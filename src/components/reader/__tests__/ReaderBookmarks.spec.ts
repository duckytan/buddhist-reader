import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderBookmarks from '@/components/reader/ReaderBookmarks.vue'
import type { Bookmark } from '@/types/reader'

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    sutraId: 'a.json',
    chapterIdx: 1,
    position: 120,
    label: '正文',
    createdAt: 1,
    ...overrides
  }
}

describe('ReaderBookmarks（§6.5 书签闭环 UI）', () => {
  it('关闭时不渲染；展开时渲染书签列表', () => {
    const closed = mount(ReaderBookmarks, { props: { open: false, bookmarks: [bookmark()] } })
    expect(closed.find('.bookmarks').exists()).toBe(false)

    const open = mount(ReaderBookmarks, { props: { open: true, bookmarks: [bookmark()] } })
    expect(open.findAll('.bookmarks__entry')).toHaveLength(1)
    expect(open.text()).toContain('正文')
    expect(open.text()).toContain('第 2 章')
  })

  it('无书签展示提示', () => {
    const wrapper = mount(ReaderBookmarks, { props: { open: true, bookmarks: [] } })
    expect(wrapper.text()).toContain('暂无书签')
  })

  it('label 为空时回退「第 N 章」', () => {
    const wrapper = mount(ReaderBookmarks, {
      props: { open: true, bookmarks: [bookmark({ label: '', chapterIdx: 4 })] }
    })
    expect(wrapper.find('.bookmarks__label').text()).toBe('第 5 章')
  })

  it('添加 / 跳转 / 删除分别上抛事件', async () => {
    const item = bookmark()
    const wrapper = mount(ReaderBookmarks, { props: { open: true, bookmarks: [item] } })

    await wrapper.find('.bookmarks__add').trigger('click')
    await wrapper.find('.bookmarks__entry').trigger('click')
    await wrapper.find('.bookmarks__remove').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
    expect(wrapper.emitted('jump')?.[0]?.[0]).toEqual(item)
    expect(wrapper.emitted('remove')?.[0]?.[0]).toBe('bm-1')
  })

  it('canAdd=false 时添加按钮禁用', () => {
    const wrapper = mount(ReaderBookmarks, {
      props: { open: true, bookmarks: [], canAdd: false }
    })
    expect(wrapper.find('.bookmarks__add').attributes('disabled')).toBeDefined()
  })
})
