/**
 * 已查词离线缓存（方案 §4.9）。
 *
 * 口径：**词条级 localStorage LRU**——首载后缓存「查过的」释义，常用词可离线；
 * 未查过的词需联网（UI 文案为「该词释义需联网获取」，非「加载失败」）。
 *
 * 设计四要素（§4.9②）：
 * - 介质：`localStorage`（零新增依赖；**不引入 IndexedDB**，守 scope §1.3）；
 * - 容量：条数 ≤500 / 总字节 ≤512KB / 单条 ≤16KB（超限词条不入缓存）；
 * - 淘汰：LRU（按最近访问时间；写满时逐出最久未用，直至满足双上限）；
 * - 结构：单 key `br-dictcache` = `{ entries: {[key]: {definition,pinyin,ts}}, order: string[] }`，
 *   写入**节流**（默认 300ms 尾触发，同进度保存口径），并提供 `flush()` 立即落盘。
 */

import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'

/** 缓存条目 */
export interface CachedEntry {
  definition: string
  pinyin: string
  /** 词典名（T05 增补：离线命中时无需索引即可展示来源词典名） */
  name: string
  ts: number
}

/** localStorage 持久化结构 */
interface CacheShape {
  entries: Record<string, CachedEntry>
  /** LRU 顺序：最久未用在前，最近使用在后 */
  order: string[]
}

/** 容量与节流参数 */
export interface TermCacheLimits {
  maxEntries: number
  maxBytes: number
  maxEntryBytes: number
  flushDelayMs: number
}

/** 默认上限（§4.9②） */
export const TERM_CACHE_LIMITS: TermCacheLimits = {
  maxEntries: 500,
  maxBytes: 512 * 1024,
  maxEntryBytes: 16 * 1024,
  flushDelayMs: 300
}

const encoder = new TextEncoder()

/** UTF-8 字节长度 */
function byteLen(text: string): number {
  return encoder.encode(text).length
}

/** 词条缓存 key：`${dictId}::${term}` */
export function makeTermCacheKey(dictId: string, term: string): string {
  return `${dictId}::${term}`
}

/** 已查词缓存（可实例化以便单测；应用使用下方 `termCache` 单例）。 */
export class TermCache {
  private data: CacheShape
  private readonly limits: TermCacheLimits
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false

  constructor(limits: TermCacheLimits = TERM_CACHE_LIMITS) {
    this.limits = limits
    this.data = this.load()
  }

  /** 读缓存；命中则刷新 LRU 位置并调度落盘。未命中返回 null。 */
  get(dictId: string, term: string): CachedEntry | null {
    const key = makeTermCacheKey(dictId, term)
    const entry = this.data.entries[key]
    if (!entry) return null
    entry.ts = Date.now()
    this.touch(key)
    this.scheduleFlush()
    return this.normalize(entry)
  }

  /**
   * 按「词」跨词典检索已缓存条目（T05：离线查词入口）。
   *
   * 用途：`dictService.lookup` **先**调用本方法——命中即返回、**不加载索引、
   * 不发任何网络请求**（离线场景下已查过的词仍可查，§4.9）。扫描量为 LRU 顺序
   * 数组（≤500 条），成本可忽略。
   */
  getByTerm(term: string): Array<{ dictId: string; entry: CachedEntry }> {
    const suffix = `::${term}`
    const result: Array<{ dictId: string; entry: CachedEntry }> = []
    // 快照遍历：`touch()` 会就地改写 order 数组，避免边遍历边改
    for (const key of [...this.data.order]) {
      if (!key.endsWith(suffix)) continue
      const dictId = key.slice(0, key.length - suffix.length)
      const entry = this.data.entries[key]
      if (!entry || !dictId) continue
      entry.ts = Date.now()
      this.touch(key)
      result.push({ dictId, entry: this.normalize(entry) })
    }
    if (result.length > 0) this.scheduleFlush()
    return result
  }

  /** 写缓存；单条超过 `maxEntryBytes` 则跳过（不入缓存）。 */
  set(dictId: string, term: string, value: { definition: string; pinyin?: string; name?: string }): void {
    const key = makeTermCacheKey(dictId, term)
    const entry: CachedEntry = {
      definition: value.definition,
      pinyin: value.pinyin ?? '',
      name: value.name ?? '',
      ts: Date.now()
    }
    if (this.entryBytes(key, entry) > this.limits.maxEntryBytes) return
    this.data.entries[key] = entry
    this.touch(key)
    this.enforceLimits()
    this.scheduleFlush()
  }

  /** 清空缓存并立即落盘。 */
  clear(): void {
    this.data = { entries: {}, order: [] }
    this.dirty = true
    this.flush()
  }

  /** 当前统计（条数 / 估算字节）。 */
  stats(): { count: number; bytes: number } {
    return { count: this.data.order.length, bytes: this.totalBytes() }
  }

  /** 立即落盘（取消节流窗口内的挂起写入）。 */
  flush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (!this.dirty) return
    writeJson(STORAGE_KEYS.dictCache, this.data)
    this.dirty = false
  }

  private load(): CacheShape {
    const raw = readJson<CacheShape | null>(STORAGE_KEYS.dictCache, null)
    if (!raw || typeof raw !== 'object' || !raw.entries || !Array.isArray(raw.order)) {
      return { entries: {}, order: [] }
    }
    return raw
  }

  private scheduleFlush(): void {
    this.dirty = true
    if (this.flushTimer !== null) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush()
    }, this.limits.flushDelayMs)
  }

  private touch(key: string): void {
    const index = this.data.order.indexOf(key)
    if (index >= 0) this.data.order.splice(index, 1)
    this.data.order.push(key)
  }

  private entryBytes(key: string, entry: CachedEntry): number {
    return byteLen(key) + byteLen(entry.definition) + byteLen(entry.pinyin) + byteLen(entry.name)
  }

  /** 兼容旧版落盘数据（缺 `name` 字段）——补齐默认值。 */
  private normalize(entry: CachedEntry): CachedEntry {
    return {
      definition: entry.definition,
      pinyin: entry.pinyin ?? '',
      name: entry.name ?? '',
      ts: entry.ts
    }
  }

  private totalBytes(): number {
    let sum = 0
    for (const key of this.data.order) {
      const entry = this.data.entries[key]
      if (entry) sum += this.entryBytes(key, entry)
    }
    return sum
  }

  private enforceLimits(): void {
    // 保留至少 1 条；逐出队首（最久未用）直至满足条数与字节双上限
    while (
      this.data.order.length > 1 &&
      (this.data.order.length > this.limits.maxEntries || this.totalBytes() > this.limits.maxBytes)
    ) {
      const oldest = this.data.order.shift()
      if (oldest !== undefined) delete this.data.entries[oldest]
    }
  }
}

/** 应用级单例 */
export const termCache = new TermCache()
