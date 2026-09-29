/**
 * 阅读进度 composable（方案 §6.3）。
 *
 * 职责（§2.1 P2 修订）：响应式胶水 + **渲染节流**；持久化在 `progressService`
 * （每经独立 key、同时存 `chapterIdx` + `position`、写盘节流 300ms）。
 *
 * **双层节流**（各有其职）：
 * - 本 composable：**渲染节流**（默认 200ms，leading + trailing）——避免滚动逐帧
 *   写 store 触发重渲染；
 * - `progressService`：**写盘节流**（300ms）——避免逐帧落 localStorage。
 *
 * 约定：卸载（`onScopeDispose`）时 `flush()`，保证挂起写入不丢失。
 */

import { onScopeDispose, ref } from 'vue'
import type { Ref } from 'vue'

import { progressService } from '@/services/progressService'
import { useReaderStore } from '@/stores/reader'
import type { ReadingProgress } from '@/types/reader'

/** 渲染节流间隔（ms） */
export const PROGRESS_THROTTLE_MS = 200

/** 进度更新（来自滚动，不含 sutraId） */
export interface ProgressUpdate {
  chapterIdx: number
  position: number
  percent: number
}

export interface UseReadingProgress {
  /** 最近一次进度 */
  progress: Ref<ReadingProgress | null>
  /** 恢复某经进度（含挂起值；无记录返回 null） */
  restore(sutraId: string): ReadingProgress | null
  /** 记录进度（渲染节流；内部再交 progressService 写盘节流） */
  record(sutraId: string, update: ProgressUpdate): void
  /** 立即提交挂起更新并落盘 */
  flush(): void
}

/** 创建阅读进度记录器。 */
export function useReadingProgress(): UseReadingProgress {
  const store = useReaderStore()
  const progress = ref<ReadingProgress | null>(null)

  let lastCommitAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: { sutraId: string; update: ProgressUpdate } | null = null

  function commit(sutraId: string, update: ProgressUpdate): void {
    lastCommitAt = Date.now()
    store.setPosition({ chapterIdx: update.chapterIdx, position: update.position })
    const next: ReadingProgress = {
      sutraId,
      chapterIdx: update.chapterIdx,
      position: update.position,
      percent: update.percent,
      updatedAt: Date.now()
    }
    progress.value = next
    progressService.save(next)
  }

  function record(sutraId: string, update: ProgressUpdate): void {
    const elapsed = Date.now() - lastCommitAt
    if (elapsed >= PROGRESS_THROTTLE_MS) {
      commit(sutraId, update)
      return
    }
    pending = { sutraId, update }
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      const held = pending
      pending = null
      if (held) commit(held.sutraId, held.update)
    }, PROGRESS_THROTTLE_MS - elapsed)
  }

  function restore(sutraId: string): ReadingProgress | null {
    const saved = progressService.restore(sutraId)
    progress.value = saved
    if (saved) store.setPosition({ chapterIdx: saved.chapterIdx, position: saved.position })
    return saved
  }

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    const held = pending
    pending = null
    if (held) commit(held.sutraId, held.update)
    progressService.flush()
  }

  onScopeDispose(flush)

  return { progress, restore, record, flush }
}
