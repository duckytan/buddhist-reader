import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // State
  const isDarkMode = ref(false)

  // Load from localStorage on initialization
  const loadTheme = () => {
    try {
      const saved = localStorage.getItem('buddhist-reader-theme')
      if (saved) {
        isDarkMode.value = JSON.parse(saved)
      } else {
        // 检测系统偏好
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    }
  }

  // Actions
  const setDarkMode = (dark) => {
    isDarkMode.value = dark
    applyTheme(dark)
    saveTheme()
  }

  const toggleDarkMode = () => {
    setDarkMode(!isDarkMode.value)
  }

  const applyTheme = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  const saveTheme = () => {
    try {
      localStorage.setItem('buddhist-reader-theme', JSON.stringify(isDarkMode.value))
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  // Initialize
  loadTheme()
  applyTheme(isDarkMode.value)

  return {
    // State
    isDarkMode,
    // Actions
    setDarkMode,
    toggleDarkMode
  }
})
