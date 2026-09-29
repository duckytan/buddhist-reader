import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import { noteService } from '@/services/noteService'
import { encodeJumpQuery } from '@/utils/readerJump'
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

import NotesView from '@/views/NotesView.vue'

function meta(title: string): SutraMeta {
  return {
    title,
    filename: `${title}.json`,
    author: '作者',
    category: 'prajna',
    chapterCount: 1,
    totalParagraphs: 1,
    totalChars: 1,
    description: ''
  }
}

const MANIFEST: SutraMeta[] = [meta('心经'), meta('坛经')]

describe('NotesView（§9 T09 笔记跳转）', () => {
  beforeEach(() => {
    localStorage.clear()
    noteService.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.loadManifest.mockResolvedValue(MANIFEST)
  })

  it('无笔记展示空态', async () => {
    const wrapper = mount(NotesView)
    await flushPromises()

    expect(wrapper.text()).toContain('暂无笔记')
  })

  it('渲染笔记并显示所属经书标题', async () => {
    noteService.add({
      sutraId: '心经.json',
      quote: '色即是空',
      text: '注一',
      anchor: { chapterIdx: 1, paraId: 'p2', offset: 3 }
    })

    const wrapper = mount(NotesView)
    await flushPromises()

    expect(wrapper.text()).toContain('心经')
    expect(wrapper.text()).toContain('色即是空')
    expect(wrapper.text()).toContain('注一')
  })

  it('点击笔记 → 跳转阅读路由并携带语义锚点 query（修旧版跳转 bug）', async () => {
    const note = noteService.add({
      sutraId: '心经.json',
      quote: '色即是空',
      text: '注一',
      anchor: { chapterIdx: 1, paraId: 'p2', offset: 3 }
    })

    const wrapper = mount(NotesView)
    await flushPromises()

    await wrapper.find('.notes__entry').trigger('click')

    expect(mocks.push).toHaveBeenCalledWith({
      name: 'reader',
      params: { id: '心经.json' },
      query: encodeJumpQuery({ sutraId: note.sutraId, anchor: note.anchor })
    })
  })

  it('无锚点的笔记跳转到经书开头（anchor 兜底）', async () => {
    noteService.add({ sutraId: '心经.json', quote: 'q', text: 't' })

    const wrapper = mount(NotesView)
    await flushPromises()

    await wrapper.find('.notes__entry').trigger('click')

    expect(mocks.push).toHaveBeenCalledWith({
      name: 'reader',
      params: { id: '心经.json' },
      query: encodeJumpQuery({
        sutraId: '心经.json',
        anchor: { chapterIdx: 0, paraId: '', offset: 0 }
      })
    })
  })

  it('关键词搜索与按经书筛选', async () => {
    noteService.add({ sutraId: '心经.json', quote: '甲', text: '般若智慧' })
    noteService.add({ sutraId: '坛经.json', quote: '乙', text: '顿悟成佛' })

    const wrapper = mount(NotesView)
    await flushPromises()

    expect(wrapper.findAll('.notes__entry')).toHaveLength(2)

    await wrapper.find('input[type="search"]').setValue('顿悟')
    expect(wrapper.findAll('.notes__entry')).toHaveLength(1)
    expect(wrapper.text()).toContain('顿悟成佛')

    await wrapper.find('input[type="search"]').setValue('')
    const chan = wrapper.findAll('.notes__filter').find((node) => node.text() === '坛经')
    await chan?.trigger('click')
    expect(wrapper.findAll('.notes__entry')).toHaveLength(1)
    expect(wrapper.text()).toContain('顿悟成佛')
  })

  it('删除笔记后列表更新', async () => {
    noteService.add({ sutraId: '心经.json', quote: '甲', text: '注一' })

    const wrapper = mount(NotesView)
    await flushPromises()

    await wrapper.find('.notes__remove').trigger('click')

    expect(wrapper.findAll('.notes__entry')).toHaveLength(0)
    expect(wrapper.text()).toContain('暂无笔记')
  })
})
