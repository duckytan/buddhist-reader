import { beforeEach, describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/data/storage'
import { createBookmarkService } from '@/services/bookmarkService'

describe('services/bookmarkService（§6.5 / D-1）', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('add 落盘到 br-bookmarks，且 list 按创建时间倒序', () => {
    const service = createBookmarkService()

    const first = service.add({ sutraId: 'a.json', chapterIdx: 0, position: 10, label: '一' })
    const second = service.add({ sutraId: 'a.json', chapterIdx: 1, position: 20, label: '二' })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.bookmarks) ?? '[]') as unknown[]
    expect(stored).toHaveLength(2)

    const list = service.list()
    expect(list).toHaveLength(2)
    // 后加者 createdAt >= 先加者 → 倒序时其在先（同毫秒时稳定排序保插入序）
    expect(list[0]?.id).toBe(second.id)
    expect(list[1]?.id).toBe(first.id)
  })

  it('listBySutra 仅返回该经书签', () => {
    const service = createBookmarkService()
    service.add({ sutraId: 'a.json', chapterIdx: 0, position: 1 })
    service.add({ sutraId: 'b.json', chapterIdx: 0, position: 2 })
    service.add({ sutraId: 'a.json', chapterIdx: 2, position: 3 })

    expect(service.listBySutra('a.json')).toHaveLength(2)
    expect(service.listBySutra('b.json')).toHaveLength(1)
    expect(service.listBySutra('missing.json')).toHaveLength(0)
  })

  it('get / remove / removeBySutra / clear', () => {
    const service = createBookmarkService()
    const a1 = service.add({ sutraId: 'a.json', chapterIdx: 0, position: 1 })
    service.add({ sutraId: 'a.json', chapterIdx: 1, position: 2 })
    const b1 = service.add({ sutraId: 'b.json', chapterIdx: 0, position: 3 })

    expect(service.get(a1.id)?.position).toBe(1)
    expect(service.get('missing')).toBeNull()

    expect(service.remove(a1.id)).toBe(true)
    expect(service.remove(a1.id)).toBe(false)
    expect(service.list()).toHaveLength(2)

    expect(service.removeBySutra('a.json')).toBe(1)
    expect(service.list().map((bookmark) => bookmark.id)).toEqual([b1.id])
    expect(service.removeBySutra('nope.json')).toBe(0)

    service.clear()
    expect(service.list()).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.bookmarks) ?? '[]')).toEqual([])
  })

  it('结构损坏的条目被丢弃（脏数据不入内存）', () => {
    localStorage.setItem(
      STORAGE_KEYS.bookmarks,
      JSON.stringify([
        { id: 'ok', sutraId: 'a.json', chapterIdx: 0, position: 5, label: '', createdAt: 1 },
        { id: 'bad-missing-position', sutraId: 'a.json', chapterIdx: 0, label: '', createdAt: 2 },
        'not-an-object'
      ])
    )
    const service = createBookmarkService()

    const list = service.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('ok')
  })

  it('无内存缓存：外部直接写盘后 list 立即可见（避免影子状态）', () => {
    const service = createBookmarkService()
    service.add({ sutraId: 'a.json', chapterIdx: 0, position: 1 })

    // 模拟「外部/另一标签页」直接写入
    localStorage.setItem(
      STORAGE_KEYS.bookmarks,
      JSON.stringify([
        { id: 'ext', sutraId: 'z.json', chapterIdx: 0, position: 9, label: '', createdAt: 100 }
      ])
    )

    expect(service.list().map((bookmark) => bookmark.id)).toEqual(['ext'])
  })
})
