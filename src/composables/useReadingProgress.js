import { ref } from 'vue'
import { storage } from '../utils/storage'

export function useReadingProgress(sutraId) {
  const savedPosition = ref(0)
  const progressPercent = ref(0)

  function restore() {
    const data = storage.getObject(`progress-${sutraId}`)
    if (data) savedPosition.value = data.position || 0
  }

  function save(position, percent) {
    progressPercent.value = percent
    storage.setObject(`progress-${sutraId}`, {
      sutraId, position, percent, time: Date.now()
    })
  }

  function clear() {
    storage.remove(`progress-${sutraId}`)
  }

  return { savedPosition, progressPercent, restore, save, clear }
}