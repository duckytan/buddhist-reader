import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { useSettingsStore } from '@/stores/settings'
import SettingsView from '@/views/SettingsView.vue'
// 源码级断言：settings store 必须无 DOM 副作用（§6.8 / §11）
import settingsStoreSource from '@/stores/settings.ts?raw'

describe('SettingsView（§6.7 四主题 / §6.8 无 DOM 副作用）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('渲染四主题（宣纸/墨夜/护眼/日间）', () => {
    const wrapper = mount(SettingsView)

    const labels = wrapper.findAll('.settings__theme').map((node) => node.text())
    expect(labels).toEqual(['宣纸', '墨夜', '护眼', '日间'])
  })

  it('点击主题即时写入 store（data-theme 由根组件声明式绑定）', async () => {
    const wrapper = mount(SettingsView)
    const store = useSettingsStore()

    expect(store.theme).toBe('paper')

    const night = wrapper.findAll('.settings__theme').find((node) => node.text() === '墨夜')
    await night?.trigger('click')
    await nextTick()

    expect(store.theme).toBe('night')
    const active = wrapper.findAll('.settings__theme').find((node) => node.text() === '墨夜')
    expect(active?.attributes('aria-pressed')).toBe('true')
  })

  it('字号/行距增减生效；恢复默认回到 paper', async () => {
    const wrapper = mount(SettingsView)
    const store = useSettingsStore()

    const before = store.fontSizeIndex
    const plus = wrapper.findAll('button').find((node) => node.attributes('aria-label') === '增大字号')
    await plus?.trigger('click')
    expect(store.fontSizeIndex).toBe(before + 1)

    store.setTheme('day')
    await nextTick()
    await wrapper.find('.settings__reset').trigger('click')
    expect(store.theme).toBe('paper')
    expect(store.fontSizeIndex).toBe(3)
  })

  it('settings store 无 DOM 副作用（源码级锁定 §6.8 / §11）', () => {
    expect(settingsStoreSource).not.toContain('document')
    expect(settingsStoreSource).not.toContain('window')
    expect(settingsStoreSource).not.toContain('classList')
    expect(settingsStoreSource).not.toContain('setAttribute')
  })
})
