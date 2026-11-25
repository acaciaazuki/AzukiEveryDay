import type { ReactNode } from 'react'
import { ICON_NAMES, type IconName } from '../core/icons'

/**
 * ACACIA 圖示庫：日系療癒軟粉彩風格。
 * - 全部 viewBox 0 0 24 24，線條 1.75、圓頭圓角，線色用 currentColor（可用文字色改色）
 * - 內部用低飽和高明度的粉彩局部填色，不用純黑白生硬線條
 * - 尺寸預設 1.6em：跟著字體大小（設定裡的 小／標準／大／特大）等比縮放
 */
const SW = 1.75

const ART: Record<IconName, ReactNode> = {
  // ---- 時間軸生活插畫 ----
  wake: (
    <>
      <circle cx="6.2" cy="6.4" r="2.3" fill="#f7b7a3" />
      <circle cx="17.8" cy="6.4" r="2.3" fill="#f7b7a3" />
      <circle cx="12" cy="13.4" r="7" fill="#fff1c1" />
      <path d="M12 9.8v3.8l2.4 1.4" />
      <path d="M8 20.4l-1.3 1.2M16 20.4l1.3 1.2" />
    </>
  ),
  sleep: (
    <>
      <path d="M3 18.5V8.5M3 15h18v3.5M21 15v-2.5a3 3 0 0 0-3-3h-7V15" fill="#e4dbfa" />
      <rect x="5" y="9.6" width="4.4" height="3.4" rx="1.7" fill="#fff7dc" />
      <path d="M17.2 3.2a2.8 2.8 0 1 0 2.4 4.2 3.4 3.4 0 0 1-2.4-4.2z" fill="#ffe08a" />
    </>
  ),
  study: (
    <>
      <path d="M9 6V5a3 3 0 0 1 6 0v1" />
      <path d="M5.5 9a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v9.5a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5z" fill="#c9ebd9" />
      <rect x="8.6" y="12.4" width="6.8" height="5" rx="1.6" fill="#fff7dc" />
      <path d="M9.4 9.6h5.2" />
    </>
  ),
  work: (
    <>
      <path d="M9 8V6.4A1.4 1.4 0 0 1 10.4 5h3.2A1.4 1.4 0 0 1 15 6.4V8" />
      <rect x="3.5" y="8" width="17" height="11.5" rx="2.6" fill="#cfe4f6" />
      <path d="M3.5 12.8h17" />
      <rect x="10.4" y="11.2" width="3.2" height="3.2" rx="1" fill="#fff7dc" />
    </>
  ),
  rest: (
    <>
      <path d="M7.5 18.5a4.2 4.2 0 0 1-.4-8.4 5.4 5.4 0 0 1 10.3 1.1 3.7 3.7 0 0 1-.4 7.3z" fill="#fdf0cf" />
      <path d="M9.6 12.4h3l-3 3.4h3M14.4 11h2.2l-2.2 2.5h2.2" />
    </>
  ),
  meal: (
    <>
      <path d="M7 3.5v6.2a2.2 2.2 0 0 0 4.4 0V3.5M9.2 3.5v17" fill="#ffd9d0" />
      <path d="M17.6 20.5v-17c-2.4 1-3.6 3.6-3.6 6.8 0 1.5.9 2.2 2 2.2h1.6" fill="#ffd9d0" />
    </>
  ),
  shopping: (
    <>
      <path d="M2.8 4h2.4l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8a1.5 1.5 0 0 0 1.5-1.1l1.6-6.2H6.2" fill="#cfeadb" />
      <circle cx="9.4" cy="19.2" r="1.5" fill="#fff7dc" />
      <circle cx="16.6" cy="19.2" r="1.5" fill="#fff7dc" />
    </>
  ),
  exercise: (
    <>
      <path d="M3.2 17.6v-6.4l3.6.6 1.6-2.6 2.3 1.5c1.2 1.2 2.7 1.9 4.4 2.3 2.4.5 4.3 1.2 5 2.6.4.9.3 2-.9 2z" fill="#c9ebe6" />
      <path d="M3.2 17.6h16.9M10.2 11.2l1.2 1.1M12.6 12.4l1.2 1" />
      <path d="M3.2 14.6h4" />
    </>
  ),
  health: (
    <>
      <path d="M9 8V6.4A1.4 1.4 0 0 1 10.4 5h3.2A1.4 1.4 0 0 1 15 6.4V8" />
      <rect x="3.5" y="8" width="17" height="11.5" rx="2.8" fill="#fbd3d0" />
      <path d="M12 11.2v5.2M9.4 13.8h5.2" />
    </>
  ),
  vacation: (
    <>
      <circle cx="18.4" cy="5.6" r="2.3" fill="#ffe08a" />
      <path d="M2.8 20.6c2.8-1.7 5.8-2.5 9.2-2.5s6.4.8 9.2 2.5z" fill="#ffe9c4" />
      <path d="M10.4 18.2c.4-3.6-.1-6.8-1.4-9.6" />
      <path d="M9 8.6C7.8 6 5.2 4.9 2.9 5.9c2.3.4 4.2 1.3 6.1 2.7zM9 8.6c.5-2.7 2.8-4.6 5.6-4.4-2 1-3.8 2.5-5.6 4.4zM9 8.6c2.7-.5 5.3.6 6.4 2.9-2-.8-4.2-1.7-6.4-2.9zM9 8.6c-2.4.3-4.3 2.1-4.6 4.5 1.3-1.7 2.9-3.2 4.6-4.5z" fill="#cdeccf" />
    </>
  ),
  // 慶祝：派對拉炮、彩帶與紙花
  celebrate: (
    <>
      <path d="M3.6 20.4l4.3-11.6 7.3 7.3z" fill="#ffd98a" />
      <path d="M6.4 12.8l4.8 4.8M5.1 16.4l2.5 2.5" />
      <path d="M12.6 8.4c.3-2.1 1.9-3.4 3.9-3.2" />
      <path d="M15.6 11.4c1.9-.7 3.7-.1 4.7 1.4" />
      <path d="M11.4 4.2l.6-1.4" />
      <circle cx="18.9" cy="3.9" r="1.3" fill="#f7b7a3" />
      <circle cx="20.4" cy="8.4" r="1" fill="#cdeccf" />
      <circle cx="8.3" cy="4.6" r="1" fill="#cfe4f6" />
      <path d="M17.6 16.6l1.2.9-.4 1.4" />
    </>
  ),
  train: (
    <>
      <rect x="5.4" y="3.4" width="13.2" height="14.2" rx="3.6" fill="#cfe4f6" />
      <rect x="7.8" y="6.2" width="8.4" height="4.8" rx="1.4" fill="#fff7dc" />
      <circle cx="9.1" cy="14.2" r=".9" fill="#fff7dc" />
      <circle cx="14.9" cy="14.2" r=".9" fill="#fff7dc" />
      <path d="M8.6 17.6l-2 3M15.4 17.6l2 3M7.6 19.6h8.8" />
    </>
  ),
  flight: (
    <>
      <path d="M20.6 3.4c-.9-.9-2.3-.7-3.2.2l-3.5 3.5-8.3-2.3-1.8 1.8 6.6 3.9-3.3 3.3-2.6-.4-1.4 1.4 3.4 1.8 1.8 3.4 1.4-1.4-.4-2.6 3.3-3.3 3.9 6.6 1.8-1.8-2.3-8.3 3.5-3.5c.9-.9 1.1-2.3.2-3.2z" fill="#dcecf8" />
      <path d="M15.6 8.4l1.4-1.4" strokeWidth="1.4" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.6C10 5.2 7.2 4.8 3.5 5.2v13.2c3.7-.4 6.5 0 8.5 1.4 2-1.4 4.8-1.8 8.5-1.4V5.2c-3.7-.4-6.5 0-8.5 1.4z" fill="#ffe3c4" />
      <path d="M12 6.6v13.2" />
      <path d="M6.2 9.6c1.4-.1 2.6.1 3.6.6M6.2 12.8c1.4-.1 2.6.1 3.6.6M14.2 10.2c1-.5 2.2-.7 3.6-.6" strokeWidth="1.4" />
      <path d="M15.4 4.9v5.4l1.3-1 1.3 1V4.8" fill="#f7b7a3" strokeWidth="1.4" />
    </>
  ),
  default: (
    <>
      <rect x="4" y="5.4" width="16" height="14.6" rx="3" fill="#dff2e9" />
      <path d="M4 10h16M8.4 3.6v3.4M15.6 3.6v3.4" />
      <path d="M12 12.2l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#ffe08a" strokeWidth="1.4" />
    </>
  ),

  // ---- 導覽 ----
  today: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="#dff2e9" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" fill="#dff2e9" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <circle cx="8.2" cy="14" r=".6" />
      <circle cx="12" cy="14" r=".6" />
      <circle cx="15.8" cy="14" r=".6" />
      <circle cx="8.2" cy="17.2" r=".6" />
      <circle cx="12" cy="17.2" r=".6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="#fbd3d0" />
      <circle cx="12" cy="10" r="2.4" fill="#fff7dc" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.2" fill="#dff2e9" />
      <path d="M8.4 12.3l2.5 2.5 4.8-5.2" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2.6" fill="#ffe9b0" />
      <circle cx="15" cy="17" r="2.6" fill="#c9ebd9" />
    </>
  ),
  reminders: (
    <>
      <path d="M9 6V5a3 3 0 0 1 6 0v1" />
      <path d="M5.5 9a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v9.5a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5z" fill="#ffe9b0" />
      <path d="M12 11.2v3.4M12 17v.1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.6" cy="10.6" r="6.4" fill="#eaf6ef" />
      <path d="M15.4 15.4L20 20" />
    </>
  ),
  subscription: (
    <>
      <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3M4.5 12a7.5 7.5 0 0 1 12.8-5.3" />
      <path d="M17.6 3.6v3.2h-3.2M6.4 20.4v-3.2h3.2" />
      <rect x="8.2" y="9.2" width="7.6" height="5.6" rx="1.4" fill="#ffe9b0" />
      <path d="M8.2 11.2h7.6" />
    </>
  ),
  inventory: (
    <>
      <rect x="3.5" y="11" width="8" height="8.5" rx="1.8" fill="#cfeadb" />
      <rect x="12.5" y="11" width="8" height="8.5" rx="1.8" fill="#fff1c1" />
      <rect x="8" y="3.5" width="8" height="7.5" rx="1.8" fill="#e4dbfa" />
      <path d="M10.6 3.5v2.6h2.8V3.5M6.1 11v2.6h2.8V11M15.1 11v2.6h2.8V11" />
    </>
  ),

  // ---- 通用 ----
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />,
  user: (
    <>
      <circle cx="12" cy="8.6" r="3.8" fill="#fff1c1" />
      <path d="M4.6 20c.6-3.7 3.4-5.6 7.4-5.6s6.8 1.9 7.4 5.6z" fill="#c9ebd9" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" fill="#ffe08a" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </>
  ),
  cloudSun: (
    <>
      <circle cx="9" cy="8.6" r="3.6" fill="#ffe08a" />
      <path d="M9 2.4v1M2.8 8.6h1M4.6 4.2l.7.7M13.4 4.2l-.7.7" />
      <path d="M8 19.8a3.8 3.8 0 0 1-.3-7.6 4.9 4.9 0 0 1 9.4 1 3.3 3.3 0 0 1-.3 6.6z" fill="#e8f3fb" />
    </>
  ),
  moon: <path d="M19 14.6A7.8 7.8 0 0 1 9.4 5a7.8 7.8 0 1 0 9.6 9.6z" fill="#e4dbfa" />,
  cloud: <path d="M7.4 18.4a4.1 4.1 0 0 1-.4-8.2 5.4 5.4 0 0 1 10.3 1.1 3.55 3.55 0 0 1-.3 7.1z" fill="#e8f3fb" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="#fff1c1" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3" fill="#cfe4f6" />
      <path d="M3 10h18" />
      <rect x="6" y="13.2" width="4.4" height="2.4" rx="1" fill="#fff7dc" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  minus: <path d="M6 12h12" />,
  /** 週期固定支出：日曆上一圈循環箭頭 */
  recurring: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3.5" fill="#e3f1ea" />
      <path d="M8 3.5v3M16 3.5v3" />
      <path d="M15.6 11.4a3.8 3.8 0 0 0-6.9-.6M8.4 15a3.8 3.8 0 0 0 6.9.6" />
      <path d="M15.8 9.2v2.3h-2.3M8.2 17.2v-2.3h2.3" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" fill="#fff1c1" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </>
  ),

  // ---- 記帳分類 ----
  food: (
    <>
      <path d="M4 11.5h16a8 8 0 0 1-16 0z" fill="#ffd9d0" />
      <path d="M8.6 19.6h6.8M14 3.4l4.2 6M17 3.4l1.4 6" />
    </>
  ),
  clothing: <path d="M8.6 4.4L3.4 7.2l2 4 2-.9V20h9.2v-9.9l2 .9 2-4-5.2-2.8a3.5 3.5 0 0 1-6.8 0z" fill="#ffe0e8" />,
  housing: (
    <>
      <path d="M4 11.2L12 4l8 7.2V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" fill="#d4ebd0" />
      <rect x="9.8" y="13.4" width="4.4" height="7.1" rx="1.2" fill="#fff7dc" />
    </>
  ),
  transport: (
    <>
      <path d="M4 14.5V10l2-4.2A2 2 0 0 1 7.8 4.6h8.4a2 2 0 0 1 1.8 1.2L20 10v4.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="#cfe4f6" />
      <path d="M4 10h16M7 15.5v2.2M17 15.5v2.2" />
      <circle cx="8" cy="12.9" r=".5" />
      <circle cx="16" cy="12.9" r=".5" />
    </>
  ),
  education: (
    <>
      <path d="M5 5.6A1.6 1.6 0 0 1 6.6 4H18.5v14H6.6A1.6 1.6 0 0 0 5 19.6z" fill="#e4dbfa" />
      <path d="M5 19.6A1.6 1.6 0 0 1 6.6 18H18.5v2.4H6.6A1.6 1.6 0 0 1 5 19.6z" fill="#fff7dc" />
      <path d="M9 8.2h6" />
    </>
  ),
  leisure: (
    <>
      <path d="M7.4 7.6h9.2a4.4 4.4 0 0 1 4.3 3.7l.5 3.4a2.4 2.4 0 0 1-4.2 1.9l-1.2-1.5H8l-1.2 1.5a2.4 2.4 0 0 1-4.2-1.9l.5-3.4a4.4 4.4 0 0 1 4.3-3.7z" fill="#fbd3df" />
      <path d="M8 10.4v3M6.5 11.9h3M15.6 11.2h.1M17.6 12.8h.1" />
    </>
  ),
  stocks: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="3.5" fill="#d4ebd0" />
      <path d="M7 15l3.4-3.6 2.6 2.4L17 9.2M14 9.2h3v3" />
    </>
  ),
  loan: (
    <>
      <path d="M3.5 9.6L12 4l8.5 5.6z" fill="#ffe9b0" />
      <path d="M5.5 11.6v6M9.8 11.6v6M14.2 11.6v6M18.5 11.6v6M3.5 20h17" />
    </>
  ),
  insurance: (
    <>
      <path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6.3z" fill="#cdeae6" />
      <path d="M12 15.6s-3.2-1.9-3.2-4.1a1.7 1.7 0 0 1 3.2-.8 1.7 1.7 0 0 1 3.2.8c0 2.2-3.2 4.1-3.2 4.1z" fill="#fbd3df" />
    </>
  ),
  box: (
    <>
      <path d="M4 8.2L12 4l8 4.2v8.6L12 21l-8-4.2z" fill="#e6ecef" />
      <path d="M4 8.2L12 12.4l8-4.2M12 12.4V21" />
    </>
  ),

  // ---- 庫存分類（居家＝housing、廚房＝meal、健康＝health、其他＝box 共用上面的圖） ----
  toothbrush: (
    <>
      <rect x="10.2" y="9.5" width="3.6" height="11.5" rx="1.8" fill="#cfe4f6" />
      <path d="M9.6 3v5.6h4.8V3" fill="#fff7dc" />
      <path d="M11.2 3v4M12.8 3v4" />
    </>
  ),
  lotion: (
    <>
      <path d="M10 3.5h4M12 3.5v3.2M9.6 6.7h4.8" />
      <rect x="7" y="8.5" width="10" height="12" rx="3" fill="#fbd8e6" />
      <rect x="9.4" y="12" width="5.2" height="4.4" rx="1.2" fill="#fff7dc" />
    </>
  ),
  pencil: (
    <>
      <path d="M15.6 4.4l4 4L9 19l-5 1 1-5z" fill="#fff1c1" />
      <path d="M13.2 6.8l4 4M5 15l4 4" />
    </>
  ),
  fridge: (
    <>
      <rect x="6" y="2.8" width="12" height="18.4" rx="2.6" fill="#d6eff6" />
      <path d="M6 9.4h12M9.2 5.2v2M9.2 12.2v2.6" />
      <path d="M14.4 13.4v4.4M12.5 14.5l3.8 2.2M12.5 16.7l3.8-2.2" />
    </>
  ),
  jar: (
    <>
      <rect x="7.6" y="3" width="8.8" height="3.2" rx="1.2" fill="#f4cf8e" />
      <path d="M8.2 6.2C6.6 7.4 6 8.8 6 10.6v7.4a2.6 2.6 0 0 0 2.6 2.6h6.8A2.6 2.6 0 0 0 18 18v-7.4c0-1.8-.6-3.2-2.2-4.4z" fill="#fff4dc" />
      <rect x="8.8" y="11.4" width="6.4" height="4.6" rx="1.2" fill="#fbe1ae" />
    </>
  ),
  tag: (
    <>
      <path d="M3.6 12.4V4.8a1.2 1.2 0 0 1 1.2-1.2h7.6l8 8a1.6 1.6 0 0 1 0 2.3l-6.3 6.3a1.6 1.6 0 0 1-2.3 0z" fill="#e3f1e8" />
      <circle cx="8.2" cy="8.2" r="1.6" fill="#fff" />
    </>
  ),

  // ---- 地點分類（餐廳＝meal、衣著＝clothing、其他＝pin 共用上面的圖） ----
  dessert: (
    <>
      <path d="M4 18.5V12l16-4.5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="#fbe0f5" />
      <path d="M4 14.4h16" />
      <circle cx="9" cy="6.2" r="1.7" fill="#f7b7a3" />
      <path d="M9 4.5V3.4" />
    </>
  ),
  cafe: (
    <>
      <path d="M9 3.4c-.8 1 .8 1.6 0 2.7M13 3.4c-.8 1 .8 1.6 0 2.7" />
      <path d="M5 9h11v5.2A4.8 4.8 0 0 1 11.2 19H9.8A4.8 4.8 0 0 1 5 14.2z" fill="#f2dcc6" />
      <path d="M16 10.2h1.4a2.2 2.2 0 0 1 0 4.4H16M4 21h13" />
    </>
  ),
  drinks: (
    <>
      <path d="M12.8 3.2l1.2 4.4M6 8h12l-1.3 11.2a1.8 1.8 0 0 1-1.8 1.6H9.1a1.8 1.8 0 0 1-1.8-1.6z" fill="#d6ecf7" />
      <path d="M6.6 12.4h10.8" />
      <circle cx="10" cy="16.2" r=".7" fill="currentColor" />
      <circle cx="13.2" cy="17.2" r=".7" fill="currentColor" />
      <circle cx="14.4" cy="14.6" r=".7" fill="currentColor" />
    </>
  ),
  clinic: (
    <>
      <path d="M4 20V9.4a2 2 0 0 1 1.2-1.8L12 4.4l6.8 3.2A2 2 0 0 1 20 9.4V20z" fill="#dbeafb" />
      <path d="M12 9.4v5M9.5 11.9h5M10 20v-3h4v3" />
    </>
  ),
  convenience: (
    <>
      <path d="M3.5 9.6L5 4.6h14l1.5 5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-3.5 0 2.5 2.5 0 0 1-3.5 0 2.5 2.5 0 0 1-5-0z" fill="#d4ebd0" />
      <path d="M5.2 12v8h13.6v-8" />
      <rect x="9.8" y="14.4" width="4.4" height="5.6" rx="1" fill="#fff7dc" />
    </>
  ),
  bookstore: (
    <>
      <path d="M12 6.2C10.2 4.8 7.6 4.4 4.5 4.8V18c3.1-.4 5.7 0 7.5 1.4 1.8-1.4 4.4-1.8 7.5-1.4V4.8c-3.1-.4-5.7 0-7.5 1.4z" fill="#fff1c1" />
      <path d="M12 6.2v13.2" />
    </>
  ),
  park: (
    <>
      <path d="M12 3.6a5.4 5.4 0 0 0-4.8 7.8A4.4 4.4 0 0 0 9 14.8h6a4.4 4.4 0 0 0 1.8-3.4A5.4 5.4 0 0 0 12 3.6z" fill="#d4ebd0" />
      <path d="M12 14.8v6M9.4 20.8h5.2" />
    </>
  ),
  attraction: (
    <>
      <circle cx="12" cy="10.2" r="6.4" fill="#ffe9d0" />
      <circle cx="12" cy="10.2" r="1.4" fill="#fff7dc" />
      <path d="M12 3.8v12.8M5.6 10.2h12.8M7.5 5.7l9 9M16.5 5.7l-9 9M6 21l6-7.2 6 7.2" />
    </>
  ),
  school: (
    <>
      <path d="M3.5 20V10.4L12 5l8.5 5.4V20z" fill="#e9dffb" />
      <path d="M12 5V3M12 3h3" />
      <rect x="9.6" y="14" width="4.8" height="6" rx="1.2" fill="#fff7dc" />
      <circle cx="12" cy="10.4" r="1.4" fill="#fff7dc" />
    </>
  ),
  market: (
    <>
      <path d="M3.6 10.4h16.8l-1.6 8.2a1.8 1.8 0 0 1-1.8 1.4H7a1.8 1.8 0 0 1-1.8-1.4z" fill="#ffe3c4" />
      <path d="M8 10.4l3-5.6M16 10.4l-3-5.6M9.4 13.6v3.4M12 13.6v3.4M14.6 13.6v3.4" />
    </>
  ),
}

/** 圖示本體。預設 1.25em 並跟字體縮放；要改大小可用 className（例如 size-6）。 */
export function Icon({ name, className = '', title, size }: { name: IconName; className?: string; title?: string; size?: number | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      data-icon-name={name}
      style={size == null ? undefined : { width: size, height: size }}
      className={`inline-block size-[1.6em] shrink-0 align-[-0.2em] ${className}`}
    >
      {title && <title>{title}</title>}
      {ART[name]}
    </svg>
  )
}

/** 粉彩圓形徽章：36px 並隨字體大小縮放（calc(36px × --fs)） */
export function IconBadge({ name, bg, className = '' }: { name: IconName; bg: string; className?: string }) {
  return (
    <span data-icon={name} className={`grid size-[calc(36px*var(--fs))] shrink-0 place-items-center rounded-full text-[#4f6b60] ${className}`} style={{ background: bg }}>
      <Icon name={name} className="size-[72%]" />
    </span>
  )
}

export { ICON_NAMES }
