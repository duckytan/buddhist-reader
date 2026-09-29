/**
 * 查词 / 词典搜索 composable（方案 §2.2 / §6.8 / §8.3 / §4.9）。
 *
 * 职责（§2.2「composables 是响应式胶水」）：持有查词与搜索的**异步 UI 态**
 * （`indexLoading`/`loading`/`status`/`hits`/`searching`/`searchResults`）与
 * **卸载取消**；把 `dictService` / `dict` store 的领域调用包成响应式接口供视图消费。
 * 这也是 **N-1**（`views → services` 跳层）的归位点——视图只消费 composable。
 *
 * 取消口径（不做「假 abort」）：`dictService.lookup` **无 `signal` 参数**
 * （T05 查词链已审查、T08 明确不改），故此处以「**令牌作废**」在卸载/新查词时
 * 丢弃在途结果——网络请求本身无法中断，本层能做的是**不写脏状态**。
 *
 * 结果状态区分（§4.9 关键）：`empty`（查无此词）≠ `offline`（该词释义需联网获取）。
 * `dictService.lookup` 对「未缓存词 + 网络失败」返回**空数组**且经 `onError` 回调
 * 告知失败，故两者必须靠 `onError` 区分，不能都渲染成同一个错误态。
 */

import { computed, onScopeDispose, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { dictService } from '@/services/dictService'
import { useDictStore } from '@/stores/dict'
import type { DictHit } from '@/types/dict'
import { logger } from '@/utils/logger'

/** 搜索结果上限（与 `dictService.searchTerms` 默认一致） */
export const DICT_SEARCH_LIMIT = 50
/** 搜索防抖（ms）——`searchTerms` 每次全表扫描 35314 词头，必须防抖 */
export const DICT_SEARCH_DEBOUNCE_MS = 200
/** 空结果文案：查无此词 */
export const DICT_EMPTY_HINT = '查无此词'
/** 空结果文案：未缓存词 + 无网络（**不是**「加载失败」） */
export const DICT_OFFLINE_HINT = '该词释义需联网获取'

/** 查词结果状态 */
export type DictLookupStatus = 'idle' | 'loading' | 'found' | 'empty' | 'offline'

export interface UseDictLookup {
  /** 索引是否已就绪 */
  indexLoaded: Ref<boolean>
  /** 索引加载中 */
  indexLoading: Ref<boolean>
  /** 启用词典中的词头（供高亮 Trie 构建，§8.1） */
  terms: Ref<string[]>
  /** 查词中 */
  loading: Ref<boolean>
  /** 查词结果（先返回先展示，渐进填充） */
  hits: Ref<DictHit[]>
  /** 查词结果状态 */
  status: Ref<DictLookupStatus>
  /** 空结果提示文案（`empty`/`offline` 才有值） */
  hint: ComputedRef<string>
  /** 搜索结果（词头列表） */
  searchResults: Ref<string[]>
  /** 搜索进行中（防抖窗口内） */
  searching: Ref<boolean>
  /** 加载索引并刷新启用词表（幂等；失败静默降级，不阻塞阅读） */
  loadDictionary(): Promise<void>
  /** 词典开关变化后刷新启用词表 */
  refreshTerms(): void
  /** 章节级预取（§4.4，静默） */
  prefetchForChapter(terms: string[]): Promise<void>
  /** 查词（含令牌作废的卸载/竞态取消） */
  lookup(term: string): Promise<DictHit[]>
  /** 清空查词状态 */
  clear(): void
  /** 搜索词头（防抖 200ms；三级匹配由 service 提供） */
  search(query: string): void
  /** 清空搜索 */
  clearSearch(): void
}

/** 创建查词 / 搜索控制器。 */
export function useDictLookup(): UseDictLookup {
  const store = useDictStore()

  const indexLoaded = ref(false)
  const indexLoading = ref(false)
  const terms = ref<string[]>([])
  const loading = ref(false)
  const hits = ref<DictHit[]>([])
  const status = ref<DictLookupStatus>('idle')
  const searchResults = ref<string[]>([])
  const searching = ref(false)

  /** 查词令牌：自增即作废在途查词（卸载/新查词时用） */
  let lookupToken = 0
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const hint = computed<string>(() => {
    if (status.value === 'empty') return DICT_EMPTY_HINT
    if (status.value === 'offline') return DICT_OFFLINE_HINT
    return ''
  })

  async function loadDictionary(): Promise<void> {
    if (indexLoaded.value) return
    indexLoading.value = true
    try {
      await store.loadIndex()
      refreshTerms()
      indexLoaded.value = true
    } catch (err) {
      // 弱项降级：索引加载失败不阻塞阅读（§4.4）
      logger.warn('词典索引加载失败，术语高亮暂不可用', err)
    } finally {
      indexLoading.value = false
    }
  }

  function refreshTerms(): void {
    terms.value = dictService.getEnabledTerms()
  }

  function prefetchForChapter(chapterTerms: string[]): Promise<void> {
    return dictService.prefetchForChapter(chapterTerms)
  }

  async function lookup(term: string): Promise<DictHit[]> {
    const token = (lookupToken += 1)
    const keyword = term.trim()
    if (keyword.length === 0) {
      hits.value = []
      status.value = 'idle'
      return []
    }

    // 结果引用缓存命中 → 立即返回（不发网络）
    const cached = store.getCached(keyword)
    if (cached) {
      hits.value = cached
      status.value = cached.length > 0 ? 'found' : 'empty'
      return cached
    }

    loading.value = true
    status.value = 'loading'
    hits.value = []

    const collected: DictHit[] = []
    let hadError = false
    try {
      const result = await store.lookup(keyword, {
        onResult: (hit) => {
          // 先返回先展示：每条一到达即刷新
          if (token !== lookupToken) return
          collected.push(hit)
          hits.value = [...collected]
        },
        onError: () => {
          hadError = true
        }
      })
      if (token !== lookupToken) return result
      hits.value = result
      status.value = result.length > 0 ? 'found' : hadError ? 'offline' : 'empty'
      return result
    } catch (err) {
      logger.warn('查词失败', keyword, err)
      if (token !== lookupToken) return []
      hits.value = []
      // 索引/网络失败 → 视为「需联网获取」，而非「查无此词」
      status.value = 'offline'
      return []
    } finally {
      if (token === lookupToken) loading.value = false
    }
  }

  function clear(): void {
    lookupToken += 1
    hits.value = []
    status.value = 'idle'
    loading.value = false
  }

  function search(query: string): void {
    if (searchTimer !== null) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
    const keyword = query.trim()
    if (keyword.length === 0) {
      searchResults.value = []
      searching.value = false
      return
    }
    searching.value = true
    searchTimer = setTimeout(() => {
      searchTimer = null
      if (disposed) return
      searchResults.value = dictService.searchTerms(keyword, DICT_SEARCH_LIMIT)
      searching.value = false
    }, DICT_SEARCH_DEBOUNCE_MS)
  }

  function clearSearch(): void {
    if (searchTimer !== null) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
    searchResults.value = []
    searching.value = false
  }

  onScopeDispose(() => {
    disposed = true
    lookupToken += 1 // 作废在途查词，避免卸载后 setState
    if (searchTimer !== null) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  })

  return {
    indexLoaded,
    indexLoading,
    terms,
    loading,
    hits,
    status,
    hint,
    searchResults,
    searching,
    loadDictionary,
    refreshTerms,
    prefetchForChapter,
    lookup,
    clear,
    search,
    clearSearch
  }
}
