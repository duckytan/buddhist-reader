import { ref } from 'vue'
import { useSutraStore } from '../stores/sutra'

export function useSutraLoader() {
  const sutraStore = useSutraStore()
  const loading = ref(false)
  const error = ref(null)
  const retryCount = ref(0)

  async function load(filename, maxRetries = 2) {
    loading.value = true
    error.value = null
    retryCount.value = 0

    while (retryCount.value <= maxRetries) {
      try {
        await sutraStore.fetchManifest()
        await sutraStore.fetchSutra(filename)
        if (sutraStore.error) {
          throw new Error(sutraStore.error)
        }
        loading.value = false
        return
      } catch (e) {
        retryCount.value++
        if (retryCount.value > maxRetries) {
          error.value = e.message
          loading.value = false
          return
        }
      }
    }
  }

  function retry(filename) {
    retryCount.value = 0
    load(filename)
  }

  return { loading, error, retryCount, load, retry }
}