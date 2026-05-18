import { ref, watch, unref, isRef } from 'vue'
import { storage } from '../utils/storage'

export function useReadingProgress(sutraIdRef) {
  const savedPosition = ref(0)
  const progressPercent = ref(0)

  function getKey() {
    const id = unref(sutraIdRef)
    return id ? `progress-${id}` : null
  }

  function restore() {
    const key = getKey()
    if (!key) return
    const data = storage.getObject(key)
    if (data) savedPosition.value = data.position || 0
  }

  function save(position, percent) {
    const key = getKey()
    if (!key) return
    progressPercent.value = percent
    storage.setObject(key, {
      sutraId: unref(sutraIdRef), position, percent, time: Date.now()
    })
  }

  function clear() {
    const key = getKey()
    if (!key) return
    storage.remove(key)
  }

  if (isRef(sutraIdRef)) {
    watch(sutraIdRef, () => { restore() }, { immediate: true })
  } else {
    restore()
  }

  return { savedPosition, progressPercent, restore, save, clear }
}