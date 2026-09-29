import { beforeEach, describe, expect, it } from 'vitest'

import {
  STORAGE_KEYS,
  isStorageAvailable,
  progressKey,
  readJson,
  removeKey,
  writeJson
} from '@/data/storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writeJson / readJson 往返', () => {
    expect(writeJson('br-test', { a: 1 })).toBe(true)
    expect(readJson('br-test', null)).toEqual({ a: 1 })
  })

  it('缺失 key 返回 fallback', () => {
    expect(readJson('br-missing', 'def')).toBe('def')
  })

  it('损坏 JSON 返回 fallback', () => {
    localStorage.setItem('br-broken', '{not json')
    expect(readJson('br-broken', 42)).toBe(42)
  })

  it('removeKey 删除 key', () => {
    writeJson('br-temp', 1)
    removeKey('br-temp')
    expect(readJson('br-temp', null)).toBeNull()
  })

  it('progressKey 每经独立', () => {
    expect(progressKey('heart-sutra')).toBe(`${STORAGE_KEYS.progressPrefix}heart-sutra`)
    expect(progressKey('a')).not.toBe(progressKey('b'))
  })

  it('key 常量统一使用 br- 前缀', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith('br-')).toBe(true)
    }
  })

  it('jsdom 下 localStorage 可用', () => {
    expect(isStorageAvailable()).toBe(true)
  })
})
