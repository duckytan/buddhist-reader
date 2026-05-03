import { defineStore } from 'pinia'
import { getServices } from '@/services/factory.js'

const DEFAULT_SETTINGS = {
  theme: 'day',
  fontSize: 18,
  lineHeight: 1.8,
  pageMargin: 16,
  highlightMode: 'background',
  displayMode: 'expandFirst',
  ttsRate: 1.0,
  ttsEnabled: true
}

export const useSettingStore = defineStore('setting', {
  state: () => ({
    settings: { ...DEFAULT_SETTINGS },
    loading: false,
    error: null
  }),

  getters: {
    theme: (state) => state.settings.theme,
    fontSize: (state) => state.settings.fontSize,
    lineHeight: (state) => state.settings.lineHeight,
    pageMargin: (state) => state.settings.pageMargin,
    highlightMode: (state) => state.settings.highlightMode,
    displayMode: (state) => state.settings.displayMode,
    ttsRate: (state) => state.settings.ttsRate,
    ttsEnabled: (state) => state.settings.ttsEnabled
  },

  actions: {
    async loadSettings() {
      this.loading = true
      this.error = null
      try {
        const services = getServices()
        const result = await services.setting.getSettingsByCategory('display')
        if (result.success) {
          this.settings = { ...DEFAULT_SETTINGS, ...result.data }
          this._applyTheme()
        } else {
          this.error = result.error.message
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async updateSetting(key, value) {
      this.settings[key] = value
      if (key === 'theme') {
        this._applyTheme()
      }

      const category = this._getCategory(key)
      const services = getServices()
      const result = await services.setting.setSetting(key, value, category)
      if (!result.success) {
        this.error = result.error.message
      }
      return result
    },

    async resetSetting(key) {
      if (key in DEFAULT_SETTINGS) {
        this.settings[key] = DEFAULT_SETTINGS[key]
        if (key === 'theme') {
          this._applyTheme()
        }
      }
    },

    async resetAllSettings() {
      this.settings = { ...DEFAULT_SETTINGS }
      this._applyTheme()
      const services = getServices()
      await services.setting.resetAll()
    },

    async exportSettings() {
      const services = getServices()
      return await services.setting.exportSettings()
    },

    async importSettings(settings) {
      const services = getServices()
      const result = await services.setting.importSettings(settings)
      if (result.success) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings }
        this._applyTheme()
      }
      return result
    },

    _applyTheme() {
      const theme = this.settings.theme
      document.documentElement.classList.remove('theme-day', 'theme-dark', 'theme-eye-care')
      document.documentElement.classList.add(`theme-${theme}`)

      const themeColors = {
        day: '#ffffff',
        dark: '#1a1a1a',
        'eye-care': '#f5f0e8'
      }
      const color = themeColors[theme] || '#ffffff'
      document.querySelector('meta[name="theme-color"]').setAttribute('content', color)
    },

    _getCategory(key) {
      const categories = {
        theme: 'display',
        fontSize: 'reader',
        lineHeight: 'reader',
        pageMargin: 'reader',
        highlightMode: 'dict',
        displayMode: 'dict',
        ttsRate: 'reader',
        ttsEnabled: 'reader'
      }
      return categories[key] || 'display'
    }
  }
})
