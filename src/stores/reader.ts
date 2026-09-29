/**
 * 阅读器 store（方案 §6.8 / §6.5）。
 *
 * 职责边界（§6.8）：**滚动位置、书签、当前章节**。
 * ❌ 禁止：面板开关等 **UI 状态**；❌ 阅读时长（§6.6 已整体移除采集）。
 *
 * 持久化说明（边界记录）：方案 §5 文件清单**无 `bookmarkService`**（§6.5 将书签
 * 闭环归入 T09），而 §6.8 明确把「书签」划归 `reader` store。故此处由 store 直接
 * 经 `data/storage`（key `br-bookmarks`）落盘——`store → data` 属**向下跨层**依赖，
 * 符合 §2.1「跨层只能向下依赖」。阅读进度（滚动位置）的持久化则走
 * `progressService`（服务层），不在本 store 落盘。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'
import type { Bookmark } from '@/types/reader'
import { createId } from '@/utils/id'

/** 新增书签入参 */
export interface BookmarkInput {
  sutraId: string
  chapterIdx: number
  position: number
  label?: string
}

export const useReaderStore = defineStore('reader', () => {
  /** 当前经书 id（文件名） */
  const sutraId = ref<string | null>(null)
  /** 当前章节索引 */
  const chapterIdx = ref(0)
  /** 当前章节内滚动位置 */
  const position = ref(0)
  /** 全部书签 */
  const bookmarks = ref<Bookmark[]>([])

  /** 当前经书的书签（按创建时间倒序） */
  const currentBookmarks = computed<Bookmark[]>(() => {
    if (!sutraId.value) return []
    return bookmarks.value
      .filter((bookmark) => bookmark.sutraId === sutraId.value)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  /** 切换当前经书（重置章节/位置） */
  function setCurrent(nextSutraId: string | null): void {
    sutraId.value = nextSutraId
    chapterIdx.value = 0
    position.value = 0
  }

  /** 更新滚动位置与当前章节 */
  function setPosition(next: { chapterIdx: number; position: number }): void {
    chapterIdx.value = next.chapterIdx
    position.value = next.position
  }

  /** 从 localStorage 载入书签 */
  function loadBookmarks(): Bookmark[] {
    const stored = readJson<Bookmark[]>(STORAGE_KEYS.bookmarks, [])
    bookmarks.value = Array.isArray(stored) ? stored : []
    return bookmarks.value
  }

  /** 落盘书签 */
  function persistBookmarks(): void {
    writeJson(STORAGE_KEYS.bookmarks, bookmarks.value)
  }

  /** 新增书签（若未载入过则先载入，避免覆盖已有数据） */
  function addBookmark(input: BookmarkInput): Bookmark {
    if (bookmarks.value.length === 0) loadBookmarks()
    const bookmark: Bookmark = {
      id: createId('bm'),
      sutraId: input.sutraId,
      chapterIdx: input.chapterIdx,
      position: input.position,
      label: input.label ?? '',
      createdAt: Date.now()
    }
    bookmarks.value = [bookmark, ...bookmarks.value]
    persistBookmarks()
    return bookmark
  }

  /** 删除书签 */
  function removeBookmark(id: string): boolean {
    const next = bookmarks.value.filter((bookmark) => bookmark.id !== id)
    if (next.length === bookmarks.value.length) return false
    bookmarks.value = next
    persistBookmarks()
    return true
  }

  /** 清空全部书签 */
  function clearBookmarks(): void {
    bookmarks.value = []
    persistBookmarks()
  }

  return {
    sutraId,
    chapterIdx,
    position,
    bookmarks,
    currentBookmarks,
    setCurrent,
    setPosition,
    loadBookmarks,
    addBookmark,
    removeBookmark,
    clearBookmarks
  }
})
