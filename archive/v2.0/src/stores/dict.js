import { defineStore } from 'pinia'
import { getServices } from '@/services/factory.js'
import { getBuiltinTermCount } from '@/data/builtinDictionary.js'

export const useDictStore = defineStore('dict', {
  state: () => ({
    dictionaries: [],
    externalDictionaries: [],
    activeDictIds: [0],
    loading: false,
    error: null,
    trieData: null
  }),

  getters: {
    activeDictionaries: (state) => {
      return state.dictionaries.filter(d => state.activeDictIds.includes(d.id))
    },

    hasActiveDicts: (state) => {
      return state.activeDictIds.length > 0
    },

    builtinDict: (state) => {
      return state.dictionaries.find(d => d.id === 0)
    }
  },

  actions: {
    async loadDictionaries() {
      this.loading = true
      this.error = null
      try {
        const services = getServices()
        const result = await services.dict.listDictionaries()
        if (result.success) {
          this.dictionaries = result.data
          const activeIds = result.data
            .filter(d => d.isActive)
            .map(d => d.id)
          if (activeIds.length > 0 && !this.activeDictIds.includes(0)) {
            this.activeDictIds = [0, ...activeIds]
          } else if (activeIds.length > 0) {
            this.activeDictIds = activeIds
          }
        } else {
          this.error = result.error.message
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async loadExternalDictionaries() {
      try {
        const response = await fetch('/dicts/manifest.json')
        if (!response.ok) throw new Error('Failed to load dict manifest')
        const manifest = await response.json()

        const externalDicts = []
        for (const item of manifest) {
          const dictResponse = await fetch(`/dicts/${item.filename}`)
          if (dictResponse.ok) {
            const dictData = await dictResponse.json()
            externalDicts.push({
              id: item.id,
              name: item.name,
              entries: dictData.entries || [],
              filename: item.filename
            })
          }
        }
        this.externalDictionaries = externalDicts
      } catch (error) {
        console.warn('[DictStore] Failed to load external dictionaries:', error)
      }
    },

    async toggleDictionary(dictId, isActive) {
      const services = getServices()
      const result = await services.dict.toggleDictionary(dictId, isActive)
      if (result.success) {
        if (isActive && !this.activeDictIds.includes(dictId)) {
          this.activeDictIds.push(dictId)
        } else {
          this.activeDictIds = this.activeDictIds.filter(id => id !== dictId)
        }
      }
      return result
    },

    async deleteDictionary(dictId) {
      const services = getServices()
      const result = await services.dict.deleteDictionary(dictId)
      if (result.success) {
        this.dictionaries = this.dictionaries.filter(d => d.id !== dictId)
        this.activeDictIds = this.activeDictIds.filter(id => id !== dictId)
      }
      return result
    },

    async lookupTerms(term) {
      if (!term || term.trim().length === 0) return []
      const services = getServices()
      const result = await services.dict.lookupTerms(term.trim(), this.activeDictIds)
      if (result.success) {
        return result.data
      }
      return []
    },

    async importDictionary(file) {
      const services = getServices()
      const result = await services.dict.importDictionary(file)
      if (result.success) {
        await this.loadDictionaries()
      }
      return result
    }
  }
})
