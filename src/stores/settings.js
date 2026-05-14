import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { storage } from '../utils/storage'

const FONT_SIZES = ['14px', '17px', '20px', '24px']
const LINE_HEIGHTS = ['1.50', '1.65', '1.80']
const THEMES = ['paper', 'night', 'eye-care']

export const useSettingsStore = defineStore('settings', () => {
  const fontSizeIndex = ref(storage.getNumber('settings-font-size', 1))
  const lineHeightIndex = ref(storage.getNumber('settings-line-height', 1))
  const theme = ref(storage.getString('settings-theme', 'paper'))

  const fontSize = ref(FONT_SIZES[fontSizeIndex.value])
  const lineHeight = ref(LINE_HEIGHTS[lineHeightIndex.value])

  const fontSizes = FONT_SIZES
  const lineHeights = LINE_HEIGHTS
  const themes = THEMES

  function setFontSize(index) {
    fontSizeIndex.value = index
    fontSize.value = FONT_SIZES[index]
    applyBodyStyles()
  }

  function setLineHeight(index) {
    lineHeightIndex.value = index
    lineHeight.value = LINE_HEIGHTS[index]
    applyBodyStyles()
  }

  function setTheme(name) {
    theme.value = name
    document.documentElement.setAttribute('data-theme', name)
  }

  function applyBodyStyles() {
    document.documentElement.style.setProperty('--text-body', fontSize.value)
    document.documentElement.style.setProperty('--leading-body', lineHeight.value)
  }

  function initFromStorage() {
    applyBodyStyles()
    setTheme(theme.value)
  }

  watch(fontSizeIndex, (v) => storage.setNumber('settings-font-size', v))
  watch(lineHeightIndex, (v) => storage.setNumber('settings-line-height', v))
  watch(theme, (v) => {
    storage.setString('settings-theme', v)
    setTheme(v)
  })

  return {
    fontSizeIndex, lineHeightIndex, theme,
    fontSize, lineHeight,
    fontSizes, lineHeights, themes,
    setFontSize, setLineHeight, setTheme, initFromStorage
  }
})