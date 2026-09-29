/**
 * 通用内存 LRU 缓存（用于词典分片缓存等）。
 *
 * 以 `Map` 的插入序实现 O(1) 的访问刷新与淘汰：
 * 命中时「删除再插入」把条目移到队尾（最近使用），淘汰时移除队首（最久未用）。
 */
export interface LruCacheOptions<V> {
  /** 最大条目数（默认 128）。 */
  maxEntries?: number
  /** 最大总字节数（默认 Infinity，即不按字节限制）。 */
  maxBytes?: number
  /** 单值字节估算函数（按字节限制时必需；默认恒为 0）。 */
  sizeOf?: (value: V) => number
}

export class LruCache<K, V> {
  private readonly map = new Map<K, V>()
  private readonly maxEntries: number
  private readonly maxBytes: number
  private readonly sizeOf: (value: V) => number
  private bytes = 0

  constructor(options: LruCacheOptions<V> = {}) {
    this.maxEntries = options.maxEntries ?? 128
    this.maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY
    this.sizeOf = options.sizeOf ?? ((): number => 0)
    if (this.maxEntries < 1) throw new RangeError('LruCache: maxEntries 必须 >= 1')
  }

  /** 读取（命中则刷新为最近使用）。 */
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key) as V
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  /** 写入（已存在则覆盖并刷新位置），随后按上限淘汰。 */
  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.bytes -= this.sizeOf(this.map.get(key) as V)
      this.map.delete(key)
    }
    this.map.set(key, value)
    this.bytes += this.sizeOf(value)
    this.evict()
  }

  delete(key: K): boolean {
    if (!this.map.has(key)) return false
    this.bytes -= this.sizeOf(this.map.get(key) as V)
    this.map.delete(key)
    return true
  }

  clear(): void {
    this.map.clear()
    this.bytes = 0
  }

  /** 当前条目数 */
  get size(): number {
    return this.map.size
  }

  /** 当前估算字节数 */
  get byteSize(): number {
    return this.bytes
  }

  /** 键列表（最久未用 → 最近使用） */
  keys(): K[] {
    return [...this.map.keys()]
  }

  private evict(): void {
    // 始终保留至少 1 条：刚写入的条目即使自身超过 maxBytes 也不立即淘汰，
    // 否则会出现「写入后立刻消失」的反直觉行为。
    while (
      this.map.size > 1 &&
      (this.map.size > this.maxEntries || this.bytes > this.maxBytes)
    ) {
      const oldest = this.map.keys().next().value as K
      this.bytes -= this.sizeOf(this.map.get(oldest) as V)
      this.map.delete(oldest)
    }
  }
}
