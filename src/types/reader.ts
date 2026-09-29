/**
 * 阅读器相关类型（方案 §7）。
 *
 * 主题统一为 **4 套**（P0-4）：宣纸 / 墨夜 / 护眼 / 日间。
 */

/** 主题名（4 值，§6.7） */
export type ThemeName = 'paper' | 'night' | 'eye-care' | 'day'

/** 书签 */
export interface Bookmark {
  id: string
  sutraId: string
  chapterIdx: number
  /** 章节内滚动位置 */
  position: number
  label: string
  createdAt: number
}

/** 阅读进度（每经独立存储；同时含章节与位置，§6.3） */
export interface ReadingProgress {
  sutraId: string
  chapterIdx: number
  position: number
  /** 0–100 百分比 */
  percent: number
  updatedAt: number
}

/** 阅读设置（仅状态；DOM 副作用在组件层应用，§6.3/§6.8） */
export interface ReaderSettings {
  fontSizeIndex: number
  lineHeightIndex: number
  theme: ThemeName
}
