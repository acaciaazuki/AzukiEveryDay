import * as RD from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchAll, type SearchHit } from '../core/search'
import { formatCurrency } from '../core/format'
import { useCategories } from '../hooks/useCategories'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { Icon } from './AcaciaIcons'
import { EventDialog, type EventTarget } from './EventDialog'
import { LedgerEntryDialog } from './LedgerDialogs'

type Opened = { kind: 'event'; target: EventTarget; hit: Extract<SearchHit, { kind: 'event' | 'shared' }> } | { kind: 'ledger'; hit: Extract<SearchHit, { kind: 'ledger' }> }

/** ⌘K／Ctrl+K 全域搜尋：個人行程、共享空間行程與記帳紀錄，選到後直接打開編輯 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<Opened | null>(null)
  const events = usePersonalStore((s) => s.data.events)
  const ledgerEntries = usePersonalStore((s) => s.data.ledgerEntries)
  const joined = usePersonalStore((s) => s.data.joinedSpaces)
  const spaces = useSpacesStore((s) => s.spaces)
  const { info } = useCategories()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const hits = useMemo(
    () =>
      searchAll({
        query,
        events,
        spaces: Object.values(joined)
          .filter((r) => spaces[r.spaceId])
          .map((r) => ({ spaceId: r.spaceId, name: r.localAlias || spaces[r.spaceId]!.name, events: spaces[r.spaceId]!.events })),
        ledgerEntries,
        categoryLabel: (id) => info(id).label,
      }),
    [query, events, joined, spaces, ledgerEntries, info],
  )

  const select = (h: SearchHit) => {
    onOpenChange(false)
    if (h.kind === 'ledger') setOpened({ kind: 'ledger', hit: h })
    else setOpened({ kind: 'event', target: h.kind === 'event' ? { kind: 'personal' } : { kind: 'space', spaceId: h.spaceId }, hit: h })
  }

  const badge = (h: SearchHit) => (h.kind === 'event' ? t('calendar.personal') : h.kind === 'shared' ? h.spaceName : t('nav.ledger'))

  return (
    <>
      <RD.Root open={open} onOpenChange={onOpenChange}>
        <RD.Portal>
          <RD.Overlay className="fixed inset-0 z-40 bg-[#26363355] backdrop-blur-[2px]" />
          <RD.Content aria-describedby={undefined} className="fixed top-[10vh] left-1/2 z-50 w-[min(620px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-(--radius-card) bg-paper shadow-card">
            <RD.Title className="sr-only">{t('search.title')}</RD.Title>
            <Command label={t('search.title')} shouldFilter={false} loop>
              <div className="flex items-center gap-1 border-b border-line px-4">
                <Icon name="search" className="text-sage" />
                <Command.Input autoFocus value={query} onValueChange={setQuery} placeholder={t('search.placeholder')} className="h-12 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" />
                <RD.Close className="rounded-md border border-line px-2 py-1 text-[length:calc(11px*var(--fs))] font-semibold text-muted hover:bg-oat">{t('search.close')}</RD.Close>
              </div>
              <Command.List className="max-h-[56vh] overflow-y-auto p-2">
                {!query.trim() ? (
                  <p className="px-3 py-4 text-[length:calc(13px*var(--fs))] text-muted">{t('search.hint')}</p>
                ) : hits.length === 0 ? (
                  <Command.Empty className="py-8 text-center text-[length:calc(13px*var(--fs))] text-muted">{t('search.empty')}</Command.Empty>
                ) : (
                  hits.map((h) => (
                    <Command.Item key={h.kind + h.id} value={h.kind + h.id} onSelect={() => select(h)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[length:calc(13px*var(--fs))] data-[selected=true]:bg-sage-light">
                      <span className="max-w-[40%] shrink-0 truncate rounded-md bg-mint px-2 py-0.5 text-[length:calc(10px*var(--fs))] font-bold text-sage-dark">{badge(h)}</span>
                      <span className="min-w-0 flex-1 truncate">{h.title}</span>
                      <small className="shrink-0 text-[length:calc(11px*var(--fs))] text-muted">
                        {h.kind === 'ledger' ? `${formatCurrency(h.entry.amount, h.entry.currency, i18n.resolvedLanguage ?? 'zh-TW')} · ` : ''}
                        {h.date}
                      </small>
                    </Command.Item>
                  ))
                )}
              </Command.List>
            </Command>
          </RD.Content>
        </RD.Portal>
      </RD.Root>
      {opened?.kind === 'event' && <EventDialog target={opened.target} event={opened.hit.event} date={opened.hit.date} onClose={() => setOpened(null)} />}
      {opened?.kind === 'ledger' && <LedgerEntryDialog entry={opened.hit.entry} date={opened.hit.date} onClose={() => setOpened(null)} />}
    </>
  )
}
