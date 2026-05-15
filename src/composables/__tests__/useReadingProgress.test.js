import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReadingProgress } from '../useReadingProgress'

describe('useReadingProgress', () => {
  const sutraId = 'test-sutra-1'

  beforeEach(() => {
    localStorage.clear()
  })

  it('should restore saved position from localStorage', () => {
    localStorage.setItem('br-progress-test-sutra-1', JSON.stringify({
      sutraId: 'test-sutra-1', position: 500, percent: 30, time: Date.now()
    }))
    const { savedPosition, restore } = useReadingProgress(sutraId)
    restore()
    expect(savedPosition.value).toBe(500)
  })

  it('should save progress to localStorage', () => {
    const { save } = useReadingProgress(sutraId)
    save(300, 15)
    const stored = JSON.parse(localStorage.getItem('br-progress-test-sutra-1'))
    expect(stored.position).toBe(300)
    expect(stored.percent).toBe(15)
  })

  it('should clear progress from localStorage', () => {
    localStorage.setItem('br-progress-test-sutra-1', JSON.stringify({
      sutraId: 'test-sutra-1', position: 100, percent: 5, time: Date.now()
    }))
    const { clear } = useReadingProgress(sutraId)
    clear()
    expect(localStorage.getItem('br-progress-test-sutra-1')).toBeNull()
  })

  it('should default to 0 position when no saved data', () => {
    const { savedPosition, restore } = useReadingProgress(sutraId)
    restore()
    expect(savedPosition.value).toBe(0)
  })

  it('should handle localStorage full gracefully', () => {
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => { throw new Error('QuotaExceededError') })

    const { save } = useReadingProgress(sutraId)
    save(500, 25)

    localStorage.setItem = originalSetItem
  })
})