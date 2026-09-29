/**
 * 设置 store（方案 §6.8 / §6.3 / §6.7）。
 *
 * 职责边界（§6.8）：**字号/行距/主题偏好**。
 * ❌ 禁止：**DOM 副作用**——CSS 变量应用由组件层 `useReaderSettings` 的 `watch`
 * 负责（T07）。本 store 只持有状态并经 `settingsService` 持久化。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  FONT_SIZE_STEPS,
  LINE_HEIGHT_STEPS,
  THEME_NAMES,
  settingsService
} from '@/services/settingsService'
import type { ReaderSettings, ThemeName } from '@/types/reader'

export const useSettingsStore = defineStore('settings', () => {
  /** 当前设置（初始即从持久层载入并校验） */
  const settings = ref<ReaderSettings>(settingsService.load())

  const fontSizeIndex = computed<number>(() => settings.value.fontSizeIndex)
  const lineHeightIndex = computed<number>(() => settings.value.lineHeightIndex)
  const theme = computed<ThemeName>(() => settings.value.theme)

  /** 是否可再放大字号 */
  const canIncreaseFontSize = computed<boolean>(() => settings.value.fontSizeIndex < FONT_SIZE_STEPS - 1)
  /** 是否可再缩小字号 */
  const canDecreaseFontSize = computed<boolean>(() => settings.value.fontSizeIndex > 0)

  /** 更新字号档位（越界钳制） */
  function setFontSize(index: number): void {
    settings.value = {
      ...settings.value,
      fontSizeIndex: clamp(index, 0, FONT_SIZE_STEPS - 1)
    }
    settingsService.save(settings.value)
  }

  /** 更新行距档位（越界钳制） */
  function setLineHeight(index: number): void {
    settings.value = {
      ...settings.value,
      lineHeightIndex: clamp(index, 0, LINE_HEIGHT_STEPS - 1)
    }
    settingsService.save(settings.value)
  }

  /** 更新主题（非法值忽略） */
  function setTheme(next: ThemeName): void {
    if (!(THEME_NAMES as readonly string[]).includes(next)) return
    settings.value = { ...settings.value, theme: next }
    settingsService.save(settings.value)
  }

  /** 重置为默认设置 */
  function reset(): ReaderSettings {
    settings.value = settingsService.reset()
    return settings.value
  }

  function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min
    return Math.min(max, Math.max(min, Math.trunc(value)))
  }

  return {
    settings,
    fontSizeIndex,
    lineHeightIndex,
    theme,
    canIncreaseFontSize,
    canDecreaseFontSize,
    setFontSize,
    setLineHeight,
    setTheme,
    reset
  }
})
