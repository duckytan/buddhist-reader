import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { STORAGE_KEYS } from '@/data/storage'
import { useReaderStore } from '@/stores/reader'
// 源码级断言：D-1 归位（reader store 不得直连 @/data/storage）
import readerStoreSource from '@/stores/reader.ts?raw'

describe('stores/reader', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('setCurrent 切换经书并重置章节/位置', () => {
    const store = useReaderStore()
    store.setPosition({ chapterIdx: 3, position: 120 })

    store.setCurrent('a.json')
    expect(store.sutraId).toBe('a.json')
    expect(store.chapterIdx).toBe(0)
    expect(store.position).toBe(0)

    store.setPosition({ chapterIdx: 1, position: 40 })
    expect(store.chapterIdx).toBe(1)
    expect(store.position).toBe(40)
  })

  it('addBookmark / removeBookmark 持久化', () => {
    const store = useReaderStore()
    const bookmark = store.addBookmark({ sutraId: 'a.json', chapterIdx: 1, position: 88, label: '此处' })

    expect(bookmark.label).toBe('此处')
    expect(store.bookmarks).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.bookmarks) ?? '[]')).toHaveLength(1)

    expect(store.removeBookmark(bookmark.id)).toBe(true)
    expect(store.removeBookmark('missing')).toBe(false)
    expect(store.bookmarks).toHaveLength(0)
  })

  it('currentBookmarks 仅含当前经书且倒序', () => {
    const store = useReaderStore()
    store.addBookmark({ sutraId: 'a.json', chapterIdx: 0, position: 1 })
    store.addBookmark({ sutraId: 'b.json', chapterIdx: 0, position: 2 })
    store.addBookmark({ sutraId: 'a.json', chapterIdx: 2, position: 3 })

    store.setCurrent('a.json')
    const list = store.currentBookmarks
    expect(list).toHaveLength(2)
    expect(list.every((item) => item.sutraId === 'a.json')).toBe(true)
    expect(list[0]?.position).toBe(3) // 最新在前
  })

  it('loadBookmarks 从持久层读取', () => {
    localStorage.setItem(
      STORAGE_KEYS.bookmarks,
      JSON.stringify([{ id: 'x', sutraId: 'a.json', chapterIdx: 0, position: 5, label: '', createdAt: 1 }])
    )
    const store = useReaderStore()

    store.loadBookmarks()
    expect(store.bookmarks).toHaveLength(1)
    expect(store.bookmarks[0]?.id).toBe('x')
  })

  it('D-1：reader store 不直连 @/data/storage（书签持久化归位 bookmarkService）', () => {
    // 反向验证：归位前 store 内含 `import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'`，此断言必红。
    expect(readerStoreSource).not.toContain('@/data/storage')
    // 且确实改为委托 service（正向锚点，防止「删了 import 但也没接 service」的假绿）
    expect(readerStoreSource).toContain('@/services/bookmarkService')
  })
})
