import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import type { LookupOptions } from '@/services/dictService'

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

import DictPopup from '@/components/dict/DictPopup.vue'
import { DICT_EMPTY_HINT, DICT_OFFLINE_HINT } from '@/composables/useDictLookup'

describe('DictPopup（§8.3 / §4.9）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('展开且有词头 → 查词并渲染多词典 DictEntryCard（先返回先展示）', async () => {
    mocks.lookup.mockImplementation(async (term: string, options?: LookupOptions) => {
      const hits = [
        { dictId: 'd1', dictName: '甲典', term, definition: '甲·般若' },
        { dictId: 'd2', dictName: '乙典', term, definition: '乙·般若' }
      ]
      for (const item of hits) options?.onResult?.(item)
      return hits
    })
    const wrapper = mount(DictPopup, { props: { open: true, term: '般若' } })
    await flushPromises()

    expect(wrapper.findAll('.dict-entry')).toHaveLength(2)
    expect(wrapper.text()).toContain('甲·般若')
    expect(wrapper.text()).toContain('乙·般若')
  })

  it('未缓存词 + 网络失败 → 展示「该词释义需联网获取」（非「查无此词」）', async () => {
    mocks.lookup.mockImplementation(async (_term: string, options?: LookupOptions) => {
      options?.onError?.(new Error('offline'), 'd1')
      return []
    })
    const wrapper = mount(DictPopup, { props: { open: true, term: '冷僻词' } })
    await flushPromises()

    expect(wrapper.text()).toContain(DICT_OFFLINE_HINT)
    expect(wrapper.text()).not.toContain(DICT_EMPTY_HINT)
  })

  it('空结果（无错误）→ 展示「查无此词」', async () => {
    mocks.lookup.mockResolvedValue([])
    const wrapper = mount(DictPopup, { props: { open: true, term: '无此词' } })
    await flushPromises()

    expect(wrapper.text()).toContain(DICT_EMPTY_HINT)
  })

  it('收起时不查词、不渲染面板', async () => {
    const wrapper = mount(DictPopup, { props: { open: false, term: '般若' } })
    await flushPromises()

    expect(mocks.lookup).not.toHaveBeenCalled()
    expect(wrapper.find('.base-sheet').exists()).toBe(false)
  })
})
