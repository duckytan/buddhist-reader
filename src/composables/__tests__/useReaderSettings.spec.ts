import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope } from 'vue'

import { FONT_SIZE_SCALE, LINE_HEIGHT_SCALE, useReaderSettings } from '@/composables/useReaderSettings'
import type { UseReaderSettings } from '@/composables/useReaderSettings'
import { useSettingsStore } from '@/stores/settings'

function create(): { rs: UseReaderSettings; store: ReturnType<typeof useSettingsStore> } {
  const store = useSettingsStore()
  const scope = effectScope()
  let rs!: UseReaderSettings
  scope.run(() => {
    rs = useReaderSettings()
  })
  return { rs, store }
}

describe('useReaderSettings（§6.3 / §6.7）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('默认档位复现 token（字号 18px / 行距 1.65），主题 paper', () => {
    const { rs } = create()

    expect(rs.theme.value).toBe('paper')
    expect(rs.fontSizeIndex.value).toBe(3)
    expect(rs.lineHeightIndex.value).toBe(2)
    expect(rs.cssVars.value).toEqual({
      '--reader-font-size': '18px',
      '--reader-line-height': '1.65'
    })
  })

  it('档位口径：字号 7 档 / 行距 5 档', () => {
    expect(FONT_SIZE_SCALE).toHaveLength(7)
    expect(LINE_HEIGHT_SCALE).toHaveLength(5)
  })

  it('增减字号/行距即时反映到 cssVars，并在边界处停下', () => {
    const { rs } = create()

    rs.increaseFontSize()
    expect(rs.fontSizeIndex.value).toBe(4)
    expect(rs.cssVars.value['--reader-font-size']).toBe('20px')

    for (let i = 0; i < 10; i += 1) rs.increaseFontSize()
    expect(rs.fontSizeIndex.value).toBe(FONT_SIZE_SCALE.length - 1)
    expect(rs.canIncreaseFontSize.value).toBe(false)

    for (let i = 0; i < 10; i += 1) rs.decreaseFontSize()
    expect(rs.fontSizeIndex.value).toBe(0)
    expect(rs.canDecreaseFontSize.value).toBe(false)
  })

  it('主题切换（非法值忽略）', () => {
    const { rs } = create()

    rs.setTheme('night')
    expect(rs.theme.value).toBe('night')

    rs.setTheme('rainbow' as never)
    expect(rs.theme.value).toBe('night')
  })
})
