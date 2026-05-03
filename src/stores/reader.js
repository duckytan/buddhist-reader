import { defineStore } from 'pinia'
import { getServices } from '@/services/factory.js'

export const useReaderStore = defineStore('reader', {
  state: () => ({
    currentSutra: null,
    currentChapter: 1,
    totalChapters: 1,
    content: '',
    highlightedHtml: '',
    scrollPosition: 0,
    readPercentage: 0,
    loading: false,
    error: null,
    showToc: false,
    showSettings: false,
    selectedTerm: null,
    dictResults: []
  }),

  getters: {
    currentChapterTitle: (state) => {
      if (!state.currentSutra) return ''
      if (state.totalChapters === 1) return state.currentSutra.title
      return `${state.currentSutra.title} · 第${state.currentChapter}章`
    },

    hasProgress: (state) => {
      return state.scrollPosition > 0 || state.readPercentage > 0
    }
  },

  actions: {
    async loadSutra(sutraId) {
      this.loading = true
      this.error = null
      try {
        const services = getServices()
        const result = await services.sutra.getSutra(sutraId)
        if (result.success) {
          this.currentSutra = result.data
          this.totalChapters = result.data.chapterCount || 1
          await this.loadChapter(this.currentChapter)
        } else {
          this.error = result.error.message
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async loadChapter(chapterIndex) {
      this.currentChapter = chapterIndex
      this.loading = true
      try {
        const progressResult = await services.progress.getProgress(this.currentSutra.id)
        if (progressResult.success && progressResult.data) {
          this.scrollPosition = progressResult.data.scrollPosition || 0
          this.readPercentage = progressResult.data.readPercentage || 0
          this.currentChapter = progressResult.data.chapterIndex || chapterIndex
        }

        this.content = this._getMockContent()
        this.highlightedHtml = this.content
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async lookupTerm(term) {
      this.selectedTerm = term
      const services = getServices()
      const results = await services.dict.lookupTerms(term)
      this.dictResults = results
    },

    clearSelectedTerm() {
      this.selectedTerm = null
      this.dictResults = []
    },

    async saveProgress() {
      if (!this.currentSutra) return
      const services = getServices()
      await services.progress.saveProgress(
        this.currentSutra.id,
        this.currentChapter,
        this.scrollPosition,
        this.readPercentage
      )
    },

    toggleToc() {
      this.showToc = !this.showToc
      this.showSettings = false
    },

    toggleSettings() {
      this.showSettings = !this.showSettings
      this.showToc = false
    },

    closePanels() {
      this.showToc = false
      this.showSettings = false
    },

    _getMockContent() {
      if (this.currentSutra) {
        return `《${this.currentSutra.title}》\n\n${this.currentSutra.description || ''}\n\n（经文内容加载中...）`
      }
      return ''
    }
  }
})
