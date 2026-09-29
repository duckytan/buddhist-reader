import { beforeEach, describe, expect, it } from 'vitest'

import { progressKey } from '@/data/storage'
import { createProgressService } from '@/services/progressService'
import type { ReadingProgress } from '@/types/reader'

function progress(sutraId: string, overrides: Partial<ReadingProgress> = {}): ReadingProgress {
  return {
    sutraId,
    chapterIdx: 2,
    position: 320,
    percent: 12.5,
    updatedAt: Date.now(),
    ...overrides
  }
}

describe('progressService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('restore：无记录返回 null', () => {
    const service = createProgressService()
    expect(service.restore('a.json')).toBeNull()
  })

  it('save 节流：未 flush 前不落盘，flush 后写入且可 restore', () => {
    const service = createProgressService()
    service.save(progress('a.json'))

    expect(localStorage.getItem(progressKey('a.json'))).toBeNull() // 节流窗口内未落盘
    expect(service.restore('a.json')?.position).toBe(320) // 挂起值可直接读

    service.flush()
    expect(localStorage.getItem(progressKey('a.json'))).not.toBeNull()

    const reopened = createProgressService()
    expect(reopened.restore('a.json')?.chapterIdx).toBe(2)
  })

  it('每经独立 key', () => {
    const service = createProgressService()
    service.save(progress('a.json', { position: 1 }))
    service.save(progress('b.json', { position: 2 }))
    service.flush()

    expect(service.restore('a.json')?.position).toBe(1)
    expect(service.restore('b.json')?.position).toBe(2)
  })

  it('clear：删除记录并丢弃挂起值', () => {
    const service = createProgressService()
    service.save(progress('a.json'))
    service.flush()
    expect(service.restore('a.json')).not.toBeNull()

    service.clear('a.json')
    expect(service.restore('a.json')).toBeNull()
    expect(localStorage.getItem(progressKey('a.json'))).toBeNull()
  })
})
