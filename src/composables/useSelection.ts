/**
 * 选区 composable（方案 §8.3 / T07）——供阅读内批注用。
 *
 * 职责：把当前 DOM 选区解析为**笔记锚点** `{ text, globalId, offset }`。
 * DOM 访问全部经 `utils/anchor.ts`（§11 唯一白名单），本文件零直连 `document`/`window`。
 */

import { ref } from 'vue'
import type { Ref } from 'vue'

import { clearSelectionAnchor, readSelectionAnchor } from '@/utils/anchor'

/** 选区锚点（= 笔记锚点素材） */
export interface SelectionInfo {
  /** 划选原文 */
  text: string
  /** 所在段落 globalId */
  globalId: string
  /** 选区起点在段落内的字符偏移 */
  offset: number
}

export interface UseSelection {
  /** 最近一次捕获的选区（无则为 null） */
  selection: Ref<SelectionInfo | null>
  /** 捕获当前选区；无有效选区返回 null */
  capture(): SelectionInfo | null
  /** 清除选区状态与浏览器选区 */
  clear(): void
}

/** 创建选区读取器。 */
export function useSelection(): UseSelection {
  const selection = ref<SelectionInfo | null>(null)

  /**
   * 捕获当前选区。
   *
   * 语义：**仅在有有效选区时更新**并返回之；无有效选区（点击折叠等）时**保持原值**
   * 并返回 null。这样点击「笔记」按钮折叠选区时，不会把先前捕获的划选内容清掉。
   */
  function capture(): SelectionInfo | null {
    const anchor = readSelectionAnchor()
    if (anchor) selection.value = anchor
    return anchor
  }

  function clear(): void {
    selection.value = null
    clearSelectionAnchor()
  }

  return { selection, capture, clear }
}
