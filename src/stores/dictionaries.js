/**
 * 词典状态管理
 * 管理预置词典和用户上传词典的加载、切换、查询
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadMDXFromUrl, loadMDXFromFile, lookupInDicts } from '@/utils/mdict-service'

// 预置词典配置
// 格式: { id, name, mdxUrl, mddUrl }
// 注意: 文件名必须与 public/mdict/ 下的实际文件名一致
const PRESET_DICTS = [
  {
    id: 'new-mdict',
    name: '佛教术语词典',
    mdxUrl: '/mdict/new_mdict.mdx',
    mddUrl: null
  },
  {
    id: 'chinese-buddhism-pedia',
    name: '中华佛教百科全书',
    mdxUrl: '/mdict/中华佛教百科全书.mdx',
    mddUrl: null  // 暂时不支持 MDD
  },
  {
    id: 'fo-jiao-ci-dian',
    name: '中国佛教网辞典',
    mdxUrl: '/mdict/中国佛教网辞典.mdx',
    mddUrl: null
  },
  {
    id: 'buddhist-terms-full',
    name: '佛教术语大词典',
    mdxUrl: '/mdict/佛学词典精简版.mdx',  // 使用实际存在的文件
    mddUrl: null
  }
]

export const useDictionariesStore = defineStore('dictionaries', () => {
  // ============ State ============

  // 预置词典列表（加载后的完整数据）
  const presetDicts = ref([])

  // 用户上传的词典列表
  const userDicts = ref([])

  // 当前启用的词典 ID 集合
  const enabledDictIds = ref(new Set())

  // 是否已初始化
  const isInitialized = ref(false)

  // 是否正在加载
  const isLoading = ref(false)

  // 加载错误信息
  const loadError = ref(null)

  // 用户词典数量限制
  const MAX_USER_DICTS = 5

  // ============ Getters ============

  // 所有词典（预置 + 用户）
  const allDicts = computed(() => [...presetDicts.value, ...userDicts.value])

  // 当前启用的词典列表
  const enabledDicts = computed(() =>
    allDicts.value.filter(d => enabledDictIds.value.has(d.id))
  )

  // 启用的词典实例（用于查询）
  const enabledDictInstances = computed(() =>
    enabledDicts.value.map(d => ({
      id: d.id,
      name: d.name,
      mdict: d.mdict,  // 注意：parseMDXFile 返回的是 'mdict'
      mdd: d.mdd
    }))
  )

  // 启用的词典数量
  const enabledCount = computed(() => enabledDictIds.value.size)

  // 获取所有启用词典的词条列表（用于 Trie 匹配）
  const allEnabledEntries = computed(() => {
    const entries = []

    // 添加内置词典（dictionary.js）
    // 已经在 ReaderContent 中单独处理

    // 添加预置词典和用户词典的词条
    for (const dict of enabledDicts.value) {
      for (const entry of dict.entries) {
        entries.push({
          term: entry.term,
          definition: entry._dictName || dict.name, // 临时用词典名作为定义
          _dictId: dict.id,
          _dictName: dict.name
        })
      }
    }

    return entries
  })

  // ============ Actions ============

  /**
   * 初始化预置词典
   * 惰性加载：只在需要时才加载
   */
  async function initPresetDicts() {
  if (isInitialized.value) return

  isLoading.value = true
  loadError.value = null

  try {
    const loadedDicts = []

    for (const config of PRESET_DICTS) {
      try {
        const dict = await loadMDXFromUrl(config.mdxUrl, config.mddUrl)
        
        // 检查词典是否正确初始化
        if (!dict.mdict || !dict.mdict.KEY_INDEX || dict.mdict.KEY_INDEX.length === 0) {
          console.warn(`Dict "${config.name}" may not have initialized properly, skipping`)
          continue
        }
        
        loadedDicts.push({
          ...dict,
          isPreset: true,
          configId: config.id
        })
      } catch (e) {
        console.warn(`Failed to load preset dict "${config.name}":`, e)
        // 继续加载其他词典
      }
    }

    presetDicts.value = loadedDicts

    // 默认启用第一个预置词典
    if (loadedDicts.length > 0) {
      enabledDictIds.value.add(loadedDicts[0].id)
    }

    isInitialized.value = true
  } catch (e) {
    loadError.value = e.message
    console.error('Failed to initialize preset dictionaries:', e)
  } finally {
    isLoading.value = false
  }
}

  /**
   * 加载用户上传的 MDX 文件
   * @param {File} mdxFile
   * @param {File} mddFile
   */
  async function loadUserDict(mdxFile, mddFile = null) {
    // 检查数量限制
    if (userDicts.value.length >= MAX_USER_DICTS) {
      throw new Error(`最多只能加载 ${MAX_USER_DICTS} 个用户词典`)
    }

    try {
      const dict = await loadMDXFromFile(mdxFile, mddFile)
      dict.isPreset = false
      dict.isUserUpload = true

      userDicts.value.push(dict)
      enabledDictIds.value.add(dict.id)

      return dict.id
    } catch (e) {
      console.error('Failed to load user dictionary:', e)
      throw e
    }
  }

  /**
   * 移除用户词典
   * @param {string} id
   */
  function removeUserDict(id) {
    const index = userDicts.value.findIndex(d => d.id === id)
    if (index !== -1) {
      userDicts.value.splice(index, 1)
      enabledDictIds.value.delete(id)
    }
  }

  /**
   * 切换词典启用状态
   * @param {string} id
   */
  function toggleDict(id) {
    if (enabledDictIds.value.has(id)) {
      enabledDictIds.value.delete(id)
    } else {
      enabledDictIds.value.add(id)
    }
  }

  /**
   * 启用/禁用所有预置词典
   * @param {boolean} enabled
   */
  function toggleAllPresetDicts(enabled) {
    for (const dict of presetDicts.value) {
      if (enabled) {
        enabledDictIds.value.add(dict.id)
      } else {
        enabledDictIds.value.delete(dict.id)
      }
    }
  }

  /**
   * 查询词条在所有启用词典中的定义
   * @param {string} term
   * @returns {Promise<Array<{ dictName, dictId, definition, isHtml }>>}
   */
  async function lookupTerm(term) {
    return await lookupInDicts(enabledDictInstances.value, term)
  }

  /**
   * 检查词典是否已启用
   * @param {string} id
   * @returns {boolean}
   */
  function isDictEnabled(id) {
    return enabledDictIds.value.has(id)
  }

  /**
   * 获取预置词典配置列表
   */
  function getPresetConfigs() {
    return PRESET_DICTS
  }

/**
   * 获取启用词典的所有词条（用于 Trie 匹配）
   * @returns {Promise<Array<{ term: string, definition: string, _dictId: string, _dictName: string }>>}
   */
  async function getAllEnabledDictEntries() {
  const entries = []

  // 内置词典词条（已单独处理）

  // 获取所有启用词典的词条
  for (const dict of enabledDicts.value) {
    if (!dict.mdict) continue

    // 检查词典是否已正确初始化
    if (!dict.mdict.KEY_INDEX || !dict.mdict.KEY_INDEX.length) {
      console.warn(`Dict "${dict.name}" not fully initialized yet, skipping...`)
      continue
    }

    try {
      // 使用 mdict 的 getWordList 获取所有词条
      // 只处理 mdx 词典，mdd 词典不支持
      if (dict.mdict.ext !== 'mdx') {
        console.warn(`Dict "${dict.name}" is not an MDX file (ext: ${dict.mdict.ext}), skipping...`)
        continue
      }

      const allWords = await dict.mdict.getWordList()
      
      for (const wordInfo of allWords) {
        // 获取释义
        const definition = await dict.mdict.getDefinition(wordInfo.offset)
        
        entries.push({
          term: wordInfo.word,
          definition: definition || wordInfo.word, // fallback to word itself
          _dictId: dict.id,
          _dictName: dict.name
        })
      }
    } catch (e) {
      console.warn(`Failed to get entries from dict "${dict.name}":`, e)
    }
  }

  return entries
}

// 缓存已获取的词典词条，避免重复查询
const dictEntriesCache = new Map()

/**
 * 获取启用词典的词条（带缓存）
 * @param {string} dictId 
 * @returns {Promise<Array>}
 */
async function getDictEntries(dictId) {
  if (dictEntriesCache.has(dictId)) {
    return dictEntriesCache.get(dictId)
  }

  const dict = enabledDicts.value.find(d => d.id === dictId)
  if (!dict || !dict.mdict) return []

  try {
    const allWords = await dict.mdict.getWordList()
    const entries = []

    for (const wordInfo of allWords) {
      const definition = await dict.mdict.getDefinition(wordInfo.offset)
      entries.push({
        term: wordInfo.word,
        definition: definition || wordInfo.word,
        _dictId: dict.id,
        _dictName: dict.name
      })
    }

    dictEntriesCache.set(dictId, entries)
    return entries
  } catch (e) {
    console.warn(`Failed to get entries for dict "${dictId}":`, e)
    return []
  }
}

// 清除缓存（词典切换时调用）
function clearDictEntriesCache() {
  dictEntriesCache.clear()
}

return {
    // State
    presetDicts,
    userDicts,
    enabledDictIds,
    isInitialized,
    isLoading,
    loadError,

    // Getters
    allDicts,
    enabledDicts,
    enabledDictInstances,
    enabledCount,

    // Async Actions (use these instead of allEnabledEntries for MDX dictionaries)
    getAllEnabledDictEntries,
    getDictEntries,
    clearDictEntriesCache,

    // Actions
    initPresetDicts,
    loadUserDict,
    removeUserDict,
    toggleDict,
    toggleAllPresetDicts,
    lookupTerm,
    isDictEnabled,
    getPresetConfigs
  }
})
