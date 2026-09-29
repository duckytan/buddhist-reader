import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderSearch from '@/components/reader/ReaderSearch.vue'
import type { SearchHit } from '@/composables/useSearch'

const HITS: SearchHit[] = [
  { globalId: 'x.json:0:0', paraOffset: 3, context: '观自在般若' },
  { globalId: 'x.json:0:1', paraOffset: 0, context: '般若波罗蜜' }
]

describe('ReaderSearch（§8.3）', () => {
  it('输入即时 emit search', async () => {
    const wrapper = mount(ReaderSearch, { props: { open: true, hits: [] } })

    await wrapper.find('input[type="search"]').setValue('般若')

    expect(wrapper.emitted('search')?.at(-1)).toEqual(['般若'])
  })

  it('渲染命中并高亮关键词；点击 emit jump(hit)', async () => {
    const wrapper = mount(ReaderSearch, { props: { open: true, hits: HITS } })
    await wrapper.find('input[type="search"]').setValue('般若')

    expect(wrapper.findAll('.search__result')).toHaveLength(2)
    expect(wrapper.findAll('.search__mark').length).toBeGreaterThan(0)

    await wrapper.findAll('.search__result')[1]?.trigger('click')
    expect(wrapper.emitted('jump')?.[0]).toEqual([HITS[1]])
  })

  it('关键词 ≥2 字且无命中时展示空态', async () => {
    const wrapper = mount(ReaderSearch, { props: { open: true, hits: [] } })
    await wrapper.find('input[type="search"]').setValue('般若')
    expect(wrapper.text()).toContain('无匹配结果')
  })
})
