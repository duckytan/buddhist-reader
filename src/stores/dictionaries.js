/**
 * 词典状态管理
 * 管理内置词典和外部词典的加载、切换、查询
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dictionary as builtinDictionary } from '@/data/dictionary'

// 缓存已加载的外部词典数据
let externalDictCache = null
let externalDictLoading = null

/**
 * 加载外部词典数据（从 public/dictionary.js）
 * 使用 fetch + 正则解析，避免 Vite 模块加载大文件
 */
async function loadExternalDictionary() {
  if (externalDictCache) return externalDictCache
  if (externalDictLoading) return externalDictLoading

  externalDictLoading = (async () => {
    const response = await fetch('/dictionary.js')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const text = await response.text()
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Failed to parse dictionary')
    
    const raw = JSON.parse(match[0])
    
    // 转换为统一格式
    externalDictCache = raw.map(entry => ({
      term: entry.t,
      pinyin: entry.p,
      sanskrit: entry.s,
      definition: Array.isArray(entry.d) 
        ? entry.d.map(d => `【${d.s}】${d.c}`).join('\n\n')
        : entry.d,
      category: entry.c,
      _dictId: 'external-mdx',
      _dictName: '佛教词典合集'
    }))
    
    console.log(`[Dictionaries] Loaded ${externalDictCache.length} external entries`)
    return externalDictCache
  })()

  return externalDictLoading
}

export const useDictionariesStore = defineStore('dictionaries', () => {
  // ============ State ============

  // 是否启用外部词典
  const externalDictEnabled = ref(true)
  
  // 外部词典是否已加载
  const externalDictLoaded = ref(false)
  
  // 加载进度（0-100）
  const loadProgress = ref(0)
  
  // 加载错误
  const loadError = ref(null)

  // ============ Getters ============

  // 内置词典词条
  const builtinEntries = computed(() => 
    builtinDictionary.map(item => ({
      term: item.term,
      pinyin: item.pinyin,
      sanskrit: item.sanskrit,
      definition: item.definition,
      category: item.category,
      _dictId: 'builtin',
      _dictName: '内置词典'
    }))
  )

  // 所有词条（内置 + 外部）
  const allEntries = computed(() => {
    if (!externalDictEnabled.value || !externalDictLoaded.value) {
      return builtinEntries.value
    }
    return [...builtinEntries.value, ...(externalDictCache || [])]
  })

  // 是否正在加载
  const isLoading = computed(() => externalDictLoading !== null && !externalDictLoaded.value)

  // ============ Actions ============

  /**
   * 初始化词典
   */
  async function initPresetDicts() {
    if (externalDictLoaded.value) return

    loadProgress.value = 0
    loadError.value = null

    try {
      await loadExternalDictionary()
      externalDictLoaded.value = true
    } catch (e) {
      loadError.value = e.message
      console.error('Failed to load external dictionary:', e)
      // 降级到只使用内置词典
      externalDictEnabled.value = false
    }
  }

  /**
   * 获取启用词典的所有词条（用于 Trie 匹配）
   */
  async function getAllEnabledDictEntries() {
    return allEntries.value
  }

  /**
   * 切换外部词典启用状态
   */
  function toggleExternalDict(enabled) {
    externalDictEnabled.value = enabled
  }

  // 兼容旧接口
  const presetDicts = ref([])
  const userDicts = ref([])
  const enabledDictIds = ref(new Set())
  const isInitialized = ref(false)
  
  function toggleDict() {}
  function lookupTerm() { return [] }

  return {
    // State
    externalDictEnabled,
    externalDictLoaded,
    loadProgress,
    loadError,
    presetDicts,
    userDicts,
    enabledDictIds,
    isInitialized,

    // Getters
    builtinEntries,
    allEntries,
    isLoading,

    // Actions
    initPresetDicts,
    getAllEnabledDictEntries,
    toggleExternalDict,
    toggleDict,
    lookupTerm
  }
})
