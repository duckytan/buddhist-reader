/**
 * 阅读器 store（方案 §6.8 / §6.5）。
 *
 * 职责边界（§6.8）：**滚动位置、书签、当前章节**。
 * ❌ 禁止：面板开关等 **UI 状态**；❌ 阅读时长（§6.6 已整体移除采集）。
 *
 * **D-1 归位（T09）**：书签的持久化与增删逻辑移交 `services/bookmarkService`
 * （框架无关）——本 store **只持状态 + 委托 service**，**不再直连 `data/storage`**，
 * 与其余 4 个 store 的做法对齐（`notes→noteService` 等）。阅读进度（滚动位置）
 * 的持久化走 `progressService`（服务层），亦不在本 store 落盘。
 *
 * 一致性口径：任何书签增删后都**回读 service**（`loadBookmarks`）刷新本地列表，
 * 使 store 恒为持久层的投影（持久层是唯一真源）。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { bookmarkService } from '@/services/bookmarkService'
import type { BookmarkInput } from '@/services/bookmarkService'
import type { Bookmark } from '@/types/reader'

// 保持既有对外类型出口（调用方/测试自 `stores/reader` 引入 `BookmarkInput`）
export type { BookmarkInput }

export const useReaderStore = defineStore('reader', () => {
  /** 当前经书 id（文件名） */
  const sutraId = ref<string | null>(null)
  /** 当前章节索引 */
  const chapterIdx = ref(0)
  /** 当前章节内滚动位置 */
  const position = ref(0)
  /** 全部书签（持久层投影） */
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

  /** 从持久层（经 service）载入书签 */
  function loadBookmarks(): Bookmark[] {
    bookmarks.value = bookmarkService.list()
    return bookmarks.value
  }

  /** 新增书签（委托 service 落盘后回读，保持 store 与持久层一致） */
  function addBookmark(input: BookmarkInput): Bookmark {
    const bookmark = bookmarkService.add(input)
    loadBookmarks()
    return bookmark
  }

  /** 删除书签（不存在返回 false，且不触发回读） */
  function removeBookmark(id: string): boolean {
    const removed = bookmarkService.remove(id)
    if (removed) loadBookmarks()
    return removed
  }

  /** 清空全部书签 */
  function clearBookmarks(): void {
    bookmarkService.clear()
    loadBookmarks()
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
