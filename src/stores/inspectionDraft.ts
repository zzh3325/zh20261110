import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'daqiao-inspection-drafts'

export interface InspectionDraft {
  taskId: string
  inspectionItem?: string
  checkPosition?: string
  inspectionType?: string
  inspectionTime?: string
  inspectionTimeUserEdited?: boolean
  checkedAt?: string
  longitude?: number
  latitude?: number
  result: 'NORMAL' | 'ABNORMAL' | ''
  remark: string
  photos: string[]
}

export const useInspectionDraftStore = defineStore('inspectionDraft', () => {
  const stored = (uni.getStorageSync(STORAGE_KEY) || {}) as Record<string, InspectionDraft>
  for (const draft of Object.values(stored)) {
    draft.photos = Array.isArray(draft.photos) ? draft.photos.filter(path => !path.startsWith('blob:')) : []
  }
  const drafts = ref<Record<string, InspectionDraft>>(stored)

  function get(taskId: string): InspectionDraft {
    return drafts.value[taskId] || { taskId, result: '', remark: '', photos: [] }
  }

  function save(draft: InspectionDraft) {
    drafts.value[draft.taskId] = { ...draft }
    const persistentDrafts = Object.fromEntries(Object.entries(drafts.value).map(([key, value]) => [
      key,
      { ...value, photos: value.photos.filter(path => !path.startsWith('blob:')) }
    ]))
    uni.setStorageSync(STORAGE_KEY, persistentDrafts)
  }

  function remove(taskId: string) {
    delete drafts.value[taskId]
    uni.setStorageSync(STORAGE_KEY, drafts.value)
  }

  return { drafts, get, save, remove }
})
