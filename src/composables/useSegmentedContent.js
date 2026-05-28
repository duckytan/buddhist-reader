import { computed, shallowRef, watch } from 'vue'

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

function highlightWithTrie(text, trie) {
  if (!text || !trie) return [{ type: 'text', content: text }]
  
  const segments = []
  let pos = 0
  
  while (pos < text.length) {
    const match = longestMatch(trie, text, pos)
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
  
  return mergeSegments(segments)
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
  return result.length > 1 || (result.length === 1 && result[0].type === 'term') ? result : null
}

function insertSearchHighlights(segments, keyword) {
  if (!keyword || keyword.length < 2) return segments
  
  const out = []
  const kwLower = keyword.toLowerCase()
  
  for (const seg of segments) {
    if (seg.type === 'term') {
      out.push(seg)
      continue
    }
    
    const text = seg.content
    const lower = text.toLowerCase()
    let lastIdx = 0
    let pos = lower.indexOf(kwLower, lastIdx)
    
    if (pos === -1) {
      out.push(seg)
      continue
    }
    
    while (pos !== -1) {
      if (pos > lastIdx) {
        out.push({ type: 'text', content: text.slice(lastIdx, pos) })
      }
      out.push({ type: 'search', content: text.slice(pos, pos + keyword.length) })
      lastIdx = pos + keyword.length
      pos = lower.indexOf(kwLower, lastIdx)
    }
    
    if (lastIdx < text.length) {
      out.push({ type: 'text', content: text.slice(lastIdx) })
    }
  }
  
  return out
}

export function useSegmentedContent(chaptersRef, enabledTermsRef, searchKeywordRef) {
  const trieRef = shallowRef(null)
  
  watch(
    () => enabledTermsRef?.value || [],
    (terms) => {
      trieRef.value = terms && terms.length > 0 ? buildTrie(terms) : null
    },
    { immediate: true }
  )
  
  const segmentedChapters = computed(() => {
    const chapters = chaptersRef?.value || []
    const trie = trieRef.value
    const kw = searchKeywordRef?.value || ''
    
    if (!chapters || chapters.length === 0) return []
    
    return chapters.map((ch, chIdx) => ({
      ...ch,
      idx: chIdx,
      paragraphs: (ch.paragraphs || []).map(p => ({
        ...p,
        segments: processText(p.text || '', trie, kw)
      }))
    }))
  })
  
  return { segmentedChapters }
}

function processText(text, trie, keyword) {
  let segments = highlightWithTrie(text, trie)
  
  if (keyword && keyword.length >= 2) {
    segments = insertSearchHighlights(segments, keyword)
  }
  
  return segments || [{ type: 'text', content: text }]
}