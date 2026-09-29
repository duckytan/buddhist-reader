/**
 * 阅读设置 composable（方案 §6.3 / §6.7 / §6.8）。
 *
 * 职责（§6.8「❌ DOM 副作用」的正确落点）：把设置 store 的**状态**转成**声明式
 * 样式绑定**——`data-theme` 与字号/行距 CSS 变量，由组件 `:data-theme`/`:style`
 * 绑定到阅读器根元素。**不直接操作 `document`**（§11），故无需 DOM 白名单。
 *
 * 档位口径（确认 T05 假设）：字号 **7 档**（0..6，默认 3 = 18px）、行距 **5 档**
 * （0..4，默认 2 = 1.65）、主题默认 `paper`——与 `settingsService` 常量一致。
 * 默认档位复现 `tokens.css` 的 `--text-body-lg`(18px) / `--leading-body`(1.65)，故
 * 「不设置即无视觉变化」。
 *
 * N-5：档位刻度与档位数**上提至 `settingsService`**（单一真源，档数由其刻度长度派生）；
 * 本文件仅 `import` 并 **re-export**，以保持「组件 → composable」依赖方向（§2.1）。
 */

import { computed } from 'vue'
import type { ComputedRef, CSSProperties } from 'vue'

import {
  FONT_SIZE_SCALE,
  FONT_SIZE_STEPS,
  LINE_HEIGHT_SCALE,
  LINE_HEIGHT_STEPS
} from '@/services/settingsService'
import { useSettingsStore } from '@/stores/settings'
import type { ReaderSettings, ThemeName } from '@/types/reader'

// 单一真源在 `settingsService`；此处 re-export 供组件/测试消费（不直连 services，守 §2.1）
export { FONT_SIZE_SCALE, FONT_SIZE_STEPS, LINE_HEIGHT_SCALE, LINE_HEIGHT_STEPS }

export interface UseReaderSettings {
  /** 当前设置（响应式） */
  settings: ComputedRef<ReaderSettings>
  /** 主题名（绑定到根元素 `data-theme`） */
  theme: ComputedRef<ThemeName>
  fontSizeIndex: ComputedRef<number>
  lineHeightIndex: ComputedRef<number>
  /** 字号/行距 CSS 变量（绑定到根元素 `:style`） */
  cssVars: ComputedRef<CSSProperties>
  canIncreaseFontSize: ComputedRef<boolean>
  canDecreaseFontSize: ComputedRef<boolean>
  canIncreaseLineHeight: ComputedRef<boolean>
  canDecreaseLineHeight: ComputedRef<boolean>
  setFontSize(index: number): void
  setLineHeight(index: number): void
  setTheme(theme: ThemeName): void
  increaseFontSize(): void
  decreaseFontSize(): void
  increaseLineHeight(): void
  decreaseLineHeight(): void
  reset(): void
}

/** 创建阅读设置控制器。 */
export function useReaderSettings(): UseReaderSettings {
  const store = useSettingsStore()

  const settings = computed<ReaderSettings>(() => store.settings)
  const theme = computed<ThemeName>(() => store.theme)
  const fontSizeIndex = computed<number>(() => store.fontSizeIndex)
  const lineHeightIndex = computed<number>(() => store.lineHeightIndex)

  const cssVars = computed<CSSProperties>(() => {
    const size = FONT_SIZE_SCALE[store.fontSizeIndex] ?? FONT_SIZE_SCALE[3] ?? 18
    const lineHeight = LINE_HEIGHT_SCALE[store.lineHeightIndex] ?? LINE_HEIGHT_SCALE[2] ?? 1.65
    return {
      '--reader-font-size': `${size}px`,
      '--reader-line-height': String(lineHeight)
    }
  })

  const canIncreaseFontSize = computed<boolean>(() => store.canIncreaseFontSize)
  const canDecreaseFontSize = computed<boolean>(() => store.canDecreaseFontSize)
  const canIncreaseLineHeight = computed<boolean>(
    () => store.lineHeightIndex < LINE_HEIGHT_STEPS - 1
  )
  const canDecreaseLineHeight = computed<boolean>(() => store.lineHeightIndex > 0)

  function increaseFontSize(): void {
    store.setFontSize(store.fontSizeIndex + 1)
  }
  function decreaseFontSize(): void {
    store.setFontSize(store.fontSizeIndex - 1)
  }
  function increaseLineHeight(): void {
    store.setLineHeight(store.lineHeightIndex + 1)
  }
  function decreaseLineHeight(): void {
    store.setLineHeight(store.lineHeightIndex - 1)
  }

  return {
    settings,
    theme,
    fontSizeIndex,
    lineHeightIndex,
    cssVars,
    canIncreaseFontSize,
    canDecreaseFontSize,
    canIncreaseLineHeight,
    canDecreaseLineHeight,
    setFontSize: store.setFontSize,
    setLineHeight: store.setLineHeight,
    setTheme: store.setTheme,
    increaseFontSize,
    decreaseFontSize,
    increaseLineHeight,
    decreaseLineHeight,
    reset: store.reset
  }
}
