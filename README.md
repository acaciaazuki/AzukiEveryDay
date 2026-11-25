# ACACIA Everyday：共享行事曆 × 個人記帳本

「你有幾件重要的事，還有足夠的空檔好好呼吸。」

- 正式網址：**https://azukieveryday.pages.dev**
- 原始碼：https://github.com/acaciaazuki/AzukiEveryDay
- 舊版 ACACIA Everyday（AcaciaEveryDay 專案）仍在 `acaciaeveryday.pages.dev` 獨立運作，兩邊資料不互通；舊版匯出的 JSON 可以在新版「設定 → 資料」匯入。

ACACIA Everyday 是一個沒有伺服器的生活工具：

- **行事曆**：月檢視與日時間軸，個人行事曆與多個「共享空間」可以疊加顯示。支援單日、跨日、跨午夜行程、批次建立、國定假日、色票與圖示，以及 30 天「最近刪除」。
- **共享空間**：在自己的 Google Drive 建立一個共用檔案，用 Email 邀請家人或朋友一起編輯行程。每個空間可以選擇「分享忙碌時段」，只把自己個人行程的時間區間（雜湊 ID，不含標題與備註）投射到空間裡。
- **個人記帳本**：依結算日（預設每月 10 號到下個月 9 號）切成一期一期，即時顯示收支、分類排行與佔比，可以自訂分類（例如「股票」「貸款」）。記帳只存在個人資料，永遠不會寫入共享空間。
- **設定**：Google 登入同步、自動備份（本機 7 份＋Drive 備份檔）、匯出／匯入 JSON、匯出 `.ics`（個人行事曆或指定共享空間）、語言、每週起始日、結算日、預設貨幣、國定假日國家、第三方授權清單、隱私權政策、刪除所有資料。
- **⌘K／Ctrl+K 全域搜尋**：同時搜尋個人行程、共享空間行程與記帳紀錄，選到後直接打開編輯。

## 技術棧

- React 19 + TypeScript + Vite，啟用 React Compiler
- React Router（SPA）：`/` 行事曆、`/ledger` 記帳本、`/settings` 設定、`/privacy` 隱私權政策
- Tailwind CSS v4（鼠尾草綠色系）、Radix UI（對話框）、cmdk（⌘K 搜尋）
- Zustand + persist：透過 `src/adapters/storage.ts` 轉接，實際讀寫一律走 `src/adapters/kv/`——網頁版存 IndexedDB，iOS App（Capacitor）存 `Library/acacia/` 的 JSON 檔
- Zod 4 驗證資料結構（`src/core/schema.ts`），`src/core/migrate.ts` 把舊版匯出檔轉成 schemaVersion 2
- Google Drive 同步：只用 `drive.file` 權限，ETag／If-Match 樂觀鎖，遇到 412 自動重試（`src/adapters/googleDriveSync.ts`）
- react-i18next：介面支援 6 種語言（繁體中文、日本語、English、한국어、Français、Deutsch）；隱私權政策為繁中／日／英三語，韓、法、德顯示英文版
- Vitest + Testing Library、oxlint

## 開發

```sh
npm install
npm run dev      # 本機開發
npx tsc -b       # 型別檢查
npm run lint     # oxlint
npm test         # 單元測試
npm run build    # 正式建置，輸出到 dist/
```

## 授權

Copyright © 2026 acaciaazuki

ACACIA Everyday 以 [GNU Affero General Public License v3.0 或更新版本](LICENSE)（`AGPL-3.0-or-later`）釋出，完整聲明見 [`NOTICE`](NOTICE)。

- 任何人都可以使用、研究、修改這份程式碼。
- 修改後再散布，或把修改後的版本架成網站／服務讓別人使用，必須：保留原作者的版權聲明、註明修改的地方、以同樣的 AGPL 授權公開完整原始碼。
- 本程式不提供任何擔保。

App 內「第三方授權清單」面板最上方也會顯示本 App 的授權、原始碼連結與 AGPL 全文（`src/components/AppLicense.tsx`）。`npm test` 會檢查 `package.json` 的 `license`、`LICENSE` 與畫面上的授權是否一致。使用的第三方套件各自保有原本的授權，見下一節。

## 第三方授權清單

側邊欄下方與設定頁「關於」區塊都有「第三方授權清單」小連結，列出所有套件的授權、版權聲明與授權全文。資料放在 `src/licenses/`，由腳本依 `package-lock.json` 與 `node_modules` 產生：

```sh
npm install
npm run licenses   # 重新產生 src/licenses/packages.json 與 texts.json
```

新增、移除或升級套件後要重跑並 commit 產生的檔案；`npm test`（CI 每個 PR 都會跑）會檢查資料是否過期，也會擋下隨網站發布的 GPL / AGPL 套件。腳本執行時會列出 GPL / AGPL、MPL 等需要注意的授權；隨網站發布的套件出現**新的授權類型**時，也會提醒評估是否要改 `LICENSES_VERSION`（請使用者重新同意）。

## 網站圖示（台灣相思樹）

Favicon、PWA 圖示、iOS 主畫面圖示、側邊欄 Logo、載入畫面與備份區塊的枝條，都由 `src/brand/acaciaArt.ts` 的向量形狀畫出來（React 元件直接 inline SVG，見 `src/components/BrandMark.tsx`）。改了形狀之後重新產生 `public/` 的圖檔與 `index.html` 的載入畫面：

```sh
npm run icons   # 需要 Playwright 的 Chromium（npx playwright install chromium）
```

`index.html` 與 `public/manifest.webmanifest` 裡的 `?v=`（瀏覽器快取版本）由圖示的向量內容算出（`iconVersion()`），`npm run icons` 會自動寫入，**不用手動加一**。`npm test` 會檢查 `public/` 的圖檔與 `?v=` 有沒有跟程式裡的形狀同步，改了形狀卻忘了重跑會失敗。

## 資料結構

| 檔案（Drive「ACACIA Everyday」資料夾） | 內容 | 誰看得到 |
| --- | --- | --- |
| `acacia_data_v2.json` | 個人行程、記帳紀錄、自訂分類、已加入的共享空間、設定 | 只有自己 |
| `acacia_backup_v2.json` | 最新一份自動備份 | 只有自己 |
| `acacia_space_<spaceId>.json` | 共享空間的名稱、行程與成員的忙碌時段 | 建立者與受邀成員 |

本機 store：`acacia-personal-v2`（個人主資料，`usePersonalStore`）、`acacia-spaces`（已加入空間的本機副本，`useSpacesStore`）、`acacia-backups`（快照，最多 7 份）。

核心邏輯都是純 TypeScript（`src/core/`），不依賴 React：

| 模組 | 用途 |
| --- | --- |
| `schema.ts` | 個人主資料、共享空間、行程、記帳、設定的 Zod 結構 |
| `merge.ts` | 逐筆 Last-Writer-Wins 合併、刪除標記、確定性 tie-break |
| `migrate.ts` | 舊版匯入（只留行程與記帳；舊分類轉代碼、不認得的分類註冊成自訂分類） |
| `trash.ts` | 30 天最近刪除，期滿轉成刪除標記 |
| `busyProjection.ts` | 忙碌時段投射（過去 7 天到未來 90 天，FNV 雜湊 ID，不含標題） |
| `ledgerCycle.ts` | 記帳結算週期（結算日 1～31 號，遇到小月自動夾到月底；以「分」整數加總） |
| `ics.ts` | 匯出 iCalendar（全天 exclusive DTEND、跨午夜進位、UTF-8 75 octets 摺行） |

## 同步與衝突處理

- **合併規則（`mergeAppData`、`mergeSpaceData`）：**每一筆紀錄依 `syncMeta.updatedAt` 比較，較新的勝出；刪除標記時間大於或等於修改時間時以刪除為準；時間完全相同時依內容排序 tie-break，合併 A、B 與合併 B、A 的結果一致。個人設定逐欄位比較。
- **刪除標記保留 180 天**（`TOMBSTONE_TTL_MS`），之後清掉；離線超過 180 天的裝置，刪掉的資料可能會再出現。
- **寫入：**先讀取雲端與 ETag，合併後用 `If-Match` 寫回；被別人搶先寫入（412）時以指數退避加隨機抖動重新讀取、合併、寫入。內容沒變時不寫。
- **同步協調器（`useCloudSyncCoordinator`）：**
  - 需要使用者已同意隱私權政策；iOS App 不啟動 Google 登入
  - 本機修改後 1.5 秒（debounce）上傳；上傳期間又有修改時，結束後再同步一次
  - 回到分頁（`visibilitychange`，15 秒冷卻）與恢復連線（`online`）時自動拉取雲端更新
  - 登入的帳號跟本機資料的帳號不同時，顯示 `account_mismatch`，由使用者決定要換帳號並清空本機資料，或登出
  - 單一共享空間遇到 403／404（被移除權限或檔案已刪除）時只標記在 `revokedSpaceIds`，不影響個人資料與其他空間
- **共享空間：**加入別人的空間時用 Google 檔案選擇器（Picker）選一次檔案，之後 `drive.file` 權限就能讀寫它。離開空間時會先撤除自己的忙碌時段再移除本機副本。

## 隱私權政策、自動備份與刪除資料

- 隱私權政策（繁中／日文／英文）全文在 `src/pages/privacy/policy.ts`，三種語言的章節與段落結構由測試檢查是否一致。改到儲存、同步或對外連線時要一起更新，並依 `src/core/consent.ts` 的說明處理 `PRIVACY_VERSION`（政策頁的「最後更新」直接沿用它，改版後使用者會被要求重新同意）。支援信箱是 **acacia.qiqi@gmail.com**（可用 `VITE_SUPPORT_EMAIL` 覆寫）。
- 使用前同意：第一次使用、或隱私權政策／第三方授權清單改版時，以全螢幕面板（`src/components/ConsentGate.tsx`）擋住整個 App；同意前不啟動 Google 登入、自動備份與同步。
- 自動備份：距上次超過 12 小時且資料有變動時建立快照（最多 7 份）；已登入時另外上傳到 Drive 的 `acacia_backup_v2.json`。匯入 JSON 與還原快照前都會先備份目前的資料。
- 最近刪除：刪除的行程先放 30 天，可以還原，之後自動轉成刪除標記。
- 刪除所有資料：已登入時刪除 Drive 上的個人檔、備份檔與自己建立的空間檔（別人建立的空間只離開），然後登出並清空本機資料（`src/store/deleteAllData.ts`）。

## 資料夾

```
scripts/      產生授權清單、網站圖示、國定假日資料的指令稿（npm run licenses / icons / holidays）
src/
  app/        路由與 Layout（桌面側欄 / 手機底部導覽）
  pages/      行事曆、記帳本、設定、隱私權政策
  components/ 共用元件與對話框
  hooks/      共用的 React hooks（同步協調器、假日、分類）
  store/      Zustand store（個人、共享空間、同步、備份、同意）
  core/       資料結構、合併、遷移、週期、匯出（純 TypeScript）
  adapters/   平台相關程式（Google 登入、Drive、kv/：IndexedDB 與 iOS 檔案儲存）
  brand/      網站圖示的向量圖（台灣相思樹）
  holidays/   打包進 App 的國定假日資料
  licenses/   第三方授權資料（npm run licenses 產生）
  i18n/       多語系設定與翻譯檔
  test/       測試用的假物件與設定
```

## 部署（Cloudflare Pages）

| 項目 | 值 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 環境變數 | `NODE_VERSION` = `22` |

`public/_redirects` 設定 SPA 路由。`public/_headers` 設定回應標頭（`src/app/headers.test.ts` 會檢查）：

- **安全：**`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options: DENY`、`Permissions-Policy`（`geolocation=()`、`microphone=()`、`camera=()` 等全部關閉）
- **Google 登入：**`Cross-Origin-Opener-Policy` 必須是 `same-origin-allow-popups`，改成 `same-origin` 會讓登入彈出視窗無法回傳結果
- **快取：**只有檔名含雜湊的 `/assets/*` 長期快取
- **CSP：**目前沒有設定。Google 登入、Picker、Drive API 與 Google 字型都會連外，要列出所有來源並實測後再加

### 環境變數與 Google Cloud 設定

| 變數 | 用途 |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | OAuth 用戶端 ID（沒設定時使用程式內建的 ID） |
| `VITE_GOOGLE_API_KEY` | Google Picker 用的 API 金鑰（加入共享空間需要） |
| `VITE_GOOGLE_APP_ID` | Google Cloud 專案編號（Picker 用來授權選到的檔案；沒設定時自動從 OAuth 用戶端 ID 的開頭擷取） |
| `VITE_SUPPORT_EMAIL` | 隱私權政策的支援信箱（預設 acacia.qiqi@gmail.com） |

- OAuth 同意畫面只需要 `drive.file` 與 `userinfo.profile` 兩個範圍
- 在 Google Cloud Console 啟用 Google Drive API 與 Google Picker API，API 金鑰限制在正式網址的 HTTP referrer
- 「已授權的 JavaScript 來源」加入正式網址 `https://azukieveryday.pages.dev`（不含結尾斜線），API 金鑰的 HTTP referrer 限制也加上同一網址；PR 預覽網址每次不同，預覽站無法登入屬正常現象

## iOS App（Capacitor）

網頁版之外，同一份程式可以用 [Capacitor](https://capacitorjs.com/) 包成 iOS App（設定在 `capacitor.config.ts`）。

### 資料存在哪裡

| 資料 | 網頁版 | iOS App |
|---|---|---|
| 個人主資料與共享空間副本 | IndexedDB | `Library/acacia/state/` 的 JSON 檔 |
| 主資料快照 | IndexedDB（acacia-backups） | `Library/acacia/backups/` |
| 使用條款同意紀錄 | IndexedDB（acacia-consent） | Preferences（UserDefaults） |

- iOS 不用 WebView 的 IndexedDB：系統空間不足時可能清掉 WebView 的網站資料
- 寫入時先寫暫存檔再改名，寫到一半當機也不會留下半個檔案；檔案損毀時另存成 `.corrupt-<時間>` 備查
- `Library/` 不會出現在「檔案」App，但會跟著 iPhone 的 iCloud 備份，換機時資料能跟著回來
- 第一次開啟 App 時，若 WebView 的 IndexedDB 有舊資料（早期測試版），會自動搬到檔案並刪掉舊資料，只做一次
- 程式只透過 `src/adapters/kv/` 與 `src/adapters/consentStorage.ts` 讀寫，store 與畫面不需要知道是哪一種

### 在 Mac 上建置

需要 Xcode。第一次：

```bash
npm install
npm run build
npx cap add ios
```

產生的 `ios/` 原生專案要 commit 進 repo。之後每次修改網頁程式：

```bash
npm run ios:sync
```

```bash
npm run ios:open
```

目前 iOS App 還不能用 Google 登入（Google 不允許在 App 內嵌的網頁做 OAuth，之後要改用原生登入外掛），所以 Drive 同步與雲端備份在 App 裡暫時無法使用；本機資料、快照與其他功能都正常。

App 內的處理（`isNativeApp()` 判斷）：

- 側邊欄與設定頁不顯示「Google 登入同步」按鈕，改成說明「只有本機資料與 iCloud 備份有效；需要 Google Drive 同步請改用網頁版」
- 自動備份的「Google Drive 備份槽」也改成說明資料只存在這台 iPhone、隨 iCloud 備份
- 啟動時不會嘗試 Google 登入

之後若要支援：評估 Capacitor 的原生 Google Sign-In 外掛（需要 Google Cloud 的 iOS 用戶端 ID 與 Xcode 設定），登入後沿用現有的 Drive 同步程式。

### App Store 隱私標示

隱私權政策第 4 節寫明 ACACIA 申報「不收集資料（Data Not Collected）」。填寫 App Store Connect 前逐項確認：

- [ ] 沒有追蹤、廣告、分析或當機回報 SDK
- [ ] 沒有自己的伺服器接收使用者資料：同步只寫使用者自己 Google Drive 裡由 ACACIA 建立的檔案
- [ ] 資料保留期間與政策一致：最近刪除 30 天（`TRASH_RETENTION_MS`）、刪除標記 180 天（`TOMBSTONE_TTL_MS`），兩者都在 `src/core/schema.ts`

## 從舊版搬資料

在「設定 → 資料」匯入舊版匯出的 JSON。只保留行程與記帳；舊版分類（例如「咖啡」）會轉成內建分類代碼，不認得的分類（例如「股票」「貸款」）自動註冊成自訂分類，舊版的待辦、最愛地點等已移除的功能會被忽略。
