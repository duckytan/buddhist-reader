/**
 * 语义锚点工具（方案 §6.1）。
 *
 * - `makeGlobalId` / `parseGlobalId`：**纯函数**，供 `sutraService` 在加载时运行时
 *   派生全局唯一段落 id（修正旧版 `p1/p2` 跨章重复）。
 * - `scrollToAnchor` 等 DOM 函数由 **T06** 在本文件追加——§11 规定 DOM 访问
 *   唯一白名单即本文件（`getElementById` + `scrollIntoView`）。
 */

/** 全局唯一段落 id：`${sutraId}:${chapterIdx}:${paraIdx}` */
export function makeGlobalId(sutraId: string, chapterIdx: number, paraIdx: number): string {
  return `${sutraId}:${chapterIdx}:${paraIdx}`
}

/** 解析结果 */
export interface ParsedGlobalId {
  sutraId: string
  chapterIdx: number
  paraIdx: number
}

/**
 * 解析 `globalId`。`sutraId` 可能自身含 `:`，故从右侧取最后两段为
 * chapterIdx / paraIdx。格式非法返回 `null`。
 */
export function parseGlobalId(globalId: string): ParsedGlobalId | null {
  const parts = globalId.split(':')
  if (parts.length < 3) return null
  const paraRaw = parts.pop()
  const chapterRaw = parts.pop()
  if (paraRaw === undefined || chapterRaw === undefined) return null
  const paraIdx = Number(paraRaw)
  const chapterIdx = Number(chapterRaw)
  const sutraId = parts.join(':')
  if (!sutraId || !Number.isInteger(chapterIdx) || !Number.isInteger(paraIdx)) return null
  return { sutraId, chapterIdx, paraIdx }
}
