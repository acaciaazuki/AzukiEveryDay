import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isNativeApp } from '../adapters/kv'
import { formatStamp } from '../core/time'
import { MAX_SNAPSHOTS } from '../core/backup'
import { deleteAllData } from '../store/deleteAllData'
import { useBackupStore } from '../store/useBackupStore'
import { useSyncStore } from '../store/useSyncStore'
import { Icon } from './AcaciaIcons'
import { Button } from './Button'
import { PrivacyLink } from './PrivacyLink'

export const card = 'rounded-(--radius-card) bg-paper p-6 shadow-card'

/** Google 登入同步狀態（側邊欄與設定頁共用）；iOS App 隱藏 Google 登入，改顯示本機儲存說明 */
export function SyncPanel({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const status = useSyncStore((s) => s.status)
  const profile = useSyncStore((s) => s.profile)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)

  if (isNativeApp())
    return (
      <div className="grid gap-1 text-xs">
        <p className="font-bold">{t('sync.nativeStatus')}</p>
        {!compact && <p className="leading-relaxed text-muted">{t('sync.nativeNotice')}</p>}
      </div>
    )

  const signedIn = status !== 'signedOut' && status !== 'connecting' && profile
  const statusText =
    status === 'syncing'
      ? t('sync.syncing')
      : status === 'synced' && lastSyncedAt
        ? t('sync.synced', { time: formatStamp(lastSyncedAt, i18n.resolvedLanguage) })
        : status === 'error'
          ? t('sync.error')
          : status === 'connecting'
            ? t('sync.connecting')
            : status === 'needsPermission'
              ? t('sync.needsPermission')
              : status === 'account_mismatch'
                ? t('sync.mismatch')
                : t('sync.localOnly')

  return (
    <div className="grid gap-2 text-xs">
      <div className="flex items-center gap-2">
        {profile?.picture ? <img src={profile.picture} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" /> : <Icon name="user" className="size-7 text-sage" />}
        <div className="min-w-0">
          <p className="truncate font-bold">{signedIn ? (profile?.name ?? t('sync.user')) : t('sync.guest')}</p>
          <p role="status" className="truncate text-muted">
            {statusText}
          </p>
        </div>
      </div>
      {status === 'account_mismatch' && (
        <div className="grid gap-2 rounded-(--radius-control) bg-[#fff4f1] p-2.5 leading-relaxed text-[#8a3a2b]">
          <p>{t('sync.mismatchHelp')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => void useSyncStore.getState().confirmSwitchAccountAndResetLocal()}>
              {t('sync.mismatchConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => void useSyncStore.getState().signOut()}>
              {t('sync.signOut')}
            </Button>
          </div>
        </div>
      )}
      {status === 'needsPermission' && (
        <>
          {!compact && <p className="leading-relaxed text-muted">{t('sync.needsPermissionHelp')}</p>}
          <Button onClick={() => void useSyncStore.getState().reauthorize()}>{t('sync.grantPermission')}</Button>
        </>
      )}
      {status === 'error' && (
        <Button variant="ghost" onClick={() => void useSyncStore.getState().syncNow()}>
          {t('sync.retry')}
        </Button>
      )}
      {!signedIn && status !== 'needsPermission' && (
        <Button disabled={status === 'connecting'} onClick={() => void useSyncStore.getState().signIn()}>
          {t('sync.signIn')}
        </Button>
      )}
      {signedIn && status !== 'account_mismatch' && !compact && (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={status === 'syncing'} onClick={() => void useSyncStore.getState().syncNow()}>
            {t('sync.now')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm(t('sync.signOutConfirm'))) void useSyncStore.getState().signOut()
            }}
          >
            {t('sync.signOut')}
          </Button>
        </div>
      )}
      {!compact && <p className="leading-relaxed text-muted">{t('sync.help')}</p>}
    </div>
  )
}

/** 自動備份：本機最多 7 份快照＋Drive 備份槽，可以手動備份與還原 */
export function BackupPanel() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage
  const s = useBackupStore()
  const signedIn = useSyncStore((x) => x.token !== null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void useBackupStore.getState().load()
  }, [])

  const run = async (fn: () => Promise<string>) => {
    try {
      setMsg(await fn())
    } catch (e) {
      console.error('備份操作失敗', e)
      setMsg(t('backup.fail'))
    }
  }

  const cloudText = isNativeApp()
    ? t('backup.cloud.native')
    : !signedIn
      ? t('backup.cloud.signedOut')
      : s.cloudStatus === 'uploading'
        ? t('backup.cloud.uploading')
        : s.cloudStatus === 'ok' && s.cloudAt
          ? t('backup.cloud.ok', { time: formatStamp(s.cloudAt, lng) })
          : s.cloudStatus === 'error'
            ? t('backup.cloud.error')
            : t('backup.cloud.waiting')

  return (
    <section className={card}>
      <h2 className="mb-1 font-bold">{t('backup.title')}</h2>
      <p className="mb-3 text-xs leading-relaxed text-muted">{t('backup.help', { count: MAX_SNAPSHOTS })}</p>
      <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="accent-[#527b67]" checked={s.enabled} onChange={(e) => void s.setEnabled(e.target.checked)} />
        {t('backup.toggle')}
      </label>
      <dl className="mb-3 grid gap-1 text-xs">
        <div className="flex gap-2">
          <dt className="text-muted">{t('backup.lastAt')}</dt>
          <dd>{s.lastAt ? formatStamp(s.lastAt, lng) : t('backup.never')}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">{t('backup.cloud.label')}</dt>
          <dd>{cloudText}</dd>
        </div>
      </dl>
      <Button variant="ghost" onClick={() => void run(async () => ((await s.backupNow('manual')) ? t('backup.done') : t('backup.unchanged')))}>
        {t('backup.now')}
      </Button>
      <h3 className="mt-4 mb-2 text-xs font-bold text-muted">{t('backup.history', { count: s.snapshots.length, max: MAX_SNAPSHOTS })}</h3>
      {s.snapshots.length === 0 ? (
        <p className="text-xs text-muted">{t('backup.empty')}</p>
      ) : (
        <ul aria-label={t('backup.historyLabel')} className="grid gap-1.5">
          {s.snapshots.map((m) => {
            const time = formatStamp(m.createdAt, lng)
            return (
              <li key={m.id} className="flex items-center gap-2 rounded-(--radius-control) border border-line px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {time} · {t(`backup.reason.${m.reason}`)}
                  </p>
                  <p className="text-muted">{t('backup.counts', { ...m.counts })}</p>
                </div>
                <Button
                  variant="ghost"
                  aria-label={t('backup.restoreLabel', { time })}
                  onClick={() => {
                    if (!window.confirm(t('backup.restoreConfirm', { time }))) return
                    void run(async () => {
                      await s.restore(m.id)
                      return t('backup.restored', { time })
                    })
                  }}
                >
                  {t('backup.restore')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {msg && (
        <p role="status" className="mt-3 text-xs text-sage-dark">
          {msg}
        </p>
      )}
    </section>
  )
}

/** 刪除所有資料：本機、自動備份，已登入時一併刪除 Drive 上的個人檔、備份檔與自己建立的共享空間檔 */
export function DeleteDataPanel() {
  const { t } = useTranslation()
  const signedIn = useSyncStore((s) => s.token !== null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const onDelete = async () => {
    if (!window.confirm(signedIn ? t('deleteData.confirmCloud') : t('deleteData.confirmLocal'))) return
    setBusy(true)
    try {
      await deleteAllData({ includeCloud: signedIn })
      setMsg(signedIn ? t('deleteData.doneCloud') : t('deleteData.done'))
    } catch (e) {
      console.error('刪除資料失敗', e)
      setMsg(t('deleteData.fail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={card}>
      <h2 className="mb-1 font-bold">{t('deleteData.title')}</h2>
      <p className="mb-2 text-xs leading-relaxed text-muted">{t('deleteData.help')}</p>
      <p className="mb-4 text-xs leading-relaxed text-muted">{signedIn ? t('deleteData.cloudOn') : t('deleteData.cloudOff')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="danger" disabled={busy} onClick={() => void onDelete()}>
          {busy ? t('deleteData.deleting') : t('deleteData.button')}
        </Button>
        <PrivacyLink className="text-xs" />
      </div>
      {msg && (
        <p role="status" className="mt-3 text-xs text-sage-dark">
          {msg}
        </p>
      )}
    </section>
  )
}
