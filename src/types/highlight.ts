/**
 * 高亮 / 搜索分段类型（方案 §7）。
 *
 * `Segment` 是「文本 → 分段」的统一产物：`term` 命中词典、`search` 命中经内搜索、
 * `text` 为普通文本。`off` 为**数据模型中的字符偏移**（§6.1 语义锚点②），
 * 渲染期由 `SegmentText` 写入 `data-off`，命中段另标 `data-hit`，从而无需反查 DOM。
 */

/** 分段类型 */
export type SegmentType = 'term' | 'search' | 'text'

/** 单段文本 */
export interface Segment {
  type: SegmentType
  content: string
  /** 该段首字符在原始文本中的偏移（用于锚点定位，§6.1） */
  off: number
}
