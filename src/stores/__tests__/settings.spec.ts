import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DEFAULT_READER_SETTINGS, FONT_SIZE_STEPS } from '@/services/settingsService'
import { useSettingsStore } from '@/stores/settings'

describe('stores/settings', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('初始载入默认设置', () => {
    const store = useSettingsStore()
    expect(store.settings).toEqual(DEFAULT_READER_SETTINGS)
    expect(store.theme).toBe('paper')
  })

  it('setFontSize 越界钳制并持久化（无 DOM 副作用）', () => {
    const store = useSettingsStore()

    store.setFontSize(99)
    expect(store.fontSizeIndex).toBe(FONT_SIZE_STEPS - 1)
    store.setFontSize(-5)
    expect(store.fontSizeIndex).toBe(0)

    const persisted = JSON.parse(localStorage.getItem('br-settings') ?? '{}') as { fontSizeIndex?: number }
    expect(persisted.fontSizeIndex).toBe(0)
  })

  it('setLineHeight / setTheme（非法主题忽略）', () => {
    const store = useSettingsStore()

    store.setLineHeight(1)
    expect(store.lineHeightIndex).toBe(1)

    store.setTheme('night')
    expect(store.theme).toBe('night')

    store.setTheme('rainbow' as never)
    expect(store.theme).toBe('night') // 非法值被忽略
  })

  it('canIncreaseFontSize / canDecreaseFontSize 边界', () => {
    const store = useSettingsStore()

    store.setFontSize(0)
    expect(store.canDecreaseFontSize).toBe(false)
    expect(store.canIncreaseFontSize).toBe(true)

    store.setFontSize(FONT_SIZE_STEPS - 1)
    expect(store.canIncreaseFontSize).toBe(false)
  })

  it('reset 回到默认', () => {
    const store = useSettingsStore()
    store.setTheme('day')
    store.setFontSize(5)

    expect(store.reset()).toEqual(DEFAULT_READER_SETTINGS)
    expect(store.theme).toBe('paper')
  })
})
