import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SegmentText from '@/components/reader/SegmentText.vue'
import type { Segment } from '@/types/highlight'

describe('SegmentText（§6.1 ②）', () => {
  it('渲染 data-off / data-hit，且拼接文本等于原文', () => {
    const segments: Segment[] = [
      { type: 'text', content: '观自在', off: 0 },
      { type: 'term', content: '般若', off: 3 },
      { type: 'text', content: '。', off: 5 }
    ]
    const wrapper = mount(SegmentText, { props: { segments } })
    const spans = wrapper.findAll('.seg')

    expect(spans).toHaveLength(3)
    expect(spans[0]?.attributes('data-off')).toBe('0')
    expect(spans[0]?.attributes('data-hit')).toBeUndefined()
    expect(spans[1]?.attributes('data-off')).toBe('3')
    expect(spans[1]?.attributes('data-hit')).toBe('')
    expect(spans[1]?.classes()).toContain('seg--term')
    expect(wrapper.text()).toBe('观自在般若。')
  })

  it('search 段同样标记 data-hit', () => {
    const wrapper = mount(SegmentText, {
      props: { segments: [{ type: 'search', content: '空', off: 7 }] }
    })
    const span = wrapper.find('.seg')
    expect(span.attributes('data-off')).toBe('7')
    expect(span.attributes('data-hit')).toBe('')
    expect(span.classes()).toContain('seg--search')
  })

  it('点击 term 段 emit termClick；text/search 段不触发（T08 点词查义）', async () => {
    const wrapper = mount(SegmentText, {
      props: {
        segments: [
          { type: 'text', content: '观自在', off: 0 },
          { type: 'term', content: '般若', off: 3 },
          { type: 'search', content: '空', off: 5 }
        ]
      }
    })
    const spans = wrapper.findAll('.seg')

    await spans[0]?.trigger('click')
    expect(wrapper.emitted('termClick')).toBeUndefined()

    await spans[2]?.trigger('click')
    expect(wrapper.emitted('termClick')).toBeUndefined()

    await spans[1]?.trigger('click')
    expect(wrapper.emitted('termClick')).toEqual([['般若']])
  })
})
