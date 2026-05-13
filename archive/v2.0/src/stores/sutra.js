import { defineStore } from 'pinia'
import { getServices } from '@/services/factory.js'
import { sutraManifest } from '@/data/sutraManifest.js'

export const useSutraStore = defineStore('sutra', {
  state: () => ({
    sutras: [],
    categories: [],
    loading: false,
    error: null,
    selectedCategory: null
  }),

  getters: {
    filteredSutras: (state) => {
      if (!state.selectedCategory) return state.sutras
      return state.sutras.filter(s => s.category === state.selectedCategory)
    },

    getSutraById: (state) => (id) => {
      return state.sutras.find(s => s.id === id) || null
    },

    getSutraBySlug: (state) => (slug) => {
      return state.sutras.find(s => s.slug === slug) || null
    }
  },

  actions: {
    async loadSutras() {
      this.loading = true
      this.error = null
      try {
        const services = getServices()
        const result = await services.sutra.listSutras()
        if (result.success) {
          this.sutras = result.data
          this.categories = [...new Set(result.data.map(s => s.category))]
        } else {
          this.error = result.error.message
          this.sutras = sutraManifest
          this.categories = [...new Set(sutraManifest.map(s => s.category))]
        }
      } catch (error) {
        this.error = error.message
        this.sutras = sutraManifest
        this.categories = [...new Set(sutraManifest.map(s => s.category))]
      } finally {
        this.loading = false
      }
    },

    setCategory(category) {
      this.selectedCategory = category
    },

    async importSutra(file) {
      const services = getServices()
      const result = await services.sutra.importSutra(file)
      if (result.success) {
        this.sutras.push(result.data)
        this.categories = [...new Set(this.sutras.map(s => s.category))]
      }
      return result
    }
  }
})
