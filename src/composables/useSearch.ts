/**
 * 经内搜索 composable（方案 §8.3）。
 *
 * 口径（逐条）：
 * - **单段 `indexOf`**（不跨段）：在每段 `paragraph.text` 内查找；
 * - **上限 50 条**；
 * - **上下文 20 字**（窗口 ≤20 字，含关键词）；
 * - 返回 `SearchHit[{ globalId, paraOffset, context }]`——`paraOffset` 即命中在
 *   段内的字符偏移，与渲染期 `data-off` 同口径，故点击结果可直接
 *   `scrollToAnchor({ globalId, offset: paraOffset })` **精确定位**（无需反查 DOM）。
 */

import { ref } from 'vue'
import type { Ref } from 'vue'

import type { Sutra } from '@/types/sutra'

/** 结果上限（§8.3） */
export const SEARCH_MAX_HITS = 50
/** 上下文窗口字数（§8.3） */
export const SEARCH_CONTEXT_CHARS = 20
/** 关键词最短长度（§8.3：≥2 字） */
export const SEARCH_MIN_KEYWORD = 2

/** 单条搜索命中 */
export interface SearchHit {
  /** 所在段落 globalId */
  globalId: string
  /** 命中在段内的字符偏移（与 `data-off` 同口径） */
  paraOffset: number
  /** 上下文（≤20 字，含关键词） */
  context: string
}

export interface UseSearch {
  /** 当前关键词 */
  keyword: Ref<string>
  /** 当前命中列表 */
  hits: Ref<SearchHit[]>
  /** 执行搜索（返回并写入 `hits`） */
  search(raw: string): SearchHit[]
  /** 清空关键词与结果 */
  clear(): void
}

/**
 * 截取包含关键词的上下文窗口。
 *
 * 「含关键词」是**硬**不变量（用户靠它理解这条为何命中）；「≤`SEARCH_CONTEXT_CHARS` 字」
 * 是**软**目标——冲突时软目标让位，窗口至少容纳完整关键词（F-3）。
 */
function makeContext(text: string, index: number, keywordLength: number): string {
  const window = Math.max(SEARCH_CONTEXT_CHARS, keywordLength)
  if (text.length <= window) return text
  const pad = Math.max(0, window - keywordLength)
  const before = Math.floor(pad / 2)
  const maxStart = text.length - window
  const start = Math.max(0, Math.min(index - before, maxStart))
  return text.slice(start, start + window)
}

/**
 * 创建经内搜索器。
 * @param sutra 当前经书（响应式；未加载时为 null）
 */
export function useSearch(sutra: Ref<Sutra | null>): UseSearch {
  const keyword = ref('')
  const hits = ref<SearchHit[]>([])

  function search(raw: string): SearchHit[] {
    const kw = raw.trim()
    keyword.value = kw

    const current = sutra.value
    if (kw.length < SEARCH_MIN_KEYWORD || !current) {
      hits.value = []
      return []
    }

    const found: SearchHit[] = []
    for (const chapter of current.chapters) {
      for (const paragraph of chapter.paragraphs) {
        let from = 0
        while (found.length < SEARCH_MAX_HITS) {
          const index = paragraph.text.indexOf(kw, from)
          if (index < 0) break
          found.push({
            globalId: paragraph.globalId,
            paraOffset: index,
            context: makeContext(paragraph.text, index, kw.length)
          })
          from = index + kw.length
        }
        if (found.length >= SEARCH_MAX_HITS) break
      }
      if (found.length >= SEARCH_MAX_HITS) break
    }

    hits.value = found
    return found
  }

  function clear(): void {
    keyword.value = ''
    hits.value = []
  }

  return { keyword, hits, search, clear }
}
