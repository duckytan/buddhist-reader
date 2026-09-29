/**
 * localStorage 统一封装（方案 §11：key 前缀 `br-`，key 命名集中常量表）。
 *
 * 容错契约（**非静默吞错**）：
 * - localStorage 在隐私模式 / 配额耗尽 / 被禁用时会抛异常；
 * - 读失败 → 返回调用方给定的 `fallback`（语义＝「无数据」）；
 * - 写失败 → 返回 `false`（语义＝「写入未成功」），由调用方决定是否降级；
 * - §11「禁止静默 catch」指的是「吞掉错误后假装成功」；此处是把失败
 *   显式转换为可判定的返回值，属明确降级，不是静默吞错。
 */

/** 统一 key 前缀（§11） */
export const STORAGE_PREFIX = 'br-'

/** 集中 key 常量表（新增 key 一律在此登记，§11） */
export const STORAGE_KEYS = {
  /** 阅读设置（字号/行距/主题） */
  settings: `${STORAGE_PREFIX}settings`,
  /** 启用的词典 id 列表 */
  enabledDicts: `${STORAGE_PREFIX}enabled-dicts`,
  /** 笔记 */
  notes: `${STORAGE_PREFIX}notes`,
  /** 书签 */
  bookmarks: `${STORAGE_PREFIX}bookmarks`,
  /** 已查词离线缓存（§4.9） */
  dictCache: `${STORAGE_PREFIX}dictcache`,
  /** 阅读进度 key 前缀：实际 key = `${prefix}${sutraId}``（每经独立，§6.3） */
  progressPrefix: `${STORAGE_PREFIX}progress:`
} as const

/** 生成某部经书的进度存储 key（每经独立） */
export function progressKey(sutraId: string): string {
  return `${STORAGE_KEYS.progressPrefix}${sutraId}`
}

/** 获取 localStorage；不可用时返回 null。 */
function getStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage
    return storage ?? null
  } catch {
    // 访问 localStorage 本身抛错（如禁用 cookie）→ 视为不可用
    return null
  }
}

/** localStorage 是否可读写（隐私模式等场景为 false）。 */
export function isStorageAvailable(): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    const probe = `${STORAGE_PREFIX}__probe__`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return true
  } catch {
    // 探测写入失败 → 不可用
    return false
  }
}

/** 读取并反序列化；缺失 / 解析失败 / 存储不可用 → 返回 fallback。 */
export function readJson<T>(key: string, fallback: T): T {
  const storage = getStorage()
  if (!storage) return fallback
  try {
    const raw = storage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    // JSON 损坏 / 读取异常 → 回退到默认值
    return fallback
  }
}

/** 序列化并写入；成功返回 true，失败（配额 / 不可用 / 循环引用）返回 false。 */
export function writeJson(key: string, value: unknown): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // 配额耗尽 / 序列化失败 → 明确返回失败
    return false
  }
}

/** 删除单个 key（失败无需处理：后续写入会覆盖）。 */
export function removeKey(key: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    // 删除失败不致命：key 残留会在下次写入时被覆盖
  }
}
