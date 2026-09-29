import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderProgress from '@/components/reader/ReaderProgress.vue'

describe('ReaderProgress', () => {
  it('展示百分比与章节位置，并暴露 aria 值', () => {
    const wrapper = mount(ReaderProgress, {
      props: { percent: 42, chapterIdx: 2, chapterCount: 10 }
    })

    expect(wrapper.text()).toContain('42%')
    expect(wrapper.text()).toContain('第 3 / 10 章')
    expect(wrapper.attributes('role')).toBe('progressbar')
    expect(wrapper.attributes('aria-valuenow')).toBe('42')
  })
})
