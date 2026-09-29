import { ref, computed, watch } from 'vue'
import { useDictStore } from '../stores/dict'
import { searchDictTerms, getTermDefinitions } from '../utils/dictSearchEngine'

export function useDictSearch() {
  const dictStore = useDictStore()
  const query = ref('')
  const results = ref([])
  const searching = ref(false)
  let debounceTimer = null

  const enabledDictIds = computed(() => dictStore.allDictIds)

  function executeSearch() {
    const q = query.value
    if (!q || !q.trim()) {
      results.value = []
      searching.value = false
      return
    }

    searching.value = true

    const termList = searchDictTerms(q, enabledDictIds.value)

    results.value = termList.map(term => ({
      term,
      definitions: getTermDefinitions(term, enabledDictIds.value)
    }))

    searching.value = false
  }

  function onQueryChange() {
    searching.value = true
    clearTimeout(debounceTimer)

    debounceTimer = setTimeout(() => {
      executeSearch()
    }, 300)
  }

  watch(query, onQueryChange)

  return {
    query,
    results,
    searching,
    enabledDictIds,
    executeSearch
  }
}
