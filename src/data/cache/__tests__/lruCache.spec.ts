import { describe, expect, it } from 'vitest'

import { LruCache } from '@/data/cache/lruCache'

describe('LruCache', () => {
  it('基本读写与命中', () => {
    const cache = new LruCache<string, number>({ maxEntries: 3 })
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    expect(cache.has('a')).toBe(true)
    expect(cache.get('z')).toBeUndefined()
    expect(cache.size).toBe(1)
  })

  it('get 刷新 LRU 顺序', () => {
    const cache = new LruCache<string, number>({ maxEntries: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // a 变为最近使用
    cache.set('c', 3) // 淘汰最久未用 b
    expect(cache.has('b')).toBe(false)
    expect(cache.has('a')).toBe(true)
    expect(cache.has('c')).toBe(true)
  })

  it('按条目数淘汰最久未用', () => {
    const cache = new LruCache<string, number>({ maxEntries: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.keys()).toEqual(['b', 'c'])
  })

  it('按字节淘汰', () => {
    const sizeOf = (value: string): number => value.length
    const cache = new LruCache<string, string>({ maxEntries: 100, maxBytes: 5, sizeOf })
    cache.set('a', 'aaa') // 3 字节
    cache.set('b', 'bbb') // 累计 6 > 5 → 淘汰 a
    expect(cache.has('a')).toBe(false)
    expect(cache.byteSize).toBe(3)
  })

  it('保留至少一条（单值超字节上限）', () => {
    const sizeOf = (value: string): number => value.length
    const cache = new LruCache<string, string>({ maxEntries: 10, maxBytes: 2, sizeOf })
    cache.set('big', '123456')
    expect(cache.size).toBe(1)
    expect(cache.get('big')).toBe('123456')
  })

  it('delete 与 clear', () => {
    const cache = new LruCache<string, number>({ maxEntries: 5 })
    cache.set('a', 1)
    expect(cache.delete('a')).toBe(true)
    expect(cache.delete('a')).toBe(false)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.byteSize).toBe(0)
  })

  it('maxEntries < 1 抛 RangeError', () => {
    expect(() => new LruCache<string, number>({ maxEntries: 0 })).toThrow(RangeError)
  })
})
