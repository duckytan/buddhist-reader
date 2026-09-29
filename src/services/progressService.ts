/**
 * 阅读进度领域服务（方案 §6.3）。
 *
 * 职责：**每经独立 key** 的进度持久化；**同时存 `chapterIdx` + `position`**
 * （修复旧版不存章节）；保存**节流 300ms**（尾触发）。
 *
 * 约定：框架无关（不 import Vue/Pinia）。DOM/生命周期副作用（页面隐藏时 flush）
 * 由组件层 `useReadingProgress` 负责（§6.8）。
 */

import { progressKey, readJson, removeKey, writeJson } from '@/data/storage'
import type { ReadingProgress } from '@/types/reader'

/** 保存节流间隔（ms，§6.3） */
export const PROGRESS_FLUSH_DELAY_MS = 300

export interface ProgressService {
  /** 恢复某经进度（含尚未落盘的挂起值；无记录返回 null） */
  restore(sutraId: string): ReadingProgress | null
  /** 保存进度（节流 300ms 尾触发落盘） */
  save(progress: ReadingProgress): void
  /** 立即落盘所有挂起写入 */
  flush(): void
  /** 清除某经进度（挂起值一并丢弃） */
  clear(sutraId: string): void
}

/** 创建阅读进度领域服务。 */
export function createProgressService(): ProgressService {
  const pending = new Map<string, ReadingProgress>()
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    for (const [sutraId, progress] of pending) {
      writeJson(progressKey(sutraId), progress)
    }
    pending.clear()
  }

  function schedule(): void {
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      flush()
    }, PROGRESS_FLUSH_DELAY_MS)
  }

  function restore(sutraId: string): ReadingProgress | null {
    const held = pending.get(sutraId)
    if (held) return { ...held }
    const stored = readJson<ReadingProgress | null>(progressKey(sutraId), null)
    if (!stored || typeof stored !== 'object') return null
    return stored
  }

  function save(progress: ReadingProgress): void {
    pending.set(progress.sutraId, { ...progress, updatedAt: progress.updatedAt || Date.now() })
    schedule()
  }

  function clear(sutraId: string): void {
    pending.delete(sutraId)
    removeKey(progressKey(sutraId))
  }

  return { restore, save, flush, clear }
}

/** 应用级单例 */
export const progressService = createProgressService()
