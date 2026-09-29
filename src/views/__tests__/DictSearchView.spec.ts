import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import type { LookupOptions } from '@/services/dictService'
import type { DictMeta } from '@/types/dict'

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

import { DICT_SEARCH_DEBOUNCE_MS } from '@/composables/useDictLookup'
import DictSearchView from '@/views/DictSearchView.vue'

const DICTS: DictMeta[] = [{ id: 'd1', name: '甲典', totalChunks: 1, entryCount: 2 }]

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('DictSearchView（§6.4 词头三级匹配）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getDicts.mockReturnValue(DICTS)
    mocks.getEnabledDictIds.mockReturnValue(['d1'])
    mocks.getEnabledTerms.mockReturnValue([])
  })

  it('输入 → 防抖 → 搜索结果；点击结果 → 词条详情（复用 DictEntryCard）', async () => {
    mocks.searchTerms.mockReturnValue(['般若', '般若经'])
    mocks.lookup.mockImplementation(async (term: string, options?: LookupOptions) => {
      const hits = [{ dictId: 'd1', dictName: '甲典', term, definition: `${term}义` }]
      for (const item of hits) options?.onResult?.(item)
      return hits
    })

    const wrapper = mount(DictSearchView)
    await flushPromises() // onMounted → loadDictionary

    await wrapper.find('input[type="search"]').setValue('般若')
    await wait(DICT_SEARCH_DEBOUNCE_MS + 50)
    await flushPromises()

    const terms = wrapper.findAll('.dict-search__term')
    expect(terms).toHaveLength(2)
    expect(terms[0]?.text()).toBe('般若')

    await terms[0]?.trigger('click')
    await flushPromises()

    expect(wrapper.find('.dict-entry__term').text()).toBe('般若')
    expect(wrapper.text()).toContain('般若义')

    wrapper.unmount()
  })

  it('无匹配词头 → 展示空态', async () => {
    mocks.searchTerms.mockReturnValue([])
    const wrapper = mount(DictSearchView)
    await flushPromises()

    await wrapper.find('input[type="search"]').setValue('zzz')
    await wait(DICT_SEARCH_DEBOUNCE_MS + 50)
    await flushPromises()

    expect(wrapper.text()).toContain('无匹配词头')

    wrapper.unmount()
  })
})
