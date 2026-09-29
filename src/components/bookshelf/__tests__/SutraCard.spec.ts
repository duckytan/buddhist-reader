import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SutraCard from '@/components/bookshelf/SutraCard.vue'
import type { SutraMeta } from '@/types/sutra'

function meta(overrides: Partial<SutraMeta> = {}): SutraMeta {
  return {
    title: '心经',
    filename: '心经.json',
    author: '玄奘',
    category: 'prajna',
    chapterCount: 3,
    totalParagraphs: 10,
    totalChars: 260,
    description: '般若经典',
    ...overrides
  }
}

describe('SutraCard（§9 T09 书架卡片）', () => {
  it('渲染标题/作者/分类标签/统计', () => {
    const wrapper = mount(SutraCard, { props: { sutra: meta() } })

    expect(wrapper.text()).toContain('心经')
    expect(wrapper.text()).toContain('玄奘')
    expect(wrapper.text()).toContain('般若')
    expect(wrapper.text()).toContain('3 章 · 260 字')
    expect(wrapper.find('.sutra-card__tag--prajna').exists()).toBe(true)
  })

  it('点击发出 open 事件（携带该经元信息）', async () => {
    const sutra = meta({ title: '坛经', category: 'chan' })
    const wrapper = mount(SutraCard, { props: { sutra } })

    await wrapper.find('button').trigger('click')

    const emitted = wrapper.emitted('open')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]?.[0]).toEqual(sutra)
  })
})
