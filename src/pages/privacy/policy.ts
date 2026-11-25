// src/pages/privacy/policy.ts
import { PRIVACY_VERSION } from '../../core/consent';

export type PrivacyLocale = 'zh-TW' | 'ja' | 'en';

export interface PrivacySection {
  /** 章節固定識別碼（供測試比對三語結構與錨點跳轉） */
  id: string;
  /** 章節標題（含編號） */
  heading: string;
  /** 內文段落（三語段落數量嚴格一致） */
  paragraphs: readonly string[];
  /** 重點條列（三語條列數量嚴格一致） */
  bullets?: readonly string[];
}

export interface PrivacyPolicyDocument {
  locale: PrivacyLocale;
  title: string;
  subtitle: string;
  updatedLabel: string;
  updatedDate: string;
  fallbackNotice?: string;
  sections: readonly PrivacySection[];
}

/** 直接沿用 consent.ts 的版本日期，確保永遠同步 */
export const UPDATED_DATE = PRIVACY_VERSION;

export const DEFAULT_SUPPORT_EMAIL = 'acacia.qiqi@gmail.com';

export function getSupportEmail(): string {
  const envEmail = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env?.VITE_SUPPORT_EMAIL;
  const trimmed = envEmail?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_SUPPORT_EMAIL;
}

/**
 * 將 App 介面 6 種語言映射至隱私權政策的 3 種正式語言：
 * 繁體中文 -> zh-TW、日文 -> ja、英文及韓／法／德 -> en
 */
export function resolvePrivacyLocale(appLocale: string): {
  policyLocale: PrivacyLocale;
  isFallbackToEnglish: boolean;
} {
  const normalized = appLocale.trim();
  if (normalized === 'zh-TW' || normalized.startsWith('zh')) {
    return { policyLocale: 'zh-TW', isFallbackToEnglish: false };
  }
  if (normalized === 'ja' || normalized.startsWith('ja-')) {
    return { policyLocale: 'ja', isFallbackToEnglish: false };
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return { policyLocale: 'en', isFallbackToEnglish: false };
  }
  return { policyLocale: 'en', isFallbackToEnglish: true };
}

export function getPrivacyPolicy(
  appLocale: string,
  supportEmail: string = getSupportEmail()
): PrivacyPolicyDocument {
  const { policyLocale, isFallbackToEnglish } = resolvePrivacyLocale(appLocale);
  const builder = POLICY_BUILDERS[policyLocale];
  const doc = builder(supportEmail);

  if (isFallbackToEnglish) {
    return {
      ...doc,
      fallbackNotice:
        'This Privacy Policy is officially provided in Traditional Chinese, Japanese, and English. For Korean, French, and German interface settings, the English version is displayed.',
    };
  }
  return doc;
}

const POLICY_BUILDERS: Record<
  PrivacyLocale,
  (supportEmail: string) => PrivacyPolicyDocument
> = {
  // ─────────────────────────────────────────────────────────────
  // 繁體中文（zh-TW）
  // ─────────────────────────────────────────────────────────────
  'zh-TW': (supportEmail) => ({
    locale: 'zh-TW',
    title: '隱私權政策',
    subtitle:
      'ACACIA Everyday 專注於個人行事曆、多人共享行事曆與個人記帳本。我們不架設自有伺服器，你的日常紀錄與財務收支只屬於你自己。',
    updatedLabel: '最後更新日期',
    updatedDate: UPDATED_DATE,
    sections: [
      {
        id: 'overview',
        heading: '1. 核心原則與無伺服器架構',
        paragraphs: [
          'ACACIA Everyday（以下簡稱「本服務」）採用純用戶端與無自有後端伺服器（Serverless）架構運作。開發者不經營任何接收、儲存或分析使用者日常內容的中繼資料庫。',
          '無論你使用個人行事曆、多人共享行事曆空間或個人記帳本，所有資料僅儲存在你的裝置本機，或在你明確授權登入後，直接於你的裝置與 Google 雲端硬碟（Google Drive）之間透過加密連線讀寫。',
        ],
        bullets: [
          '開發者看不到、無法存取、亦無法代為還原你的任何行程或記帳紀錄。',
          '未登入 Google 帳號時，本服務完全離線運作，不會向外部發送任何同步請求。',
          '本服務不要求定位、聯絡人、相機或麥克風等與核心功能無關的系統權限。',
        ],
      },
      {
        id: 'personal-storage-and-ledger',
        heading: '2. 本機儲存、個人雲端同步與記帳隱私隔離',
        paragraphs: [
          '在未開啟雲端同步的情況下，你的資料只會保存在目前使用的裝置中；當你選擇在網頁版啟用 Google 登入同步時，本服務僅使用最小檔案權限（drive.file）讀寫由本服務建立或你主動選取的專屬 JSON 檔案。',
          '你的「記帳本」與自訂記帳分類受到最嚴格的隱私隔離保護，永遠只儲存在個人資料檔中，絕不會寫入或暴露於任何多人共享空間。',
        ],
        bullets: [
          '網頁版（PWA／瀏覽器）：個人主資料與本機自動備份快照（最多 7 份）儲存於瀏覽器的 IndexedDB 中。',
          'iOS App 版：個人主資料與快照儲存於應用程式沙盒的 Library/acacia/ 目錄下（不公開於系統「檔案」App，但會隨你的 iPhone 系統設定納入 Apple iCloud 裝置備份）。',
          '個人雲端檔案：登入 Google 後，個人行程、記帳紀錄與個人設定僅同步至你個人 Google Drive 內的 acacia_data_v2.json，以及雲端自動備份檔 acacia_backup_v2.json。',
          '記帳絕對私密：記帳本金額、收支明細、結算週期設定與自訂分類不會以任何形式傳送給共享行事曆的其他成員。',
        ],
      },
      {
        id: 'shared-spaces-and-busy-slots',
        heading: '3. 共享行事曆空間與「忙碌時段」隱私邊界',
        paragraphs: [
          '當你建立或透過 Google Picker 選取加入「共享行事曆空間」時，該空間的資料是透過空間建立者與受邀成員在 Google Drive 共同讀寫單一共用檔案（acacia_space_<id>.json）完成同步，不經過任何第三方中繼伺服器。',
          '為兼顧多人排程便利與個人隱私，你可以自由決定是否將「個人行事曆」的空檔狀態投射至特定共享空間，且系統在設計上確保私密細節絕不外洩：',
        ],
        bullets: [
          '共享空間可見範圍：同一空間的協作成員可看見發佈於該空間的「共享行程」（標題、時間、備註、建立者與最後修改者顯示名稱），以及依 Google Drive 原生共用機制顯示的協作者帳號資訊（名稱與電子郵件）。',
          '個人忙碌時段投射（預設關閉）：開啟後，系統僅將你過去 7 天至未來 90 天內未刪除的個人行程轉換為「不可逆單向雜湊 ID」與「開始／結束時間區間」寫入共享檔案，標示為「忙碌中」。',
          '零標題與零備註外流：忙碌時段同步資料中完全不含個人行程的標題、備註、分類色標或原始行程 ID；不同共享空間亦採用不同雜湊鹽值，防止跨空間比對追蹤（僅有你自己的裝置會在畫面上於本機記憶體對照顯示原始標題）。',
          '隨時撤回投射：當你將個人行程移至最近刪除、關閉該空間的忙碌投射開關或退出空間時，對應的忙碌時段會在下次同步時自動從共享檔案移除。',
        ],
      },
      {
        id: 'data-not-collected',
        heading: '4. 「不收集資料」聲明與第三方服務說明',
        paragraphs: [
          '依據 Apple App Store 隱私標示規範與資料最小化原則，本服務正式申報為「不收集資料（Data Not Collected）」。程式碼中不包含任何廣告 SDK、行為追蹤器、第三方數據分析或自動當機回報工具。',
          '本服務運作時僅在必要範圍內與以下基礎設施直接通訊，開發者不會從中攔截或保存任何個人識別資訊：',
        ],
        bullets: [
          '網站託管（Cloudflare Pages）：網頁版靜態程式碼檔案由 Cloudflare 傳遞，基礎連線過程受 Cloudflare 標準網路安全與隱私政策保護，本服務未啟用任何額外的使用者行為紀錄。',
          'Google 身分驗證與 Google Drive API：僅在你主動點擊登入、同步或選取共享空間檔案時，直接與 Google 官方伺服器連線驗證身分及讀寫授權範圍（drive.file）內的檔案。',
          'Apple iOS 與 iCloud 系統備份：使用 iOS App 時，本機檔案可能依你在裝置開啟的 iCloud 備份設定由 Apple 加密備份，受 Apple 隱私權政策規範。',
          '字型與靜態資源：介面字型與台灣相思樹圖示等資源僅用於畫面呈現，不附帶跨站追蹤 Cookie。',
        ],
      },
      {
        id: 'retention-and-deletion',
        heading: '5. 資料保留期間與完整刪除權利',
        paragraphs: [
          '你的資料保留時間完全由你掌控。為支援誤刪還原與多裝置離線衝突合併，本服務在你的本機與同步檔案中設有明確的自動清理期限：',
          '你可以隨時透過「設定」頁面的匯出與刪除工具搬移或徹底銷毀資料：',
        ],
        bullets: [
          '最近刪除垃圾桶（保留 30 天）：被刪除的個人行程或共享行程會先移入「最近刪除」，30 天內可隨時還原；超過 30 天後，系統會在啟動、同步合併或開啟垃圾桶時自動永久清除。',
          '同步刪除標記 Tombstones（保留 180 天）：紀錄永久刪除後，同步中繼資料（syncMeta）會保留不含內容內文的刪除時間標記 180 天，防止長期離線裝置重新連線時讓舊資料復活；滿 180 天後自動清除。',
          '資料匯出與可攜權：你可隨時匯出完整個人資料 JSON 備份，或匯出標準 RFC 5545 行事曆（.ics）檔案至其他日曆軟體。',
          '一鍵刪除所有資料：在設定頁執行「刪除所有資料」時，系統會刪除個人 Google Drive 上的本服務檔案（已登入時）、退出共享空間、登出帳號，並清空本機儲存與所有自動備份快照。',
        ],
      },
      {
        id: 'consent-and-updates',
        heading: '6. 使用前同意機制與政策修訂',
        paragraphs: [
          '首次開啟本服務，或本隱私權政策、第三方授權清單有重大版本更新時，畫面會顯示全螢幕同意面板。在你點擊「同意並開始使用」之前，本服務不會啟動 Google 登入、自動備份或任何雲端同步程序。',
          '你的同意紀錄（同意之版本號與時間戳記）僅儲存在目前裝置本機（網頁版存於 IndexedDB 的 acacia-consent，iOS 版存於系統 Preferences），不會同步至雲端或寫入匯出檔；清除瀏覽器資料或執行「刪除所有資料」後將重新詢問。',
        ],
        bullets: [
          '當本政策因功能調整或法規要求而更新時，我們會同步更新本頁頂端的「最後更新日期（PRIVACY_VERSION）」並請你重新確認。',
          '公開網址 /privacy 在同意前後皆可隨時開啟查閱完整條文，且繁中、日文、英文三種語言版本維持一致的章節與保障標準。',
        ],
      },
      {
        id: 'contact',
        heading: '7. 聯絡我們',
        paragraphs: [
          '若你對本隱私權政策、Google Drive 權限運作方式或開放原始碼授權有任何疑問，歡迎透過支援信箱與我們聯繫：',
          `支援電子郵件：${supportEmail}`,
        ],
      },
    ],
  }),

  // ─────────────────────────────────────────────────────────────
  // 日本語（ja）
  // ─────────────────────────────────────────────────────────────
  ja: (supportEmail) => ({
    locale: 'ja',
    title: 'プライバシーポリシー',
    subtitle:
      'ACACIA Everyday は、個人のカレンダー、複数人での共有カレンダー、そして個人の家計簿に特化したツールです。独自のサーバーを持たず、日々の予定や収支データはすべてあなた自身の手元に保たれます。',
    updatedLabel: '最終更新日',
    updatedDate: UPDATED_DATE,
    sections: [
      {
        id: 'overview',
        heading: '1. 基本原則とサーバーレス設計',
        paragraphs: [
          'ACACIA Everyday（以下「本サービス」）は、クライアント完結型のサーバーレス（独自バックエンドなし）アーキテクチャで動作します。開発者は、ユーザーの予定や家計簿データを受信・保存・分析するためのいかなる中継サーバーも運用していません。',
          '個人カレンダー、共有スペース、家計簿のいずれを利用する場合でも、データはお使いの端末内のみに保存されるか、ご自身の明示的なログイン許可のもと、端末と Google ドライブ（Google Drive）の間で暗号化通信を通じて直接読み書きされます。',
        ],
        bullets: [
          '開発者があなたの予定や家計簿の内容を閲覧・取得・復元することは技術的に不可能です。',
          'Google アカウントにログインしていない状態では完全にオフラインで動作し、外部への同期通信は一切行われません。',
          '位置情報、連絡先、カメラ、マイクなど、本サービスの機能に不要な端末権限を要求することはありません。',
        ],
      },
      {
        id: 'personal-storage-and-ledger',
        heading: '2. 端末内保存・個人クラウド同期と家計簿のプライバシー分離',
        paragraphs: [
          'クラウド同期を有効にしない限り、データはお使いの端末内にのみ保存されます。Web 版で Google ログイン同期を有効にした場合も、最小限のファイル権限（drive.file）のみを使用し、本サービスが作成したファイルまたはあなたが選択した専用 JSON ファイルのみを読み書きします。',
          '「家計簿」およびカスタムカテゴリは厳格に分離・保護されており、個人用データファイル内にのみ保存され、共有スペースに書き込まれたり他者に公開されたりすることは一切ありません。',
        ],
        bullets: [
          'Web 版（PWA／ブラウザ）：個人メインデータおよび自動バックアップスナップショット（最大 7 件）はブラウザの IndexedDB に保存されます。',
          'iOS アプリ版：個人データとスナップショットはアプリ専用領域の Library/acacia/ にファイルとして保存されます（「ファイル」アプリには表示されませんが、iPhone の設定に応じて Apple iCloud バックアップの対象となります）。',
          '個人クラウドファイル：Google ログイン時、個人の予定・家計簿・設定はご自身の Google ドライブ内の acacia_data_v2.json およびバックアップ用 acacia_backup_v2.json にのみ同期されます。',
          '家計簿の完全な秘匿性：収支金額、明細、集計サイクル（毎月10日締め等）、カスタムカテゴリが共有カレンダーのメンバーに送信されることは決してありません。',
        ],
      },
      {
        id: 'shared-spaces-and-busy-slots',
        heading: '3. 共有カレンダースペースと「予定あり（ビジー）」投影の境界',
        paragraphs: [
          '「共有スペース」を作成、または Google Picker で選択して参加した場合、作成者と招待メンバーの Google ドライブ間で単一の共有ファイル（acacia_space_<id>.json）を直接読み書きすることで同期が行われ、第三者のサーバーを経由しません。',
          '日程調整の利便性と個人のプライバシーを両立するため、個人カレンダーの空き状況を特定の共有スペースへ投影するかどうかを自由に選択でき、詳細情報が漏洩しない設計となっています。',
        ],
        bullets: [
          '共有スペースでの公開範囲：同じスペースのメンバーには、そのスペースに登録された「共有予定」（件名、日時、メモ、作成者・最終編集者の表示名）および Google ドライブ標準の共有メンバー情報（表示名・メールアドレス）が表示されます。',
          '個人の予定あり枠の投影（初期設定オフ）：オンにすると、過去 7 日間〜未来 90 日間の未削除の個人予定について、「不可逆な一方向ハッシュ ID」と「開始・終了日時」のみを共有ファイルに書き込み、「予定あり」として表示します。',
          '件名・メモの非送信：予定あり枠のデータには、個人予定の件名、メモ、色ラベル、元の予定 ID は一切含まれません。スペースごとに異なるハッシュ値を生成するためスペース間の名寄せも防ぎます（ご自身の端末画面でのみ、端末内メモリで元の件名を照合して表示します）。',
          'いつでも解除可能：個人予定をゴミ箱へ移動した場合や、予定あり投影スイッチをオフにした場合、またはスペースから退出した場合は、次回同期時に共有ファイルから該当枠が自動的に削除されます。',
        ],
      },
      {
        id: 'data-not-collected',
        heading: '4. 「データを収集しない」宣言と外部サービスについて',
        paragraphs: [
          'Apple App Store のプライバシー表示基準およびデータ最小化の原則に基づき、本サービスは「データを収集しない（Data Not Collected）」として申告しています。広告 SDK、行動トラッカー、アクセス解析、クラッシュレポート送信ツールは一切組み込まれていません。',
          '本サービスは動作に必要な最小限の範囲でのみ以下の基盤と直接通信し、開発者が個人を特定できる情報を取得・保存することはありません。',
        ],
        bullets: [
          'ホスティング（Cloudflare Pages）：Web 版の静的ファイル配信に Cloudflare を利用しており、標準的な通信セキュリティ保護が適用されますが、本サービス独自の行動ログ記録は行っていません。',
          'Google 認証および Google Drive API：ユーザーが自らログイン、同期、または共有ファイルの選択を行った際にのみ Google 公式サーバーと直接通信し、許可された範囲（drive.file）のファイルを読み書きします。',
          'Apple iOS および iCloud バックアップ：iOS アプリ利用時、端末側で iCloud バックアップが有効な場合は Apple により暗号化バックアップが行われ、Apple のプライバシーポリシーが適用されます。',
          'フォントおよび静的アセット：フォントやタイワンソウシジュ（相思樹）のアイコン描画は画面表示のみに使用され、追跡用 Cookie を伴いません。',
        ],
      },
      {
        id: 'retention-and-deletion',
        heading: '5. データの保持期間（30日・180日）と削除の権利',
        paragraphs: [
          'データの保持期間はすべてユーザー自身の管理下にあります。誤削除からの復元および複数端末のオフライン競合マージを正しく行うため、端末内および同期ファイルには明確な自動消去期間が設けられています。',
          '「設定」画面のエクスポート機能およびデータ削除機能から、いつでもデータの移行や完全な消去を行えます。',
        ],
        bullets: [
          '最近削除した項目・ゴミ箱（30日間保持）：削除した個人予定や共有予定はまず「最近削除した項目」に移動し、30日以内であれば復元可能です。30日を経過すると、起動時・同期マージ後・ゴミ箱を開いた際に自動的に完全削除されます。',
          '同期用削除マーカー Tombstones（180日間保持）：完全削除された項目は、長期間オフラインだった端末から古いデータが復活するのを防ぐため、本文を含まない削除日時記録（syncMeta）のみを180日間保持した後、自動的に消去します。',
          'データのエクスポート（可搬性）：いつでも全個人データの JSON エクスポート、または標準 RFC 5545 形式（.ics）でのカレンダー書き出しが可能です。',
          'すべてのデータを削除：設定画面から「すべてのデータを削除」を実行すると、個人 Google ドライブ上の本サービス用ファイルの削除（ログイン時）、共有スペースからの退出、ログアウト、および端末内データと全バックアップの消去が一括で行われます。',
        ],
      },
      {
        id: 'consent-and-updates',
        heading: '6. 利用前の同意確認とポリシーの改定',
        paragraphs: [
          '初回利用時、または本プライバシーポリシーやオープンソースライセンス一覧のバージョンが更新された際は、全画面の同意パネルが表示されます。「同意して使い始める」を押すまで、Google ログイン、自動バックアップ、クラウド同期は一切起動しません。',
          '同意の記録（バージョン番号と同意日時）はお使いの端末内（Web 版は IndexedDB の acacia-consent、iOS 版は Preferences）にのみ保存され、クラウド同期やエクスポートデータには含まれません。ブラウザデータの消去や「すべてのデータを削除」を実行すると再度確認が表示されます。',
        ],
        bullets: [
          '機能変更や法令対応により本ポリシーを改定する場合は、ページ上部の「最終更新日（PRIVACY_VERSION）」を更新し、改めて同意の確認をお願いしております。',
          '公開 URL（/privacy）は同意の前後を問わずいつでも閲覧可能であり、繁体字中国語・日本語・英語の3言語で同一の章構成と保護水準を維持しています。',
        ],
      },
      {
        id: 'contact',
        heading: '7. お問い合わせ',
        paragraphs: [
          '本プライバシーポリシー、Google ドライブ権限の仕組み、またはオープンソースライセンスに関するご質問がございましたら、以下のサポート窓口までご連絡ください。',
          `サポート用メールアドレス：${supportEmail}`,
        ],
      },
    ],
  }),

  // ─────────────────────────────────────────────────────────────
  // English（en — also displayed for ko / fr / de）
  // ─────────────────────────────────────────────────────────────
  en: (supportEmail) => ({
    locale: 'en',
    title: 'Privacy Policy',
    subtitle:
      'ACACIA Everyday focuses on your personal calendar, shared calendar spaces, and personal expense ledger. We operate zero backend servers—your schedule and finances belong strictly to you.',
    updatedLabel: 'Last Updated',
    updatedDate: UPDATED_DATE,
    sections: [
      {
        id: 'overview',
        heading: '1. Core Principles & Serverless Architecture',
        paragraphs: [
          'ACACIA Everyday ("the Service") is built on a purely client-side, serverless architecture. The developer does not operate any backend server or database that receives, stores, or analyzes your personal content.',
          'Whether you use the personal calendar, shared calendar spaces, or personal ledger, all data remains locally on your device or—only after your explicit sign-in authorization—syncs directly between your device and Google Drive over encrypted connections.',
        ],
        bullets: [
          'The developer cannot view, access, intercept, or recover any of your calendar events or ledger entries.',
          'When you are not signed in with Google, the Service runs entirely offline and makes zero background sync requests.',
          'The Service never requests geolocation, contacts, camera, microphone, or other permissions unrelated to its core features.',
        ],
      },
      {
        id: 'personal-storage-and-ledger',
        heading: '2. Local Storage, Personal Cloud Sync & Ledger Isolation',
        paragraphs: [
          'Unless cloud sync is enabled, your data stays solely on your current device. When you sign in with Google on the web app, the Service requests only the minimal per-file scope (drive.file) to read and write dedicated JSON files created by the Service or explicitly selected by you.',
          'Your Personal Ledger and custom categories are strictly isolated for your eyes only—they are stored exclusively in your personal data file and are never written to or exposed in any shared calendar space.',
        ],
        bullets: [
          'Web App (PWA / Browser): Personal data and local automatic backup snapshots (up to 7 snapshots) are stored in your browser’s IndexedDB.',
          'iOS App: Personal data and snapshots are stored as files inside the app sandbox under Library/acacia/ (hidden from the system Files app, and included in encrypted Apple iCloud device backups if enabled in your iPhone settings).',
          'Personal Cloud Files: When signed in with Google, your personal events, ledger records, and settings sync only to acacia_data_v2.json and acacia_backup_v2.json in your own Google Drive.',
          'Strict Ledger Privacy: Expense/income amounts, notes, custom billing cycle dates (e.g., 10th-to-10th), and custom categories are never transmitted to collaborators in any shared space.',
        ],
      },
      {
        id: 'shared-spaces-and-busy-slots',
        heading: '3. Shared Calendar Spaces & "Busy Slot" Privacy Boundaries',
        paragraphs: [
          'When you create a Shared Space or join one by selecting its file via Google Picker, collaboration happens directly through a single shared JSON file (acacia_space_<id>.json) in Google Drive among authorized members, without passing through any intermediary server.',
          'To balance effortless group scheduling with personal privacy, you control whether your personal availability is projected into each shared space, backed by strict cryptographic and structural safeguards:',
        ],
        bullets: [
          'What Space Collaborators Can See: Members of the same shared space can view Shared Events posted directly to that space (title, date/time, notes, creator and last editor display names) as well as collaborator account info (name and email) managed natively by Google Drive.',
          'Optional Personal Busy-Slot Projection (Off by Default): When enabled for a space, only active personal events within a rolling window (past 7 days to future 90 days) are projected as an irreversible one-way hashed ID plus start/end timestamps labeled "Busy".',
          'Zero Titles or Notes Leaked: Projected busy slots never contain your personal event titles, notes, colors, or original event IDs, and space-specific hashing prevents cross-space correlation (only your own device locally maps your own busy slots back to their titles in memory).',
          'Instant Revocation: Trashing a personal event, turning off busy projection for a space, or leaving a space automatically removes the corresponding busy slots from the shared file upon the next sync.',
        ],
      },
      {
        id: 'data-not-collected',
        heading: '4. "Data Not Collected" Declaration & Third-Party Services',
        paragraphs: [
          'In accordance with Apple App Store privacy nutrition label standards and data minimization principles, ACACIA Everyday declares "Data Not Collected." The codebase contains zero advertising SDKs, behavioral trackers, third-party analytics, or automated crash-reporting libraries.',
          'The Service communicates directly only with essential infrastructure required to deliver the app, without the developer collecting or retaining personally identifiable information:',
        ],
        bullets: [
          'Static Hosting (Cloudflare Pages): Web app static assets are delivered via Cloudflare under standard network security protections; no custom user behavioral logging is enabled.',
          'Google Identity & Google Drive API: Contacted directly only when you initiate Google Sign-In, cloud sync, or Google Picker selection to access authorized files under the drive.file scope.',
          'Apple iOS & iCloud Device Backup: On iOS, local sandbox files may be backed up by Apple if iCloud Backup is enabled on your device, governed by Apple’s Privacy Policy.',
          'Fonts & Static Assets: Interface typography and vector Taiwan Acacia brand icons are used strictly for visual rendering without cross-site tracking cookies.',
        ],
      },
      {
        id: 'retention-and-deletion',
        heading: '5. Data Retention Periods (30 & 180 Days) & Right to Delete',
        paragraphs: [
          'You retain full control over the lifecycle of your data. To support accidental-deletion recovery and reliable multi-device offline conflict resolution, clear automatic expiration windows apply to local and synced records:',
          'You may export, migrate, or permanently erase all of your data at any time from the Settings page:',
        ],
        bullets: [
          'Recently Deleted Trash (30-Day Retention): Deleted personal or shared events move to Recently Deleted and can be restored within 30 days; items older than 30 days are permanently purged on app launch, after sync merges, or when opening the trash view.',
          'Sync Deletion Tombstones (180-Day Retention): After permanent deletion, content-free deletion timestamps in syncMeta are kept for 180 days so long-offline devices do not resurrect deleted items, then automatically purged.',
          'Data Portability & Export: You can export a full JSON backup for re-import or export standard RFC 5545 (.ics) calendar files compatible with Apple Calendar, Google Calendar, and Outlook.',
          'Delete All Data: Triggering "Delete All Data" in Settings deletes ACACIA files from your personal Google Drive (when signed in), leaves joined spaces, signs out, and wipes all local storage and backup snapshots.',
        ],
      },
      {
        id: 'consent-and-updates',
        heading: '6. Pre-Use Consent Gate & Policy Updates',
        paragraphs: [
          'When you open the Service for the first time—or whenever this Privacy Policy or the third-party license notice version changes—a full-screen consent gate is presented. Google Sign-In, automatic backups, and cloud sync remain strictly inactive until you tap "Agree and Continue."',
          'Your consent record (version numbers and timestamp) is stored solely on your local device (acacia-consent in IndexedDB on web; Preferences on iOS) and is excluded from cloud sync and backups. Clearing browser storage or running "Delete All Data" resets consent.',
        ],
        bullets: [
          'Whenever material updates are made to reflect feature or legal changes, we update the Last Updated date (PRIVACY_VERSION) at the top of this page and prompt for renewed consent.',
          'The public /privacy route remains accessible at all times both before and after consent, maintaining identical section structure and privacy guarantees across Traditional Chinese, Japanese, and English.',
        ],
      },
      {
        id: 'contact',
        heading: '7. Contact Us',
        paragraphs: [
          'If you have any questions regarding this Privacy Policy, Google Drive permission scopes, or open-source licensing, please reach out via email:',
          `Support Email: ${supportEmail}`,
        ],
      },
    ],
  }),
};
