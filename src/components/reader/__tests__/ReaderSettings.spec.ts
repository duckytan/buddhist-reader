import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import ReaderSettings from '@/components/reader/ReaderSettings.vue'
import { useSettingsStore } from '@/stores/settings'

function buttonByLabel(wrapper: VueWrapper, label: string): DOMWrapper<Element> {
  const found = wrapper.findAll('button').find((node) => node.attributes('aria-label') === label)
  if (!found) throw new Error(`未找到按钮：${label}`)
  return found
}

describe('ReaderSettings（§6.3 / §6.7）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('字号增减即时生效并持久化', async () => {
    const wrapper = mount(ReaderSettings, { props: { open: true } })
    const store = useSettingsStore()

    expect(store.fontSizeIndex).toBe(3)
    await buttonByLabel(wrapper, '增大字号').trigger('click')
    expect(store.fontSizeIndex).toBe(4)

    const persisted = JSON.parse(localStorage.getItem('br-settings') ?? '{}') as { fontSizeIndex?: number }
    expect(persisted.fontSizeIndex).toBe(4)
  })

  it('行距增减即时生效', async () => {
    const wrapper = mount(ReaderSettings, { props: { open: true } })
    const store = useSettingsStore()

    await buttonByLabel(wrapper, '减小行距').trigger('click')
    expect(store.lineHeightIndex).toBe(1)
  })

  it('主题 4 套可切换且即时生效', async () => {
    const wrapper = mount(ReaderSettings, { props: { open: true } })
    const store = useSettingsStore()

    const themeButtons = wrapper.findAll('.settings__theme')
    expect(themeButtons.map((node) => node.text())).toEqual(['宣纸', '墨夜', '护眼', '日间'])

    await themeButtons[1]?.trigger('click')
    expect(store.theme).toBe('night')

    await themeButtons[3]?.trigger('click')
    expect(store.theme).toBe('day')
  })
})
