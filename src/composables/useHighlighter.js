import { computed } from 'vue'

class TrieNode {
  constructor() { this.children = {}; this.isTerm = false }
}

function buildTrie(words) {
  const root = new TrieNode()
  for (const w of words) {
    if (typeof w !== 'string') continue
    let node = root
    for (const ch of w) {
      if (!node.children[ch]) node.children[ch] = new TrieNode()
      node = node.children[ch]
    }
    node.isTerm = true
  }
  return root
}

function longestMatch(root, text, start) {
  let node = root
  let lastMatchEnd = -1
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (!node.children[ch]) break
    node = node.children[ch]
    if (node.isTerm) lastMatchEnd = i + 1
  }
  return lastMatchEnd > 0 ? text.slice(start, lastMatchEnd) : null
}

const NUMERAL_CHARS = '零一二三四五六七八九十百千万亿兆〇○０-９'

function isNumeralPhrase(text, start, matchLen) {
  if (start > 0) {
    const prev = text[start - 1]
    if (NUMERAL_CHARS.includes(prev)) return true
  }
  if (start + matchLen < text.length) {
    const next = text[start + matchLen]
    if (NUMERAL_CHARS.includes(next)) return true
  }
  return false
}

export function useHighlighter(enabledTerms) {
  const trie = computed(() => {
    if (!enabledTerms || enabledTerms.length === 0) return null
    return buildTrie(enabledTerms)
  })

  function highlight(text) {
    if (!text || typeof text !== 'string') return null
    const root = trie.value
    if (!root) return null

    const segments = []
    let pos = 0

    while (pos < text.length) {
      const match = longestMatch(root, text, pos)
      if (match && !isNumeralPhrase(text, pos, match.length)) {
        segments.push({ type: 'term', content: match })
        pos += match.length
      } else if (match && isNumeralPhrase(text, pos, match.length)) {
        segments.push({ type: 'text', content: text[pos] })
        pos += 1
      } else {
        segments.push({ type: 'text', content: text[pos] })
        pos += 1
      }
    }

    const merged = mergeSegments(segments)
    return merged.length > 1 || (merged.length === 1 && merged[0].type === 'term') ? merged : null
  }

  return { trie, highlight }
}

function mergeSegments(segments) {
  const result = []
  let current = null
  for (const seg of segments) {
    if (current && current.type === seg.type) {
      current.content += seg.content
    } else {
      current = { type: seg.type, content: seg.content }
      result.push(current)
    }
  }
  return result
}