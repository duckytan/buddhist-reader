import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import type { SutraMeta } from '@/types/sutra'

const mocks = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadSutra: vi.fn(),
  getMeta: vi.fn(),
  clear: vi.fn(),
  push: vi.fn()
}))

vi.mock('@/services/sutraService', () => ({
  sutraService: mocks,
  createSutraService: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push })
}))

import BookshelfView from '@/views/BookshelfView.vue'

function meta(title: string, category: SutraMeta['category']): SutraMeta {
  return {
    title,
    filename: `${title}.json`,
    author: '作者',
    category,
    chapterCount: 1,
    totalParagraphs: 1,
    totalChars: 1,
    description: `${title}简介`
  }
}

const MANIFEST: SutraMeta[] = [meta('心经', 'prajna'), meta('坛经', 'chan'), meta('金刚经', 'prajna')]

describe('BookshelfView（§9 T09 / §8.1）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('载入清单后渲染经书卡片', async () => {
    mocks.loadManifest.mockResolvedValue(MANIFEST)

    const wrapper = mount(BookshelfView)
    await flushPromises()

    expect(mocks.loadManifest).toHaveBeenCalled()
    expect(wrapper.findAll('.sutra-card')).toHaveLength(3)
    expect(wrapper.text()).toContain('共 3 部')
  })

  it('分类筛选只显示该分类', async () => {
    mocks.loadManifest.mockResolvedValue(MANIFEST)

    const wrapper = mount(BookshelfView)
    await flushPromises()

    const chan = wrapper.findAll('.bookshelf__filter').find((node) => node.text() === '禅宗')
    await chan?.trigger('click')

    const cards = wrapper.findAll('.sutra-card')
    expect(cards).toHaveLength(1)
    expect(cards[0]?.text()).toContain('坛经')
  })

  it('点击卡片跳转阅读路由（id = filename）', async () => {
    mocks.loadManifest.mockResolvedValue(MANIFEST)

    const wrapper = mount(BookshelfView)
    await flushPromises()

    await wrapper.findAll('.sutra-card')[0]?.trigger('click')

    expect(mocks.push).toHaveBeenCalledWith({ name: 'reader', params: { id: '心经.json' } })
  })

  it('载入失败展示错误态（三态之一）', async () => {
    mocks.loadManifest.mockRejectedValue(new Error('清单加载失败'))

    const wrapper = mount(BookshelfView)
    await flushPromises()

    expect(wrapper.text()).toContain('清单加载失败')
    expect(wrapper.find('.state--error').exists()).toBe(true)
  })
})
