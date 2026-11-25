/** 行程的生活小圖示。依標題關鍵字自動挑，也可以在行程表單手動指定 */
export const EVENT_ICON_KEYS = ['wake', 'sleep', 'study', 'work', 'rest', 'meal', 'shopping', 'exercise', 'health', 'vacation', 'train', 'flight', 'book', 'celebrate', 'default'] as const
export type EventIconKey = (typeof EVENT_ICON_KEYS)[number]

/**
 * 關鍵字（繁中、日文、英文）。順序就是比對優先順序：
 * 像「午餐會議」會先命中用餐，「workout」不會被當成上班。
 */
const KEYWORDS: [Exclude<EventIconKey, 'default'>, string[]][] = [
  ['wake', ['起床', '晨間', '早起', '鬧鐘', '起き', '朝活', 'wake up', 'wake', 'morning routine', 'alarm']],
  ['sleep', ['就寢', '睡覺', '睡前', '晚安', '寝る', '就寝', 'おやすみ', 'sleep', 'bedtime', 'bed']],
  // 交通放前面：「搭高鐵去出差」「機場接機」比較想看到交通工具
  ['flight', ['飛機', '機場', '航班', '班機', '登機', '搭機', '接機', '送機', '飛行機', '空港', 'フライト', '搭乗', 'flight', 'airport', 'plane', 'boarding']],
  ['train', ['火車', '高鐵', '台鐵', '捷運', '列車', '電車', '新幹線', '地鐵', '鐵道', '在来線', 'train', 'metro', 'subway', 'mrt', 'railway', 'shinkansen']],
  ['health', ['看診', '醫院', '美容', '牙醫', '診所', '健檢', '打針', '複診', '病院', '通院', '歯医者', '美容院', 'doctor', 'hospital', 'clinic', 'dentist', 'salon', 'checkup']],
  // 慶祝排在用餐、購物前面：「慶生晚餐」「生日派對採買」比較想看到慶祝
  ['celebrate', ['慶祝', '慶生', '生日', '派對', '紀念日', '週年', '周年', '婚禮', '結婚', '喜酒', '畢業典禮', '尾牙', '誕生日', 'パーティー', '記念日', 'お祝い', '結婚式', '祝賀', 'birthday', 'party', 'anniversary', 'celebrate', 'celebration', 'wedding', 'graduation']],
  ['shopping', ['購物', '買東西', '超市', '採買', '買菜', '買い物', 'スーパー', 'shopping', 'grocery', 'groceries', 'supermarket']],
  ['meal', ['吃飯', '早餐', '午餐', '晚餐', '聚餐', '宵夜', '餐廳', '食事', '朝食', '昼食', '夕食', 'ランチ', 'ディナー', '飲み会', 'breakfast', 'brunch', 'lunch', 'dinner', 'meal', 'eat']],
  ['exercise', ['運動', '健身', '散步', '跑步', '慢跑', '晨跑', '夜跑', '路跑', '健走', '快走', '瑜珈', '游泳', 'ジム', '散歩', 'ランニング', 'ジョギング', 'ウォーキング', 'ヨガ', 'workout', 'gym', 'running', 'run', 'jogging', 'jog', 'yoga', 'walk', 'exercise']],
  ['vacation', ['度假', '渡假', '旅行', '旅遊', '出遊', '海邊', '沙灘', '放假', '假期', '露營', 'バカンス', '休暇', '観光', 'ビーチ', 'vacation', 'holiday', 'trip', 'travel', 'beach', 'camping']],
  ['rest', ['午休', '小睡', '休息', '咖啡', '下午茶', '昼休み', '休憩', '仮眠', 'カフェ', 'nap', 'rest', 'break', 'coffee', 'tea']],
  // 讀書、看書這類「翻書」的行程用課本；去學校上課、考試維持書包
  ['book', ['讀書', '念書', '唸書', '看書', '閱讀', '課本', '圖書館', '自習', '背單字', '読書', '図書館', '教科書', '本を読', 'reading', 'read', 'book', 'library', 'textbook']],
  ['study', ['上學', '上課', '考試', '作業', '學校', '補習', '授業', '勉強', '学校', '宿題', 'study', 'class', 'school', 'homework', 'lecture', 'exam']],
  ['work', ['上班', '工作', '會議', '開會', '面試', '出差', '加班', '仕事', '会議', '出勤', 'work', 'meeting', 'office', 'interview']],
]

/** 英文關鍵字要整個字比對，避免 brunch 裡的 run、breakfast 裡的 break 誤判 */
const matches = (title: string, kw: string) => (/^[a-z ]+$/.test(kw) ? new RegExp(`(?<![a-z])${kw}(?![a-z])`).test(title) : title.includes(kw))

export function detectEventIcon(title: string): EventIconKey {
  const t = title.toLowerCase()
  for (const [key, words] of KEYWORDS) if (words.some((w) => matches(t, w))) return key
  return 'default'
}

/** 行程實際要顯示的圖示：手動選的優先，沒選就依標題判斷 */
export const eventIconOf = (e: { title: string; icon?: EventIconKey }): EventIconKey => e.icon ?? detectEventIcon(e.title)

/** 圓形底框的柔和粉彩色 */
export const ICON_BG: Record<EventIconKey, string> = {
  wake: '#fff3c4',
  sleep: '#e9e3fb',
  study: '#dcecf8',
  work: '#fbe5d3',
  rest: '#fdebd4',
  meal: '#ffe6df',
  shopping: '#def3e7',
  exercise: '#e0f1de',
  health: '#fde4e3',
  vacation: '#fff0cc',
  train: '#dcecf8',
  flight: '#e3eefb',
  book: '#fde9d6',
  celebrate: '#fde4f0',
  default: '#eaf6ef',
}
