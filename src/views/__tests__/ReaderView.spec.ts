import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { progressKey } from '@/data/storage'
import type { Sutra } from '@/types/sutra'

const mocks = vi.hoisted(() => ({
  loadSutra: vi.fn(),
  loadIndex: vi.fn(),
  getEnabledTerms: vi.fn(),
  prefetchForChapter: vi.fn()
}))

vi.mock('@/services/sutraService', () => ({
  sutraService: { loadSutra: mocks.loadSutra },
  createSutraService: vi.fn()
}))

vi.mock('@/services/dictService', () => ({
  dictService: {
    loadIndex: mocks.loadIndex,
    getEnabledTerms: mocks.getEnabledTerms,
    prefetchForChapter: mocks.prefetchForChapter
  },
  createDictService: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'x.json' } })
}))

import ReaderView from '@/views/ReaderView.vue'

const SUTRA: Sutra = {
  title: '心经',
  filename: 'x.json',
  author: '玄奘',
  category: 'prajna',
  chapterCount: 1,
  totalParagraphs: 1,
  totalChars: 4,
  description: '',
  chapters: [{ title: '正文', paragraphs: [{ id: 'p1', text: '般若', globalId: 'x.json:0:0' }] }]
}

describe('ReaderView（§8.1 集成）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getEnabledTerms.mockReturnValue([])
    mocks.prefetchForChapter.mockResolvedValue(undefined)
  })

  it('加载后渲染经文，并按已存进度用语义锚点定位', async () => {
    mocks.loadSutra.mockResolvedValue(SUTRA)
    localStorage.setItem(
      progressKey('x.json'),
      JSON.stringify({ sutraId: 'x.json', chapterIdx: 0, position: 0, percent: 30, updatedAt: 1 })
    )

    const wrapper = mount(ReaderView, { attachTo: document.body })
    await flushPromises()
    await nextTick()
    await flushPromises()

    expect(wrapper.find('.para').attributes('id')).toBe('para-x.json:0:0')
    // 恢复定位走 utils/anchor.scrollToAnchor → scrollIntoView
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('加载失败展示错误态（三态之一）', async () => {
    mocks.loadSutra.mockRejectedValue(new Error('未找到经书：x.json'))

    const wrapper = mount(ReaderView, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.text()).toContain('未找到经书')

    wrapper.unmount()
  })
})
