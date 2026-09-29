/**
 * 笔记类型（方案 §7）。
 *
 * `anchor` 为语义锚点：`{ chapterIdx, paraId, offset }`——修复旧版 `paragraphId` 恒空
 * 的缺陷（§6.3）；跳转时携带锚点精确定位。
 */

/** 笔记锚点（章节 + 段落 id + 段内字符偏移） */
export interface NoteAnchor {
  chapterIdx: number
  paraId: string
  offset: number
}

/** 笔记 */
export interface Note {
  id: string
  sutraId: string
  /** 划选原文 */
  quote: string
  /** 用户笔记内容 */
  text: string
  /** 锚点；无定位信息时为 null */
  anchor: NoteAnchor | null
  createdAt: number
  updatedAt: number
}
