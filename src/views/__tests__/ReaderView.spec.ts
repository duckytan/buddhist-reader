import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { STORAGE_KEYS, progressKey } from '@/data/storage'
import { useReaderStore } from '@/stores/reader'
import { useSettingsStore } from '@/stores/settings'
import type { Sutra } from '@/types/sutra'
import { encodeJumpQuery } from '@/utils/readerJump'

const mocks = vi.hoisted(() => ({
  loadSutra: vi.fn(),
  loadIndex: vi.fn(),
  getDicts: vi.fn(),
  getEnabledDictIds: vi.fn(),
  getEnabledTerms: vi.fn(),
  prefetchForChapter: vi.fn(),
  lookup: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  route: { params: { id: 'x.json' }, query: {} as Record<string, unknown> }
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
    prefetchForChapter: mocks.prefetchForChapter,
    lookup: mocks.lookup
  },
  createDictService: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace })
}))

import ReaderView from '@/views/ReaderView.vue'
// 源码级断言：N-1 归位（视图不得直连 @/services）
import readerViewSource from '@/views/ReaderView.vue?raw'
import type { LookupOptions } from '@/services/dictService'

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
    mocks.route.params = { id: 'x.json' }
    mocks.route.query = {}
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

    // 命中渲染为 search 段（携带 data-off / data-search）
    const searchSeg = wrapper.find('.seg--search')
    expect(searchSeg.exists()).toBe(true)
    expect(searchSeg.attributes('data-off')).toBe('3')
    expect(searchSeg.attributes('data-search')).toBe('')

    ;(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear()
    await wrapper.find('.search__result').trigger('click')
    await flushPromises()
    await nextTick()

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('N-1：视图不直连 @/services（词典领域调用归位 composable）', () => {
    expect(readerViewSource).not.toContain('@/services/')
  })

  it('点词查义：点击高亮词 → 打开查词弹窗并展示词条（T08）', async () => {
    mocks.getEnabledTerms.mockReturnValue(['般若'])
    mocks.lookup.mockImplementation(async (term: string, options?: LookupOptions) => {
      const hits = [{ dictId: 'd1', dictName: '甲典', term, definition: '甲·般若' }]
      for (const item of hits) options?.onResult?.(item)
      return hits
    })

    const wrapper = await mountReady()

    const termSpan = wrapper.find('.seg--term')
    expect(termSpan.exists()).toBe(true)
    await termSpan.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('甲·般若')

    wrapper.unmount()
  })

  it('书签闭环（§6.5）：添加 → 列表 → 回看走像素路径（scrollToProgress）', async () => {
    const wrapper = await mountReady()

    // 打开书签面板
    const bookmarksButton = wrapper.findAll('button').find((node) => node.attributes('aria-label') === '书签')
    await bookmarksButton?.trigger('click')
    expect(wrapper.find('.bookmarks').exists()).toBe(true)

    // 添加：记当前章节 + 像素位置
    await wrapper.find('.bookmarks__add').trigger('click')
    const store = useReaderStore()
    expect(store.currentBookmarks).toHaveLength(1)
    expect(wrapper.findAll('.bookmarks__entry')).toHaveLength(1)
    // 已落盘（可读回）
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.bookmarks) ?? '[]')).toHaveLength(1)

    wrapper.unmount()
  })

  it('书签回看：点击书签 → 经像素路径还原滚动位置（非段内锚点路径）', async () => {
    // 预置一个「有像素位置」的书签（add 时刻为 0 无法区分两条路径，故直接种入）
    localStorage.setItem(
      STORAGE_KEYS.bookmarks,
      JSON.stringify([
        { id: 'bm-1', sutraId: 'x.json', chapterIdx: 0, position: 120, label: '正文', createdAt: 1 }
      ])
    )

    const wrapper = await mountReady()

    const bookmarksButton = wrapper.findAll('button').find((node) => node.attributes('aria-label') === '书签')
    await bookmarksButton?.trigger('click')
    await wrapper.find('.bookmarks__entry').trigger('click')
    await flushPromises()
    await nextTick()

    // 像素路径证据：容器 scrollTop 被设为书签 position。
    // 若误用段内锚点路径（scrollToAnchor({offset})），此处 scrollTop 恒为 0 → 必红。
    expect(wrapper.find('.reader-content').element.scrollTop).toBe(120)

    wrapper.unmount()
  })

  it('跨视图跳转（笔记页 query）→ 语义锚点路径定位并消费 query', async () => {
    mocks.route.query = encodeJumpQuery({
      sutraId: 'x.json',
      anchor: { chapterIdx: 0, paraId: 'p1', offset: 3 }
    })

    const wrapper = await mountReady()

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    // 跳转后清除 query，避免返回/刷新重复跳转
    expect(mocks.replace).toHaveBeenCalledWith({
      name: 'reader',
      params: { id: 'x.json' },
      query: {}
    })

    wrapper.unmount()
  })
})
