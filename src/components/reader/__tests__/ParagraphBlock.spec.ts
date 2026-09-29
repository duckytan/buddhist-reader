import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ParagraphBlock from '@/components/reader/ParagraphBlock.vue'
import { toElementId } from '@/utils/anchor'
import type { Paragraph } from '@/types/sutra'

const paragraph: Paragraph = { id: 'p1', text: '观自在般若', globalId: 'x.json:0:0' }

describe('ParagraphBlock（§6.1 ①③）', () => {
  it('段落 id = toElementId(globalId)；无分段时纯文本', () => {
    const wrapper = mount(ParagraphBlock, { props: { paragraph } })

    expect(wrapper.find('p').attributes('id')).toBe(toElementId('x.json:0:0'))
    expect(wrapper.find('p').attributes('data-global-id')).toBe('x.json:0:0')
    expect(wrapper.text()).toBe('观自在般若')
    expect(wrapper.find('.seg-text').exists()).toBe(false)
  })

  it('有分段时渲染 SegmentText（携带 data-off）', () => {
    const wrapper = mount(ParagraphBlock, {
      props: {
        paragraph,
        segments: [
          { type: 'text', content: '观自在', off: 0 },
          { type: 'term', content: '般若', off: 3 }
        ]
      }
    })

    expect(wrapper.find('.seg-text').exists()).toBe(true)
    expect(wrapper.findAll('.seg')).toHaveLength(2)
    expect(wrapper.text()).toBe('观自在般若')
  })
})
