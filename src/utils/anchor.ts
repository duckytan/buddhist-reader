/**
 * 语义锚点工具（方案 §6.1 / §11）。
 *
 * - `makeGlobalId` / `parseGlobalId`：**纯函数**，供 `sutraService` 在加载时运行时
 *   派生全局唯一段落 id（修正旧版 `p1/p2` 跨章重复）。
 * - `toElementId` / `scrollToAnchor` / `setScrollTop`：**DOM 封装**（T06 落地）——
 *   §11 规定 DOM 访问**唯一白名单**即本文件（`eslint.config.js` 对本文件豁免
 *   `no-restricted-globals`）。组件/composable **只调用本封装**，绝不直接
 *   `document.*` / `window.*` / `scrollIntoView`。
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

/* ------------------------------------------------------------------ *
 * DOM 封装（§6.1 ③ / §11 唯一白名单）
 * ------------------------------------------------------------------ */

/** 段落 DOM id 前缀（避免与页面其它 id 冲突） */
const PARA_ID_PREFIX = 'para-'

/**
 * `globalId` → DOM 元素 id。
 * 与 `ParagraphBlock.vue` 的 `:id` 一一对应；因 `globalId` 全局唯一，`getElementById`
 * 无歧义（§6.1 ①）。
 */
export function toElementId(globalId: string): string {
  return `${PARA_ID_PREFIX}${globalId}`
}

/** 滚动锚点（§6.1 ③ / §8.3） */
export interface ScrollAnchor {
  /** 目标段落 `globalId`（`${sutraId}:${chapterIdx}:${paraIdx}`） */
  globalId: string
  /** 段内字符偏移（命中元素 `[data-off][data-search]`）；null/省略则定位到段落本身 */
  offset?: number | null
}

/**
 * 滚动结果（区分「精确命中」与「降级到段落」，调用方可据此降级）。
 * - `'exact'`：精确命中段内 `[data-off][data-search]` 命中元素；
 * - `'paragraph'`：找到段落，但该 offset 的命中元素不存在 → 回退到段落元素；
 * - `'none'`：`getElementById` 失败（目标段落不存在）。
 */
export type ScrollResult = 'exact' | 'paragraph' | 'none'

/**
 * 滚动到锚点（§6.1 ③ 的「CSS 锚点」实现）。
 *
 * 步骤：
 * 1. `getElementById(toElementId(globalId))` 取目标段落（全局唯一，无歧义）；
 * 2. 若给定 `offset`，优先取段内 `[data-off="${offset}"][data-search]` **搜索命中**元素
 *    （`data-search` 仅 `search` 段携带，与 `term` 段的 `data-hit` 消歧）；
 * 3. `scrollIntoView({ block: 'start' })`——header 偏移由目标元素上的
 *    `scroll-margin-top: var(--reader-header-height)` 承担，**不使用任何魔法偏移**，
 *    也**不 `getBoundingClientRect`**。
 *
 * @returns `'exact'`（精确命中）/ `'paragraph'`（回退段落）/ `'none'`（段落不存在）
 */
export function scrollToAnchor(anchor: ScrollAnchor): ScrollResult {
  const element = document.getElementById(toElementId(anchor.globalId))
  if (!element) return 'none'

  const offset = anchor.offset ?? null
  if (offset !== null) {
    const hit = element.querySelector(`[data-off="${offset}"][data-search]`)
    if (hit) {
      hit.scrollIntoView({ block: 'start' })
      return 'exact'
    }
  }
  element.scrollIntoView({ block: 'start' })
  return 'paragraph'
}

/**
 * 直接设置滚动容器位置（进度恢复用：按持久化的像素位置精确还原）。
 * 集中于此以满足 §11「DOM 访问集中在 anchor.ts」。
 */
export function setScrollTop(element: HTMLElement, top: number): void {
  element.scrollTop = Math.max(0, top)
}

/** 选区锚点（T07 §8.3 / useSelection）：划选文字 → 笔记锚点 */
export interface SelectionAnchor {
  /** 划选原文 */
  text: string
  /** 所在段落 globalId */
  globalId: string
  /** 选区起点在段落内的字符偏移 */
  offset: number
}

/**
 * 读取当前 DOM 选区并解析为段落锚点（供阅读内批注）。
 *
 * **不使用 TreeWalker**：段落内每个分段元素都带 `data-off`（§6.1 ②），故
 * 「段内偏移 = 分段 `data-off` + 选区在文本节点内的偏移」即可算出，无需累加遍历。
 * 无有效选区（折叠/跨元素异常）返回 null。
 */
export function readSelectionAnchor(): SelectionAnchor | null {
  const selection = globalThis.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  const text = selection.toString().trim()
  if (!text) return null

  const range = selection.getRangeAt(0)
  const startNode = range.startContainer
  const startElement = startNode.nodeType === 3 ? startNode.parentElement : (startNode as Element)
  if (!startElement) return null

  const paragraph = startElement.closest('[data-global-id]')
  const globalId = paragraph?.getAttribute('data-global-id') ?? ''
  if (!globalId) return null

  const segment = startElement.closest('[data-off]')
  const segmentOffset = segment ? Number(segment.getAttribute('data-off')) : 0
  const innerOffset = startNode.nodeType === 3 ? range.startOffset : 0
  const offset = (Number.isFinite(segmentOffset) ? segmentOffset : 0) + innerOffset

  return { text, globalId, offset }
}

/** 清除当前选区。 */
export function clearSelectionAnchor(): void {
  globalThis.getSelection()?.removeAllRanges()
}
