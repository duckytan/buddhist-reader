import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useHighlighter } from '@/composables/useHighlighter'
import type { Segment } from '@/types/highlight'

/** 从 v3.1.0 `useHighlighter.test.js` 移植的基准词表 */
const mockTerms = ['般若波罗蜜多', '般若', '菩提', '十七尊']

describe('useHighlighter', () => {
  const { highlight } = useHighlighter(mockTerms)

  /** 取命中词段（断言非空） */
  function termSegments(text: string): Segment[] {
    const result = highlight(text)
    if (!result) throw new Error(`expected non-null highlight for: ${text}`)
    return result.filter((s) => s.type === 'term')
  }

  it('高亮已知术语', () => {
    const result = highlight('般若波罗蜜多心经')
    expect(result).not.toBeNull()
    expect(result?.some((s) => s.type === 'term')).toBe(true)
  })

  it('正向最长匹配：优先长词', () => {
    const terms = termSegments('般若波罗蜜多')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.content).toBe('般若波罗蜜多')
  })

  it('无命中返回 null', () => {
    expect(highlight('这是一段普通文字')).toBeNull()
  })

  it('空串返回 null', () => {
    expect(highlight('')).toBeNull()
  })

  it('多处命中', () => {
    const terms = termSegments('般若与菩提')
    expect(terms).toHaveLength(2)
    expect(terms[0]?.content).toBe('般若')
    expect(terms[1]?.content).toBe('菩提')
  })

  it('数字短语过滤：不在「三十七尊」中命中「十七尊」', () => {
    expect(highlight('三十七尊')).toBeNull()
  })

  it('非数字上下文正常命中「十七尊」', () => {
    const terms = termSegments('供养十七尊')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.content).toBe('十七尊')
  })

  it('Segment 携带正确字符偏移 off（供 §6.1 锚点）', () => {
    const result = highlight('供养十七尊')
    expect(result).not.toBeNull()
    const term = result?.find((s) => s.type === 'term')
    const text = result?.find((s) => s.type === 'text')
    expect(term?.off).toBe(2)
    expect(text?.off).toBe(0)
  })

  it('兼容 ref 词表输入（含响应式更新）', () => {
    const termsRef = ref<string[]>(['般若'])
    const { highlight: h } = useHighlighter(termsRef)
    expect(h('般若')).not.toBeNull()
    termsRef.value = []
    expect(h('般若')).toBeNull()
  })

  it('空词表返回 null', () => {
    const { highlight: h } = useHighlighter([])
    expect(h('般若')).toBeNull()
  })
})
