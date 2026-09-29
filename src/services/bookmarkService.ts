/**
 * 书签领域服务（方案 §6.5 / §7 / §9 T09）。
 *
 * 职责：书签 CRUD + 持久化（`localStorage` key `br-bookmarks`）。
 *
 * **D-1 归位背景**：§6.8 原将「书签」划归 `reader` store，但 store 直接经
 * `data/storage` 落盘属**跳层**，且与其余 4 个 store（`notes→noteService` /
 * `settings→settingsService` / `sutra→sutraService` / `dict→dictService`）**不对称**。
 * T09 做书签闭环时抽出本 service，`reader` store 改为「只持状态 + 委托 service」。
 *
 * 约定：框架无关（不 import Vue/Pinia），可在 Node 下单测；**不做 sutra 标题解析**
 * （§6.8：标题由调用方/composable 提供）。
 *
 * 缓存口径（与 `noteService` 的**有意差异**）：本服务**不设长驻内存缓存**。
 * `reader` store 已持有响应式 `bookmarks`，service 再缓存会形成**影子状态**——
 * 「缓存 vs 直接读盘」不一致正是旧实现跳层落盘的隐患来源。书签量小，每次读盘
 * 成本可忽略；无缓存亦使「外部直接写盘后读取」天然一致，避免测试/多标签页歧义。
 */

import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'
import type { Bookmark } from '@/types/reader'
import { createId } from '@/utils/id'

/** 新增书签入参 */
export interface BookmarkInput {
  sutraId: string
  chapterIdx: number
  /** 章节内滚动位置（像素） */
  position: number
  label?: string
}

export interface BookmarkService {
  /** 全部书签（按创建时间倒序） */
  list(): Bookmark[]
  /** 某经的书签（按创建时间倒序） */
  listBySutra(sutraId: string): Bookmark[]
  /** 取单条 */
  get(id: string): Bookmark | null
  /** 新增 */
  add(input: BookmarkInput): Bookmark
  /** 删除单条（不存在返回 false） */
  remove(id: string): boolean
  /** 删除某经全部书签，返回删除条数 */
  removeBySutra(sutraId: string): number
  /** 清空全部 */
  clear(): void
}

/** 结构校验：脏数据（手改 / 旧版本残留）不入内存，避免污染渲染 */
function isBookmark(value: unknown): value is Bookmark {
  if (!value || typeof value !== 'object') return false
  const bookmark = value as Record<string, unknown>
  return (
    typeof bookmark.id === 'string' &&
    typeof bookmark.sutraId === 'string' &&
    typeof bookmark.chapterIdx === 'number' &&
    typeof bookmark.position === 'number' &&
    typeof bookmark.label === 'string' &&
    typeof bookmark.createdAt === 'number'
  )
}

/** 读取并校验全部书签（损坏条目丢弃） */
function readAll(): Bookmark[] {
  const raw = readJson<unknown>(STORAGE_KEYS.bookmarks, [])
  if (!Array.isArray(raw)) return []
  return raw.filter(isBookmark)
}

/** 落盘（写入失败由 storage 层显式返回 false，此处无需降级逻辑） */
function persist(list: Bookmark[]): void {
  writeJson(STORAGE_KEYS.bookmarks, list)
}

/** 创建书签领域服务。 */
export function createBookmarkService(): BookmarkService {
  function list(): Bookmark[] {
    return [...readAll()].sort((a, b) => b.createdAt - a.createdAt)
  }

  function listBySutra(sutraId: string): Bookmark[] {
    return list().filter((bookmark) => bookmark.sutraId === sutraId)
  }

  function get(id: string): Bookmark | null {
    return readAll().find((bookmark) => bookmark.id === id) ?? null
  }

  function add(input: BookmarkInput): Bookmark {
    const bookmark: Bookmark = {
      id: createId('bm'),
      sutraId: input.sutraId,
      chapterIdx: input.chapterIdx,
      position: input.position,
      label: input.label ?? '',
      createdAt: Date.now()
    }
    persist([bookmark, ...readAll()])
    return bookmark
  }

  function remove(id: string): boolean {
    const current = readAll()
    const next = current.filter((bookmark) => bookmark.id !== id)
    if (next.length === current.length) return false
    persist(next)
    return true
  }

  function removeBySutra(sutraId: string): number {
    const current = readAll()
    const next = current.filter((bookmark) => bookmark.sutraId !== sutraId)
    const removed = current.length - next.length
    if (removed > 0) persist(next)
    return removed
  }

  function clear(): void {
    persist([])
  }

  return { list, listBySutra, get, add, remove, removeBySutra, clear }
}

/** 应用级单例 */
export const bookmarkService = createBookmarkService()
