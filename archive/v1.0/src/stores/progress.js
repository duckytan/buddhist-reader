import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProgressStore = defineStore('progress', () => {
  // State
  const progressMap = ref(new Map()) // sutraId -> { percentage, chapterIndex, scrollPosition, lastReadTime }
  const readingHistory = ref([]) // 最近阅读的经文列表 [{ sutraId, lastReadTime, progress }]

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

    try {
      const savedHistory = localStorage.getItem('buddhist-reader-history')
      if (savedHistory) {
        readingHistory.value = JSON.parse(savedHistory)
      }
    } catch (error) {
      console.error('Failed to load reading history:', error)
    }
  }

  // Actions
  const saveProgress = (sutraId, data) => {
    const existing = progressMap.value.get(sutraId) || {}
    const progressData = {
      percentage: data.percentage || 0,
      chapterIndex: data.chapterIndex || 0,
      scrollPosition: data.scrollPosition || 0,
      lastReadTime: Date.now(),
      ...existing,
      ...data
    }
    progressMap.value.set(sutraId, progressData)
    persistProgress()

    // 更新阅读历史
    updateReadingHistory(sutraId, progressData)
  }

  const getProgress = (sutraId) => {
    return progressMap.value.get(sutraId) || { percentage: 0, chapterIndex: 0, scrollPosition: 0 }
  }

  const clearProgress = () => {
    progressMap.value.clear()
    readingHistory.value = []
    persistProgress()
    persistHistory()
  }

  const updateReadingHistory = (sutraId, progressData) => {
    // 移除已存在的记录
    readingHistory.value = readingHistory.value.filter(item => item.sutraId !== sutraId)
    
    // 添加到开头
    readingHistory.value.unshift({
      sutraId,
      lastReadTime: progressData.lastReadTime,
      progress: progressData.percentage
    })
    
    // 只保留最近10条
    if (readingHistory.value.length > 10) {
      readingHistory.value = readingHistory.value.slice(0, 10)
    }
    
    persistHistory()
  }

  const getRecentReadings = (limit = 5) => {
    return readingHistory.value.slice(0, limit)
  }

  const persistProgress = () => {
    try {
      const obj = Object.fromEntries(progressMap.value)
      localStorage.setItem('buddhist-reader-progress', JSON.stringify(obj))
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const persistHistory = () => {
    try {
      localStorage.setItem('buddhist-reader-history', JSON.stringify(readingHistory.value))
    } catch (error) {
      console.error('Failed to save reading history:', error)
    }
  }

  // Initialize
  loadProgress()

  return {
    // State
    progressMap,
    readingHistory,
    // Actions
    saveProgress,
    getProgress,
    getRecentReadings,
    clearProgress
  }
})
