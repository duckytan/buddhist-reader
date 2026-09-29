/**
 * 笔记 store（方案 §6.8）。
 *
 * 职责边界（§6.8）：**笔记 CRUD**。
 * ❌ 禁止：sutra 标题解析——由 composable 经 `sutraService` 提供标题。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { noteService } from '@/services/noteService'
import type { NoteInput, NotePatch } from '@/services/noteService'
import type { Note } from '@/types/note'

export const useNotesStore = defineStore('notes', () => {
  /** 全部笔记（更新时间倒序） */
  const notes = ref<Note[]>([])
  /** 是否已从持久层载入 */
  const loaded = ref(false)

  /** 按经分组的笔记数 */
  const countBySutra = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const note of notes.value) {
      counts[note.sutraId] = (counts[note.sutraId] ?? 0) + 1
    }
    return counts
  })

  /** 从持久层载入 */
  function load(): Note[] {
    notes.value = noteService.list()
    loaded.value = true
    return notes.value
  }

  /** 某经的笔记 */
  function bySutra(sutraId: string): Note[] {
    return notes.value.filter((note) => note.sutraId === sutraId)
  }

  /** 取单条 */
  function get(id: string): Note | null {
    return notes.value.find((note) => note.id === id) ?? null
  }

  /** 新增 */
  function add(input: NoteInput): Note {
    const note = noteService.add(input)
    notes.value = [note, ...notes.value]
    return note
  }

  /** 更新 */
  function update(id: string, patch: NotePatch): Note | null {
    const updated = noteService.update(id, patch)
    if (!updated) return null
    notes.value = notes.value.map((note) => (note.id === id ? updated : note))
    return updated
  }

  /** 删除 */
  function remove(id: string): boolean {
    const ok = noteService.remove(id)
    if (ok) notes.value = notes.value.filter((note) => note.id !== id)
    return ok
  }

  /** 删除某经全部笔记 */
  function removeBySutra(sutraId: string): number {
    const removed = noteService.removeBySutra(sutraId)
    if (removed > 0) notes.value = notes.value.filter((note) => note.sutraId !== sutraId)
    return removed
  }

  return { notes, loaded, countBySutra, load, bySutra, get, add, update, remove, removeBySutra }
})
