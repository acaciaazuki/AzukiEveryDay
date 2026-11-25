import type { PrefsApi } from '../adapters/kv/migrate'
import type { FsApi } from '../adapters/kv/nativeKv'

/**
 * 記憶體版的 Capacitor Filesystem／Preferences，模擬 iOS 的行為：
 * - rename 目標已存在時失敗（iOS FileManager.moveItem 的行為），用來驗證「刪掉舊檔再改名」的備援
 * - 可以指定某個動作失敗，模擬寫到一半當機
 */
export function fakeFs(opts: { renameOverwrites?: boolean } = {}) {
  const files = new Map<string, string>()
  let failNext: { op: keyof FsApi; times: number } | null = null
  const maybeFail = (op: keyof FsApi) => {
    if (failNext && failNext.op === op && failNext.times > 0) {
      failNext.times--
      throw new Error(`模擬 ${op} 失敗`)
    }
  }
  const api: FsApi = {
    writeFile: async ({ path, data }) => {
      maybeFail('writeFile')
      files.set(path, data)
    },
    readFile: async ({ path }) => {
      const data = files.get(path)
      if (data === undefined) throw new Error('File does not exist')
      return { data }
    },
    deleteFile: async ({ path }) => {
      maybeFail('deleteFile')
      if (!files.delete(path)) throw new Error('File does not exist')
    },
    rename: async ({ from, to }) => {
      maybeFail('rename')
      const data = files.get(from)
      if (data === undefined) throw new Error('File does not exist')
      if (files.has(to) && !opts.renameOverwrites) throw new Error('Destination exists')
      files.set(to, data)
      files.delete(from)
    },
    readdir: async ({ path }) => {
      const prefix = `${path}/`
      const names = [...files.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)).filter((n) => !n.includes('/'))
      if (names.length === 0) throw new Error('Directory does not exist')
      return { files: names.map((name) => ({ name })) }
    },
    rmdir: async ({ path }) => {
      for (const k of [...files.keys()]) if (k.startsWith(`${path}/`)) files.delete(k)
    },
  }
  return { api, files, failNext: (op: keyof FsApi, times = 1) => (failNext = { op, times }) }
}

export function fakePrefs() {
  const values = new Map<string, string>()
  const api: PrefsApi = {
    get: async ({ key }) => ({ value: values.get(key) ?? null }),
    set: async ({ key, value }) => void values.set(key, value),
    remove: async ({ key }) => void values.delete(key),
  }
  return { api, values }
}
