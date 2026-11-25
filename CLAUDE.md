# 使用者規定（必須遵守）

- 所有給使用者看的文字一律使用**繁體中文（台灣）**，包含：最終回覆、工作過程中每一句說明與進度回報、提問、PR 標題與內文、commit 訊息、程式碼註解與測試名稱。
- 呼叫工具前後的簡短進度說明（例如「接著查看設定頁」「測試通過」）也一律用繁體中文，不可出現英文短句。
- 不得使用英文句子或簡體中文；程式碼、指令、檔名、套件名稱、API 名稱等專有名詞可保留原文。
- 用語採台灣慣用詞（例如：程式、檔案、資料、設定、預設、介面、伺服器、網路）。
- 發現自己用錯語言（例如寫出英文或簡體中文的句子）時，立即主動用繁體中文（台灣）重新說明，不要等使用者提醒。
- 每次回覆送出前，先檢查整段文字是否都是繁體中文（台灣）。

# 專案開發規定

## 產品定位

- ACACIA Everyday 是「共享行事曆 × 個人記帳本」：個人行事曆、共享空間（多人共用行事曆）、個人記帳本與設定。
- 正式網址 `https://azukieveryday.pages.dev`，原始碼 `https://github.com/acaciaazuki/AzukiEveryDay`；舊站 `acaciaeveryday.pages.dev` 屬於原專案，不要指向它。程式內需要本站網址時優先用 `window.location.origin` 動態取得。
- 沒有自己的伺服器。雲端只使用使用者自己的 Google Drive，權限限定 `drive.file`（不可改回 `drive.appdata` 或擴大範圍）：
  - `acacia_data_v2.json`：個人主資料；`acacia_backup_v2.json`：自動備份；`acacia_space_<spaceId>.json`：共享空間（建立者 Drive 中的共用檔）。
- 記帳紀錄與自訂分類只能存在個人主資料，絕不可寫入共享空間。
- 忙碌時段投射只能包含雜湊 ID、擁有者 ID／顯示名稱與時間範圍，不可帶入行程標題、備註、顏色或原始行程 ID。
- 已移除的功能：今天、稍後辦、購物／庫存、最愛地點、地點搜尋 Proxy、定位權限、側邊欄排序；要加回前先跟使用者確認，並同步更新隱私權政策與 `_headers`。
- 核心邏輯（`src/core/`）保持純 TypeScript、不依賴 React；合併、垃圾桶、忙碌投射、記帳週期、.ics 的行為改動時要同步更新對應測試（`mergeAndMigrate`、`trashAndBusy`、`ledgerCycle`、`ics`）。

## 分支與合併

- 一律開分支、發 PR，不直接推送到 `main`。
- 沒有使用者明確指示「請合併」，不得自行合併 PR，也不得開啟自動合併。

## 推送前檢查

- 推送前必須全部通過：型別檢查（`npx tsc -b`）、`npm run lint`、`npm test`、`npm run build`。
- 有增減或升級套件時，執行 `npm run licenses` 並一起提交更新後的授權清單。
- 有修改網站圖示（`src/brand/`）時，執行 `npm run icons`。

## 同步修改的範圍

- 介面文字有新增或變更時，6 種語言檔（`src/i18n/locales/` 的 zh-TW、ja、en、ko、fr、de）都要同步更新，不可留空或漏譯。
- 儲存、同步或對外連線有變更時，必須檢查三語隱私權政策（`src/pages/privacy/policy.ts`）是否需要一起更新；內容有變更時依 `src/core/consent.ts` 的說明處理 `PRIVACY_VERSION`。
- 資料儲存（主資料、快照、同意紀錄）一律透過 `src/adapters/kv/` 與 `src/adapters/consentStorage.ts` 讀寫（網頁版 IndexedDB、iOS App 檔案），store 與畫面不直接碰 IndexedDB 或 Capacitor。
- 語言、字體大小、最近搜尋這類小偏好可以用 localStorage，但 key 必須以 `acacia` 開頭（「刪除所有資料」靠這個前綴清除）。
