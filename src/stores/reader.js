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
    dictResults: [],
    currentPage: 1,
    itemsPerPage: 2000
  }),

  getters: {
    currentChapterTitle: (state) => {
      if (!state.currentSutra) return ''
      if (state.totalChapters === 1) return state.currentSutra.title
      return `${state.currentSutra.title} · 第${state.currentChapter}章`
    },

    hasProgress: (state) => {
      return state.scrollPosition > 0 || state.readPercentage > 0
    },

    totalPages: (state) => {
      if (!state.content) return 1
      return Math.ceil(state.content.length / state.itemsPerPage)
    },

    paginatedContent: (state) => {
      if (!state.content) return ''
      const start = (state.currentPage - 1) * state.itemsPerPage
      const end = start + state.itemsPerPage
      return state.content.slice(start, end)
    },

    pageIndicator: (state) => {
      return `${state.currentPage} / ${Math.ceil(state.content.length / state.itemsPerPage) || 1}`
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
      this.currentPage = 1
      this.loading = true
      try {
        const services = getServices()
        const progressResult = await services.progress.getProgress(this.currentSutra.id)
        if (progressResult.success && progressResult.data) {
          this.scrollPosition = progressResult.data.scrollPosition || 0
          this.readPercentage = progressResult.data.readPercentage || 0
          this.currentChapter = progressResult.data.chapterIndex || chapterIndex
        }

        const contentResult = await services.sutra.getSutraContent(this.currentSutra.id)
        if (contentResult.success) {
          const data = contentResult.data
          if (data.chapters && data.chapters.length > 0) {
            const chapter = data.chapters[chapterIndex - 1] || data.chapters[0]
            this.content = chapter.content || ''
            this.totalChapters = data.chapters.length
          } else {
            this.content = data.content || this._getMockContent()
          }
        } else {
          this.content = this._getMockContent()
        }
        
        this.highlightedHtml = this.content
      } catch (error) {
        this.error = error.message
        this.content = this._getMockContent()
      } finally {
        this.loading = false
      }
    },

scrollToTop() {
      this.scrollPosition = 0
      window.scrollTo(0, 0)
    },

    nextPage() {
      const total = Math.ceil(this.content.length / this.itemsPerPage)
      if (this.currentPage < total) {
        this.currentPage++
        this.scrollToTop()
      }
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.scrollToTop()
      }
    },

    goToPage(page) {
      const total = Math.ceil(this.content.length / this.itemsPerPage)
      if (page >= 1 && page <= total) {
        this.currentPage = page
        this.scrollToTop()
      }
    },

    async lookupTerm(term) {
      this.selectedTerm = term
      const services = getServices()
      const result = await services.dict.lookupTerms(term, [0])
      if (result.success) {
        this.dictResults = result.data
      } else {
        this.dictResults = []
      }
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
