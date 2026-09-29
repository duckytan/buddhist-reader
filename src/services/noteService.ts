/**
 * 笔记领域服务（方案 §7 / §6.3）。
 *
 * 职责：笔记 CRUD + 持久化（`localStorage` key `br-notes`）。
 * 关键点：**语义锚点** `anchor:{chapterIdx, paraId, offset}`——修复旧版
 * `paragraphId` 恒空的缺陷（§6.3）。
 *
 * 约定：框架无关（不 import Vue/Pinia）；**不做 sutra 标题解析**（§6.8：由
 * 调用方/composable 经 `sutraService` 解析标题）。
 */

import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'
import type { Note, NoteAnchor } from '@/types/note'
import { createId } from '@/utils/id'

/** 新增笔记入参 */
export interface NoteInput {
  sutraId: string
  /** 划选原文 */
  quote: string
  /** 笔记内容 */
  text: string
  /** 锚点；无定位信息时省略或传 null */
  anchor?: NoteAnchor | null
}

/** 更新笔记入参（部分字段） */
export interface NotePatch {
  quote?: string
  text?: string
  anchor?: NoteAnchor | null
}

export interface NoteService {
  /** 全部笔记（按更新时间倒序） */
  list(): Note[]
  /** 某经的笔记 */
  listBySutra(sutraId: string): Note[]
  /** 取单条 */
  get(id: string): Note | null
  /** 新增 */
  add(input: NoteInput): Note
  /** 更新（不存在返回 null） */
  update(id: string, patch: NotePatch): Note | null
  /** 删除单条 */
  remove(id: string): boolean
  /** 删除某经全部笔记，返回删除条数 */
  removeBySutra(sutraId: string): number
  /** 清空全部 */
  clear(): void
}

/** 创建笔记领域服务。 */
export function createNoteService(): NoteService {
  let cache: Note[] | null = null

  function load(): Note[] {
    if (cache) return cache
    const raw = readJson<Note[]>(STORAGE_KEYS.notes, [])
    cache = Array.isArray(raw) ? raw : []
    return cache
  }

  function persist(): void {
    writeJson(STORAGE_KEYS.notes, cache ?? [])
  }

  function list(): Note[] {
    return [...load()].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  function listBySutra(sutraId: string): Note[] {
    return list().filter((note) => note.sutraId === sutraId)
  }

  function get(id: string): Note | null {
    return load().find((note) => note.id === id) ?? null
  }

  function add(input: NoteInput): Note {
    const now = Date.now()
    const note: Note = {
      id: createId('note'),
      sutraId: input.sutraId,
      quote: input.quote,
      text: input.text,
      anchor: input.anchor ?? null,
      createdAt: now,
      updatedAt: now
    }
    cache = [note, ...load()]
    persist()
    return note
  }

  function update(id: string, patch: NotePatch): Note | null {
    const notes = load()
    const index = notes.findIndex((note) => note.id === id)
    if (index < 0) return null
    const current = notes[index]
    if (!current) return null
    const next: Note = {
      ...current,
      quote: patch.quote ?? current.quote,
      text: patch.text ?? current.text,
      anchor: patch.anchor === undefined ? current.anchor : patch.anchor,
      updatedAt: Date.now()
    }
    const copy = [...notes]
    copy[index] = next
    cache = copy
    persist()
    return next
  }

  function remove(id: string): boolean {
    const notes = load()
    const next = notes.filter((note) => note.id !== id)
    if (next.length === notes.length) return false
    cache = next
    persist()
    return true
  }

  function removeBySutra(sutraId: string): number {
    const notes = load()
    const next = notes.filter((note) => note.sutraId !== sutraId)
    const removed = notes.length - next.length
    if (removed > 0) {
      cache = next
      persist()
    }
    return removed
  }

  function clear(): void {
    cache = []
    persist()
  }

  return { list, listBySutra, get, add, update, remove, removeBySutra, clear }
}

/** 应用级单例 */
export const noteService = createNoteService()
