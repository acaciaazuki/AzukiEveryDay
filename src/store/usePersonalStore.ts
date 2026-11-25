import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { webStorage } from '../adapters/storage'
import { emptyPersonalData, newId } from '../core/defaults'
import {
  type CalendarEvent,
  type JoinedSpaceRef,
  type LedgerCategory,
  type LedgerEntry,
  type PersonalAppData,
  PersonalAppDataSchema,
  type UserSettings,
  UserSettingsSchema,
} from '../core/schema'
import { emptyMeta, tombstoneMeta, touchMeta } from '../core/syncMeta'
import { purgeExpiredTrash } from '../core/trash'
import { useSpacesStore } from './useSpacesStore'

/**
 * 個人主資料（acacia_data_v2.json 的本機副本）：個人行程、記帳本、自訂分類、已加入的共享空間與設定。
 *
 * - 每次修改都維護 syncMeta（逐筆修改時間與刪除標記），同步時才能逐筆合併
 * - 行程或「忙碌時段投射」開關有變動時，立即重新計算自己在各共享空間的雜湊忙碌時段
 * - 記帳本的動作只修改個人資料，絕不寫入共享空間
 */

export interface CurrentUser {
  uid: string
  displayName: string
}

export type EventInput = Omit<CalendarEvent, 'id' | 'trashedAt'> & { id?: string }
export type LedgerEntryInput = Omit<LedgerEntry, 'id'> & { id?: string }
export type CategoryInput = Omit<LedgerCategory, 'id' | 'isCustom'> & { id?: string }

type Meta = NonNullable<PersonalAppData['syncMeta']>
type CollectionKey = 'events' | 'ledgerEntries' | 'customCategories' | 'joinedSpaces'

interface PersonalState {
  data: PersonalAppData
  currentUser: CurrentUser | null
  /** 本機有修改、尚未上傳 */
  isDirty: boolean
  lastSyncedEtag: string | null

  upsertEvent: (input: EventInput) => string
  batchCreateEvents: (inputs: EventInput[]) => string[]
  trashEvent: (id: string) => void
  restoreEvent: (id: string) => void
  permanentlyDeleteEvent: (id: string) => void
  purgeExpiredPersonalTrash: (nowIso?: string) => void

  upsertLedgerEntry: (input: LedgerEntryInput) => string
  deleteLedgerEntry: (id: string) => void
  upsertCustomCategory: (input: CategoryInput) => string
  deleteCustomCategory: (id: string) => void

  updateSettings: (patch: Partial<UserSettings>) => void

  addJoinedSpace: (ref: JoinedSpaceRef) => void
  updateJoinedSpace: (spaceId: string, patch: Partial<Omit<JoinedSpaceRef, 'spaceId' | 'driveFileId'>>) => void
  removeJoinedSpace: (spaceId: string) => void

  setCurrentUser: (user: CurrentUser | null) => void
  /** 雲端合併後套用（stillDirty：上傳期間本機又有修改，維持待上傳） */
  applyMergedFromCloud: (data: PersonalAppData, etag: string, opts?: { stillDirty?: boolean }) => void
  /** 還原快照或匯入 JSON：視為「現在做的修改」，跟目前資料比對後逐筆記下修改時間 */
  replaceWithSnapshot: (data: PersonalAppData) => void
  markSynced: (etag: string) => void
  /** 清空本機（刪除所有資料、切換帳號） */
  resetLocal: () => void
  /** 依目前資料重新計算各空間的忙碌時段 */
  syncBusyProjections: () => void
}

const nowIsoOf = () => new Date().toISOString()

const metaOf = (d: PersonalAppData): Meta =>
  d.syncMeta ?? { events: emptyMeta(), ledgerEntries: emptyMeta(), customCategories: emptyMeta(), joinedSpaces: emptyMeta(), settingsFieldUpdatedAt: {} }

/** 比對前後兩份資料，把新增、修改、刪除都記成 nowIso（還原快照用） */
export function diffSyncMeta(before: PersonalAppData, after: PersonalAppData, nowIso: string): Meta {
  const prev = metaOf(before)
  const next = { ...metaOf(after) }
  const keys: CollectionKey[] = ['events', 'ledgerEntries', 'customCategories', 'joinedSpaces']
  for (const k of keys) {
    const a = before[k] as Record<string, unknown>
    const b = after[k] as Record<string, unknown>
    let meta = { updatedAt: { ...prev[k].updatedAt, ...next[k].updatedAt }, tombstones: { ...prev[k].tombstones, ...next[k].tombstones } }
    const changed = Object.keys(b).filter((id) => JSON.stringify(a[id]) !== JSON.stringify(b[id]))
    const removed = Object.keys(a).filter((id) => !(id in b))
    meta = touchMeta(meta, changed, nowIso)
    meta = tombstoneMeta(meta, removed, nowIso)
    for (const id of Object.keys(meta.updatedAt)) if (!(id in b)) delete meta.updatedAt[id]
    next[k] = meta
  }
  const settingsFieldUpdatedAt = { ...prev.settingsFieldUpdatedAt }
  for (const key of Object.keys(UserSettingsSchema.shape) as (keyof UserSettings)[]) {
    if (before.settings[key] !== after.settings[key]) settingsFieldUpdatedAt[key] = nowIso
  }
  next.settingsFieldUpdatedAt = settingsFieldUpdatedAt
  return next
}

export const usePersonalStore = create<PersonalState>()(
  persist(
    (set, get) => {
      /** 修改一個集合：更新項目、syncMeta 與 updatedAt，並標記待上傳 */
      const mutate = <K extends CollectionKey>(key: K, fn: (items: PersonalAppData[K], nowIso: string) => { items: PersonalAppData[K]; touched?: string[]; removed?: string[] } | null) => {
        const nowIso = nowIsoOf()
        const d = get().data
        const r = fn(d[key], nowIso)
        if (!r) return false
        const meta = metaOf(d)
        let colMeta = meta[key]
        if (r.touched?.length) colMeta = touchMeta(colMeta, r.touched, nowIso)
        if (r.removed?.length) colMeta = tombstoneMeta(colMeta, r.removed, nowIso)
        set({ data: { ...d, [key]: r.items, updatedAt: nowIso, syncMeta: { ...meta, [key]: colMeta } }, isDirty: true })
        return true
      }

      const syncBusy = () => {
        const { data, currentUser } = get()
        useSpacesStore.getState().reconcileBusyProjections({
          personalEvents: data.events,
          joinedSpaces: data.joinedSpaces,
          owner: currentUser ? { uid: currentUser.uid, name: currentUser.displayName } : null,
        })
      }

      const buildEvent = (input: EventInput, prev: CalendarEvent | undefined): CalendarEvent => {
        const allDay = input.isAllDay
        return {
          ...input,
          id: input.id ?? newId(),
          title: input.title.trim().slice(0, 200),
          endDate: input.endDate >= input.startDate ? input.endDate : input.startDate,
          startTime: allDay ? undefined : input.startTime,
          endTime: allDay ? undefined : input.endTime,
          note: input.note.slice(0, 2000),
          trashedAt: prev?.trashedAt ?? null,
        }
      }

      const setTrashed = (id: string, trashed: boolean) => {
        const ok = mutate('events', (items, nowIso) => {
          const evt = items[id]
          if (!evt || Boolean(evt.trashedAt) === trashed) return null
          return { items: { ...items, [id]: { ...evt, trashedAt: trashed ? nowIso : null } }, touched: [id] }
        })
        if (ok) syncBusy()
      }

      return {
        data: emptyPersonalData(),
        currentUser: null,
        isDirty: false,
        lastSyncedEtag: null,

        upsertEvent: (input) => {
          const evt = buildEvent(input, input.id ? get().data.events[input.id] : undefined)
          mutate('events', (items) => ({ items: { ...items, [evt.id]: evt }, touched: [evt.id] }))
          syncBusy()
          return evt.id
        },

        batchCreateEvents: (inputs) => {
          const events = inputs.map((i) => buildEvent({ ...i, id: undefined }, undefined))
          if (events.length === 0) return []
          mutate('events', (items) => ({ items: { ...items, ...Object.fromEntries(events.map((e) => [e.id, e])) }, touched: events.map((e) => e.id) }))
          syncBusy()
          return events.map((e) => e.id)
        },

        trashEvent: (id) => setTrashed(id, true),
        restoreEvent: (id) => setTrashed(id, false),

        permanentlyDeleteEvent: (id) => {
          const ok = mutate('events', (items) => {
            if (!items[id]) return null
            const next = { ...items }
            delete next[id]
            return { items: next, removed: [id] }
          })
          if (ok) syncBusy()
        },

        purgeExpiredPersonalTrash: (nowIso = nowIsoOf()) => {
          const d = get().data
          const meta = metaOf(d)
          const r = purgeExpiredTrash(d.events, meta.events, nowIso)
          if (r.events === d.events && r.meta === meta.events) return
          set({ data: { ...d, events: r.events, updatedAt: nowIso, syncMeta: { ...meta, events: r.meta } }, isDirty: true })
          if (r.purgedIds.length) syncBusy()
        },

        upsertLedgerEntry: (input) => {
          const id = input.id ?? newId()
          const entry: LedgerEntry = { ...input, id, amount: Math.max(0, input.amount), currency: input.currency.toUpperCase(), note: input.note.slice(0, 500) }
          mutate('ledgerEntries', (items) => ({ items: { ...items, [id]: entry }, touched: [id] }))
          return id
        },

        deleteLedgerEntry: (id) =>
          void mutate('ledgerEntries', (items) => {
            if (!items[id]) return null
            const next = { ...items }
            delete next[id]
            return { items: next, removed: [id] }
          }),

        upsertCustomCategory: (input) => {
          const id = input.id ?? `custom_${newId()}`
          const cat: LedgerCategory = { ...input, id, label: input.label.trim().slice(0, 50), isCustom: true }
          mutate('customCategories', (items) => ({ items: { ...items, [id]: cat }, touched: [id] }))
          return id
        },

        deleteCustomCategory: (id) =>
          void mutate('customCategories', (items) => {
            if (!items[id]) return null
            const next = { ...items }
            delete next[id]
            return { items: next, removed: [id] }
          }),

        updateSettings: (patch) => {
          const d = get().data
          const nowIso = nowIsoOf()
          const settings = UserSettingsSchema.parse({ ...d.settings, ...patch })
          const meta = metaOf(d)
          const fields = { ...meta.settingsFieldUpdatedAt }
          let changed = false
          for (const k of Object.keys(patch) as (keyof UserSettings)[]) {
            if (settings[k] !== d.settings[k]) {
              fields[k] = nowIso
              changed = true
            }
          }
          if (!changed) return
          set({ data: { ...d, settings, updatedAt: nowIso, syncMeta: { ...meta, settingsFieldUpdatedAt: fields } }, isDirty: true })
        },

        addJoinedSpace: (ref) => {
          mutate('joinedSpaces', (items) => ({ items: { ...items, [ref.spaceId]: ref }, touched: [ref.spaceId] }))
          syncBusy()
        },

        updateJoinedSpace: (spaceId, patch) => {
          const ok = mutate('joinedSpaces', (items) => {
            const prev = items[spaceId]
            if (!prev) return null
            return { items: { ...items, [spaceId]: { ...prev, ...patch } }, touched: [spaceId] }
          })
          if (ok && 'projectBusySlots' in patch) syncBusy()
        },

        removeJoinedSpace: (spaceId) => {
          // 離開前先撤除自己在該空間的忙碌時段
          const ref = get().data.joinedSpaces[spaceId]
          if (ref?.projectBusySlots) {
            const { data, currentUser } = get()
            useSpacesStore.getState().reconcileBusyProjections({
              personalEvents: data.events,
              joinedSpaces: { ...data.joinedSpaces, [spaceId]: { ...ref, projectBusySlots: false } },
              owner: currentUser ? { uid: currentUser.uid, name: currentUser.displayName } : null,
            })
          }
          mutate('joinedSpaces', (items) => {
            if (!items[spaceId]) return null
            const next = { ...items }
            delete next[spaceId]
            return { items: next, removed: [spaceId] }
          })
        },

        setCurrentUser: (user) => {
          set({ currentUser: user })
          syncBusy()
        },

        applyMergedFromCloud: (data, etag, opts) => {
          set({ data, lastSyncedEtag: etag, isDirty: Boolean(opts?.stillDirty) })
          syncBusy()
        },

        replaceWithSnapshot: (data) => {
          const nowIso = nowIsoOf()
          const before = get().data
          const restored: PersonalAppData = { ...data, updatedAt: nowIso }
          set({ data: { ...restored, syncMeta: diffSyncMeta(before, restored, nowIso) }, isDirty: true })
          syncBusy()
        },

        markSynced: (etag) => set({ lastSyncedEtag: etag, isDirty: false }),

        resetLocal: () => set({ data: emptyPersonalData(), currentUser: null, isDirty: false, lastSyncedEtag: null }),

        syncBusyProjections: syncBusy,
      }
    },
    {
      name: 'acacia-personal-v2',
      version: 2,
      storage: createJSONStorage(() => webStorage),
      partialize: (s) => ({ data: s.data, currentUser: s.currentUser, isDirty: s.isDirty, lastSyncedEtag: s.lastSyncedEtag }),
      // 讀回來的資料先驗證；格式壞掉時保留空白資料，不讓 App 整個打不開（自動備份仍可還原）
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<PersonalState, 'data' | 'currentUser' | 'isDirty' | 'lastSyncedEtag'>>
        const parsed = PersonalAppDataSchema.safeParse(p.data)
        if (!parsed.success && p.data) console.error('本機資料格式不正確，改用空白資料', parsed.error)
        return {
          ...current,
          data: parsed.success ? parsed.data : current.data,
          currentUser: p.currentUser ?? null,
          isDirty: Boolean(p.isDirty),
          lastSyncedEtag: p.lastSyncedEtag ?? null,
        }
      },
      onRehydrateStorage: () => (state) => state?.purgeExpiredPersonalTrash(),
    },
  ),
)

/** 等本機資料（個人與共享空間）都讀進來 */
export function whenHydrated(): Promise<void> {
  const wait = (p: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void }) =>
    p.hasHydrated() ? Promise.resolve() : new Promise<void>((r) => void p.onFinishHydration(() => r()))
  return Promise.all([wait(usePersonalStore.persist), wait(useSpacesStore.persist)]).then(() => {})
}
