import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const base = import.meta.env.BASE_URL

export const useSutraStore = defineStore('sutra', () => {
  const sutraList = ref([])
  const currentSutra = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const categories = [
    { key: 'all', label: '全部' },
    { key: 'prajna', label: '般若' },
    { key: 'yogacara', label: '唯识' },
    { key: 'chan', label: '禅宗' },
    { key: 'mantra', label: '密咒' },
    { key: 'general', label: '通论' },
    { key: 'biography', label: '传记' }
  ]

  const activeCategory = ref('all')

  const filteredList = computed(() => {
    if (activeCategory.value === 'all') return sutraList.value
    return sutraList.value.filter(s => s.category === activeCategory.value)
  })

  async function fetchManifest() {
    loading.value = true
    error.value = null
    try {
      const resp = await fetch(`${base}sutras/manifest.json`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      sutraList.value = await resp.json()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchSutra(filename) {
    error.value = null
    try {
      const resp = await fetch(`${base}sutras/${filename}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      currentSutra.value = await resp.json()
    } catch (e) {
      error.value = e.message
    }
  }

  function setCategory(key) {
    activeCategory.value = key
  }

  function retry() {
    fetchManifest()
  }

  return {
    sutraList, currentSutra, loading, error,
    categories, activeCategory, filteredList,
    fetchManifest, fetchSutra, setCategory, retry
  }
})