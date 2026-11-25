import type { KeyValueStore, KvNamespace } from './types'

/**
 * iOS（Capacitor）版：每個 key 存成一個 JSON 檔，放在 App 的 Library/acacia/<命名空間>/ 底下。
 * Library 不會出現在「檔案」App，但會跟著 iPhone 的 iCloud 備份（換機時資料能跟著回來）。
 * 不用 WebView 的 IndexedDB：iOS 在空間不足時可能清掉 WebView 的網站資料。
 *
 * 寫入：先寫 <檔名>.tmp，再改名成正式檔名，寫到一半當機也不會留下半個檔案。
 * iOS 的 rename 遇到目標已存在可能失敗，所以失敗時先刪掉舊檔再改名一次；
 * 讀取時若正式檔不在、但留有 .tmp（剛好在刪檔與改名之間當機），就從 .tmp 救回。
 * 正式檔內容壞掉（不是合法 JSON）時改名保留成 .corrupt-<時間>，不直接刪除。
 */

/** 用到的 Capacitor Filesystem 動作（測試時換成記憶體版） */
export interface FsApi {
  writeFile(o: { path: string; data: string; directory: string; encoding: string; recursive?: boolean }): Promise<unknown>
  readFile(o: { path: string; directory: string; encoding: string }): Promise<{ data: string | Blob }>
  deleteFile(o: { path: string; directory: string }): Promise<void>
  rename(o: { from: string; to: string; directory: string; toDirectory?: string }): Promise<void>
  readdir(o: { path: string; directory: string }): Promise<{ files: { name: string }[] }>
  rmdir(o: { path: string; directory: string; recursive?: boolean }): Promise<void>
}

export const NATIVE_ROOT = 'acacia'
const DIRECTORY = 'LIBRARY'
const ENCODING = 'utf8'
const EXT = '.json'

/** key 轉成安全的檔名（snapshot:xxx 的冒號等字元都會被編碼） */
export const fileNameOf = (key: string) => `${encodeURIComponent(key)}${EXT}`
const keyOfFile = (name: string) => decodeURIComponent(name.slice(0, -EXT.length))

export function createNativeKv(ns: KvNamespace, fs: FsApi, now: () => number = Date.now): KeyValueStore {
  const dir = `${NATIVE_ROOT}/${ns}`
  const pathOf = (key: string) => `${dir}/${fileNameOf(key)}`
  const at = (path: string) => ({ path, directory: DIRECTORY })

  const readText = async (path: string): Promise<string | null> => {
    try {
      const r = await fs.readFile({ ...at(path), encoding: ENCODING })
      return typeof r.data === 'string' ? r.data : await r.data.text()
    } catch {
      return null // 檔案不存在
    }
  }

  return {
    async get<T>(key: string) {
      const path = pathOf(key)
      const text = await readText(path)
      if (text !== null) {
        try {
          return JSON.parse(text) as T
        } catch (e) {
          console.error('本機資料檔損毀，已另存備查', path, e)
          await fs.rename({ from: path, to: `${path}.corrupt-${now()}`, directory: DIRECTORY }).catch(() => {})
        }
      }
      // 正式檔不在（或壞掉），看看有沒有寫到一半留下的暫存檔
      const tmp = await readText(`${path}.tmp`)
      if (tmp === null) return undefined
      try {
        return JSON.parse(tmp) as T
      } catch {
        return undefined
      }
    },

    async set(key, value) {
      const path = pathOf(key)
      const tmp = `${path}.tmp`
      await fs.writeFile({ ...at(tmp), data: JSON.stringify(value), encoding: ENCODING, recursive: true })
      try {
        await fs.rename({ from: tmp, to: path, directory: DIRECTORY })
      } catch {
        await fs.deleteFile(at(path)).catch(() => {})
        await fs.rename({ from: tmp, to: path, directory: DIRECTORY })
      }
    },

    async del(key) {
      const path = pathOf(key)
      await fs.deleteFile(at(path)).catch(() => {})
      await fs.deleteFile(at(`${path}.tmp`)).catch(() => {})
    },

    async clear() {
      await fs.rmdir({ ...at(dir), recursive: true }).catch(() => {})
    },

    async keys() {
      try {
        const { files } = await fs.readdir(at(dir))
        // 只剩暫存檔（寫到一半當機）的 key 也算，讀取時會從暫存檔救回
        const names = files.map((f) => f.name.replace(/\.tmp$/, '')).filter((n) => n.endsWith(EXT))
        return [...new Set(names)].map(keyOfFile)
      } catch {
        return []
      }
    },
  }
}
