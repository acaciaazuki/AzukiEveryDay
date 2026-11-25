import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { useSyncStore } from '../store/useSyncStore'
import { showToast } from '../store/useToastStore'
import { Button } from './Button'
import { ColorSwatches } from './ColorSwatches'
import { Dialog } from './Dialog'
import { Field } from './Field'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 建立共享空間：在自己的 Drive 建立 acacia_space_<id>.json，之後可以邀請成員 */
export function CreateSpaceDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const create = async () => {
    setBusy(true)
    try {
      await useSyncStore.getState().createSpace(name)
      showToast({ message: t('spaces.created') })
      onClose()
    } catch (e) {
      console.error('建立共享空間失敗', e)
      showToast({ message: t('spaces.failed') })
      setBusy(false)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('spaces.create')}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <Field label={t('spaces.name')} value={name} maxLength={100} required autoFocus placeholder={t('spaces.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
        <p className="text-xs leading-relaxed text-muted">{t('spaces.createHelp')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {t('spaces.createButton')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** 共享空間設定：名稱、顯示名稱、顏色、忙碌時段投射、邀請成員、離開 */
export function SpaceSettingsDialog({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const ref = usePersonalStore((s) => s.data.joinedSpaces[spaceId])
  const space = useSpacesStore((s) => s.spaces[spaceId])
  const user = usePersonalStore((s) => s.currentUser)
  const revoked = useSyncStore((s) => s.revokedSpaceIds.includes(spaceId))
  const [name, setName] = useState(space?.name ?? '')
  const [alias, setAlias] = useState(ref?.localAlias ?? '')
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  if (!ref) return null
  const isOwner = Boolean(space && user && space.ownerUid === user.uid)
  const members = space ? [...new Set(Object.values(space.busySlots).map((b) => b.ownerDisplayName).concat(Object.values(space.events).map((e) => e.createdByName)))].filter(Boolean) : []

  const save = () => {
    if (space && name.trim() && name.trim() !== space.name) useSpacesStore.getState().renameSpace(spaceId, name)
    if ((alias.trim() || undefined) !== ref.localAlias) usePersonalStore.getState().updateJoinedSpace(spaceId, { localAlias: alias.trim().slice(0, 100) || undefined })
    onClose()
  }

  const invite = async () => {
    if (!EMAIL.test(email.trim())) return
    setInviting(true)
    try {
      await useSyncStore.getState().inviteMember(spaceId, email)
      showToast({ message: t('spaces.invited', { email: email.trim() }) })
      setEmail('')
    } catch (e) {
      console.error('邀請成員失敗', e)
      showToast({ message: t('spaces.inviteFailed') })
    } finally {
      setInviting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('spaces.settings')}>
      <div className="grid gap-4">
        {revoked && <p className="rounded-(--radius-control) bg-[#fff4f1] px-3 py-2 text-xs leading-relaxed text-[#9a3f2b]">{t('spaces.revoked')}</p>}
        <Field label={t('spaces.name')} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        <Field label={t('spaces.alias')} value={alias} maxLength={100} placeholder={space?.name} onChange={(e) => setAlias(e.target.value)} />
        <ColorSwatches label={t('spaces.color')} value={ref.color} onChange={(c) => usePersonalStore.getState().updateJoinedSpace(spaceId, { color: c })} />

        <section className="grid gap-2 rounded-(--radius-control) border border-line p-3">
          <label className="flex items-start gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="mt-1 accent-[#527b67]"
              checked={ref.projectBusySlots}
              disabled={!user}
              onChange={(e) => usePersonalStore.getState().updateJoinedSpace(spaceId, { projectBusySlots: e.target.checked })}
            />
            <span>
              {t('spaces.busyToggle')}
              <span className="mt-1 block text-xs leading-relaxed font-normal text-muted">{t('spaces.busyHelp')}</span>
            </span>
          </label>
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-bold">{t('spaces.invite')}</h3>
          <p className="text-xs leading-relaxed text-muted">{t(isOwner ? 'spaces.inviteHelp' : 'spaces.inviteHelpMember')}</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              aria-label={t('spaces.email')}
              placeholder="name@gmail.com"
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-(--radius-control) border border-line bg-oat px-3 py-2 text-sm outline-none focus:border-sage"
            />
            <Button onClick={() => void invite()} disabled={inviting || !EMAIL.test(email.trim())}>
              {t('spaces.inviteButton')}
            </Button>
          </div>
          {members.length > 0 && <p className="text-xs text-muted">{t('spaces.members', { names: members.join('、') })}</p>}
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="danger"
            className="mr-auto"
            onClick={() => {
              if (!window.confirm(t('spaces.leaveConfirm', { name: ref.localAlias || space?.name || '' }))) return
              useSyncStore.getState().leaveSpace(spaceId)
              onClose()
            }}
          >
            {t('spaces.leave')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save}>{t('common.save')}</Button>
        </div>
      </div>
    </Dialog>
  )
}
