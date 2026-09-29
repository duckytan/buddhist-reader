import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { progressKey } from '@/data/storage'
import { useSettingsStore } from '@/stores/settings'
import type { Sutra } from '@/types/sutra'

const mocks = vi.hoisted(() => ({
  loadSutra: vi.fn(),
  loadIndex: vi.fn(),
  getDicts: vi.fn(),
  getEnabledDictIds: vi.fn(),
  getEnabledTerms: vi.fn(),
  prefetchForChapter: vi.fn(),
  push: vi.fn()
}))

vi.mock('@/services/sutraService', () => ({
  sutraService: { loadSutra: mocks.loadSutra },
  createSutraService: vi.fn()
}))

vi.mock('@/services/dictService', () => ({
  dictService: {
    loadIndex: mocks.loadIndex,
    getDicts: mocks.getDicts,
    getEnabledDictIds: mocks.getEnabledDictIds,
    getEnabledTerms: mocks.getEnabledTerms,
    prefetchForChapter: mocks.prefetchForChapter
  },
  createDictService: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'x.json' } }),
  useRouter: () => ({ push: mocks.push })
}))

import ReaderView from '@/views/ReaderView.vue'

const SUTRA: Sutra = {
  title: '心经',
  filename: 'x.json',
  author: '玄奘',
  category: 'prajna',
  chapterCount: 1,
  totalParagraphs: 1,
  totalChars: 6,
  description: '',
  chapters: [{ title: '正文', paragraphs: [{ id: 'p1', text: '观自在般若', globalId: 'x.json:0:0' }] }]
}

async function mountReady(): Promise<ReturnType<typeof mount>> {
  const wrapper = mount(ReaderView, { attachTo: document.body })
  await flushPromises()
  await nextTick()
  await flushPromises()
  return wrapper
}

describe('ReaderView（§8.1 / §8.3 集成）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    mocks.loadSutra.mockResolvedValue(SUTRA)
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getDicts.mockReturnValue([])
    mocks.getEnabledDictIds.mockReturnValue([])
    mocks.getEnabledTerms.mockReturnValue([])
    mocks.prefetchForChapter.mockResolvedValue(undefined)
  })

  it('加载后渲染经文，并按已存进度用语义锚点定位', async () => {
    localStorage.setItem(
      progressKey('x.json'),
      JSON.stringify({ sutraId: 'x.json', chapterIdx: 0, position: 0, percent: 30, updatedAt: 1 })
    )

    const wrapper = await mountReady()

    expect(wrapper.find('.para').attributes('id')).toBe('para-x.json:0:0')
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

  it('主题以 data-theme 声明式绑定（§6.7）', async () => {
    const wrapper = await mountReady()
    const settings = useSettingsStore()

    expect(wrapper.find('.reader').attributes('data-theme')).toBe('paper')
    settings.setTheme('night')
    await nextTick()
    expect(wrapper.find('.reader').attributes('data-theme')).toBe('night')

    wrapper.unmount()
  })

  it('经内搜索：输入 → 命中高亮为 search 段 → 点击结果触发语义锚点定位（§8.3）', async () => {
    const wrapper = await mountReady()

    // 打开搜索面板
    const searchButton = wrapper.findAll('button').find((node) => node.attributes('aria-label') === '搜索')
    await searchButton?.trigger('click')

    const input = wrapper.find('input[type="search"]')
    await input.setValue('般若')
    await nextTick()

    // 命中渲染为 search 段（携带 data-off / data-hit）
    const searchSeg = wrapper.find('.seg--search')
    expect(searchSeg.exists()).toBe(true)
    expect(searchSeg.attributes('data-off')).toBe('3')
    expect(searchSeg.attributes('data-hit')).toBe('')

    ;(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear()
    await wrapper.find('.search__result').trigger('click')
    await flushPromises()
    await nextTick()

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()

    wrapper.unmount()
  })
})
