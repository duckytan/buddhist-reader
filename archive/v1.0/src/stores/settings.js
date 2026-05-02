import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const fontSize = ref(18)
  const showPinyin = ref(false)
  const ttsSpeed = ref(1.0)

  // Load from localStorage on initialization
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('buddhist-reader-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        fontSize.value = parsed.fontSize || 18
        showPinyin.value = parsed.showPinyin !== undefined ? parsed.showPinyin : false
        ttsSpeed.value = parsed.ttsSpeed || 1.0
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  // Actions
  const setFontSize = (size) => {
    fontSize.value = size
    saveSettings()
  }

  const setShowPinyin = (show) => {
    showPinyin.value = show
    saveSettings()
  }

  const setTtsSpeed = (speed) => {
    ttsSpeed.value = speed
    saveSettings()
  }

  const saveSettings = () => {
    try {
      const settings = {
        fontSize: fontSize.value,
        showPinyin: showPinyin.value,
        ttsSpeed: ttsSpeed.value
      }
      localStorage.setItem('buddhist-reader-settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // Initialize
  loadSettings()

  return {
    // State
    fontSize,
    showPinyin,
    ttsSpeed,
    // Actions
    setFontSize,
    setShowPinyin,
    setTtsSpeed
  }
})
