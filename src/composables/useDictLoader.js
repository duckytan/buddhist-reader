import { ref } from 'vue'

const CACHE_TTL = 5 * 60 * 1000

export function useDictLoader() {
  const cache = ref({})
  const errors = ref([])

  async function fetchDict(dictId, manifest) {
    const cached = cache.value[dictId]
    if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data

    const entry = manifest.find(d => d.id === dictId)
    if (!entry) throw new Error(`Unknown dict: ${dictId}`)

    const resp = await fetch(`/dicts/${encodeURIComponent(entry.filename)}`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()

    cache.value[dictId] = { data, time: Date.now() }
    return data
  }

  async function lookupTerm(term, dictIds, manifest) {
    const results = []
    const newErrors = []

    const promises = dictIds.map(async (dictId) => {
      try {
        const dict = await fetchDict(dictId, manifest)
        const entry = dict.entries.find(e => e.term === term)
        if (entry) {
          results.push({ dictId, ...entry })
        }
      } catch (e) {
        newErrors.push({ dictId, message: e.message })
      }
    })

    await Promise.all(promises)
    errors.value = newErrors
    return results
  }

  function clearCache() { cache.value = {} }

  return { cache, errors, fetchDict, lookupTerm, clearCache }
}