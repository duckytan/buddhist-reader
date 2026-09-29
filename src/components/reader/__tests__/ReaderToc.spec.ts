import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderToc from '@/components/reader/ReaderToc.vue'

describe('ReaderToc', () => {
  it('列出章节，点击发出 jump(chapterIdx)，当前章节高亮', async () => {
    const wrapper = mount(ReaderToc, {
      props: { open: true, chapters: ['第一章', '第二章', '第三章'], currentChapterIdx: 1 }
    })

    const items = wrapper.findAll('.toc__button')
    expect(items).toHaveLength(3)
    expect(items[1]?.classes()).toContain('toc__button--active')

    await items[2]?.trigger('click')
    expect(wrapper.emitted('jump')?.[0]).toEqual([2])
  })

  it('未展开时不渲染面板', () => {
    const wrapper = mount(ReaderToc, { props: { open: false, chapters: ['第一章'] } })
    expect(wrapper.find('.base-sheet').exists()).toBe(false)
  })
})
