import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import type { Sutra, SutraMeta } from '@/types/sutra'

const mocks = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadSutra: vi.fn(),
  loadIndex: vi.fn(),
  getDicts: vi.fn(),
  getEnabledDictIds: vi.fn(),
  getEnabledTerms: vi.fn(),
  prefetchForChapter: vi.fn(),
  lookup: vi.fn(),
  readSelectionAnchor: vi.fn(),
  clearSelectionAnchor: vi.fn()
}))

vi.mock('@/services/sutraService', () => ({
  sutraService: {
    loadManifest: mocks.loadManifest,
    loadSutra: mocks.loadSutra,
    getMeta: vi.fn(),
    clear: vi.fn()
  },
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

// 仅替换「选区读取」（jsdom 难以构造真实划选）；定位/滚动封装保持真实实现
vi.mock('@/utils/anchor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/anchor')>()
  return {
    ...actual,
    readSelectionAnchor: mocks.readSelectionAnchor,
    clearSelectionAnchor: mocks.clearSelectionAnchor
  }
})

import App from '@/App.vue'
import NotesView from '@/views/NotesView.vue'
import ReaderView from '@/views/ReaderView.vue'
import BookshelfView from '@/views/BookshelfView.vue'
import { useReaderStore } from '@/stores/reader'
import type { LookupOptions } from '@/services/dictService'

function meta(title: string, category: SutraMeta['category']): SutraMeta {
  return {
    title,
    filename: `${title}.json`,
    author: '作者',
    category,
    chapterCount: 2,
    totalParagraphs: 2,
    totalChars: 12,
    description: `${title}简介`
  }
}

const MANIFEST: SutraMeta[] = [meta('心经', 'prajna'), meta('坛经', 'chan')]

const SUTRA: Sutra = {
  ...MANIFEST[0]!,
  chapters: [
    { title: '第一章', paragraphs: [{ id: 'p1', text: '观自在般若', globalId: '心经.json:0:0' }] },
    { title: '第二章', paragraphs: [{ id: 'p2', text: '菩提萨埵', globalId: '心经.json:1:0' }] }
  ]
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'bookshelf', component: BookshelfView },
      { path: '/dict', name: 'dict', component: { template: '<div />' } },
      { path: '/notes', name: 'notes', component: NotesView },
      { path: '/settings', name: 'settings', component: { template: '<div />' } },
      { path: '/read/:id', name: 'reader', component: ReaderView }
    ]
  })
}

/**
 * 关键路径 E2E（方案 §9 T10 / §14 M4）。
 *
 * **注意**：方案已砍掉 Playwright 套件（建议5 减法），故此处是 **Vitest + jsdom
 * 组件测试**，不是浏览器 E2E。它以**真实 router + 真实 views/stores/services** 串起
 * 主链路，仅 mock 掉网络边界（`sutraService` / `dictService`）与选区读取
 * （jsdom 无法构造真实划选）：
 *
 *   找经（M1）→ 加载（M3）→ 连续滚动（M4）→ 点词查义（M6）→ 批注（M13）→ 回看
 */
describe('关键路径 E2E（jsdom 组件测试）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    mocks.loadManifest.mockResolvedValue(MANIFEST)
    mocks.loadSutra.mockResolvedValue(SUTRA)
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getDicts.mockReturnValue([])
    mocks.getEnabledDictIds.mockReturnValue([])
    mocks.getEnabledTerms.mockReturnValue(['般若'])
    mocks.prefetchForChapter.mockResolvedValue(undefined)
    mocks.lookup.mockImplementation(async (term: string, options?: LookupOptions) => {
      const hits = [{ dictId: 'd1', dictName: '甲典', term, definition: '甲·般若' }]
      for (const hit of hits) options?.onResult?.(hit)
      return hits
    })
  })

  it('找经 → 加载 → 连续滚动 → 点词查义 → 批注 → 回看', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()

    // ── M1 找经：书架渲染经书卡片 ──
    const cards = wrapper.findAll('.sutra-card')
    expect(cards).toHaveLength(2)
    expect(wrapper.text()).toContain('心经')

    // ── 点卡片 → 进入阅读器 ──
    await cards[0]?.trigger('click')
    await flushPromises()
    await nextTick()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('reader')

    // ── M3 加载：经文渲染 ──
    expect(wrapper.find('.reader').exists()).toBe(true)
    expect(wrapper.text()).toContain('观自在般若')
    expect(wrapper.text()).toContain('菩提萨埵')

    // ── M4 连续滚动：滚动 → 进度记录（reader store 位置跟随） ──
    const content = wrapper.find('.reader-content')
    const scrollEl = content.element as HTMLElement
    scrollEl.scrollTop = 250
    await content.trigger('scroll')
    await nextTick()
    expect(useReaderStore().position).toBe(250)

    // ── M6 点词查义：点击高亮词 → 弹窗展示释义 ──
    const term = wrapper.find('.seg--term')
    expect(term.exists()).toBe(true)
    await term.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('甲·般若')

    // ── M13 批注：划选 → 写批注 → 保存（持久化到 br-notes） ──
    mocks.readSelectionAnchor.mockReturnValue({
      text: '般若',
      globalId: '心经.json:0:0',
      offset: 3
    })
    await wrapper.find('.reader').trigger('mouseup')
    await nextTick()

    const notesButton = wrapper
      .findAll('button')
      .find((node) => node.attributes('aria-label') === '笔记')
    await notesButton?.trigger('click')
    await nextTick()

    await wrapper.find('.notes__input').setValue('我的批注')
    await wrapper.find('.notes__btn').trigger('click')
    await nextTick()
    expect(JSON.parse(localStorage.getItem('br-notes') ?? '[]')).toHaveLength(1)

    // ── 回看：笔记页列出该笔记 → 点击 → 携带语义锚点跳回阅读器 ──
    const pushSpy = vi.spyOn(router, 'push')
    await router.push('/notes')
    await flushPromises()
    await nextTick()
    expect(wrapper.text()).toContain('我的批注')

    await wrapper.find('.notes__entry').trigger('click')

    const readerPush = pushSpy.mock.calls
      .map((call) => call[0])
      .find(
        (to) => typeof to === 'object' && to !== null && 'name' in to && to.name === 'reader'
      ) as { name: string; params: Record<string, string>; query: Record<string, string> } | undefined

    expect(readerPush?.params.id).toBe('心经.json')
    expect(readerPush?.query.jump).toBe('note')

    wrapper.unmount()
  })
})
