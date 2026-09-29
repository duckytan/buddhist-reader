import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope } from 'vue'

import type { LookupOptions } from '@/services/dictService'
import type { DictHit, DictMeta } from '@/types/dict'

const mocks = vi.hoisted(() => ({
  loadIndex: vi.fn(),
  getDicts: vi.fn(),
  getEnabledDictIds: vi.fn(),
  getEnabledTerms: vi.fn(),
  prefetchForChapter: vi.fn(),
  setEnabled: vi.fn(),
  isEnabled: vi.fn(),
  lookup: vi.fn(),
  searchTerms: vi.fn()
}))

vi.mock('@/services/dictService', () => ({
  dictService: mocks,
  createDictService: vi.fn()
}))

import {
  DICT_EMPTY_HINT,
  DICT_OFFLINE_HINT,
  DICT_SEARCH_DEBOUNCE_MS,
  DICT_SEARCH_LIMIT,
  useDictLookup
} from '@/composables/useDictLookup'
import type { UseDictLookup } from '@/composables/useDictLookup'

const DICTS: DictMeta[] = [{ id: 'd1', name: '甲典', totalChunks: 1, entryCount: 2 }]

function hit(term: string, definition = '义'): DictHit {
  return { dictId: 'd1', dictName: '甲典', term, definition }
}

function create(): { api: UseDictLookup; dispose: () => void } {
  const scope = effectScope()
  let api!: UseDictLookup
  scope.run(() => {
    api = useDictLookup()
  })
  return { api, dispose: () => scope.stop() }
}

describe('useDictLookup（§6.8 / §4.9 / N-1）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loadDictionary 加载索引并刷新启用词表', async () => {
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getDicts.mockReturnValue(DICTS)
    mocks.getEnabledDictIds.mockReturnValue(['d1'])
    mocks.getEnabledTerms.mockReturnValue(['般若', '菩萨'])
    const { api } = create()

    await api.loadDictionary()

    expect(api.indexLoaded.value).toBe(true)
    expect(api.terms.value).toEqual(['般若', '菩萨'])
    expect(mocks.getEnabledTerms).toHaveBeenCalled()
  })

  it('lookup 多词典并行、先返回先展示，最终 found', async () => {
    const hits = [hit('般若', '甲·般若'), hit('般若', '乙·般若')]
    mocks.lookup.mockImplementation(async (_term: string, options?: LookupOptions) => {
      for (const item of hits) options?.onResult?.(item)
      return hits
    })
    const { api } = create()

    const result = await api.lookup('般若')

    expect(result).toEqual(hits)
    expect(api.hits.value).toEqual(hits)
    expect(api.status.value).toBe('found')
    expect(api.loading.value).toBe(false)
  })

  it('lookup 空结果（无错误）→ empty + 「查无此词」', async () => {
    mocks.lookup.mockResolvedValue([])
    const { api } = create()

    await api.lookup('无此词')

    expect(api.status.value).toBe('empty')
    expect(api.hint.value).toBe(DICT_EMPTY_HINT)
  })

  it('lookup 未缓存 + 网络失败 → offline + 「该词释义需联网获取」（≠ 查无此词）', async () => {
    mocks.lookup.mockImplementation(async (_term: string, options?: LookupOptions) => {
      options?.onError?.(new Error('network'), 'd1')
      return []
    })
    const { api } = create()

    await api.lookup('冷僻词')

    expect(api.status.value).toBe('offline')
    expect(api.hint.value).toBe(DICT_OFFLINE_HINT)
    expect(api.hint.value).not.toBe(DICT_EMPTY_HINT)
  })

  it('lookup 抛错（索引加载失败）→ offline', async () => {
    mocks.lookup.mockRejectedValue(new Error('index fail'))
    const { api } = create()

    await api.lookup('般若')

    expect(api.status.value).toBe('offline')
    expect(api.hits.value).toEqual([])
  })

  it('结果引用缓存命中 → 直接返回，不再查 service', async () => {
    mocks.lookup.mockResolvedValue([hit('般若')])
    const { api } = create()

    await api.lookup('般若')
    mocks.lookup.mockClear()
    await api.lookup('般若')

    expect(mocks.lookup).not.toHaveBeenCalled()
    expect(api.status.value).toBe('found')
  })

  it('search 防抖 200ms：窗口内只以最后一次查询调用 searchTerms', () => {
    vi.useFakeTimers()
    mocks.searchTerms.mockReturnValue(['般若'])
    const { api } = create()

    api.search('般')
    api.search('般若')
    expect(mocks.searchTerms).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DICT_SEARCH_DEBOUNCE_MS)

    expect(mocks.searchTerms).toHaveBeenCalledTimes(1)
    expect(mocks.searchTerms).toHaveBeenCalledWith('般若', DICT_SEARCH_LIMIT)
    expect(api.searchResults.value).toEqual(['般若'])
    expect(api.searching.value).toBe(false)
  })

  it('卸载（scope.stop）后防抖不再触发搜索（令牌/标志作废）', () => {
    vi.useFakeTimers()
    const { api, dispose } = create()

    api.search('般若')
    dispose()
    vi.advanceTimersByTime(DICT_SEARCH_DEBOUNCE_MS)

    expect(mocks.searchTerms).not.toHaveBeenCalled()
    expect(api.searchResults.value).toEqual([])
  })

  it('卸载后作废在途查词结果（不写脏状态）', async () => {
    let resolveLookup: (hits: DictHit[]) => void = () => {}
    mocks.lookup.mockImplementation(
      () => new Promise<DictHit[]>((resolve) => (resolveLookup = resolve))
    )
    const { api, dispose } = create()

    const pending = api.lookup('般若')
    dispose()
    resolveLookup([hit('般若')])
    await pending

    expect(api.hits.value).toEqual([])
  })

  it('prefetchForChapter 委托 service（静默）', async () => {
    mocks.prefetchForChapter.mockResolvedValue(undefined)
    const { api } = create()

    await api.prefetchForChapter(['般若'])

    expect(mocks.prefetchForChapter).toHaveBeenCalledWith(['般若'])
  })

  it('clear 重置查词状态', async () => {
    mocks.lookup.mockResolvedValue([hit('般若')])
    const { api } = create()
    await api.lookup('般若')

    api.clear()

    expect(api.hits.value).toEqual([])
    expect(api.status.value).toBe('idle')
  })
})
