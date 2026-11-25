import { useSyncStore } from '../store/useSyncStore'
import { showToast } from '../store/useToastStore'

/** 加入別人分享的空間：透過 Google Picker 選一次檔案 */
export async function joinSpace(t: (k: string) => string) {
  try {
    const id = await useSyncStore.getState().joinSpaceViaPicker()
    if (id) showToast({ message: t('spaces.joined') })
  } catch (e) {
    console.error('加入共享空間失敗', e)
    showToast({ message: t('spaces.joinFailed') })
  }
}
