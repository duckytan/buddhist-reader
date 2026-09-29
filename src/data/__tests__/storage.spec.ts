import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  it('writeJson：写失败（配额耗尽）→ 返回 false（不谎报成功）', () => {
    // 让 setItem 抛错，模拟配额耗尽 / 序列化失败
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      // 红条件（存活变异体 V7a）：若 writeJson 的 catch 改成 `return true`（谎报成功）
      // → 此处变 true → 红。这是 T10 审计发现「该分支无覆盖」的守护用例。
      expect(writeJson('br-quota', { a: 1 })).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })

  it('isStorageAvailable：探测写入抛错 → 返回 false（不可用分支）', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    try {
      // 红条件：若 isStorageAvailable 的 catch 改成 `return true` → 此处变 true → 红
      expect(isStorageAvailable()).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})
