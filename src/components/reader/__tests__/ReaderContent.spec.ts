import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderContent from '@/components/reader/ReaderContent.vue'
import type { Sutra } from '@/types/sutra'

/** 两章、且各章段落 id 均为 p1/p2（模拟旧版跨章重复），globalId 应各不相同 */
function makeSutra(): Sutra {
  return {
    title: '心经',
    filename: 'x.json',
    author: '玄奘',
    category: 'prajna',
    chapterCount: 2,
    totalParagraphs: 4,
    totalChars: 40,
    description: '',
    chapters: [
      {
        title: '第一章',
        paragraphs: [
          { id: 'p1', text: '观自在般若', globalId: 'x.json:0:0' },
          { id: 'p2', text: '行深般若', globalId: 'x.json:0:1' }
        ]
      },
      {
        title: '第二章',
        paragraphs: [
          { id: 'p1', text: '色即是空', globalId: 'x.json:1:0' },
          { id: 'p2', text: '空即是色', globalId: 'x.json:1:1' }
        ]
      }
    ]
  }
}

describe('ReaderContent', () => {
  it('段落 DOM id 全局唯一（跨章不重复，§6.1 ①）', () => {
    const wrapper = mount(ReaderContent, { props: { sutra: makeSutra() } })
    const ids = wrapper.findAll('.para').map((node) => node.attributes('id'))

    expect(ids).toEqual(['para-x.json:0:0', 'para-x.json:0:1', 'para-x.json:1:0', 'para-x.json:1:1'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('滚动时 emit progress（含 chapterIdx/position/percent）', async () => {
    const wrapper = mount(ReaderContent, { props: { sutra: makeSutra() } })
    await wrapper.find('.reader-content').trigger('scroll')

    const events = wrapper.emitted('progress')
    expect(events).toHaveLength(1)
    const payload = events?.[0]?.[0] as { chapterIdx: number; position: number; percent: number }
    expect(typeof payload.chapterIdx).toBe('number')
    expect(payload.position).toBe(0)
    expect(payload.percent).toBe(0)
  })

  it('词表就绪后 emit chapterTerms（供 §4.4 章节级预取）', async () => {
    const wrapper = mount(ReaderContent, { props: { sutra: makeSutra(), terms: [] } })
    expect(wrapper.emitted('chapterTerms')).toBeUndefined()

    await wrapper.setProps({ terms: ['般若'] })

    const events = wrapper.emitted('chapterTerms')
    expect(events?.at(-1)?.[0]).toEqual(['般若'])
  })

  it('未给词表时不产生高亮分段（纯文本渲染）', () => {
    const wrapper = mount(ReaderContent, { props: { sutra: makeSutra() } })
    expect(wrapper.find('.seg-text').exists()).toBe(false)
    expect(wrapper.findAll('.para')).toHaveLength(4)
  })

  it('搜索命中叠加为 search 段（data-off/data-search，供 §8.3 精确跳转）', () => {
    const wrapper = mount(ReaderContent, {
      props: {
        sutra: makeSutra(),
        searchHits: [{ globalId: 'x.json:0:0', paraOffset: 3, context: '观自在般若' }],
        searchKeyword: '般若'
      }
    })

    const segment = wrapper.find('.seg--search')
    expect(segment.exists()).toBe(true)
    expect(segment.attributes('data-off')).toBe('3')
    expect(segment.attributes('data-search')).toBe('')
    expect(segment.text()).toBe('般若')
  })

  it('F-2：相邻命中各自成段（「般若般若」搜「般若」→ data-off 0 与 2 都在）', () => {
    const sutra = makeSutra()
    const paragraph = sutra.chapters[0]?.paragraphs[0]
    if (paragraph) paragraph.text = '般若般若'

    const wrapper = mount(ReaderContent, {
      props: {
        sutra,
        searchHits: [
          { globalId: 'x.json:0:0', paraOffset: 0, context: '般若般若' },
          { globalId: 'x.json:0:0', paraOffset: 2, context: '般若般若' }
        ],
        searchKeyword: '般若'
      }
    })

    // 旧的「仅按 type 合并」实现会塌成单段 search@0 → 此断言必红
    expect(wrapper.findAll('.seg--search')).toHaveLength(2)
    expect(wrapper.findAll('[data-off="0"][data-search]')).toHaveLength(1)
    expect(wrapper.findAll('[data-off="2"][data-search]')).toHaveLength(1)
  })

  it('N-4：searchHits 非空但 searchKeyword 为空 → 不产生 search 段（同位置 term 段不被误当命中）', () => {
    const wrapper = mount(ReaderContent, {
      props: {
        sutra: makeSutra(),
        terms: ['般若'],
        searchHits: [{ globalId: 'x.json:0:0', paraOffset: 3, context: 'x' }],
        searchKeyword: ''
      }
    })

    expect(wrapper.find('.seg--search').exists()).toBe(false)
    expect(wrapper.findAll('[data-search]')).toHaveLength(0)
    // 同位置的 term 段仍在（data-hit），但**不会**匹配 [data-search] → scrollToAnchor 只会降级到段落
    expect(wrapper.find('[data-off="3"][data-hit]').exists()).toBe(true)
    expect(wrapper.find('[data-off="3"][data-search]').exists()).toBe(false)
  })
})
