import {
  type CollectionSyncMeta,
  type PersonalAppData,
  type SharedSpaceData,
  TOMBSTONE_TTL_MS,
  UserSettingsSchema,
} from './schema'

/**
 * 逐筆合併（Last-Writer-Wins + 刪除標記）：
 * - 每筆資料以 syncMeta.updatedAt[id] 比較，較新的勝出；沒有紀錄時用整份檔案的 updatedAt
 * - 刪除標記（tombstones）時間 >= 資料時間時以刪除為準（同時間刪除優先）
 * - 刪除標記保留 180 天，過期就不再傳遞
 * - 時間完全相同時用內容排序做確定性的 tie-break，合併 A、B 與合併 B、A 的結果一致
 */

type UserSettings = PersonalAppData['settings']

function deterministicTieBreak<T>(a: T, b: T): T {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const strA = JSON.stringify(a, Object.keys(a as object).sort())
    const strB = JSON.stringify(b, Object.keys(b as object).sort())
    return strA >= strB ? a : b
  }
  return String(a) >= String(b) ? a : b
}

export function mergeRecordCollection<T>(
  localItems: Record<string, T>,
  localMeta: CollectionSyncMeta | undefined,
  localFallbackTime: string,
  remoteItems: Record<string, T>,
  remoteMeta: CollectionSyncMeta | undefined,
  remoteFallbackTime: string,
  nowMs: number = Date.now(),
): { items: Record<string, T>; meta: CollectionSyncMeta } {
  const mergedItems: Record<string, T> = {}
  const mergedUpdatedAt: Record<string, string> = {}
  const mergedTombstones: Record<string, string> = {}

  const lUpd = localMeta?.updatedAt ?? {}
  const rUpd = remoteMeta?.updatedAt ?? {}
  const lTomb = localMeta?.tombstones ?? {}
  const rTomb = remoteMeta?.tombstones ?? {}

  const allIds = new Set<string>([...Object.keys(localItems), ...Object.keys(remoteItems), ...Object.keys(lTomb), ...Object.keys(rTomb)])

  for (const id of allIds) {
    const inLocal = id in localItems
    const inRemote = id in remoteItems

    const localItemTime = inLocal ? (lUpd[id] ?? localFallbackTime) : null
    const remoteItemTime = inRemote ? (rUpd[id] ?? remoteFallbackTime) : null

    const localDelTime = lTomb[id] ?? null
    const remoteDelTime = rTomb[id] ?? null
    const latestDelTime = localDelTime && remoteDelTime ? (localDelTime >= remoteDelTime ? localDelTime : remoteDelTime) : (localDelTime ?? remoteDelTime)

    let winningItem: T | null = null
    let winningItemTime: string | null = null

    if (inLocal && inRemote) {
      if (localItemTime! > remoteItemTime!) {
        winningItem = localItems[id]
        winningItemTime = localItemTime
      } else if (remoteItemTime! > localItemTime!) {
        winningItem = remoteItems[id]
        winningItemTime = remoteItemTime
      } else {
        winningItem = deterministicTieBreak(localItems[id], remoteItems[id])
        winningItemTime = localItemTime
      }
    } else if (inLocal) {
      winningItem = localItems[id]
      winningItemTime = localItemTime
    } else if (inRemote) {
      winningItem = remoteItems[id]
      winningItemTime = remoteItemTime
    }

    if (latestDelTime && (!winningItemTime || latestDelTime >= winningItemTime)) {
      if (nowMs - Date.parse(latestDelTime) < TOMBSTONE_TTL_MS) {
        mergedTombstones[id] = latestDelTime
      }
      continue
    }

    if (winningItem !== null && winningItemTime !== null) {
      mergedItems[id] = winningItem
      mergedUpdatedAt[id] = winningItemTime
    }
  }

  return {
    items: mergedItems,
    meta: { updatedAt: mergedUpdatedAt, tombstones: mergedTombstones },
  }
}

export function mergeUserSettings(
  localSettings: UserSettings,
  localFieldMeta: Record<string, string> | undefined,
  localFallbackTime: string,
  remoteSettings: UserSettings,
  remoteFieldMeta: Record<string, string> | undefined,
  remoteFallbackTime: string,
): { settings: UserSettings; fieldUpdatedAt: Record<string, string> } {
  const keys = Object.keys(UserSettingsSchema.shape) as Array<keyof UserSettings>
  const mergedSettings: Record<string, unknown> = {}
  const mergedFieldUpdatedAt: Record<string, string> = {}

  for (const key of keys) {
    const k = String(key)
    const lTime = localFieldMeta?.[k] ?? localFallbackTime
    const rTime = remoteFieldMeta?.[k] ?? remoteFallbackTime
    const lVal = localSettings[key]
    const rVal = remoteSettings[key]

    if (lTime > rTime) {
      mergedSettings[k] = lVal
      mergedFieldUpdatedAt[k] = lTime
    } else if (rTime > lTime) {
      mergedSettings[k] = rVal
      mergedFieldUpdatedAt[k] = rTime
    } else {
      mergedSettings[k] = deterministicTieBreak(lVal, rVal)
      mergedFieldUpdatedAt[k] = lTime
    }
  }

  return {
    settings: UserSettingsSchema.parse(mergedSettings),
    fieldUpdatedAt: mergedFieldUpdatedAt,
  }
}

export function mergeAppData(local: PersonalAppData, remote: PersonalAppData, nowIso: string = new Date().toISOString()): PersonalAppData {
  const nowMs = Date.parse(nowIso)

  const eventsRes = mergeRecordCollection(local.events, local.syncMeta?.events, local.updatedAt, remote.events, remote.syncMeta?.events, remote.updatedAt, nowMs)

  const ledgerRes = mergeRecordCollection(local.ledgerEntries, local.syncMeta?.ledgerEntries, local.updatedAt, remote.ledgerEntries, remote.syncMeta?.ledgerEntries, remote.updatedAt, nowMs)

  const categoriesRes = mergeRecordCollection(
    local.customCategories,
    local.syncMeta?.customCategories,
    local.updatedAt,
    remote.customCategories,
    remote.syncMeta?.customCategories,
    remote.updatedAt,
    nowMs,
  )

  const joinedSpacesRes = mergeRecordCollection(local.joinedSpaces, local.syncMeta?.joinedSpaces, local.updatedAt, remote.joinedSpaces, remote.syncMeta?.joinedSpaces, remote.updatedAt, nowMs)

  const settingsRes = mergeUserSettings(
    local.settings,
    local.syncMeta?.settingsFieldUpdatedAt,
    local.updatedAt,
    remote.settings,
    remote.syncMeta?.settingsFieldUpdatedAt,
    remote.updatedAt,
  )

  return {
    schemaVersion: 2,
    updatedAt: nowIso,
    events: eventsRes.items,
    ledgerEntries: ledgerRes.items,
    customCategories: categoriesRes.items,
    joinedSpaces: joinedSpacesRes.items,
    settings: settingsRes.settings,
    syncMeta: {
      events: eventsRes.meta,
      ledgerEntries: ledgerRes.meta,
      customCategories: categoriesRes.meta,
      joinedSpaces: joinedSpacesRes.meta,
      settingsFieldUpdatedAt: settingsRes.fieldUpdatedAt,
    },
  }
}

export function mergeSpaceData(local: SharedSpaceData, remote: SharedSpaceData, nowIso: string = new Date().toISOString()): SharedSpaceData {
  const nowMs = Date.parse(nowIso)

  const eventsResult = mergeRecordCollection(local.events, local.syncMeta?.events, local.updatedAt, remote.events, remote.syncMeta?.events, remote.updatedAt, nowMs)

  const busySlotsResult = mergeRecordCollection(local.busySlots, local.syncMeta?.busySlots, local.updatedAt, remote.busySlots, remote.syncMeta?.busySlots, remote.updatedAt, nowMs)

  const lNameTime = local.syncMeta?.nameUpdatedAt ?? local.updatedAt
  const rNameTime = remote.syncMeta?.nameUpdatedAt ?? remote.updatedAt
  const nameWinsLocal = lNameTime > rNameTime || (lNameTime === rNameTime && local.name >= remote.name)

  return {
    schemaVersion: 2,
    spaceId: local.spaceId,
    ownerUid: local.ownerUid,
    name: nameWinsLocal ? local.name : remote.name,
    updatedAt: nowIso,
    events: eventsResult.items,
    busySlots: busySlotsResult.items,
    syncMeta: {
      nameUpdatedAt: nameWinsLocal ? lNameTime : rNameTime,
      events: eventsResult.meta,
      busySlots: busySlotsResult.meta,
    },
  }
}
