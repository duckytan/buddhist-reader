import { dictTerms } from '../data/dictIndex'
import { computed } from 'vue'

export function useHighlighter(content, termIndex) {
  const terms = computed(() => {
    if (!termIndex) return []
    return dictTerms.filter(t => termIndex[t] && termIndex[t].length > 0)
  })

  function buildRegex() {
    if (terms.value.length === 0) return null
    const pattern = terms.value.map(escapeRegex).join('|')
    return new RegExp(pattern, 'g')
  }

  function highlight(text) {
    if (!text) return null
    const re = buildRegex()
    if (!re) return text

    const segments = []
    let lastIndex = 0
    let match

    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      segments.push({ type: 'term', content: match[0] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return segments.length > 0 ? segments : null
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  return { terms, highlight }
}