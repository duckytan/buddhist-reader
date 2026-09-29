import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DictEntryCard from '@/components/dict/DictEntryCard.vue'

describe('DictEntryCard', () => {
  it('渲染词典名 / 词头 / 释义', () => {
    const wrapper = mount(DictEntryCard, {
      props: {
        hit: { dictId: 'd1', dictName: '甲典', term: '般若', definition: '智慧。\n第二行' }
      }
    })

    expect(wrapper.find('.dict-entry__term').text()).toBe('般若')
    expect(wrapper.find('.dict-entry__dict').text()).toBe('甲典')
    expect(wrapper.find('.dict-entry__definition').text()).toContain('智慧。')
    expect(wrapper.find('.dict-entry__definition').text()).toContain('第二行')
  })
})
