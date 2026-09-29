/**
 * 词典领域服务（方案 §7 / §2.2 / §6.3 / §4.4 / §4.9）——词典领域**唯一入口**。
 *
 * 职责：索引加载、启用词典管理、查词编排、分片获取、缓存编排、章节级预取、
 * 词头三级匹配（§6.4）。
 *
 * **查词口径（关键）**——`lookup(term)` 严格按「termCache → 索引 → 分片」：
 *   ① **先查 `termCache`（已查词离线缓存，§4.9）**：命中即返回，**不加载索引、
 *      不发任何网络请求**（离线可查已查过的词）；
 *   ② 未命中 → 读内存索引 `index.terms[term]` 得候选分片引用；
 *   ③ 逐词典解析：分片内存 LRU → 命中即取；未命中才 `fetchChunk`（网络）。
 * 多词典用 `Promise.allSettled` **真并行**，且「**先返回先展示**」——每个词典
 * 一返回即回调 `onResult`，最终数组按**返回先后**排列（非输入顺序）。
 *
 * 约定：框架无关（不 import Vue/Pinia），可在 Node 下单测；网络经仓库层。
 */

import { LruCache } from '@/data/cache/lruCache'
import { termCache as defaultTermCache } from '@/data/cache/termCache'
import type { TermCache } from '@/data/cache/termCache'
import { createDictRepository } from '@/data/repositories/dictRepository'
import type { DictRepository } from '@/data/repositories/dictRepository'
import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'
import type { DictChunk, DictHit, DictIndex, DictMeta } from '@/types/dict'
import { logger } from '@/utils/logger'

/** 查词回调（渐进式展示 / 降级） */
export interface LookupOptions {
  /** 某词典一返回即回调（先返回先展示） */
  onResult?: (hit: DictHit) => void
  /** 某词典解析失败（超时/网络）时回调，供 UI 展示「点击重试」 */
  onError?: (error: unknown, dictId: string) => void
}

export interface DictService {
  /** 加载索引（幂等：并发调用共享同一 Promise；`force` 强制重拉） */
  loadIndex(force?: boolean): Promise<DictIndex>
  /** 索引是否已就绪 */
  isIndexLoaded(): boolean
  /** 当前索引（未加载返回 null） */
  getIndex(): DictIndex | null
  /** 词典元信息列表（未加载返回空数组） */
  getDicts(): DictMeta[]
  /** 当前启用的词典 id 列表 */
  getEnabledDictIds(): string[]
  /** 启用/停用某词典（持久化） */
  setEnabled(dictId: string, on: boolean): void
  /** 某词典是否启用 */
  isEnabled(dictId: string): boolean
  /** 全部「启用词典中出现的」词头（供 Trie 构建 / 高亮，§8.1） */
  getEnabledTerms(): string[]
  /** 查词：termCache → 索引 → 分片（多词典并行，先返回先展示） */
  lookup(term: string, options?: LookupOptions): Promise<DictHit[]>
  /** 章节级预取（§4.4）：静默把该章命中术语所需分片拉入内存 LRU */
  prefetchForChapter(terms: string[]): Promise<void>
  /** 词头三级匹配（§6.4）：完全 > 前缀 > 包含 */
  searchTerms(query: string, limit?: number): string[]
  /** 清空内存状态（索引/分片 LRU/启用列表缓存；不清已查词离线缓存） */
  clear(): void
}

export interface DictServiceOptions {
  /** 覆盖仓库（测试注入） */
  repository?: DictRepository
  /** 覆盖分片内存 LRU（测试注入） */
  chunkCache?: LruCache<string, DictChunk>
  /** 覆盖已查词离线缓存（测试注入） */
  termCache?: TermCache
}

/** 分片内存 LRU 默认上限：64 片 / 16MB（§4.4「命中 LRU 为口径」） */
const CHUNK_CACHE_ENTRIES = 64
const CHUNK_CACHE_BYTES = 16 * 1024 * 1024

/** 分片 key：`${dictId}::${chunkIndex}` */
function chunkKey(dictId: string, chunkIndex: number): string {
  return `${dictId}::${chunkIndex}`
}

/** 分片粗略字节估算（用于 LRU 的字节上限） */
function roughBytes(chunk: DictChunk): number {
  let sum = 0
  for (const term of Object.keys(chunk)) {
    const entry = chunk[term]
    if (!entry) continue
    sum += term.length + entry.definition.length + entry.pinyin.length + entry.category.length
  }
  return sum
}

/** 创建词典领域服务。 */
export function createDictService(options: DictServiceOptions = {}): DictService {
  const repository = options.repository ?? createDictRepository()
  const chunkCache =
    options.chunkCache ??
    new LruCache<string, DictChunk>({
      maxEntries: CHUNK_CACHE_ENTRIES,
      maxBytes: CHUNK_CACHE_BYTES,
      sizeOf: roughBytes
    })
  const termCache = options.termCache ?? defaultTermCache

  let index: DictIndex | null = null
  let indexPromise: Promise<DictIndex> | null = null
  /** null = 「全部启用」默认态（未显式改动过） */
  let enabledIds: Set<string> | null = readEnabledIds()

  function readEnabledIds(): Set<string> | null {
    const saved = readJson<string[] | null>(STORAGE_KEYS.enabledDicts, null)
    return Array.isArray(saved) ? new Set(saved) : null
  }

  function persistEnabledIds(): void {
    if (enabledIds) writeJson(STORAGE_KEYS.enabledDicts, [...enabledIds])
  }

  function loadIndex(force = false): Promise<DictIndex> {
    if (index && !force) return Promise.resolve(index)
    if (indexPromise && !force) return indexPromise
    indexPromise = repository.fetchIndex().then((fetched) => {
      index = fetched
      indexPromise = null
      return fetched
    })
    return indexPromise
  }

  function isIndexLoaded(): boolean {
    return index !== null
  }

  function getIndex(): DictIndex | null {
    return index
  }

  function getDicts(): DictMeta[] {
    return index ? index.dicts : []
  }

  function isEnabled(dictId: string): boolean {
    return enabledIds === null ? true : enabledIds.has(dictId)
  }

  function getEnabledDictIds(): string[] {
    if (!index) return enabledIds ? [...enabledIds] : []
    return index.dicts.filter((meta) => isEnabled(meta.id)).map((meta) => meta.id)
  }

  function setEnabled(dictId: string, on: boolean): void {
    if (enabledIds === null) {
      // 首次改动：以「当前全部词典」为基线，再应用本次开关
      const baseline = index ? index.dicts.map((meta) => meta.id) : []
      enabledIds = new Set(baseline)
    }
    if (on) enabledIds.add(dictId)
    else enabledIds.delete(dictId)
    persistEnabledIds()
  }

  function getEnabledTerms(): string[] {
    if (!index) return []
    const terms: string[] = []
    for (const term of Object.keys(index.terms)) {
      const refs = index.terms[term]
      if (refs?.some((ref) => isRefEnabled(ref))) terms.push(term)
    }
    return terms
  }

  function isRefEnabled(ref: [number, number]): boolean {
    if (!index) return false
    const meta = index.dicts[ref[0] - 1]
    return meta ? isEnabled(meta.id) : false
  }

  /** 解析单个「词典 + 分片」引用 → 命中或 null（不抛错由调用方隔离）。 */
  async function resolveRef(
    term: string,
    ref: [number, number]
  ): Promise<DictHit | null> {
    if (!index) return null
    const meta = index.dicts[ref[0] - 1]
    if (!meta || !isEnabled(meta.id)) return null

    // ③-a 分片内存 LRU（预取/历史）
    const key = chunkKey(meta.id, ref[1])
    let chunk = chunkCache.get(key)
    if (!chunk) {
      // ③-b 冷启动：网络拉取（8s 超时 + 1 重试，经仓库层）
      chunk = await repository.fetchChunk(meta.id, ref[1])
      chunkCache.set(key, chunk)
    }
    const entry = chunk[term]
    if (!entry) return null
    // 命中后写入已查词离线缓存（§6.3）
    termCache.set(meta.id, term, {
      definition: entry.definition,
      pinyin: entry.pinyin,
      name: meta.name
    })
    return { dictId: meta.id, dictName: meta.name, term, definition: entry.definition }
  }

  async function lookup(term: string, lookupOptions: LookupOptions = {}): Promise<DictHit[]> {
    // ① 先查已查词离线缓存——命中即返回，不加载索引、不发网络（§4.9）
    const cached = termCache.getByTerm(term).filter((item) => isEnabled(item.dictId))
    if (cached.length > 0) {
      const hits = cached.map<DictHit>(({ dictId, entry }) => ({
        dictId,
        dictName: entry.name,
        term,
        definition: entry.definition
      }))
      for (const hit of hits) lookupOptions.onResult?.(hit)
      return hits
    }

    // ② 再查索引
    const idx = await loadIndex()
    const refs = idx.terms[term]
    if (!refs || refs.length === 0) return []

    // ③ 才拉分片：多词典真并行 + 先返回先展示
    const hits: DictHit[] = []
    const tasks = refs.map((ref) => {
      const dictId = idx.dicts[ref[0] - 1]?.id ?? String(ref[0])
      return resolveRef(term, ref).then(
        (hit) => {
          if (hit) {
            hits.push(hit)
            lookupOptions.onResult?.(hit)
          }
        },
        (error: unknown) => {
          logger.warn('查词分片解析失败', dictId, error)
          lookupOptions.onError?.(error, dictId)
        }
      )
    })
    await Promise.allSettled(tasks)
    return hits
  }

  async function prefetchForChapter(terms: string[]): Promise<void> {
    const idx = await loadIndex()
    const wanted = new Set<string>()
    for (const term of terms) {
      const refs = idx.terms[term]
      if (!refs) continue
      for (const ref of refs) {
        if (!isRefEnabled(ref)) continue
        const meta = idx.dicts[ref[0] - 1]
        if (!meta) continue
        const key = chunkKey(meta.id, ref[1])
        if (!chunkCache.has(key)) wanted.add(key)
      }
    }
    const tasks = [...wanted].map((key) => {
      const separator = key.indexOf('::')
      const dictId = key.slice(0, separator)
      const chunkIndex = Number(key.slice(separator + 2))
      return repository
        .fetchChunk(dictId, chunkIndex)
        .then((chunk) => {
          chunkCache.set(key, chunk)
        })
        .catch((error: unknown) => {
          // 预取静默失败：不阻塞阅读（§4.4）
          logger.debug('预取分片失败', key, error)
        })
    })
    await Promise.allSettled(tasks)
  }

  function searchTerms(query: string, limit = 50): string[] {
    if (!index) return []
    const keyword = query.trim()
    if (keyword.length === 0) return []
    const exact: string[] = []
    const prefix: string[] = []
    const contains: string[] = []
    for (const term of Object.keys(index.terms)) {
      if (term === keyword) exact.push(term)
      else if (term.startsWith(keyword)) prefix.push(term)
      else if (term.includes(keyword)) contains.push(term)
    }
    return [...exact, ...prefix, ...contains].slice(0, limit)
  }

  function clear(): void {
    index = null
    indexPromise = null
    chunkCache.clear()
    enabledIds = readEnabledIds()
  }

  return {
    loadIndex,
    isIndexLoaded,
    getIndex,
    getDicts,
    getEnabledDictIds,
    setEnabled,
    isEnabled,
    getEnabledTerms,
    lookup,
    prefetchForChapter,
    searchTerms,
    clear
  }
}

/** 应用级单例 */
export const dictService = createDictService()
