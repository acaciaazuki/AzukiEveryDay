/**
 * 全站圖示名稱。AcaciaIcons.tsx 對每個名稱都要有一張圖（用 Record 在編譯期檢查）。
 * 生活（時間軸）、導覽、記帳分類、地點分類、通用符號都在這裡。
 */
export const ICON_NAMES = [
  // 時間軸生活插畫
  'wake', 'sleep', 'study', 'work', 'rest', 'meal', 'shopping', 'exercise', 'health', 'vacation', 'train', 'flight', 'book', 'celebrate', 'default',
  // 導覽
  'today', 'calendar', 'pin', 'tasks', 'settings', 'reminders', 'search', 'subscription', 'inventory',
  // 通用
  'close', 'check', 'user', 'sun', 'cloudSun', 'moon', 'cloud', 'clock', 'card', 'receipt', 'plus', 'minus', 'recurring',
  // 記帳分類
  'food', 'clothing', 'housing', 'transport', 'education', 'leisure', 'stocks', 'loan', 'insurance', 'box',
  // 庫存分類
  'toothbrush', 'lotion', 'pencil', 'fridge', 'jar', 'tag',
  // 地點分類
  'dessert', 'cafe', 'drinks', 'clinic', 'convenience', 'bookstore', 'park', 'attraction', 'school', 'market',
] as const
export type IconName = (typeof ICON_NAMES)[number]
