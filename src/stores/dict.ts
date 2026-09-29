/**
 * 词典 store（方案 §6.8）。
 *
 * 职责边界（§6.8）：**索引（轻量元信息）、启用词典、查词结果缓存引用**。
 * ❌ 禁止：阅读进度；❌ **直接持有大对象**——`index.terms`（35314 词头）与分片
 * 数据均驻留 **service/仓库层**（`dictService` + `lruCache`），store 只持有
 * 「词典元信息列表 + 启用 id + 小体量查词结果引用」。
 *
 * 说明：`loading`/`error` 等异步 UI 态由 composable（`useDictLookup`，T08）持有。
 */

import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { dictService } from '@/services/dictService'
import type { LookupOptions } from '@/services/dictService'
import type { DictHit, DictMeta } from '@/types/dict'

/** 查词结果引用缓存上限（小对象，仅 UI 最近结果） */
const RESULT_CACHE_LIMIT = 50

export const useDictStore = defineStore('dict', () => {
  /** 词典元信息（轻量） */
  const dicts = shallowRef<DictMeta[]>([])
  /** 索引是否已就绪 */
  const indexLoaded = ref(false)
  /** 启用词典 id 列表 */
  const enabledIds = ref<string[]>([])
  /** 查词结果引用缓存（term → hits；仅小对象，非分片数据） */
  const results = shallowRef<Record<string, DictHit[]>>({})

  /** 启用的词典元信息 */
  const enabledDicts = computed<DictMeta[]>(() =>
    dicts.value.filter((meta) => enabledIds.value.includes(meta.id))
  )

  /** 加载索引并同步轻量状态 */
  async function loadIndex(force = false): Promise<void> {
    await dictService.loadIndex(force)
    dicts.value = dictService.getDicts()
    enabledIds.value = dictService.getEnabledDictIds()
    indexLoaded.value = true
  }

  /** 查词（委托 dictService；结果记入引用缓存） */
  async function lookup(term: string, options?: LookupOptions): Promise<DictHit[]> {
    const hits = await dictService.lookup(term, options)
    remember(term, hits)
    return hits
  }

  /** 取引用缓存中的查词结果 */
  function getCached(term: string): DictHit[] | null {
    return results.value[term] ?? null
  }

  /** 清空引用缓存 */
  function clearResults(): void {
    results.value = {}
  }

  /** 启用/停用词典 */
  function setEnabled(dictId: string, on: boolean): void {
    dictService.setEnabled(dictId, on)
    enabledIds.value = dictService.getEnabledDictIds()
  }

  /** 某词典是否启用 */
  function isEnabled(dictId: string): boolean {
    return enabledIds.value.includes(dictId)
  }

  function remember(term: string, hits: DictHit[]): void {
    const next: Record<string, DictHit[]> = { ...results.value, [term]: hits }
    const keys = Object.keys(next)
    if (keys.length > RESULT_CACHE_LIMIT) {
      for (const key of keys.slice(0, keys.length - RESULT_CACHE_LIMIT)) delete next[key]
    }
    results.value = next
  }

  return {
    dicts,
    indexLoaded,
    enabledIds,
    results,
    enabledDicts,
    loadIndex,
    lookup,
    getCached,
    clearResults,
    setEnabled,
    isEnabled
  }
})
