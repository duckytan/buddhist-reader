import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderHeader from '@/components/reader/ReaderHeader.vue'
// 源码级断言用 Vite `?raw`（浏览器 tsconfig 无 node 类型；vite/client 已声明 `*?raw`）。
// 注：vitest 默认 `css:false` 会把 `.css?raw` 也置空，故此处只锁三组件间「同源」。
import headerSource from '@/components/reader/ReaderHeader.vue?raw'
import paragraphSource from '@/components/reader/ParagraphBlock.vue?raw'
import contentSource from '@/components/reader/ReaderContent.vue?raw'

describe('ReaderHeader', () => {
  it('渲染标题并发出各工具事件', async () => {
    const wrapper = mount(ReaderHeader, { props: { title: '心经' } })
    expect(wrapper.text()).toContain('心经')

    const clickLabel = async (label: string): Promise<void> => {
      const button = wrapper.findAll('button').find((node) => node.attributes('aria-label') === label)
      await button?.trigger('click')
    }

    await clickLabel('返回书架')
    await clickLabel('目录')
    await clickLabel('搜索')
    await clickLabel('书签')
    await clickLabel('笔记')
    await clickLabel('词典')
    await clickLabel('设置')

    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('toc')).toHaveLength(1)
    expect(wrapper.emitted('search')).toHaveLength(1)
    expect(wrapper.emitted('bookmarks')).toHaveLength(1)
    expect(wrapper.emitted('notes')).toHaveLength(1)
    expect(wrapper.emitted('dicts')).toHaveLength(1)
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })

  it('顶栏高度 / 段落 scroll-margin-top / 正文 padding-top 三方同源于 --reader-header-height', () => {
    // jsdom 无法解析 var() 且不注入 SFC <style>，故改为源码级「同源」回归护栏：
    // 三处必须引用同一 token（token 定义见 tokens.css）。任一处改硬编码即红。
    expect(headerSource).toContain('height: var(--reader-header-height)')
    expect(paragraphSource).toContain(
      'scroll-margin-top: calc(var(--reader-header-height) + var(--spacing-xs))'
    )
    expect(contentSource).toContain(
      'padding: calc(var(--reader-header-height) + var(--spacing-xs))'
    )

    // 顶栏高度不得硬编码像素魔法值（只允许引用 token）
    expect(headerSource).not.toMatch(/height:\s*\d+px/)
  })
})
