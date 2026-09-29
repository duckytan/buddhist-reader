/**
 * 术语高亮 composable（方案 §6.2 / §9 T04）。
 *
 * 语义与 v3.1.0 `useHighlighter` **等价**（移植全部 7 个单测）：
 * - 正向最长匹配（Trie）；
 * - 数字短语过滤（避免「十七尊」命中于「三十七尊」）；
 * - 无命中返回 `null`（保留旧版 null 语义）；
 * - 入参兼容 `Ref<string[]>` 与普通 `string[]`。
 *
 * v4.0 改进：
 * - TS 重写 + 返回 `Segment`（新增 `off` 字符偏移，供 §6.1 语义锚点 `data-off`）；
 * - Trie 构建加 **identity memo**（同一词表引用只构建一次）；
 * - 词典开关改细粒度响应式后，词表变化仅重建 Trie，不再整页重挂载（由调用方配合）。
 *
 * 未采纳「分块惰性构建」：24k 词表的 Trie 构建为一次性 O(总字符数)，实测非瓶颈；
 * 引入惰性分块会增加复杂度与等价性风险，违背「做减法」，故延后至有实测需求时。
 */

import { computed, unref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { buildTrie, longestMatch } from '@/utils/trie'
import type { TrieNode } from '@/utils/trie'
import { isNumeralPhrase } from '@/utils/text'
import type { Segment } from '@/types/highlight'

/** 词表入参：兼容 ref / computed / 普通数组 / 空值 */
export type TermsInput =
  | Ref<string[]>
  | ComputedRef<string[]>
  | string[]
  | null
  | undefined

export interface UseHighlighter {
  /** 当前 Trie（无词表时为 null） */
  trie: ComputedRef<TrieNode | null>
  /** 对文本分段高亮；无任何命中返回 null */
  highlight: (text: string) => Segment[] | null
}

/** 按词表引用缓存 Trie，避免同一引用重复构建 */
const trieMemo = new WeakMap<readonly string[], TrieNode>()

function getTrie(terms: readonly string[]): TrieNode {
  let trie = trieMemo.get(terms)
  if (!trie) {
    trie = buildTrie(terms)
    trieMemo.set(terms, trie)
  }
  return trie
}

/** 合并相邻同类型分段（`off` 取该段首字符偏移） */
function mergeSegments(segments: Segment[]): Segment[] {
  const result: Segment[] = []
  let current: Segment | null = null
  for (const seg of segments) {
    if (current && current.type === seg.type) {
      current.content += seg.content
    } else {
      current = { type: seg.type, content: seg.content, off: seg.off }
      result.push(current)
    }
  }
  return result
}

/**
 * 创建高亮器。
 * @param terms 启用的术语词表（ref / 普通数组均可）
 */
export function useHighlighter(terms: TermsInput): UseHighlighter {
  const trie = computed<TrieNode | null>(() => {
    const list = unref(terms)
    if (!list || list.length === 0) return null
    return getTrie(list)
  })

  function highlight(text: string): Segment[] | null {
    if (!text || typeof text !== 'string') return null
    const root = trie.value
    if (!root) return null

    const segments: Segment[] = []
    let pos = 0

    while (pos < text.length) {
      const match = longestMatch(root, text, pos)
      if (match && !isNumeralPhrase(text, pos, match.length)) {
        segments.push({ type: 'term', content: match, off: pos })
        pos += match.length
      } else {
        // 无命中 / 数字短语上下文 → 逐字符作为普通文本
        segments.push({ type: 'text', content: text.charAt(pos), off: pos })
        pos += 1
      }
    }

    const merged = mergeSegments(segments)
    return merged.length > 1 || (merged.length === 1 && merged[0]?.type === 'term') ? merged : null
  }

  return { trie, highlight }
}
