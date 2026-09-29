import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import {
  SEARCH_CONTEXT_CHARS,
  SEARCH_MAX_HITS,
  useSearch
} from '@/composables/useSearch'
import type { Sutra } from '@/types/sutra'

function makeSutra(paragraphs: Array<{ id: string; text: string }>): Sutra {
  return {
    title: '测试经',
    filename: 't.json',
    author: 'x',
    category: 'general',
    chapterCount: 1,
    totalParagraphs: paragraphs.length,
    totalChars: paragraphs.reduce((sum, p) => sum + p.text.length, 0),
    description: '',
    chapters: [
      {
        title: '第一章',
        paragraphs: paragraphs.map((p, index) => ({
          id: p.id,
          text: p.text,
          globalId: `t.json:0:${index}`
        }))
      }
    ]
  }
}

describe('useSearch（§8.3）', () => {
  it('单段 indexOf：命中返回 globalId / paraOffset / context', () => {
    const sutra = ref<Sutra | null>(makeSutra([{ id: 'p1', text: '观自在般若行深般若' }]))
    const { search, hits } = useSearch(sutra)

    const found = search('般若')

    expect(found).toHaveLength(2)
    expect(found[0]).toEqual({ globalId: 't.json:0:0', paraOffset: 3, context: expect.any(String) })
    expect(found[1]?.paraOffset).toBe(7)
    expect(hits.value).toHaveLength(2)
  })

  it('不跨段匹配（关键词只在跨段拼接处出现 → 0 命中）', () => {
    const sutra = ref<Sutra | null>(
      makeSutra([
        { id: 'p1', text: '末字AB' },
        { id: 'p2', text: 'CD起首' }
      ])
    )
    const { search } = useSearch(sutra)

    expect(search('BC')).toHaveLength(0)
  })

  it('上下文 ≤ 20 字且包含关键词', () => {
    const long = '一二三四五六七八九十' + '般若' + '甲乙丙丁戊己庚辛壬癸子丑寅卯'
    const sutra = ref<Sutra | null>(makeSutra([{ id: 'p1', text: long }]))
    const { search } = useSearch(sutra)

    const hit = search('般若')[0]

    expect(hit).toBeDefined()
    expect(hit?.context.length).toBeLessThanOrEqual(SEARCH_CONTEXT_CHARS)
    expect(hit?.context).toContain('般若')
  })

  it('上限 50 条', () => {
    // 关键词须 ≥2 字（§8.3），故用「空空」重复：120 字 → 60 处非重叠命中 → 截断为 50。
    const sutra = ref<Sutra | null>(makeSutra([{ id: 'p1', text: '空空'.repeat(60) }]))
    const { search } = useSearch(sutra)

    expect(search('空空')).toHaveLength(SEARCH_MAX_HITS)
  })

  it('关键词 < 2 字 / 无经书 → 空结果；clear 清空', () => {
    const sutra = ref<Sutra | null>(makeSutra([{ id: 'p1', text: '般若般若' }]))
    const { search, clear, keyword, hits } = useSearch(sutra)

    expect(search('般')).toHaveLength(0)

    sutra.value = null
    expect(search('般若')).toHaveLength(0)

    sutra.value = makeSutra([{ id: 'p1', text: '般若' }])
    search('般若')
    clear()
    expect(keyword.value).toBe('')
    expect(hits.value).toHaveLength(0)
  })
})
