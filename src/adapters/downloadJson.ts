/** 把資料存成 JSON 檔下載（設定頁「匯出」與錯誤畫面「下載資料備份」共用，格式相同，可以在設定頁匯入） */
export function downloadJson(data: unknown, fileName: string) {
  downloadText(JSON.stringify(data, null, 2), fileName, 'application/json')
}

/** 把文字存成檔案下載（例如 .ics 行事曆） */
export function downloadText(text: string, fileName: string, type: string) {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}

/** 匯出檔名：acacia-YYYY-MM-DD.json */
export const backupFileName = (now = new Date()) => `acacia-${now.toISOString().slice(0, 10)}.json`
