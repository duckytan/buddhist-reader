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

  it('§5 M9：单章节经渲染**段落列表**（摘录标签），点击发出 jumpParagraph', async () => {
    const wrapper = mount(ReaderToc, {
      props: {
        open: true,
        chapters: ['正文'],
        paragraphLabels: ['观自在般若', '菩提萨埵']
      }
    })

    const items = wrapper.findAll('.toc__button--paragraph')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('观自在般若')
    expect(items[1]?.text()).toContain('菩提萨埵')

    await items[1]?.trigger('click')
    expect(wrapper.emitted('jumpParagraph')?.[0]).toEqual([1])
    // 单章节分支**不得**发出章节跳转（避免与段落跳转混淆）
    expect(wrapper.emitted('jump')).toBeUndefined()
  })

  it('§5 M9：多章节经仍渲染章节列表（不回归）', () => {
    const wrapper = mount(ReaderToc, {
      props: { open: true, chapters: ['第一章', '第二章'], paragraphLabels: ['不应显示'] }
    })

    expect(wrapper.findAll('.toc__button--paragraph')).toHaveLength(0)
    expect(wrapper.findAll('.toc__button')).toHaveLength(2)
  })
})
