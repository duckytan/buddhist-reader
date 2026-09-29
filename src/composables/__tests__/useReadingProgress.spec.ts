import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope } from 'vue'

import { progressKey } from '@/data/storage'
import { useReadingProgress, PROGRESS_THROTTLE_MS } from '@/composables/useReadingProgress'
import type { UseReadingProgress } from '@/composables/useReadingProgress'
import { progressService } from '@/services/progressService'
import { useReaderStore } from '@/stores/reader'

function create(): { rp: UseReadingProgress; store: ReturnType<typeof useReaderStore> } {
  const store = useReaderStore()
  const scope = effectScope()
  let rp!: UseReadingProgress
  scope.run(() => {
    rp = useReadingProgress()
  })
  return { rp, store }
}

describe('useReadingProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    progressService.flush()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restore：读回进度并同步 store 位置', () => {
    localStorage.setItem(
      progressKey('a.json'),
      JSON.stringify({ sutraId: 'a.json', chapterIdx: 2, position: 300, percent: 40, updatedAt: 1 })
    )
    const { rp, store } = create()

    const saved = rp.restore('a.json')

    expect(saved?.chapterIdx).toBe(2)
    expect(store.chapterIdx).toBe(2)
    expect(store.position).toBe(300)
    expect(rp.restore('none.json')).toBeNull()
  })

  it('record 节流：窗口内合并、到期提交（leading + trailing）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const { rp, store } = create()

    // 首次立即提交（距上次 > 阈值）
    rp.record('a.json', { chapterIdx: 0, position: 10, percent: 1 })
    expect(store.chapterIdx).toBe(0)

    // 窗口内多次 → 合并，不立即提交
    rp.record('a.json', { chapterIdx: 1, position: 20, percent: 2 })
    rp.record('a.json', { chapterIdx: 3, position: 30, percent: 3 })
    expect(store.chapterIdx).toBe(0)

    // 到期提交最后一次
    vi.advanceTimersByTime(PROGRESS_THROTTLE_MS)
    expect(store.chapterIdx).toBe(3)
    expect(store.position).toBe(30)
  })

  it('flush：提交挂起值并落盘', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const { rp } = create()

    rp.record('a.json', { chapterIdx: 0, position: 10, percent: 1 })
    rp.record('a.json', { chapterIdx: 5, position: 50, percent: 5 }) // 挂起
    rp.flush()

    const stored = JSON.parse(localStorage.getItem(progressKey('a.json')) ?? 'null') as { chapterIdx: number } | null
    expect(stored?.chapterIdx).toBe(5)
  })
})
