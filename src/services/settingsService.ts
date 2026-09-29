/**
 * 阅读设置领域服务（方案 §6.3 / §6.8）。
 *
 * 职责：字号/行距/主题偏好的**读写与校验**（持久化 key `br-settings`）。
 * **不含 DOM 副作用**——CSS 变量的应用由组件层 `useReaderSettings` 的 `watch`
 * 负责（§6.8：settings store 只存状态）。
 *
 * 约定：框架无关（不 import Vue/Pinia）。
 */

import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'
import type { ReaderSettings, ThemeName } from '@/types/reader'

/**
 * 字号档位刻度（px）。**长度即档位数**——`FONT_SIZE_STEPS` 由其派生（单一真源，N-5）。
 * 默认索引 3 对应 `--text-body-lg`(18px)。
 */
export const FONT_SIZE_SCALE: readonly number[] = [15, 16, 17, 18, 20, 22, 24]
/**
 * 行距档位刻度（无单位倍数）。**长度即档位数**——`LINE_HEIGHT_STEPS` 由其派生（N-5）。
 * 默认索引 2 对应 `--leading-body`(1.65)。
 */
export const LINE_HEIGHT_SCALE: readonly number[] = [1.45, 1.55, 1.65, 1.8, 2.0]
/** 字号档位总数（索引 0..6，默认 3 居中）——派生自 `FONT_SIZE_SCALE`，杜绝双真源漂移 */
export const FONT_SIZE_STEPS = FONT_SIZE_SCALE.length
/** 行距档位总数（索引 0..4，默认 2 居中）——派生自 `LINE_HEIGHT_SCALE`，杜绝双真源漂移 */
export const LINE_HEIGHT_STEPS = LINE_HEIGHT_SCALE.length
/** 合法主题（4 套，§6.7） */
export const THEME_NAMES: readonly ThemeName[] = ['paper', 'night', 'eye-care', 'day']

/** 默认阅读设置（宣纸 + 中档字号/行距） */
export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSizeIndex: 3,
  lineHeightIndex: 2,
  theme: 'paper'
}

export interface SettingsService {
  /** 读取设置（缺失/损坏 → 默认值；越界值被钳制） */
  load(): ReaderSettings
  /** 保存设置（先校验；写入成功返回 true） */
  save(settings: ReaderSettings): boolean
  /** 重置为默认值并落盘，返回默认值 */
  reset(): ReaderSettings
}

/** 将任意输入钳制为合法设置 */
export function sanitizeSettings(input: Partial<ReaderSettings> | null | undefined): ReaderSettings {
  const source = input ?? {}
  const fontSizeIndex = clampIndex(source.fontSizeIndex, FONT_SIZE_STEPS, DEFAULT_READER_SETTINGS.fontSizeIndex)
  const lineHeightIndex = clampIndex(
    source.lineHeightIndex,
    LINE_HEIGHT_STEPS,
    DEFAULT_READER_SETTINGS.lineHeightIndex
  )
  const theme = isThemeName(source.theme) ? source.theme : DEFAULT_READER_SETTINGS.theme
  return { fontSizeIndex, lineHeightIndex, theme }
}

function clampIndex(value: number | undefined, steps: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.trunc(value)
  if (rounded < 0) return 0
  if (rounded > steps - 1) return steps - 1
  return rounded
}

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value)
}

/** 创建阅读设置领域服务。 */
export function createSettingsService(): SettingsService {
  function load(): ReaderSettings {
    return sanitizeSettings(readJson<Partial<ReaderSettings> | null>(STORAGE_KEYS.settings, null))
  }

  function save(settings: ReaderSettings): boolean {
    return writeJson(STORAGE_KEYS.settings, sanitizeSettings(settings))
  }

  function reset(): ReaderSettings {
    const defaults = { ...DEFAULT_READER_SETTINGS }
    writeJson(STORAGE_KEYS.settings, defaults)
    return defaults
  }

  return { load, save, reset }
}

/** 应用级单例 */
export const settingsService = createSettingsService()
