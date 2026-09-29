import { beforeEach, describe, expect, it } from 'vitest'

import { createNoteService } from '@/services/noteService'

describe('noteService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('add / list：新增后可列出且按更新时间倒序', () => {
    const service = createNoteService()
    const first = service.add({ sutraId: 'a.json', quote: '甲', text: '注一' })
    const second = service.add({ sutraId: 'a.json', quote: '乙', text: '注二' })

    const list = service.list()
    expect(list).toHaveLength(2)
    expect(list[0]?.id).toBe(second.id)
    expect(list[1]?.id).toBe(first.id)
    expect(first.anchor).toBeNull()
  })

  it('持久化：新实例可读到既有笔记', () => {
    const service = createNoteService()
    service.add({ sutraId: 'a.json', quote: '甲', text: '注一', anchor: { chapterIdx: 0, paraId: 'p1', offset: 3 } })

    const reopened = createNoteService()
    const list = reopened.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.anchor).toEqual({ chapterIdx: 0, paraId: 'p1', offset: 3 })
  })

  it('update：部分更新且刷新 updatedAt', () => {
    const service = createNoteService()
    const note = service.add({ sutraId: 'a.json', quote: '甲', text: '旧' })

    const updated = service.update(note.id, { text: '新' })
    expect(updated?.text).toBe('新')
    expect(updated?.quote).toBe('甲')
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(note.updatedAt)

    expect(service.update('missing', { text: 'x' })).toBeNull()
  })

  it('remove / removeBySutra / get', () => {
    const service = createNoteService()
    const a = service.add({ sutraId: 'a.json', quote: 'q', text: 't' })
    service.add({ sutraId: 'a.json', quote: 'q2', text: 't2' })
    service.add({ sutraId: 'b.json', quote: 'q3', text: 't3' })

    expect(service.get(a.id)?.text).toBe('t')
    expect(service.remove(a.id)).toBe(true)
    expect(service.remove('missing')).toBe(false)
    expect(service.removeBySutra('a.json')).toBe(1)
    expect(service.list()).toHaveLength(1)
  })
})
