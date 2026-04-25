import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProgressStore = defineStore('progress', () => {
  // State
  const progressMap = ref(new Map())

  // Load from localStorage on initialization
  const loadProgress = () => {
    try {
      const saved = localStorage.getItem('buddhist-reader-progress')
      if (saved) {
        const parsed = JSON.parse(saved)
        progressMap.value = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
    }
  }

  // Actions
  const saveProgress = (sutraId, percentage) => {
    progressMap.value.set(sutraId, percentage)
    persistProgress()
  }

  const getProgress = (sutraId) => {
    return progressMap.value.get(sutraId) || 0
  }

  const clearProgress = () => {
    progressMap.value.clear()
    persistProgress()
  }

  const persistProgress = () => {
    try {
      const obj = Object.fromEntries(progressMap.value)
      localStorage.setItem('buddhist-reader-progress', JSON.stringify(obj))
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  // Initialize
  loadProgress()

  return {
    // State
    progressMap,
    // Actions
    saveProgress,
    getProgress,
    clearProgress
  }
})
