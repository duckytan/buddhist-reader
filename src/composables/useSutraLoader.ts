/**
 * 经书加载 composable（方案 §8.1）。
 *
 * 职责（§2.1 P2 修订）：**Vue 响应式胶水**——持有 `status`/`error` 等异步 UI 态、
 * 生命周期与卸载取消；**不含领域算法**（加载逻辑在 `sutraService`）。
 *
 * 约定：
 * - 组件/composable 内禁止直接 `document.*`/`window.*`（§11）；
 * - 卸载时 `AbortController.abort()`，取消后**不写入任何状态**（防卸载后 setState）；
 * - `sutra` 由 `sutra` store 持有（§6.8），本 composable 只负责加载与提交。
 */

import { computed, onScopeDispose, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { sutraService } from '@/services/sutraService'
import { useSutraStore } from '@/stores/sutra'
import type { Sutra } from '@/types/sutra'
import { logger } from '@/utils/logger'

/** 加载状态（三态 + idle） */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseSutraLoader {
  /** 当前经书（来自 store） */
  sutra: ComputedRef<Sutra | null>
  /** 加载状态 */
  status: Ref<LoadStatus>
  /** 错误信息（无错误为 null） */
  error: Ref<string | null>
  /** 加载指定经书 */
  load(sutraId: string): Promise<void>
  /** 重试上次加载 */
  retry(): Promise<void>
  /** 取消进行中的加载 */
  cancel(): void
}

/** 创建经书加载器。 */
export function useSutraLoader(): UseSutraLoader {
  const store = useSutraStore()
  const status = ref<LoadStatus>('idle')
  const error = ref<string | null>(null)
  const sutra = computed<Sutra | null>(() => store.current)

  let controller: AbortController | null = null
  let lastId = ''

  async function load(sutraId: string): Promise<void> {
    lastId = sutraId
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    status.value = 'loading'
    error.value = null

    try {
      const loaded = await sutraService.loadSutra(sutraId, signal)
      if (signal.aborted) return // 已卸载/已切换 → 丢弃结果，不写状态
      store.current = loaded
      status.value = 'ready'
    } catch (err) {
      if (signal.aborted) return
      status.value = 'error'
      error.value = err instanceof Error ? err.message : '加载失败'
      logger.warn('经书加载失败', sutraId, err)
    }
  }

  async function retry(): Promise<void> {
    if (lastId) await load(lastId)
  }

  function cancel(): void {
    controller?.abort()
    controller = null
  }

  onScopeDispose(cancel)

  return { sutra, status, error, load, retry, cancel }
}
