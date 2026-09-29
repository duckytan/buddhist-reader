import { describe, expect, it } from 'vitest'

import { buildTrie, createTrieNode, longestMatch } from '@/utils/trie'

describe('trie', () => {
  const root = buildTrie(['般若', '般若波罗蜜多', '菩提'])

  it('正向最长匹配', () => {
    expect(longestMatch(root, '般若波罗蜜多心经', 0)).toBe('般若波罗蜜多')
  })

  it('短词命中', () => {
    expect(longestMatch(root, '菩提本无树', 0)).toBe('菩提')
  })

  it('无命中返回 null', () => {
    expect(longestMatch(root, '心经', 0)).toBeNull()
  })

  it('从中途位置匹配', () => {
    expect(longestMatch(root, '若般若', 1)).toBe('般若')
  })

  it('空词表不匹配', () => {
    const empty = buildTrie([])
    expect(longestMatch(empty, '般若', 0)).toBeNull()
    expect(empty.isTerm).toBe(false)
  })

  it('createTrieNode 初始为空', () => {
    const node = createTrieNode()
    expect(node.isTerm).toBe(false)
    expect(node.children.size).toBe(0)
  })

  it('忽略空串词', () => {
    const withEmpty = buildTrie(['', '般若'])
    expect(longestMatch(withEmpty, '般若', 0)).toBe('般若')
  })
})
