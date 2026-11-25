import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { webStorage } from '../adapters/storage'
import { reconcileUserBusySlotsInSpace } from '../core/busyProjection'
import { newId } from '../core/defaults'
import { type CalendarEvent, type JoinedSpaceRef, type SharedEvent, type SharedSpaceData, SharedSpaceDataSchema } from '../core/schema'
import { tombstoneMeta, touchMeta } from '../core/syncMeta'
import { purgeExpiredTrash } from '../core/trash'

/**
 * 共享空間（本機副本）。每個空間對應 Drive 上的一個 acacia_space_<spaceId>.json，
 * 由同步協調器（hooks/useCloudSyncCoordinator）負責跟雲端合併。
 * 這裡只放共享行程與忙碌時段，記帳本不會出現在這裡。
 */

export interface SpaceEditor {
  uid: string
  name: string
}

/** 新增或編輯共享行程時表單送來的內容 */
export type SharedEventInput = Omit<CalendarEvent, 'id' | 'trashedAt'> & { id?: string }

interface SpacesState {
  spaces: Record<string, SharedSpaceData>
  /** 本機有修改、尚未上傳的空間 */
  dirtySpaceIds: string[]
  /** 上次同步時各空間檔的 ETag */
  spaceEtags: Record<string, string>

  upsertSpaceLocal: (space: SharedSpaceData, opts?: { dirty?: boolean }) => void
  removeSpaceLocal: (spaceId: string) => void
  renameSpace: (spaceId: string, name: string) => void
  upsertSharedEvent: (spaceId: string, input: SharedEventInput, editor: SpaceEditor) => string | null
  trashSharedEvent: (spaceId: string, eventId: string) => void
  restoreSharedEvent: (spaceId: string, eventId: string) => void
  permanentlyDeleteSharedEvent: (spaceId: string, eventId: string) => void
  purgeAllSpacesTrash: (nowIso?: string) => void
  /** 依個人行程重新計算自己在各空間的忙碌時段（開關關閉時撤除自己的時段） */
  reconcileBusyProjections: (params: { personalEvents: Record<string, CalendarEvent>; joinedSpaces: Record<string, JoinedSpaceRef>; owner: SpaceEditor | null; nowIso?: string }) => void
  applyMergedSpaceFromCloud: (space: SharedSpaceData, etag: string, opts?: { stillDirty?: boolean }) => void
  markSpaceSynced: (spaceId: string, etag: string) => void
  clearAllSpacesLocal: () => void
}

const nowIsoOf = () => new Date().toISOString()
const addDirty = (list: string[], id: string) => (list.includes(id) ? list : [...list, id])

export const useSpacesStore = create<SpacesState>()(
  persist(
    (set, get) => {
      /** 修改單一空間：更新 updatedAt 並標記為待上傳 */
      const update = (spaceId: string, fn: (s: SharedSpaceData, nowIso: string) => SharedSpaceData | null) => {
        const space = get().spaces[spaceId]
        if (!space) return
        const nowIso = nowIsoOf()
        const next = fn(space, nowIso)
        if (!next || next === space) return
        set((st) => ({ spaces: { ...st.spaces, [spaceId]: { ...next, updatedAt: nowIso } }, dirtySpaceIds: addDirty(st.dirtySpaceIds, spaceId) }))
      }

      const setEvent = (s: SharedSpaceData, evt: SharedEvent, nowIso: string): SharedSpaceData => ({
        ...s,
        events: { ...s.events, [evt.id]: evt },
        syncMeta: { ...s.syncMeta, events: touchMeta(s.syncMeta.events, [evt.id], nowIso) },
      })

      return {
        spaces: {},
        dirtySpaceIds: [],
        spaceEtags: {},

        upsertSpaceLocal: (space, opts) =>
          set((st) => ({ spaces: { ...st.spaces, [space.spaceId]: space }, dirtySpaceIds: opts?.dirty ? addDirty(st.dirtySpaceIds, space.spaceId) : st.dirtySpaceIds })),

        removeSpaceLocal: (spaceId) =>
          set((st) => {
            const spaces = { ...st.spaces }
            delete spaces[spaceId]
            const spaceEtags = { ...st.spaceEtags }
            delete spaceEtags[spaceId]
            return { spaces, spaceEtags, dirtySpaceIds: st.dirtySpaceIds.filter((x) => x !== spaceId) }
          }),

        renameSpace: (spaceId, name) =>
          update(spaceId, (s, nowIso) => {
            const trimmed = name.trim().slice(0, 100)
            if (!trimmed || trimmed === s.name) return null
            return { ...s, name: trimmed, syncMeta: { ...s.syncMeta, nameUpdatedAt: nowIso } }
          }),

        upsertSharedEvent: (spaceId, input, editor) => {
          const space = get().spaces[spaceId]
          if (!space) return null
          const id = input.id ?? newId()
          update(spaceId, (s, nowIso) => {
            const prev = s.events[id]
            const evt: SharedEvent = {
              ...input,
              id,
              trashedAt: prev?.trashedAt ?? null,
              createdByUid: prev?.createdByUid ?? editor.uid,
              createdByName: (prev?.createdByName ?? editor.name).slice(0, 80),
              lastEditedByName: editor.name.slice(0, 80),
            }
            return setEvent(s, evt, nowIso)
          })
          return id
        },

        trashSharedEvent: (spaceId, eventId) =>
          update(spaceId, (s, nowIso) => {
            const evt = s.events[eventId]
            if (!evt || evt.trashedAt) return null
            return setEvent(s, { ...evt, trashedAt: nowIso }, nowIso)
          }),

        restoreSharedEvent: (spaceId, eventId) =>
          update(spaceId, (s, nowIso) => {
            const evt = s.events[eventId]
            if (!evt || !evt.trashedAt) return null
            return setEvent(s, { ...evt, trashedAt: null }, nowIso)
          }),

        permanentlyDeleteSharedEvent: (spaceId, eventId) =>
          update(spaceId, (s, nowIso) => {
            if (!s.events[eventId]) return null
            const events = { ...s.events }
            delete events[eventId]
            return { ...s, events, syncMeta: { ...s.syncMeta, events: tombstoneMeta(s.syncMeta.events, [eventId], nowIso) } }
          }),

        purgeAllSpacesTrash: (nowIso = nowIsoOf()) => {
          const changed: Record<string, SharedSpaceData> = {}
          for (const [id, s] of Object.entries(get().spaces)) {
            const r = purgeExpiredTrash(s.events, s.syncMeta.events, nowIso)
            if (r.events !== s.events || r.meta !== s.syncMeta.events) changed[id] = { ...s, events: r.events, syncMeta: { ...s.syncMeta, events: r.meta } }
          }
          const ids = Object.keys(changed)
          if (ids.length === 0) return
          set((st) => ({ spaces: { ...st.spaces, ...changed }, dirtySpaceIds: ids.reduce(addDirty, st.dirtySpaceIds) }))
        },

        reconcileBusyProjections: ({ personalEvents, joinedSpaces, owner, nowIso = nowIsoOf() }) => {
          if (!owner) return
          const changed: Record<string, SharedSpaceData> = {}
          for (const [spaceId, space] of Object.entries(get().spaces)) {
            const ref = joinedSpaces[spaceId]
            const r = reconcileUserBusySlotsInSpace({
              spaceId,
              ownerUid: owner.uid,
              ownerDisplayName: owner.name.slice(0, 80),
              projectEnabled: Boolean(ref?.projectBusySlots),
              personalEvents,
              existingBusySlots: space.busySlots,
              existingMeta: space.syncMeta.busySlots,
              nowIso,
            })
            if (r.hasChanges) changed[spaceId] = { ...space, updatedAt: nowIso, busySlots: r.busySlots, syncMeta: { ...space.syncMeta, busySlots: r.meta } }
          }
          const ids = Object.keys(changed)
          if (ids.length === 0) return
          set((st) => ({ spaces: { ...st.spaces, ...changed }, dirtySpaceIds: ids.reduce(addDirty, st.dirtySpaceIds) }))
        },

        applyMergedSpaceFromCloud: (space, etag, opts) =>
          set((st) => ({
            spaces: { ...st.spaces, [space.spaceId]: space },
            spaceEtags: { ...st.spaceEtags, [space.spaceId]: etag },
            dirtySpaceIds: opts?.stillDirty ? addDirty(st.dirtySpaceIds, space.spaceId) : st.dirtySpaceIds.filter((x) => x !== space.spaceId),
          })),

        markSpaceSynced: (spaceId, etag) => set((st) => ({ spaceEtags: { ...st.spaceEtags, [spaceId]: etag }, dirtySpaceIds: st.dirtySpaceIds.filter((x) => x !== spaceId) })),

        clearAllSpacesLocal: () => set({ spaces: {}, dirtySpaceIds: [], spaceEtags: {} }),
      }
    },
    {
      name: 'acacia-spaces',
      version: 2,
      storage: createJSONStorage(() => webStorage),
      partialize: (s) => ({ spaces: s.spaces, dirtySpaceIds: s.dirtySpaceIds, spaceEtags: s.spaceEtags }),
      // 讀回來的空間逐一驗證，格式不對的略過（不讓一個壞掉的空間拖垮整個 App）
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<SpacesState, 'spaces' | 'dirtySpaceIds' | 'spaceEtags'>>
        const spaces: Record<string, SharedSpaceData> = {}
        for (const [id, raw] of Object.entries(p.spaces ?? {})) {
          const r = SharedSpaceDataSchema.safeParse(raw)
          if (r.success) spaces[id] = r.data
        }
        return { ...current, spaces, dirtySpaceIds: Array.isArray(p.dirtySpaceIds) ? p.dirtySpaceIds : [], spaceEtags: p.spaceEtags ?? {} }
      },
      onRehydrateStorage: () => (state) => state?.purgeAllSpacesTrash(),
    },
  ),
)
