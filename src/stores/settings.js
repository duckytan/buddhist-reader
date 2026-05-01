import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const fontSize = ref(18)
  const showPinyin = ref(false)
  const ttsSpeed = ref(1.0)
  const lineHeight = ref('loose')

  const lineHeightLabelMap = {
    tight: '紧凑',
    base: '标准',
    loose: '宽松'
  }

  const lineHeightCssMap = {
    tight: 'var(--line-height-tight)',
    base: 'var(--line-height-base)',
    loose: 'var(--line-height-loose)'
  }

  // Load from localStorage on initialization
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('buddhist-reader-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        fontSize.value = parsed.fontSize || 18
        showPinyin.value = parsed.showPinyin !== undefined ? parsed.showPinyin : false
        ttsSpeed.value = parsed.ttsSpeed || 1.0
        lineHeight.value = parsed.lineHeight || 'loose'
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

  const setLineHeight = (value) => {
    lineHeight.value = value
    saveSettings()
  }

  const saveSettings = () => {
    try {
      const settings = {
        fontSize: fontSize.value,
        showPinyin: showPinyin.value,
        ttsSpeed: ttsSpeed.value,
        lineHeight: lineHeight.value
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
    lineHeight,
    lineHeightLabelMap,
    lineHeightCssMap,
    // Actions
    setFontSize,
    setShowPinyin,
    setTtsSpeed,
    setLineHeight
  }
})
