import { ref } from 'vue'
import { dictDefinitions } from '../data/dictIndex'

export function useDictLoader() {
  const errors = ref([])

  function lookupTerm(term, dictIds) {
    const results = []
    const newErrors = []

    for (const dictId of dictIds) {
      const defs = dictDefinitions[dictId]
      if (!defs) {
        newErrors.push({ dictId, message: 'No definitions loaded' })
        continue
      }
      const definition = defs[term]
      if (definition) {
        results.push({ dictId, term, definition })
      }
    }

    errors.value = newErrors
    return results
  }

  function clearCache() {}

  return { errors, lookupTerm, clearCache }
}