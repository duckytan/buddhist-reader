import { describe, it, expect } from 'vitest'
import { useHighlighter } from '../useHighlighter'

describe('useHighlighter', () => {
  const mockIndex = {
    '般若波罗蜜多': ['dict-1'],
    '般若': ['dict-1', 'dict-2'],
    '菩提': ['dict-1']
  }

  const { highlight } = useHighlighter(null, mockIndex)

  it('should highlight known terms in text', () => {
    const result = highlight('般若波罗蜜多心经')
    expect(result).not.toBeNull()
    expect(result.some(s => s.type === 'term')).toBe(true)
    expect(result.some(s => s.type === 'text')).toBe(true)
  })

  it('should match longer terms first (般若波罗蜜多 before 般若)', () => {
    const result = highlight('般若波罗蜜多')
    const termSegments = result.filter(s => s.type === 'term')
    expect(termSegments.length).toBe(1)
    expect(termSegments[0].content).toBe('般若波罗蜜多')
  })

  it('should not modify text when no matches found', () => {
    const result = highlight('这是一段普通文字')
    if (result) {
      expect(result.every(s => s.type === 'text')).toBe(true)
    } else {
      expect(result).toBeNull()
    }
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

  it('should return text segments between matched terms', () => {
    const result = highlight('般若与菩提')
    const textSegments = result.filter(s => s.type === 'text')
    expect(textSegments.some(s => s.content === '与')).toBe(true)
  })
})