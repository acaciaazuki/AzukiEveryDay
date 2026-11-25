import { useTranslation } from 'react-i18next'
import { daysLeft } from '../core/trash'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { Button } from './Button'
import { Dialog } from './Dialog'

/** 「最近刪除」：個人與共享空間刪除的行程保留 30 天，可以還原或立即永久刪除 */
export function TrashDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  const events = usePersonalStore((s) => s.data.events)
  const joined = usePersonalStore((s) => s.data.joinedSpaces)
  const spaces = useSpacesStore((s) => s.spaces)

  const rows = [
    ...Object.values(events)
      .filter((e) => e.trashedAt)
      .map((e) => ({ key: `p:${e.id}`, title: e.title, date: e.startDate, trashedAt: e.trashedAt!, where: t('calendar.personal'), restore: () => usePersonalStore.getState().restoreEvent(e.id), purge: () => usePersonalStore.getState().permanentlyDeleteEvent(e.id) })),
    ...Object.values(joined).flatMap((ref) => {
      const space = spaces[ref.spaceId]
      if (!space) return []
      return Object.values(space.events)
        .filter((e) => e.trashedAt)
        .map((e) => ({
          key: `s:${space.spaceId}:${e.id}`,
          title: e.title,
          date: e.startDate,
          trashedAt: e.trashedAt!,
          where: ref.localAlias || space.name,
          restore: () => useSpacesStore.getState().restoreSharedEvent(space.spaceId, e.id),
          purge: () => useSpacesStore.getState().permanentlyDeleteSharedEvent(space.spaceId, e.id),
        }))
    }),
  ].sort((a, b) => b.trashedAt.localeCompare(a.trashedAt))

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('trash.title')}>
      <p className="mb-3 text-xs leading-relaxed text-muted">{t('trash.help')}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('trash.empty')}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 rounded-(--radius-control) border border-line px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-[length:calc(11px*var(--fs))] text-muted">
                  {r.date} · {r.where} · {t('trash.daysLeft', { count: daysLeft(r.trashedAt) })}
                </p>
              </div>
              <Button variant="ghost" onClick={r.restore}>
                {t('trash.restore')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm(t('trash.purgeConfirm', { title: r.title }))) r.purge()
                }}
              >
                {t('trash.purge')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
