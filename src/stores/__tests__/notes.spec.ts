import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { noteService } from '@/services/noteService'
import { useNotesStore } from '@/stores/notes'

describe('stores/notes', () => {
  beforeEach(() => {
    localStorage.clear()
    noteService.clear()
    setActivePinia(createPinia())
  })

  it('load / add / bySutra / countBySutra', () => {
    const store = useNotesStore()
    store.load()
    expect(store.notes).toHaveLength(0)

    store.add({ sutraId: 'a.json', quote: '甲', text: '注一' })
    store.add({ sutraId: 'a.json', quote: '乙', text: '注二' })
    store.add({ sutraId: 'b.json', quote: '丙', text: '注三' })

    expect(store.notes).toHaveLength(3)
    expect(store.bySutra('a.json')).toHaveLength(2)
    expect(store.countBySutra['a.json']).toBe(2)
    expect(store.countBySutra['b.json']).toBe(1)
  })

  it('update / remove / removeBySutra', () => {
    const store = useNotesStore()
    const note = store.add({ sutraId: 'a.json', quote: '甲', text: '旧' })

    expect(store.update(note.id, { text: '新' })?.text).toBe('新')
    expect(store.get(note.id)?.text).toBe('新')
    expect(store.update('missing', { text: 'x' })).toBeNull()

    expect(store.remove(note.id)).toBe(true)
    expect(store.remove('missing')).toBe(false)

    store.add({ sutraId: 'a.json', quote: 'q', text: 't' })
    store.add({ sutraId: 'a.json', quote: 'q', text: 't' })
    expect(store.removeBySutra('a.json')).toBe(2)
    expect(store.notes).toHaveLength(0)
  })
})
