import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dictIndex, dictTerms } from '../data/dictIndex'
import { storage } from '../utils/storage'

export const useDictStore = defineStore('dict', () => {
  const termIndex = ref(dictIndex)
  const definitionCache = ref({})
  const enabledDicts = ref(storage.getObject('dicts-enabled') || {
    'dict-1': true, 'dict-2': true, 'dict-3': true
  })
  const lookupResult = ref(null)
  const lookupLoading = ref(false)
  const refreshKey = ref(0)

  const allDictIds = computed(() => Object.keys(enabledDicts.value))

  const enabledTerms = computed(() => {
    return dictTerms.filter(term => {
      const ids = termIndex.value[term] || []
      return ids.some(id => isDictEnabled(id))
    })
  })

  function isDictEnabled(dictId) { return enabledDicts.value[dictId] !== false }

  function toggleDict(dictId) {
    enabledDicts.value[dictId] = !isDictEnabled(dictId)
    storage.setObject('dicts-enabled', enabledDicts.value)
    triggerRefresh()
  }

  function getDictIdsForTerm(term) {
    const ids = termIndex.value[term] || []
    return ids.filter(id => isDictEnabled(id))
  }

  function triggerRefresh() { refreshKey.value++ }

  function clearCache() { definitionCache.value = {} }

  return {
    termIndex, definitionCache, enabledDicts,
    lookupResult, lookupLoading, allDictIds, enabledTerms, refreshKey,
    isDictEnabled, toggleDict, getDictIdsForTerm, triggerRefresh, clearCache
  }
})