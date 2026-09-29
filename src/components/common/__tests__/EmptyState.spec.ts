import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import EmptyState from '../EmptyState.vue'

/**
 * 工具链冒烟测试（T01）：验证 Vitest + jsdom + @vue/test-utils + SFC 编译 + `@` 别名可用。
 */
describe('EmptyState', () => {
  it('渲染默认空态文案', () => {
    const wrapper = mount(EmptyState)
    expect(wrapper.text()).toContain('暂无内容')
  })

  it('渲染自定义文案', () => {
    const wrapper = mount(EmptyState, { props: { text: '空空如也' } })
    expect(wrapper.text()).toContain('空空如也')
  })
})
