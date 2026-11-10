import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'daqiao-inspection-drafts'

export interface InspectionDraft {
  taskId: string
  checkedAt?: string
  longitude?: number
  latitude?: number
  result: 'NORMAL' | 'ABNORMAL' | ''
  remark: string
  photos: string[]
}

export const useInspectionDraftStore = defineStore('inspectionDraft', () => {
  const drafts = ref<Record<string, InspectionDraft>>(uni.getStorageSync(STORAGE_KEY) || {})

  function get(taskId: string): InspectionDraft {
    return drafts.value[taskId] || { taskId, result: '', remark: '', photos: [] }
  }

  function save(draft: InspectionDraft) {
    drafts.value[draft.taskId] = { ...draft }
    uni.setStorageSync(STORAGE_KEY, drafts.value)
  }

  function remove(taskId: string) {
    delete drafts.value[taskId]
    uni.setStorageSync(STORAGE_KEY, drafts.value)
  }

  return { drafts, get, save, remove }
})
