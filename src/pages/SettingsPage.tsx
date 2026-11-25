import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { backupFileName, downloadJson, downloadText } from '../adapters/downloadJson'
import { Button } from '../components/Button'
import { LicensesLink } from '../components/LicensesLink'
import { PageHead } from '../components/PageHead'
import { PrivacyLink } from '../components/PrivacyLink'
import { BackupPanel, card, DeleteDataPanel, SyncPanel } from '../components/SettingsPanels'
import { CURRENCIES } from '../core/defaults'
import { currencyName } from '../core/format'
import { HOLIDAY_COUNTRIES } from '../core/holidays'
import { buildOwnBusySlotTitleMap } from '../core/busyProjection'
import { buildSafeIcsFileName, exportPersonalCalendarToIcs, exportSharedSpaceToIcs } from '../core/ics'
import { migrateToV2 } from '../core/migrate'
import type { UserSettings } from '../core/schema'
import { LANGUAGES } from '../i18n'
import { useBackupStore } from '../store/useBackupStore'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'

const selectClass = 'w-full rounded-(--radius-control) border border-line bg-oat px-3 py-2.5 text-sm text-ink outline-none focus:border-sage'

/** 目前裝置的時區（匯出 .ics 時寫進 TZID，讓其他行事曆 App 用正確的時間顯示） */
const localTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'zh-TW'
  const settings = usePersonalStore((s) => s.data.settings)
  const joined = usePersonalStore((s) => s.data.joinedSpaces)
  const spaces = useSpacesStore((s) => s.spaces)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [icsSource, setIcsSource] = useState('personal')
  const [icsBusy, setIcsBusy] = useState(false)

  const update = (patch: Partial<UserSettings>) => usePersonalStore.getState().updateSettings(patch)

  const exportJson = () => downloadJson(usePersonalStore.getState().data, backupFileName())

  const exportIcs = () => {
    const today = new Date().toISOString().slice(0, 10)
    const tz = localTimeZone()
    if (icsSource === 'personal') {
      const name = t('calendar.personal')
      downloadText(exportPersonalCalendarToIcs(usePersonalStore.getState().data.events, { calendarName: `ACACIA ${name}`, timeZone: tz }), buildSafeIcsFileName(name, today), 'text/calendar;charset=utf-8')
      return
    }
    const space = spaces[icsSource]
    if (!space) return
    const user = usePersonalStore.getState().currentUser
    const label = joined[icsSource]?.localAlias || space.name
    const text = exportSharedSpaceToIcs(space, {
      calendarName: `ACACIA - ${label}`,
      timeZone: tz,
      includeBusySlots: icsBusy,
      formatBusySummary: (name) => t('calendar.busy', { name }),
      revealOwnBusyTitles: true,
      currentUserUid: user?.uid,
      ownBusyTitleMap: user ? buildOwnBusySlotTitleMap(space.spaceId, user.uid, usePersonalStore.getState().data.events) : {},
    })
    downloadText(text, buildSafeIcsFileName(label, today), 'text/calendar;charset=utf-8')
  }

  const importJson = async (file: File) => {
    if (!window.confirm(t('settings.importConfirm'))) return
    try {
      const data = migrateToV2(JSON.parse(await file.text()))
      await useBackupStore.getState().backupNow('beforeImport')
      // 保留目前已加入的共享空間（匯入檔裡的連結可能屬於別的帳號）
      usePersonalStore.getState().replaceWithSnapshot({ ...data, joinedSpaces: usePersonalStore.getState().data.joinedSpaces })
      setMsg(t('settings.importOk'))
    } catch (e) {
      setMsg(t('settings.importFail', { msg: e instanceof Error ? e.message : String(e) }))
    }
  }

  return (
    <>
      <PageHead title={t('settings.title')} />
      <div className="grid max-w-xl grid-cols-[minmax(0,1fr)] gap-4">
        <section className={card}>
          <h2 className="mb-3 font-bold">{t('sync.title')}</h2>
          <SyncPanel />
        </section>

        <section className={`${card} grid gap-4`}>
          <h2 className="font-bold">{t('settings.preferences')}</h2>
          <div className="grid gap-1.5">
            <span className="text-xs font-semibold text-muted">{t('settings.language')}</span>
            <div role="radiogroup" aria-label={t('settings.language')} className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Button
                  key={l.code}
                  role="radio"
                  aria-checked={lng === l.code}
                  variant={lng === l.code ? 'primary' : 'ghost'}
                  onClick={() => {
                    void i18n.changeLanguage(l.code)
                    update({ locale: l.code })
                  }}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t('settings.weekStartsOn')}
            <select value={settings.weekStartsOn} onChange={(e) => update({ weekStartsOn: e.target.value === '0' ? 0 : 1 })} className={selectClass}>
              <option value={1}>{t('settings.monday')}</option>
              <option value={0}>{t('settings.sunday')}</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t('settings.billingDay')}
            <select value={settings.billingCycleStartDay} onChange={(e) => update({ billingCycleStartDay: Number(e.target.value) })} className={selectClass}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {t('settings.billingDayOption', { day: d })}
                </option>
              ))}
            </select>
            <span className="font-normal leading-relaxed">{t('settings.billingDayHelp')}</span>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t('settings.defaultCurrency')}
            <select value={settings.defaultCurrency} onChange={(e) => update({ defaultCurrency: e.target.value })} className={selectClass}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} · {currencyName(c, lng)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t('settings.holidayRegion')}
            <select value={settings.holidayRegion} onChange={(e) => update({ holidayRegion: e.target.value })} className={selectClass}>
              {HOLIDAY_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {regionName(c, lng)}
                </option>
              ))}
              <option value="none">{t('settings.holidayNone')}</option>
            </select>
          </label>
        </section>

        <BackupPanel />

        <section className={card}>
          <h2 className="mb-1 font-bold">{t('settings.data')}</h2>
          <p className="mb-3 text-xs leading-relaxed text-muted">{t('settings.dataHelp')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={exportJson}>
              {t('settings.export')}
            </Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              {t('settings.import')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importJson(f)
                e.target.value = ''
              }}
            />
          </div>
          <h3 className="mt-5 mb-1 text-sm font-bold">{t('settings.ics')}</h3>
          <p className="mb-3 text-xs leading-relaxed text-muted">{t('settings.icsHelp')}</p>
          <div className="grid gap-2">
            <select aria-label={t('settings.icsSource')} value={icsSource} onChange={(e) => setIcsSource(e.target.value)} className={selectClass}>
              <option value="personal">{t('calendar.personal')}</option>
              {Object.values(joined)
                .filter((r) => spaces[r.spaceId])
                .map((r) => (
                  <option key={r.spaceId} value={r.spaceId}>
                    {r.localAlias || spaces[r.spaceId]!.name}
                  </option>
                ))}
            </select>
            {icsSource !== 'personal' && (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" className="accent-[#527b67]" checked={icsBusy} onChange={(e) => setIcsBusy(e.target.checked)} />
                {t('settings.icsBusy')}
              </label>
            )}
            <div>
              <Button variant="ghost" onClick={exportIcs}>
                {t('settings.exportIcs')}
              </Button>
            </div>
          </div>
          {msg && (
            <p role="status" className="mt-3 text-xs text-sage-dark">
              {msg}
            </p>
          )}
        </section>

        <section className={card}>
          <h2 className="mb-2 font-bold">{t('settings.about')}</h2>
          <div className="flex flex-wrap gap-4">
            <PrivacyLink className="text-xs" />
            <LicensesLink className="text-xs" />
          </div>
        </section>

        <DeleteDataPanel />
      </div>
    </>
  )
}

function regionName(code: string, lng: string) {
  try {
    return new Intl.DisplayNames([lng], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}
