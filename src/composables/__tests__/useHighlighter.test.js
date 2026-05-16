import { describe, it, expect } from 'vitest'
import { useHighlighter } from '../useHighlighter'

describe('useHighlighter', () => {
  const mockIndex = {
    '般若波罗蜜多': ['dict-1'],
    '般若': ['dict-1', 'dict-2'],
    '菩提': ['dict-1'],
    '十七尊': ['dict-1']
  }

  const { highlight } = useHighlighter(Object.keys(mockIndex))

  it('should highlight known terms in text', () => {
    const result = highlight('般若波罗蜜多心经')
    expect(result).not.toBeNull()
    expect(result.some(s => s.type === 'term')).toBe(true)
  })

  it('should match longer terms first via Trie forward matching', () => {
    const result = highlight('般若波罗蜜多')
    const termSegments = result.filter(s => s.type === 'term')
    expect(termSegments.length).toBe(1)
    expect(termSegments[0].content).toBe('般若波罗蜜多')
  })

  it('should not modify text when no matches found', () => {
    const result = highlight('这是一段普通文字')
    expect(result).toBeNull()
  })

  it('should return null for empty content', () => {
    const result = highlight('')
    expect(result).toBeNull()
  })

  it('should handle text with multiple term matches', () => {
    const result = highlight('般若与菩提')
    const termSegments = result.filter(s => s.type === 'term')
    expect(termSegments.length).toBe(2)
    expect(termSegments[0].content).toBe('般若')
    expect(termSegments[1].content).toBe('菩提')
  })

  it('should skip numeral phrases - not highlight 十七尊 inside 三十七尊', () => {
    const result = highlight('三十七尊')
    expect(result).toBeNull()
  })

  it('should highlight 十七尊 when not in numeral context', () => {
    const result = highlight('供养十七尊')
    const termSegments = result.filter(s => s.type === 'term')
    expect(termSegments.length).toBe(1)
    expect(termSegments[0].content).toBe('十七尊')
  })
})