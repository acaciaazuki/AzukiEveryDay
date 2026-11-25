/**
 * 隱私權政策全文（繁中／日文／英文）。
 * 內容依程式碼實際行為撰寫：改到儲存、同步或第三方服務時，記得一起更新這裡，並依 src/core/consent.ts 的說明處理 PRIVACY_VERSION
 * （UPDATED_DATE 直接沿用它，使用者也會因此被要求重新同意）。
 * 三種語言的章節與段落結構必須一致（src/components/PrivacyDialog.test.tsx 會檢查）。
 * 段落中的網址與 {email} 會自動變成連結。
 */

import { PRIVACY_VERSION } from '../../core/consent'

/** 支援信箱（也可以用環境變數 VITE_SUPPORT_EMAIL 覆寫） */
export const CONTACT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? 'acacia.qiqi@gmail.com'
export const EFFECTIVE_DATE = '2026-11-25'
/** 最後更新日期＝同意紀錄用的政策版本（src/core/consent.ts 的 PRIVACY_VERSION），只要改那裡一處 */
export const UPDATED_DATE = PRIVACY_VERSION

export type PolicyBlock = string | { list: string[] } | { sub: string }
export interface PolicySection {
  id: string
  heading: string
  blocks: PolicyBlock[]
}
export interface PolicyDoc {
  title: string
  eyebrow: string
  dates: { effective: string; updated: string }
  toc: string
  summaryTitle: string
  summary: string[]
  sections: PolicySection[]
}

export type PolicyLang = 'zh-TW' | 'ja' | 'en'

const zhTW: PolicyDoc = {
  title: '隱私權政策',
  eyebrow: '你的資料，留在你身邊',
  dates: { effective: '生效日期：', updated: '最後更新：' },
  toc: '目錄',
  summaryTitle: '重點摘要',
  summary: [
    '不需要註冊帳號也能完整使用。你的資料預設只存在這台裝置的瀏覽器裡（IndexedDB）。',
    '開啟 Google 雲端同步後，資料只會存進「你自己」Google Drive 裡由 ACACIA 建立的檔案（drive.file 權限）。我們沒有伺服器或資料庫保存你的資料，也看不到你的資料。',
    '記帳本只存在你的個人資料裡，永遠不會出現在共享空間。共享空間是你 Drive 裡的一個共用檔案，只有你邀請的成員看得到；分享到空間的「忙碌時段」只有雜湊 ID 與時間範圍，不含行程標題或備註。',
    '不使用定位、不放廣告、不使用任何分析或追蹤工具、不販售或分享你的資料。',
    '你隨時可以匯出 JSON 或 .ics、從自動備份還原，或在設定頁一鍵刪除所有本機與雲端資料。',
  ],
  sections: [
    {
      id: 'scope',
      heading: '1. 適用範圍',
      blocks: [
        '本隱私權政策說明 ACACIA Everyday（以下稱「本服務」或「ACACIA」）的開發與營運者（以下稱「我們」）如何處理你在使用本服務時的資料。本政策適用於網頁版（https://acaciaeveryday.pages.dev）以及 iOS App。',
        '我們依中華民國《個人資料保護法》處理個人資料，並參考歐盟一般資料保護規則（GDPR）、Apple App Store 審核準則與 Google API 服務使用者資料政策的要求撰寫本政策。',
      ],
    },
    {
      id: 'collect',
      heading: '2. 我們處理哪些資料',
      blocks: [
        { sub: '2.1 帳號資訊（僅在你選擇使用 Google 登入時）' },
        '登入是選用功能，只用於雲端同步與共享空間。登入時本服務透過 Google OAuth 向 Google 取得下列權限：',
        {
          list: [
            '基本個人資料（userinfo.profile）：你的 Google 帳號 ID、姓名與大頭貼網址。帳號 ID 與姓名會存進你的資料，用來辨識目前登入的帳號（避免把兩個帳號的資料混在一起），以及在共享空間標示「誰建立、誰最後編輯」；大頭貼只用來在畫面上顯示。',
            'Google Drive 檔案權限（drive.file）：只能讀寫 ACACIA 自己建立的檔案，以及你在 Google 檔案選擇器中親自選取的共享空間檔案，無法看到你 Drive 裡的其他任何檔案。',
          ],
        },
        '本服務不會要求你的 Email 地址、通訊錄、行事曆或 Drive 中的其他檔案。登入取得的存取權杖（access token）存在瀏覽器的 sessionStorage，最長約一小時有效，關閉分頁或登出即刪除；登出時會一併向 Google 撤銷該權杖。',
        { sub: '2.2 你建立的內容' },
        '你在 ACACIA 中輸入的個人行程、記帳紀錄、自訂記帳分類、已加入的共享空間清單（含你自訂的空間別名與顏色），以及語言、每週起始日、記帳結算日、預設貨幣、國定假日的國家等設定。這些內容只用於提供本服務的功能。記帳紀錄與自訂分類只存在你的個人資料，不會寫入任何共享空間。',
        { sub: '2.3 共享空間' },
        {
          list: [
            '建立共享空間時，ACACIA 會在你的 Google Drive 建立一個 acacia_space_<空間 ID>.json 檔案。邀請成員時，你輸入的對方 Email 會傳給 Google Drive，用來把這個檔案以「編輯者」權限共用給對方，Google 會寄出共用通知信。ACACIA 本身不保存受邀者的 Email。',
            '空間裡的行程（標題、時間、備註、顏色等）以及建立者與最後編輯者的姓名，所有成員都看得到，並會同步到每位成員的裝置。',
            '你可以為某個空間開啟「分享忙碌時段」。忙碌時段只包含一個由行程 ID 雜湊產生的代號、你的帳號 ID 與顯示名稱，以及日期與時間範圍（過去 7 天到未來 90 天），不包含行程標題、備註、顏色或圖示。',
            '你離開空間時，App 會先撤除你在該空間的忙碌時段，再刪除這台裝置上的空間副本。空間檔案存在建立者的 Drive，由建立者決定是否刪除；建立者在 Drive 取消你的共用權限後，你就無法再讀取該空間。',
          ],
        },
        { sub: '2.4 裝置上的小型偏好設定' },
        '為了讓畫面一打開就套用你的偏好，語言、字體大小與最近的搜尋紀錄等會存在瀏覽器的 localStorage。這些資料不會傳出你的裝置。',
        { sub: '2.5 國家／地區與國定假日' },
        {
          list: [
            '顯示國定假日時，App 會依瀏覽器提供的時區與語言設定，在你的裝置上推測預設的國家／地區（例如時區為 Asia/Taipei 時預設台灣）。這只是預設值，不使用定位、不需要位置權限，推測結果也不會傳送出去。你可以在設定頁改選其他國家或關閉。',
            '假日資料已內建在 App 中（來源見第 4 節），顯示時不會連線到任何假日服務，也不會傳送國家、年份或其他資料。',
          ],
        },
        { sub: '2.6 我們不處理的資料' },
        '本服務沒有自己的帳號系統，不使用定位，也不收集使用分析、當機報告、廣告識別碼（IDFA 等）、裝置指紋、通訊錄、照片或健康資料。',
      ],
    },
    {
      id: 'storage',
      heading: '3. 資料儲存位置與傳輸安全',
      blocks: [
        { sub: '3.1 優先儲存在你的裝置' },
        {
          list: [
            '網頁版的主要資料與共享空間副本存在你瀏覽器的 IndexedDB；iOS App 則存在 App 自己的檔案區（Library 資料夾）。',
            '自動備份快照存在同一處的另一個儲存區，最多保留最近 7 份，較舊的自動刪除。',
            '小型偏好設定存在 localStorage；Google 存取權杖存在 sessionStorage（見 2.1）。',
          ],
        },
        { sub: '3.2 雲端同步：只存進你自己的 Google Drive' },
        '開啟 Google 登入同步後，ACACIA 會在你的 Google Drive 建立「ACACIA Everyday」資料夾，資料只會寫入其中由 ACACIA 建立的檔案，佔用的是你自己的 Drive 容量。使用的檔案如下：',
        {
          list: [
            'acacia_data_v2.json：你的個人資料（行程、記帳、分類、設定與已加入的空間清單）。只有你自己能存取。',
            'acacia_backup_v2.json：最新一份自動備份（每次自動備份時覆寫，不影響同步檔）。只有你自己能存取。',
            'acacia_space_<空間 ID>.json：你建立的共享空間，會共用給你邀請的成員（見 2.3）。',
          ],
        },
        { sub: '3.3 傳輸與加密' },
        {
          list: [
            '你的裝置與 Google 之間的所有連線都使用 HTTPS（TLS）加密傳輸，資料直接在你的裝置與 Google 之間往返，不經過我們的伺服器。',
            'ACACIA 本身不會對資料另外做端對端加密：本機資料以 JSON 格式存在瀏覽器或 App 中，受你的作業系統與瀏覽器保護；雲端檔案則依 Google 的安全措施儲存在你的 Drive。建議為裝置設定螢幕鎖，並避免在共用電腦上登入同步。',
          ],
        },
        { sub: '3.4 我們不持有你的資料' },
        '我們沒有任何伺服器或資料庫保存你的個人資料，無法存取、檢視、分析，也無法替你復原資料。請善用匯出 JSON 與自動備份功能保護你的資料。',
      ],
    },
    {
      id: 'third-party',
      heading: '4. 第三方服務',
      blocks: [
        '本服務只會在必要時與下列服務連線，各服務依其自己的隱私權政策處理資料：',
        {
          list: [
            'Google Identity Services（accounts.google.com）：只在你按下「Google 登入同步」時載入，用於登入與授權。',
            'Google OAuth 使用者資訊 API：登入後取得帳號 ID、姓名與大頭貼（見 2.1）。',
            'Google Drive API：讀寫你 Drive 中由 ACACIA 建立的檔案，以及邀請成員時設定共用權限（見 2.3、3.2）。',
            'Google 檔案選擇器（apis.google.com、docs.google.com）：只在你選擇「加入共享空間」時載入，讓你親自挑選別人共用給你的空間檔案。',
            'Google Fonts（fonts.googleapis.com、fonts.gstatic.com）：網頁載入字型時，你的瀏覽器會直接向 Google 下載字型檔，Google 因此會收到你的 IP 位址與瀏覽器資訊。',
            'Cloudflare Pages：網頁版的託管服務。如同一般網站，Cloudflare 可能為了安全與維運記錄連線資訊（例如 IP 位址、請求時間）。',
            '國定假日資料：台灣採用行政院人事行政總處「政府行政機關辦公日曆表」（政府資料開放平台），中國採用國務院辦公廳公告（經開源專案 holiday-cn 整理），韓國採用宇宙航空廳月曆要項（經開源專案 holidays-kr 整理），其他國家採用開源專案 date-holidays 依法定規則推算。這些資料在建置網站時就打包進 App，使用時不會連線到上述來源，因此不會有任何資料傳給它們。各來源的授權列在「第三方授權清單」。',
          ],
        },
        'Google 隱私權政策：https://policies.google.com/privacy',
        'Cloudflare 隱私權政策：https://www.cloudflare.com/privacypolicy/',
        { sub: '不使用廣告與追蹤' },
        '本服務不顯示廣告，不使用任何第三方廣告追蹤器、分析工具（例如 Google Analytics）或跨 App／跨網站追蹤，也不會出售、出租或分享你的資料給任何人。',
        { sub: 'App 隱私標示：不收集資料' },
        '依 Apple App Store「App 隱私」的定義，ACACIA 申報為「不收集資料（Data Not Collected）」：我們沒有自己的伺服器或資料庫，不會接收、保存或存取你的行程、記帳、聯絡資訊、使用紀錄或診斷資料；App 裡沒有任何追蹤、廣告或分析 SDK。你的資料只存在你的裝置，以及你自己選擇開啟同步時的 Google Drive。上面列出的第三方服務只用於即時完成你當下的操作（例如登入、讀寫你的 Drive），不會用來追蹤你或建立你的個人檔案。',
        { sub: 'Google API 有限使用聲明' },
        'ACACIA 使用與傳輸從 Google API 取得的資訊時，會遵守 Google API 服務使用者資料政策（https://developers.google.com/terms/api-services-user-data-policy），包括其中的有限使用（Limited Use）要求。從 Google 取得的資料只用於在 App 內提供同步、共享空間與顯示登入帳號的功能，不會用於廣告，也不會轉移給第三方或供人員閱讀。',
      ],
    },
    {
      id: 'retention',
      heading: '5. 資料保留期間',
      blocks: [
        {
          list: [
            '本機資料：保留到你在 App 內刪除、使用「刪除所有資料」或清除瀏覽器網站資料為止。',
            '自動備份快照：本機最多 7 份，超過時自動刪除最舊的一份；Drive 備份檔只保留最新一份。',
            '雲端檔案：保留在你的 Google Drive，直到你刪除（見第 6 節）。共享空間檔案保留在建立者的 Drive。',
            'Google 存取權杖：最長約一小時，關閉分頁或登出時刪除。',
            '最近刪除：刪除的行程會先放在「最近刪除」30 天，期間可以還原；滿 30 天後自動永久刪除（在 App 啟動或同步時執行，不需要任何伺服器）。',
            '同步用的刪除標記：刪除資料時，本機資料與同步檔會留下刪除標記，只記錄該筆資料的 ID 與刪除時間，不含任何內容，用來讓你的其他裝置與其他成員也跟著刪除；保留 180 天後自動清除。',
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '6. 你的權利與資料控制',
      blocks: [
        '依個人資料保護法及 GDPR，你可以查詢、閱覽、取得副本、更正、刪除你的資料，或停止處理。由於資料由你自己保管，這些權利大多可以直接在 App 內行使：',
        { sub: '6.1 查閱與匯出（資料可攜）' },
        '到「設定 → 資料」按「匯出 JSON」，即可下載完整個人資料的 JSON 檔，可再匯入 ACACIA 或其他工具。',
        '同一處也可以「匯出行事曆（.ics）」，把我的行事曆或某個共享空間的行程產生成標準 iCalendar 檔，匯入 Apple 行事曆、Google 日曆、Outlook 等 App。檔案在你的裝置上產生，不會經過任何伺服器。',
        { sub: '6.2 更正與還原' },
        '所有內容都可以直接在 App 內修改。誤刪行程可以從「最近刪除」還原；也可以在「設定 → 自動備份」選擇快照一鍵還原（還原前會先為目前的資料留一份快照）。',
        { sub: '6.3 刪除所有本機與雲端資料' },
        {
          list: [
            '（建議）先按「匯出 JSON」留一份備份。',
            '若要一併刪除雲端資料，先用 Google 登入同步。',
            '到「設定 → 刪除所有資料」，按「刪除所有資料」並確認。',
            '本服務會刪除你 Drive 中由 ACACIA 建立的個人檔、備份檔與你建立的共享空間檔，然後登出並撤銷授權，最後清除這台裝置上的所有資料、自動備份快照與偏好設定。別人建立的共享空間檔案不會被刪除。刪除後無法復原。',
          ],
        },
        '你也可以從 Google 端刪除或撤銷：在 Google Drive 刪除「ACACIA Everyday」資料夾；或到 Google 帳戶的「第三方應用程式與服務」（https://myaccount.google.com/connections）移除 ACACIA 的存取權。在其他裝置上的本機資料，需在該裝置上分別刪除，或清除瀏覽器的網站資料。',
        { sub: '6.4 撤回同意' },
        '你可以隨時登出 Google 停止同步、關閉某個空間的「分享忙碌時段」，或離開共享空間；關閉後相關功能會停止，其他功能不受影響。',
      ],
    },
    {
      id: 'children',
      heading: '7. 兒童隱私',
      blocks: ['本服務並非專為未滿 13 歲的兒童設計，我們也不會在知情的情況下收集兒童的個人資料。未成年人使用本服務前，應取得法定代理人的同意。'],
    },
    {
      id: 'changes',
      heading: '8. 政策修訂',
      blocks: ['我們可能因功能調整或法規變更修訂本政策。修訂後會更新本頁的「最後更新」日期；如有重大變更（例如資料用途或第三方服務改變），會在 App 內明顯處公告。繼續使用本服務即表示你同意修訂後的政策。'],
    },
    {
      id: 'contact',
      heading: '9. 聯絡我們',
      blocks: ['對本政策或你的資料有任何疑問、意見或請求，請來信：{email}。我們會盡快回覆。'],
    },
  ],
}

const ja: PolicyDoc = {
  title: 'プライバシーポリシー',
  eyebrow: 'あなたのデータは、あなたの手元に',
  dates: { effective: '施行日：', updated: '最終更新日：' },
  toc: '目次',
  summaryTitle: '要点',
  summary: [
    'アカウント登録なしですべての機能を使えます。データは初期状態ではこの端末のブラウザ（IndexedDB）にのみ保存されます。',
    'Google クラウド同期を有効にすると、データは「あなた自身の」Google ドライブ内で ACACIA が作成したファイルにのみ保存されます（drive.file 権限）。私たちはデータを保存するサーバーやデータベースを持たず、あなたのデータを見ることもできません。',
    '家計簿はあなたの個人データにのみ保存され、共有スペースに出ることはありません。共有スペースはあなたのドライブ上の共有ファイルで、招待したメンバーだけが見られます。スペースに共有する「予定あり」の時間帯は、ハッシュ化された ID と時間の範囲だけで、予定のタイトルやメモは含みません。',
    '位置情報は使わず、広告、アクセス解析、トラッキングツールも一切使用せず、データの販売や共有も行いません。',
    'いつでも JSON や .ics で書き出し、自動バックアップから復元、または設定画面から端末とクラウドのデータをまとめて削除できます。',
  ],
  sections: [
    {
      id: 'scope',
      heading: '1. 適用範囲',
      blocks: [
        '本プライバシーポリシーは、ACACIA Everyday（以下「本サービス」または「ACACIA」）の開発・運営者（以下「私たち」）が、本サービスのご利用にあたりデータをどのように取り扱うかを説明するものです。Web 版（https://acaciaeveryday.pages.dev）および iOS アプリに適用されます。',
        '私たちは中華民国（台湾）の「個人資料保護法」に従って個人データを取り扱い、EU 一般データ保護規則（GDPR）、Apple App Store 審査ガイドライン、Google API サービスのユーザーデータに関するポリシーの要件を参考に本ポリシーを作成しています。',
      ],
    },
    {
      id: 'collect',
      heading: '2. 取り扱うデータ',
      blocks: [
        { sub: '2.1 アカウント情報（Google でログインした場合のみ）' },
        'ログインは任意で、クラウド同期と共有スペースにのみ使います。ログイン時、本サービスは Google OAuth を通じて次の権限を取得します。',
        {
          list: [
            '基本プロフィール（userinfo.profile）：Google アカウントの ID、名前、プロフィール画像の URL。アカウント ID と名前はあなたのデータに保存され、ログイン中のアカウントの識別（2 つのアカウントのデータが混ざらないようにするため）と、共有スペースで「作成者・最終編集者」を表示するために使います。プロフィール画像は画面表示にのみ使います。',
            'Google ドライブのファイル権限（drive.file）：ACACIA 自身が作成したファイルと、あなたが Google のファイル選択画面で自分で選んだ共有スペースのファイルだけを読み書きでき、ドライブ内のその他のファイルを見ることはできません。',
          ],
        },
        '本サービスがメールアドレス、連絡先、カレンダー、ドライブ内のその他のファイルを要求することはありません。ログインで取得したアクセストークンはブラウザの sessionStorage に保存され、有効期間は最長約 1 時間です。タブを閉じるかログアウトすると削除され、ログアウト時には Google 側でも無効化されます。',
        { sub: '2.2 あなたが作成したコンテンツ' },
        'ACACIA に入力した個人の予定、家計簿の記録、カスタムカテゴリ、参加中の共有スペースの一覧（独自の別名や色を含む）、および言語、週の始まり、締め日、既定の通貨、祝日の国などの設定です。これらは本サービスの機能を提供するためにのみ使います。家計簿の記録とカスタムカテゴリは個人データにのみ保存され、共有スペースに書き込まれることはありません。',
        { sub: '2.3 共有スペース' },
        {
          list: [
            '共有スペースを作成すると、ACACIA はあなたの Google ドライブに acacia_space_<スペース ID>.json ファイルを作成します。メンバーを招待すると、入力した相手のメールアドレスが Google ドライブに送られ、このファイルが「編集者」権限で共有され、Google から共有通知メールが送信されます。ACACIA 自体は招待した相手のメールアドレスを保存しません。',
            'スペース内の予定（タイトル、時間、メモ、色など）と、作成者・最終編集者の名前はすべてのメンバーに表示され、各メンバーの端末に同期されます。',
            'スペースごとに「予定ありの時間帯を共有」をオンにできます。予定ありの時間帯に含まれるのは、予定 ID をハッシュ化した識別子、あなたのアカウント ID と表示名、日付と時間の範囲（過去 7 日から今後 90 日）だけで、予定のタイトル、メモ、色、アイコンは含みません。',
            'スペースから退出すると、アプリはまずそのスペースからあなたの予定ありの時間帯を取り除き、その後この端末のスペースのコピーを削除します。スペースのファイルは作成者のドライブにあり、削除するかどうかは作成者が決めます。作成者がドライブで共有を解除すると、あなたはそのスペースを読めなくなります。',
          ],
        },
        { sub: '2.4 端末上の小さな設定' },
        '画面を開いてすぐに設定を反映するため、言語、文字サイズ、最近の検索履歴などはブラウザの localStorage に保存されます。これらが端末の外に送られることはありません。',
        { sub: '2.5 国・地域と祝日' },
        {
          list: [
            '祝日を表示するとき、アプリはブラウザのタイムゾーンと言語設定から、端末上で既定の国・地域を推測します（例：タイムゾーンが Asia/Tokyo なら日本）。これは既定値にすぎず、位置情報は使わず、位置情報の許可も不要で、推測結果が送信されることもありません。設定画面で別の国を選ぶか、オフにできます。',
            '祝日データはアプリに組み込まれており（出典は第 4 節）、表示時に祝日サービスへ接続したり、国や年などのデータを送信したりすることはありません。',
          ],
        },
        { sub: '2.6 取り扱わないデータ' },
        '本サービスは独自のアカウントシステムを持たず、位置情報を使わず、利用状況の解析、クラッシュレポート、広告識別子（IDFA など）、端末のフィンガープリント、連絡先、写真、健康データを収集しません。',
      ],
    },
    {
      id: 'storage',
      heading: '3. データの保存場所と通信の安全性',
      blocks: [
        { sub: '3.1 まずはあなたの端末に保存' },
        {
          list: [
            'Web 版の主なデータと共有スペースのコピーはブラウザの IndexedDB に、iOS アプリではアプリ専用のファイル領域（Library フォルダ）に保存されます。',
            '自動バックアップのスナップショットは同じ場所の別の保存領域に保存され、最新 7 件まで保持し、古いものは自動的に削除されます。',
            '小さな設定は localStorage に、Google のアクセストークンは sessionStorage に保存されます（2.1 参照）。',
          ],
        },
        { sub: '3.2 クラウド同期：あなた自身の Google ドライブにのみ保存' },
        'Google ログインで同期を有効にすると、ACACIA はあなたの Google ドライブに「ACACIA Everyday」フォルダを作成し、その中の ACACIA が作成したファイルにのみデータを書き込みます。使用するのはあなた自身のドライブ容量です。使用するファイルは次のとおりです。',
        {
          list: [
            'acacia_data_v2.json：あなたの個人データ（予定、家計簿、カテゴリ、設定、参加中のスペース一覧）。アクセスできるのはあなただけです。',
            'acacia_backup_v2.json：最新の自動バックアップ 1 件（自動バックアップのたびに上書きされ、同期ファイルには影響しません）。アクセスできるのはあなただけです。',
            'acacia_space_<スペース ID>.json：あなたが作成した共有スペース。招待したメンバーと共有されます（2.3 参照）。',
          ],
        },
        { sub: '3.3 通信と暗号化' },
        {
          list: [
            'あなたの端末と Google の間の通信はすべて HTTPS（TLS）で暗号化され、データは端末と Google の間で直接やり取りされ、私たちのサーバーを経由しません。',
            'ACACIA 自体はデータに独自のエンドツーエンド暗号化を行いません。端末上のデータは JSON 形式でブラウザまたはアプリに保存され、OS とブラウザによって保護されます。クラウドのファイルは Google のセキュリティ対策のもとであなたのドライブに保存されます。端末には画面ロックを設定し、共用パソコンでは同期にログインしないことをおすすめします。',
          ],
        },
        { sub: '3.4 私たちはあなたのデータを保持しません' },
        '私たちは個人データを保存するサーバーやデータベースを一切持たず、データへのアクセス、閲覧、分析、復元はできません。JSON の書き出しと自動バックアップでデータを守ってください。',
      ],
    },
    {
      id: 'third-party',
      heading: '4. 第三者サービス',
      blocks: [
        '本サービスは必要な場合にのみ次のサービスに接続します。各サービスはそれぞれのプライバシーポリシーに従ってデータを取り扱います。',
        {
          list: [
            'Google Identity Services（accounts.google.com）：「Google でログインして同期」を押したときにのみ読み込み、ログインと認可に使います。',
            'Google OAuth ユーザー情報 API：ログイン後にアカウント ID、名前、プロフィール画像を取得します（2.1 参照）。',
            'Google Drive API：ドライブ内の ACACIA が作成したファイルの読み書きと、メンバー招待時の共有設定に使います（2.3、3.2 参照）。',
            'Google ファイル選択画面（apis.google.com、docs.google.com）：「共有スペースに参加」を選んだときにのみ読み込み、共有されたスペースのファイルをあなた自身が選べるようにします。',
            'Google Fonts（fonts.googleapis.com、fonts.gstatic.com）：Web ページでフォントを読み込む際、ブラウザが Google から直接フォントをダウンロードするため、Google は IP アドレスとブラウザ情報を受け取ります。',
            'Cloudflare Pages：Web 版のホスティングサービスです。一般的な Web サイトと同様に、Cloudflare はセキュリティと運用のために接続情報（IP アドレス、リクエスト時刻など）を記録することがあります。',
            '祝日データ：台湾は行政院人事行政総処「政府行政機関辦公日曆表」（政府資料開放平台）、中国は国務院弁公庁の公告（オープンソースプロジェクト holiday-cn による整理）、韓国は宇宙航空庁の暦要項（オープンソースプロジェクト holidays-kr による整理）、その他の国はオープンソースプロジェクト date-holidays による法定ルールからの算出を使用しています。これらのデータはサイトのビルド時にアプリへ組み込まれ、利用時にこれらの提供元へ接続することはないため、データが送られることはありません。各提供元のライセンスは「サードパーティライセンス」に記載しています。',
          ],
        },
        'Google プライバシーポリシー：https://policies.google.com/privacy',
        'Cloudflare プライバシーポリシー：https://www.cloudflare.com/privacypolicy/',
        { sub: '広告・トラッキングは使用しません' },
        '本サービスは広告を表示せず、第三者の広告トラッカー、解析ツール（Google Analytics など）、アプリやサイトをまたいだトラッキングを一切使用せず、あなたのデータを誰かに販売、貸与、共有することもありません。',
        { sub: 'App のプライバシー：データの収集なし' },
        'Apple App Store の「App のプライバシー」の定義に基づき、ACACIA は「データの収集なし（Data Not Collected）」と申告しています。私たちは独自のサーバーやデータベースを持たず、予定、家計簿、連絡先情報、利用履歴、診断データを受け取ったり、保存したり、アクセスしたりしません。アプリにはトラッキング、広告、解析の SDK は一切含まれていません。データはあなたの端末と、あなたが同期を有効にした場合のあなたの Google ドライブにのみ存在します。上記の第三者サービスは、ログインやドライブの読み書きなど、その場の操作を完了するためにのみ使われ、あなたの追跡やプロファイル作成には使われません。',
        { sub: 'Google API の限定使用に関する開示' },
        'ACACIA が Google API から取得した情報を使用・転送する際は、限定使用（Limited Use）の要件を含む Google API サービスのユーザーデータに関するポリシー（https://developers.google.com/terms/api-services-user-data-policy）を遵守します。Google から取得したデータは、アプリ内で同期、共有スペース、ログイン中のアカウント表示の機能を提供するためにのみ使用し、広告には使用せず、第三者への転送や人による閲覧も行いません。',
      ],
    },
    {
      id: 'retention',
      heading: '5. データの保存期間',
      blocks: [
        {
          list: [
            '端末上のデータ：アプリ内で削除するか、「すべてのデータを削除」を使うか、ブラウザのサイトデータを消去するまで保持されます。',
            '自動バックアップのスナップショット：端末上は最大 7 件で、超えると最も古いものから自動的に削除されます。ドライブのバックアップファイルは最新 1 件のみ保持します。',
            'クラウドのファイル：削除するまであなたの Google ドライブに保持されます（第 6 節参照）。共有スペースのファイルは作成者のドライブに保持されます。',
            'Google のアクセストークン：最長約 1 時間で、タブを閉じるかログアウトすると削除されます。',
            '最近削除した項目：削除した予定はまず「最近削除した項目」に 30 日間置かれ、その間は復元できます。30 日を過ぎると自動的に完全に削除されます（アプリの起動時や同期時に実行され、サーバーは不要です）。',
            '同期用の削除マーカー：データを削除すると、端末のデータと同期ファイルに削除マーカーが残ります。記録するのはその項目の ID と削除日時だけで、内容は含みません。ほかの端末やほかのメンバーでも削除を反映するためのもので、180 日後に自動的に消去されます。',
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '6. あなたの権利とデータの管理',
      blocks: [
        '個人資料保護法および GDPR に基づき、あなたは自分のデータの照会、閲覧、写しの取得、訂正、削除、または処理の停止を求めることができます。データはあなた自身が管理しているため、これらの権利の多くはアプリ内で直接行使できます。',
        { sub: '6.1 閲覧と書き出し（データポータビリティ）' },
        '「設定 → データ」で「JSON を書き出す」を押すと、個人データ全体の JSON ファイルをダウンロードでき、ACACIA やほかのツールに読み込めます。',
        '同じ場所の「カレンダーを書き出す（.ics）」で、マイカレンダーまたは共有スペースの予定を標準の iCalendar ファイルとして作成し、Apple カレンダー、Google カレンダー、Outlook などに取り込めます。ファイルは端末上で作成され、サーバーを経由しません。',
        { sub: '6.2 訂正と復元' },
        'すべての内容はアプリ内で直接修正できます。誤って削除した予定は「最近削除した項目」から復元でき、「設定 → 自動バックアップ」でスナップショットを選んでワンタップで復元することもできます（復元前に現在のデータのスナップショットを残します）。',
        { sub: '6.3 端末とクラウドのデータをすべて削除' },
        {
          list: [
            '（推奨）まず「JSON を書き出す」でバックアップを残します。',
            'クラウドのデータも削除する場合は、先に Google でログインして同期します。',
            '「設定 → すべてのデータを削除」で「すべてのデータを削除」を押し、確認します。',
            '本サービスは、ドライブ内の ACACIA が作成した個人ファイル、バックアップファイル、あなたが作成した共有スペースのファイルを削除し、ログアウトして認可を取り消し、最後にこの端末のすべてのデータ、自動バックアップのスナップショット、設定を消去します。ほかの人が作成した共有スペースのファイルは削除されません。削除後は元に戻せません。',
          ],
        },
        'Google 側から削除・取り消しすることもできます。Google ドライブで「ACACIA Everyday」フォルダを削除するか、Google アカウントの「サードパーティ製のアプリとサービス」（https://myaccount.google.com/connections）で ACACIA のアクセス権を削除してください。ほかの端末にある端末上のデータは、その端末で個別に削除するか、ブラウザのサイトデータを消去する必要があります。',
        { sub: '6.4 同意の撤回' },
        'いつでも Google からログアウトして同期を止めたり、スペースの「予定ありの時間帯を共有」をオフにしたり、共有スペースから退出したりできます。オフにすると関連機能は停止しますが、ほかの機能には影響しません。',
      ],
    },
    {
      id: 'children',
      heading: '7. 子どものプライバシー',
      blocks: ['本サービスは 13 歳未満の子どもを対象としたものではなく、子どもの個人データを故意に収集することはありません。未成年の方は、法定代理人の同意を得てからご利用ください。'],
    },
    {
      id: 'changes',
      heading: '8. ポリシーの変更',
      blocks: ['機能の変更や法令の改正により、本ポリシーを改定することがあります。改定時は本ページの「最終更新日」を更新し、重要な変更（データの用途や第三者サービスの変更など）はアプリ内のわかりやすい場所でお知らせします。改定後も本サービスを利用し続けることで、改定後のポリシーに同意したものとみなされます。'],
    },
    {
      id: 'contact',
      heading: '9. お問い合わせ',
      blocks: ['本ポリシーやあなたのデータに関するご質問、ご意見、ご要望は {email} までご連絡ください。できるだけ早くお返事します。'],
    },
  ],
}

const en: PolicyDoc = {
  title: 'Privacy Policy',
  eyebrow: 'Your data stays with you',
  dates: { effective: 'Effective date: ', updated: 'Last updated: ' },
  toc: 'Contents',
  summaryTitle: 'At a glance',
  summary: [
    'You can use every feature without creating an account. By default your data is stored only in this device’s browser (IndexedDB).',
    'If you turn on Google cloud sync, your data is stored only in files that ACACIA creates in your own Google Drive (drive.file scope). We have no server or database that keeps your data, and we cannot see it.',
    'Your ledger lives only in your personal data and never appears in a shared space. A shared space is a shared file in your Drive that only the members you invite can see; the “busy” times you share with a space contain only a hashed ID and a time range, never event titles or notes.',
    'We do not use location, show ads, use analytics or tracking tools, or sell or share your data.',
    'You can export JSON or .ics at any time, restore from automatic backups, or delete all local and cloud data in one step from Settings.',
  ],
  sections: [
    {
      id: 'scope',
      heading: '1. Scope',
      blocks: [
        'This Privacy Policy explains how the developer and operator of ACACIA Everyday (“ACACIA”, the “Service”, “we”) handles data when you use the Service. It applies to the web app (https://acaciaeveryday.pages.dev) and to the iOS app.',
        'We handle personal data in accordance with the Personal Data Protection Act of Taiwan (R.O.C.), and wrote this policy with reference to the EU General Data Protection Regulation (GDPR), the Apple App Store Review Guidelines and the Google API Services User Data Policy.',
      ],
    },
    {
      id: 'collect',
      heading: '2. Data we handle',
      blocks: [
        { sub: '2.1 Account information (only if you sign in with Google)' },
        'Signing in is optional and is used only for cloud sync and shared spaces. When you sign in, the Service requests the following from Google through Google OAuth:',
        {
          list: [
            'Basic profile (userinfo.profile): your Google account ID, name and profile picture URL. The account ID and name are saved in your data to identify the signed-in account (so data from two accounts never gets mixed) and to show “created by / last edited by” in shared spaces; the picture is only shown on screen.',
            'Google Drive file access (drive.file): ACACIA can read and write only the files it created itself and the shared-space files you pick yourself in the Google file picker. It cannot see any other file in your Drive.',
          ],
        },
        'The Service never asks for your email address, contacts, calendars or other files in your Drive. The access token from signing in is kept in the browser’s sessionStorage, is valid for about one hour at most, and is deleted when you close the tab or sign out; signing out also revokes it with Google.',
        { sub: '2.2 Content you create' },
        'The personal events, ledger entries, custom ledger categories and list of joined shared spaces (including your own aliases and colours for them) that you enter in ACACIA, plus settings such as language, first day of the week, billing day, default currency and holiday country. This content is used only to provide the Service’s features. Ledger entries and custom categories are kept only in your personal data and are never written to any shared space.',
        { sub: '2.3 Shared spaces' },
        {
          list: [
            'When you create a shared space, ACACIA creates a file named acacia_space_<space ID>.json in your Google Drive. When you invite a member, the email address you enter is sent to Google Drive to share this file with them as an editor, and Google sends them a sharing notification. ACACIA itself does not keep invitees’ email addresses.',
            'Events in a space (title, time, note, colour and so on) and the names of their creator and last editor are visible to every member and synced to each member’s devices.',
            'You can turn on “share busy times” for a space. A busy slot contains only an identifier hashed from the event ID, your account ID and display name, and the date and time range (from 7 days ago to 90 days ahead). It never includes the event title, note, colour or icon.',
            'When you leave a space, the app first removes your busy slots from it and then deletes the copy on this device. The space file stays in its creator’s Drive, and the creator decides whether to delete it; once the creator stops sharing it in Drive, you can no longer read the space.',
          ],
        },
        { sub: '2.4 Small preferences on your device' },
        'So that your preferences apply as soon as the app opens, the language, font size, recent searches and similar preferences are kept in the browser’s localStorage. They never leave your device.',
        { sub: '2.5 Country/region and public holidays' },
        {
          list: [
            'When showing public holidays, the app guesses a default country/region on your device from the browser’s time zone and language settings (for example, a time zone of Europe/London defaults to the United Kingdom). This is only a default: it does not use location, needs no location permission, and the guess is never sent anywhere. You can choose another country or turn holidays off in Settings.',
            'Holiday data is built into the app (sources in Section 4), so showing holidays never contacts a holiday service or sends the country, year or any other data.',
          ],
        },
        { sub: '2.6 Data we do not handle' },
        'The Service has no account system of its own, does not use location, and does not collect usage analytics, crash reports, advertising identifiers (such as IDFA), device fingerprints, contacts, photos or health data.',
      ],
    },
    {
      id: 'storage',
      heading: '3. Where data is stored and how it is protected',
      blocks: [
        { sub: '3.1 Stored on your device first' },
        {
          list: [
            'On the web, your main data and copies of shared spaces are stored in the browser’s IndexedDB; in the iOS app they are stored in the app’s own file area (the Library folder).',
            'Automatic backup snapshots are stored in a separate area in the same place. The 7 most recent are kept and older ones are deleted automatically.',
            'Small preferences are kept in localStorage; the Google access token is kept in sessionStorage (see 2.1).',
          ],
        },
        { sub: '3.2 Cloud sync: only in your own Google Drive' },
        'When you turn on sync with Google sign-in, ACACIA creates an “ACACIA Everyday” folder in your Google Drive and writes data only to files it created there. They count toward your own Drive storage. The files are:',
        {
          list: [
            'acacia_data_v2.json: your personal data (events, ledger, categories, settings and list of joined spaces). Only you can access it.',
            'acacia_backup_v2.json: the latest automatic backup (overwritten at each automatic backup; it does not affect the sync file). Only you can access it.',
            'acacia_space_<space ID>.json: a shared space you created, shared with the members you invite (see 2.3).',
          ],
        },
        { sub: '3.3 Transmission and encryption' },
        {
          list: [
            'All connections between your device and Google are encrypted with HTTPS (TLS). Data travels directly between your device and Google and never passes through our servers.',
            'ACACIA does not add its own end-to-end encryption: local data is stored as JSON in the browser or app and protected by your operating system and browser, and cloud files are stored in your Drive under Google’s security measures. We recommend a screen lock on your devices and not signing in to sync on shared computers.',
          ],
        },
        { sub: '3.4 We do not hold your data' },
        'We have no server or database that stores your personal data, so we cannot access, view, analyse or recover it for you. Please use JSON export and automatic backups to protect your data.',
      ],
    },
    {
      id: 'third-party',
      heading: '4. Third-party services',
      blocks: [
        'The Service connects to the following services only when needed. Each handles data under its own privacy policy:',
        {
          list: [
            'Google Identity Services (accounts.google.com): loaded only when you press “Sign in with Google to sync”, for sign-in and authorisation.',
            'Google OAuth user info API: gets your account ID, name and profile picture after sign-in (see 2.1).',
            'Google Drive API: reads and writes the files ACACIA created in your Drive, and sets sharing permissions when you invite members (see 2.3 and 3.2).',
            'Google file picker (apis.google.com, docs.google.com): loaded only when you choose “Join a shared space”, so that you yourself pick the space file someone shared with you.',
            'Google Fonts (fonts.googleapis.com, fonts.gstatic.com): when the web page loads fonts, your browser downloads them directly from Google, so Google receives your IP address and browser information.',
            'Cloudflare Pages: hosting for the web app. Like any website host, Cloudflare may log connection information (such as IP address and request time) for security and operations.',
            'Public holiday data: Taiwan uses the Directorate-General of Personnel Administration’s government office calendar (Government Open Data Platform), mainland China uses State Council General Office notices (compiled by the open-source project holiday-cn), South Korea uses the Korea AeroSpace Administration’s calendar data (compiled by the open-source project holidays-kr), and other countries are calculated from statutory rules by the open-source project date-holidays. This data is bundled into the app at build time and the app never contacts these sources, so no data is sent to them. Their licences are listed under “Third-party licences”.',
          ],
        },
        'Google Privacy Policy: https://policies.google.com/privacy',
        'Cloudflare Privacy Policy: https://www.cloudflare.com/privacypolicy/',
        { sub: 'No ads or tracking' },
        'The Service shows no ads and uses no third-party ad trackers, analytics tools (such as Google Analytics) or cross-app/cross-site tracking, and we never sell, rent or share your data with anyone.',
        { sub: 'App privacy label: Data Not Collected' },
        'Under Apple App Store “App Privacy” definitions, ACACIA declares “Data Not Collected”: we have no server or database of our own and never receive, store or access your events, ledger, contact information, usage history or diagnostics, and the app contains no tracking, advertising or analytics SDKs. Your data exists only on your devices and, if you choose to turn on sync, in your own Google Drive. The third-party services listed above are used only to complete what you are doing at that moment (such as signing in or reading and writing your Drive), never to track you or build a profile of you.',
        { sub: 'Google API Limited Use disclosure' },
        'ACACIA’s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. Data from Google is used only to provide sync, shared spaces and display of the signed-in account inside the app. It is never used for advertising, transferred to third parties, or read by humans.',
      ],
    },
    {
      id: 'retention',
      heading: '5. How long data is kept',
      blocks: [
        {
          list: [
            'Local data: kept until you delete it in the app, use “Delete all data”, or clear the browser’s site data.',
            'Automatic backup snapshots: up to 7 on the device, with the oldest deleted automatically beyond that; the Drive backup file keeps only the latest one.',
            'Cloud files: kept in your Google Drive until you delete them (see Section 6). Shared-space files stay in their creator’s Drive.',
            'Google access token: about one hour at most, deleted when you close the tab or sign out.',
            'Recently deleted: deleted events first go to “Recently deleted” for 30 days, where you can restore them; after 30 days they are permanently deleted automatically (done when the app starts or syncs, with no server involved).',
            'Deletion markers for sync: when you delete something, your local data and sync files keep a deletion marker that records only the item’s ID and deletion time, with no content, so your other devices and other members delete it too. Markers are cleared automatically after 180 days.',
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: '6. Your rights and control over your data',
      blocks: [
        'Under Taiwan’s Personal Data Protection Act and the GDPR, you may access, view, obtain a copy of, correct or delete your data, or ask that processing stop. Because you hold your own data, you can exercise most of these rights directly in the app:',
        { sub: '6.1 Access and export (data portability)' },
        'In Settings → Data, press “Export JSON” to download a JSON file of all your personal data, which you can import into ACACIA or other tools.',
        'In the same place, “Export calendar (.ics)” turns My calendar or a shared space into a standard iCalendar file you can import into Apple Calendar, Google Calendar, Outlook and other apps. The file is created on your device and never passes through any server.',
        { sub: '6.2 Correction and restore' },
        'You can edit everything directly in the app. Events deleted by mistake can be restored from “Recently deleted”, and you can restore a snapshot in one tap under Settings → Automatic backups (a snapshot of your current data is kept first).',
        { sub: '6.3 Delete all local and cloud data' },
        {
          list: [
            '(Recommended) Press “Export JSON” first to keep a backup.',
            'To delete cloud data too, sign in with Google first.',
            'Go to Settings → Delete all data, press “Delete all data” and confirm.',
            'The Service deletes the personal file, backup file and shared-space files you created in your Drive, signs you out and revokes authorisation, and finally clears all data, automatic backup snapshots and preferences on this device. Shared-space files created by others are not deleted. This cannot be undone.',
          ],
        },
        'You can also delete or revoke from Google’s side: delete the “ACACIA Everyday” folder in Google Drive, or remove ACACIA’s access under “Third-party apps & services” in your Google Account (https://myaccount.google.com/connections). Local data on other devices must be deleted on each device, or by clearing the browser’s site data.',
        { sub: '6.4 Withdrawing consent' },
        'You can sign out of Google to stop syncing, turn off “share busy times” for a space, or leave a shared space at any time. The related features stop; everything else keeps working.',
      ],
    },
    {
      id: 'children',
      heading: '7. Children’s privacy',
      blocks: ['The Service is not designed for children under 13, and we do not knowingly collect personal data from children. Minors should get the consent of a parent or legal guardian before using the Service.'],
    },
    {
      id: 'changes',
      heading: '8. Changes to this policy',
      blocks: ['We may revise this policy when features or laws change. We will update the “Last updated” date on this page, and announce material changes (such as changes to how data is used or to third-party services) prominently in the app. Continuing to use the Service means you accept the revised policy.'],
    },
    {
      id: 'contact',
      heading: '9. Contact us',
      blocks: ['For any questions, feedback or requests about this policy or your data, email {email}. We will reply as soon as we can.'],
    },
  ],
}

export const POLICIES: Record<PolicyLang, PolicyDoc> = { 'zh-TW': zhTW, ja, en }

/**
 * 依介面語言取隱私權政策。政策正文只有繁中／日文／英文三個版本（PRIVACY_VERSION 綁定這三份內容）；
 * 韓文、法文、德文等其他介面語言顯示英文版，繁體中文仍是預設。只改顯示哪一份，不改內容，所以不會觸發重簽。
 */
export const policyFor = (lng: string | undefined): PolicyDoc => {
  if (lng === 'ja' || lng === 'en') return POLICIES[lng]
  if (lng === 'ko' || lng === 'fr' || lng === 'de') return POLICIES.en
  return POLICIES['zh-TW']
}
