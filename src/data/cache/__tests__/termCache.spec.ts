import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS, readJson } from '@/data/storage'
import { TERM_CACHE_LIMITS, TermCache, makeTermCacheKey } from '@/data/cache/termCache'

interface Persisted {
  entries: Record<string, { definition: string; pinyin: string; ts: number }>
  order: string[]
}

describe('TermCache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('set/get 往返（pinyin 默认空串）', () => {
    const cache = new TermCache()
    cache.set('dict-1', '般若', { definition: '智慧' })
    expect(cache.get('dict-1', '般若')).toMatchObject({ definition: '智慧', pinyin: '' })
    expect(cache.get('dict-1', '不存在')).toBeNull()
  })

  it('makeTermCacheKey 组合 dictId 与 term', () => {
    expect(makeTermCacheKey('dict-1', '般若')).toBe('dict-1::般若')
  })

  it('clear 后为空', () => {
    const cache = new TermCache()
    cache.set('dict-1', '般若', { definition: '智慧' })
    cache.clear()
    expect(cache.get('dict-1', '般若')).toBeNull()
    expect(cache.stats().count).toBe(0)
  })

  it('按条数上限淘汰最久未用', () => {
    const cache = new TermCache({ ...TERM_CACHE_LIMITS, maxEntries: 2, maxBytes: 1024 * 1024 })
    cache.set('d', 'a', { definition: 'A' })
    cache.set('d', 'b', { definition: 'B' })
    cache.get('d', 'a') // a 最近使用
    cache.set('d', 'c', { definition: 'C' }) // 淘汰最久未用 b
    expect(cache.get('d', 'b')).toBeNull()
    expect(cache.get('d', 'a')).not.toBeNull()
    expect(cache.get('d', 'c')).not.toBeNull()
  })

  it('单条超过 maxEntryBytes 不入缓存', () => {
    const cache = new TermCache({ ...TERM_CACHE_LIMITS, maxEntryBytes: 8 })
    cache.set('d', 'big', { definition: 'x'.repeat(100) })
    expect(cache.get('d', 'big')).toBeNull()
    expect(cache.stats().count).toBe(0)
  })

  it('写入节流：flushDelayMs 后才落盘', () => {
    vi.useFakeTimers()
    const cache = new TermCache({ ...TERM_CACHE_LIMITS, flushDelayMs: 300 })
    cache.set('d', 'a', { definition: 'A' })
    expect(readJson<Persisted | null>(STORAGE_KEYS.dictCache, null)).toBeNull()
    vi.advanceTimersByTime(300)
    const persisted = readJson<Persisted | null>(STORAGE_KEYS.dictCache, null)
    expect(persisted?.order).toEqual(['d::a'])
  })

  it('flush 立即落盘', () => {
    const cache = new TermCache()
    cache.set('d', 'a', { definition: 'A' })
    cache.flush()
    const persisted = readJson<Persisted | null>(STORAGE_KEYS.dictCache, null)
    expect(persisted?.entries['d::a']?.definition).toBe('A')
  })

  it('新实例可从 localStorage 恢复', () => {
    const first = new TermCache()
    first.set('d', 'a', { definition: 'A' })
    first.flush()
    const second = new TermCache()
    expect(second.get('d', 'a')?.definition).toBe('A')
  })
})
