/**
 * 词典状态管理
 * 管理内置词典、外部词典和用户自定义词典的加载、切换、查询
 * 支持每个词典单独开关，状态持久化到 localStorage
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { dictionary as builtinDictionary } from '@/data/dictionary'
import {
  getUserDictEntries,
  saveUserDictionary,
  deleteUserDictionary,
  getUserDictionaries,
  clearAllUserDictionaries,
  exportUserDictionaries,
  importUserDictionaries
} from '@/utils/userDictStorage'

// 本地存储 key
const STORAGE_KEY = 'buddhist-reader-dict-settings'

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
            _dictName: src.s,
            _sourceId: src.s
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
          _dictName: '佛教词典合集',
          _sourceId: 'external-mdx'
        })
      }
    }
    
    externalDictCache = entries
    console.log(`[Dictionaries] Loaded ${externalDictCache.length} external entries`)
    return externalDictCache
  })()

  return externalDictLoadingPromise
}

/**
 * 从 localStorage 加载词典设置
 */
function loadDictSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load dict settings:', e)
  }
  return null
}

/**
 * 保存词典设置到 localStorage
 */
function saveDictSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save dict settings:', e)
  }
}

export const useDictionariesStore = defineStore('dictionaries', () => {
  // ============ State ============

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

  // 启用的词典 ID 集合
  const enabledDictIds = ref(new Set())

  // 外部词典来源列表（动态生成）
  const externalSources = ref([])

  // ============ Getters ============

  // 内置词典词条（按词条分组）
  const builtinEntries = computed(() => 
    builtinDictionary.map(item => ({
      term: item.term,
      pinyin: item.pinyin,
      sanskrit: item.sanskrit,
      definition: item.definition,
      category: item.category,
      _dictId: 'builtin',
      _dictName: '内置词典',
      _sourceId: 'builtin'
    }))
  )

  // 所有词条（根据启用状态过滤）
  const allEntries = computed(() => {
    let entries = []
    
    // 内置词典
    if (enabledDictIds.value.has('builtin')) {
      entries = [...entries, ...builtinEntries.value]
    }
    
    // 外部词典（按来源过滤）
    if (externalDictLoaded.value && externalDictCache) {
      const enabledSources = [...enabledDictIds.value].filter(id => id.startsWith('source-') || id === 'external-mdx')
      if (enabledSources.length > 0) {
        const filtered = externalDictCache.filter(entry => 
          enabledDictIds.value.has(`source-${entry._sourceId}`) || enabledDictIds.value.has(entry._dictId)
        )
        entries = [...entries, ...filtered]
      }
    }
    
    // 用户自定义词典（按 ID 过滤）
    if (userDictEntriesCache.length > 0) {
      const filtered = userDictEntriesCache.filter(entry => 
        enabledDictIds.value.has(entry._dictId)
      )
      entries = [...entries, ...filtered]
    }
    
    return entries
  })

  // 词典列表（用于设置页面显示）
  const dictList = computed(() => {
    const list = []

    // 内置词典
    list.push({
      id: 'builtin',
      name: '内置词典',
      type: 'builtin',
      enabled: enabledDictIds.value.has('builtin'),
      entryCount: builtinDictionary.length
    })

    // 外部词典来源
    if (externalDictLoaded.value && externalSources.value.length > 0) {
      for (const source of externalSources.value) {
        list.push({
          id: `source-${source.id}`,
          name: source.name,
          type: 'external',
          enabled: enabledDictIds.value.has(`source-${source.id}`),
          entryCount: source.count
        })
      }
    }

    // 用户自定义词典
    for (const dict of userDictList.value) {
      list.push({
        id: `user-${dict.id}`,
        name: dict.name,
        type: 'user',
        enabled: enabledDictIds.value.has(`user-${dict.id}`),
        entryCount: dict.entries?.length || 0,
        userId: dict.id
      })
    }

    return list
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

      // 提取外部词典来源列表
      const sourceMap = new Map()
      for (const entry of externalDictCache) {
        const id = entry._sourceId
        if (!sourceMap.has(id)) {
          sourceMap.set(id, { id, name: entry._dictName, count: 0 })
        }
        sourceMap.get(id).count++
      }
      externalSources.value = [...sourceMap.values()]

      // 默认启用所有词典
      if (enabledDictIds.value.size === 0) {
        enabledDictIds.value.add('builtin')
        for (const source of externalSources.value) {
          enabledDictIds.value.add(`source-${source.id}`)
        }
      }
    } catch (e) {
      loadError.value = e.message
      console.error('Failed to load external dictionary:', e)
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

      // 默认启用新加载的用户词典
      for (const dict of userDictList.value) {
        enabledDictIds.value.add(`user-${dict.id}`)
      }

      // 保存设置
      persistSettings()
    } catch (e) {
      console.error('Failed to load user dictionaries:', e)
    }
  }

  /**
   * 上传用户自定义词典
   */
  async function uploadUserDictionary(file, onProgress, customName) {
    let data

    if (typeof file === 'object' && Array.isArray(file)) {
      data = file
    } else {
      const text = await file.text()
      data = JSON.parse(text)
    }

    if (!Array.isArray(data)) {
      throw new Error('词典数据必须是数组格式')
    }

    const id = `user-${Date.now()}`
    const name = customName || file.name.replace(/\.(json|mdx)$/i, '')

    await saveUserDictionary(id, name, data)
    await loadUserDictionaries()

    // 默认启用新上传的词典
    enabledDictIds.value.add(`user-${id}`)
    persistSettings()

    return { id, name, entryCount: data.length }
  }

  /**
   * 删除用户自定义词典
   */
  async function removeUserDictionary(id) {
    await deleteUserDictionary(id)
    enabledDictIds.value.delete(`user-${id}`)
    await loadUserDictionaries()
    persistSettings()
  }

  /**
   * 清空所有用户自定义词典
   */
  async function clearUserDictionaries() {
    await clearAllUserDictionaries()
    userDictList.value = []
    userDictEntriesCache = []
    // 清除所有 user- 前缀的启用 ID
    for (const id of enabledDictIds.value) {
      if (id.startsWith('user-')) {
        enabledDictIds.value.delete(id)
      }
    }
    persistSettings()
  }

  /**
   * 导出所有用户词典为 JSON 文件
   */
  async function exportDictionaries() {
    const data = await exportUserDictionaries()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `buddhist-reader-dicts-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return data.dictionaries.length
  }

  /**
   * 从 JSON 文件导入用户词典
   */
  async function importDictionaries(file) {
    const text = await file.text()
    const data = JSON.parse(text)
    const importedCount = await importUserDictionaries(data)
    await loadUserDictionaries()
    persistSettings()
    return importedCount
  }

  /**
   * 切换词典启用状态
   */
  function toggleDict(dictId, enabled) {
    if (enabled) {
      enabledDictIds.value.add(dictId)
    } else {
      enabledDictIds.value.delete(dictId)
    }
    persistSettings()
  }

  /**
   * 启用所有词典
   */
  function enableAllDicts() {
    enabledDictIds.value.add('builtin')
    for (const source of externalSources.value) {
      enabledDictIds.value.add(`source-${source.id}`)
    }
    for (const dict of userDictList.value) {
      enabledDictIds.value.add(`user-${dict.id}`)
    }
    persistSettings()
  }

  /**
   * 禁用所有词典
   */
  function disableAllDicts() {
    enabledDictIds.value.clear()
    persistSettings()
  }

  /**
   * 持久化设置到 localStorage
   */
  function persistSettings() {
    saveDictSettings({
      enabledDictIds: [...enabledDictIds.value]
    })
  }

  /**
   * 恢复设置
   */
  function restoreSettings() {
    const settings = loadDictSettings()
    if (settings && settings.enabledDictIds) {
      enabledDictIds.value = new Set(settings.enabledDictIds)
    }
  }

  /**
   * 获取启用词典的所有词条（用于 Trie 匹配）
   */
  async function getAllEnabledDictEntries() {
    return allEntries.value
  }

  // 兼容旧接口
  const presetDicts = ref([])
  const isInitialized = ref(false)
  const externalDictEnabled = computed(() => [...enabledDictIds.value].some(id => id.startsWith('source-') || id === 'external-mdx'))

  function toggleExternalDict(enabled) {
    if (enabled) {
      enableAllDicts()
    } else {
      disableAllDicts()
    }
  }
  
  function toggleDict() {}
  function lookupTerm() { return [] }

  return {
    // State
    externalDictLoaded,
    loadProgress,
    loadError,
    userDictList,
    externalSources,
    enabledDictIds,
    presetDicts,
    isInitialized,

    // Getters
    builtinEntries,
    allEntries,
    dictList,
    isLoading,
    externalDictEnabled,

    // Actions
    initPresetDicts,
    loadUserDictionaries,
    uploadUserDictionary,
    removeUserDictionary,
    clearUserDictionaries,
    exportDictionaries,
    importDictionaries,
    toggleDict,
    enableAllDicts,
    disableAllDicts,
    persistSettings,
    restoreSettings,
    getAllEnabledDictEntries,
    toggleExternalDict,
    toggleDict,
    lookupTerm
  }
})
