/**
 * 前缀树（Trie）工具（方案 §6.2：保留复用旧版 Trie 算法，TS 重写但语义等价）。
 *
 * 用于术语高亮：对文本逐位置做「正向最长匹配」。算法与 v3.1.0 `useHighlighter`
 * 内的实现语义一致（`children` 由普通对象改为 `Map`，行为等价）。
 */

/** Trie 节点 */
export interface TrieNode {
  readonly children: Map<string, TrieNode>
  isTerm: boolean
}

/** 新建空节点 */
export function createTrieNode(): TrieNode {
  return { children: new Map(), isTerm: false }
}

/**
 * 构建 Trie。
 * @param words 词表（非字符串 / 空串自动忽略，与旧版一致）
 */
export function buildTrie(words: Iterable<string>): TrieNode {
  const root = createTrieNode()
  for (const word of words) {
    if (typeof word !== 'string' || word.length === 0) continue
    let node = root
    for (const ch of word) {
      let next = node.children.get(ch)
      if (!next) {
        next = createTrieNode()
        node.children.set(ch, next)
      }
      node = next
    }
    node.isTerm = true
  }
  return root
}

/**
 * 从 `start` 起做正向最长匹配。
 * @returns 命中词（最长）或 `null`
 */
export function longestMatch(root: TrieNode, text: string, start: number): string | null {
  let node = root
  let lastMatchEnd = -1
  for (let i = start; i < text.length; i++) {
    const next = node.children.get(text.charAt(i))
    if (!next) break
    node = next
    if (node.isTerm) lastMatchEnd = i + 1
  }
  return lastMatchEnd > 0 ? text.slice(start, lastMatchEnd) : null
}
