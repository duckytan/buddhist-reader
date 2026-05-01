/**
 * 词典状态管理
 * 管理内置词典、外部词典和用户自定义词典的加载、切换、查询
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dictionary as builtinDictionary } from '@/data/dictionary'
import {
  getUserDictEntries,
  saveUserDictionary,
  deleteUserDictionary,
  getUserDictionaries,
  clearAllUserDictionaries
} from '@/utils/userDictStorage'

// 缓存已加载的外部词典数据
let externalDictCache = null
let externalDictLoadingPromise = null

/**
 * 加载外部词典数据（从 public/dictionary.json）
 */
async function loadExternalDictionary() {
  if (externalDictCache) return externalDictCache
  if (externalDictLoadingPromise) return externalDictLoadingPromise

  externalDictLoadingPromise = (async () => {
    const response = await fetch('/dictionary.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const raw = await response.json()
    
    // 转换为统一格式，多来源词条拆分为独立条目
    const entries = []
    for (const entry of raw) {
      const sources = Array.isArray(entry.d) ? entry.d : null
      if (sources) {
        // 多来源：拆分为独立条目，每条对应一个来源
        for (const src of sources) {
          entries.push({
            term: entry.t,
            pinyin: entry.p,
            sanskrit: entry.s,
            definition: src.c,
            category: entry.c,
            _dictId: `source-${src.s}`,
            _dictName: src.s
          })
        }
      } else {
        // 单来源
        entries.push({
          term: entry.t,
          pinyin: entry.p,
          sanskrit: entry.s,
          definition: entry.d,
          category: entry.c,
          _dictId: 'external-mdx',
          _dictName: '佛教词典合集'
        })
      }
    }
    
    externalDictCache = entries
    console.log(`[Dictionaries] Loaded ${externalDictCache.length} external entries`)
    return externalDictCache
  })()

  return externalDictLoadingPromise
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

  // 用户自定义词典列表
  const userDictList = ref([])
  
  // 用户自定义词典词条缓存
  let userDictEntriesCache = []

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

  // 所有词条（内置 + 外部 + 用户）
  const allEntries = computed(() => {
    let entries = [...builtinEntries.value]
    
    if (externalDictEnabled.value && externalDictLoaded.value) {
      entries = [...entries, ...(externalDictCache || [])]
    }
    
    // 添加用户自定义词典词条
    entries = [...entries, ...userDictEntriesCache]
    
    return entries
  })

  // 是否正在加载
  const isLoading = computed(() => externalDictLoadingPromise !== null && !externalDictLoaded.value)

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

    // 加载用户自定义词典
    await loadUserDictionaries()
  }

  /**
   * 加载用户自定义词典
   */
  async function loadUserDictionaries() {
    try {
      userDictList.value = await getUserDictionaries()
      userDictEntriesCache = await getUserDictEntries()
      console.log(`[Dictionaries] Loaded ${userDictEntriesCache.length} user dictionary entries from ${userDictList.value.length} dicts`)
    } catch (e) {
      console.error('Failed to load user dictionaries:', e)
    }
  }

  /**
   * 上传用户自定义词典
   * @param {File} file - JSON 文件
   * @param {Function} onProgress - 进度回调
   * @param {string} customName - 自定义词典名称（可选）
   */
  async function uploadUserDictionary(file, onProgress, customName) {
    let data

    // 判断是否已经是解析后的数据
    if (typeof file === 'object' && Array.isArray(file)) {
      data = file
    } else {
      const text = await file.text()
      data = JSON.parse(text)
    }

    // 验证数据格式
    if (!Array.isArray(data)) {
      throw new Error('词典数据必须是数组格式')
    }

    // 生成唯一 ID
    const id = `user-${Date.now()}`
    const name = customName || file.name.replace(/\.(json|mdx)$/i, '')

    // 保存到 IndexedDB
    await saveUserDictionary(id, name, data)

    // 更新状态
    await loadUserDictionaries()

    return { id, name, entryCount: data.length }
  }

  /**
   * 删除用户自定义词典
   */
  async function removeUserDictionary(id) {
    await deleteUserDictionary(id)
    await loadUserDictionaries()
  }

  /**
   * 清空所有用户自定义词典
   */
  async function clearUserDictionaries() {
    await clearAllUserDictionaries()
    userDictList.value = []
    userDictEntriesCache = []
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
    userDictList,
    presetDicts,
    enabledDictIds,
    isInitialized,

    // Getters
    builtinEntries,
    allEntries,
    isLoading,

    // Actions
    initPresetDicts,
    loadUserDictionaries,
    uploadUserDictionary,
    removeUserDictionary,
    clearUserDictionaries,
    getAllEnabledDictEntries,
    toggleExternalDict,
    toggleDict,
    lookupTerm
  }
})
