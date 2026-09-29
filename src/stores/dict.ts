/**
 * 词典 store（方案 §6.8）。
 *
 * 职责边界（§6.8）：**索引（轻量元信息）、启用词典、查词结果缓存引用**。
 * ❌ 禁止：阅读进度；❌ **直接持有大对象**——`index.terms`（35314 词头）与分片
 * 数据均驻留 **service/仓库层**（`dictService` + `lruCache`），store 只持有
 * 「词典元信息列表 + 启用 id + 小体量查词结果引用」。
 *
 * 说明：`loading`/`error` 等异步 UI 态由 composable（`useDictLookup`）持有。
 *
 * **结果缓存淘汰（T08 D-2）**：原先手写的「仅条数封顶」已换为通用 `LruCache`
 * （条数 + **字节**双上限）——`DictHit.definition` 是释义正文，单条可达 16KB，
 * 仅按条数封顶会让 50 条大释义把结果缓存撑到 MB 级，与「小体量引用」自述不符。
 */

import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { LruCache } from '@/data/cache/lruCache'
import { dictService } from '@/services/dictService'
import type { LookupOptions } from '@/services/dictService'
import type { DictHit, DictMeta } from '@/types/dict'

/** 查词结果引用缓存：条数上限（与旧实现一致） */
const RESULT_CACHE_LIMIT = 50
/** 查词结果引用缓存：字节上限（512KB，与 `termCache` 口径协调） */
const RESULT_CACHE_BYTES = 512 * 1024

/** 查词结果粗略字节估算（释义正文为主） */
function roughHitsBytes(hits: DictHit[]): number {
  let sum = 0
  for (const hit of hits) {
    sum += hit.term.length + hit.dictName.length + hit.definition.length
  }
  return sum
}

export const useDictStore = defineStore('dict', () => {
  /** 词典元信息（轻量） */
  const dicts = shallowRef<DictMeta[]>([])
  /** 索引是否已就绪 */
  const indexLoaded = ref(false)
  /** 启用词典 id 列表 */
  const enabledIds = ref<string[]>([])
  /** 查词结果引用缓存（term → hits；仅小对象，非分片数据） */
  const results = shallowRef<Record<string, DictHit[]>>({})

  /**
   * 结果引用缓存的**内部**淘汰器（条数 + 字节双上限）。
   *
   * ⚠️ 不让组件直接读本实例：Pinia 响应式**不追踪 `class` 内部 `Map` 的变更**，
   * 直接读会「静默不刷新」。故对外仍以 `results`（`Record` 形状）暴露，
   * 每次变更后按 LRU 存活键**重建对象**赋给 `shallowRef` 以触发更新。
   */
  const cache = new LruCache<string, DictHit[]>({
    maxEntries: RESULT_CACHE_LIMIT,
    maxBytes: RESULT_CACHE_BYTES,
    sizeOf: roughHitsBytes
  })

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
    cache.clear()
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

  /** 写入结果缓存，并按 LRU 存活键重建对外 `Record`。 */
  function remember(term: string, hits: DictHit[]): void {
    cache.set(term, hits)
    const prev = results.value
    const next: Record<string, DictHit[]> = {}
    for (const key of cache.keys()) {
      next[key] = key === term ? hits : (prev[key] ?? [])
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
