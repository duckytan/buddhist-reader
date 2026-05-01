import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'buddhist-reader-ignored-terms'

export const useIgnoredTermsStore = defineStore('ignoredTerms', () => {
  const ignoredTerms = ref(new Set())

  // 从 localStorage 加载
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const arr = JSON.parse(stored)
        ignoredTerms.value = new Set(arr)
      }
    } catch (e) {
      console.warn('Failed to load ignored terms:', e)
    }
  }

  // 保存到 localStorage
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ignoredTerms.value]))
    } catch (e) {
      console.warn('Failed to save ignored terms:', e)
    }
  }

  // 检查是否忽略
  function isIgnored(term) {
    return ignoredTerms.value.has(term)
  }

  // 添加忽略
  function addIgnoredTerm(term) {
    ignoredTerms.value.add(term)
    saveToStorage()
  }

  // 移除忽略
  function removeIgnoredTerm(term) {
    ignoredTerms.value.delete(term)
    saveToStorage()
  }

  // 清除所有
  function clearAll() {
    ignoredTerms.value.clear()
    saveToStorage()
  }

  // 获取所有忽略词条
  function getAll() {
    return [...ignoredTerms.value].sort()
  }

  // 初始化
  loadFromStorage()

  return {
    ignoredTerms,
    isIgnored,
    addIgnoredTerm,
    removeIgnoredTerm,
    clearAll,
    getAll
  }
})
