/**
 * 词典数据类型（v4.0 · T02 数据层）
 *
 * 与 `scripts/build-dict-chunks.cjs` 的产出严格对应：
 *   - 分片：`public/dict-chunks/{dictId}-{idx}.json`  → `DictChunk`
 *   - 索引：`public/dict-index.json`                  → `DictIndex`
 *   - 每词典 manifest：`public/dict-chunks/{dictId}-manifest.json` → `DictManifest`
 *
 * 说明：`entryCount` 一律为「过滤后」值（term.trim().length >= 2），
 * 与分片 manifest 口径一致（方案 §4.7 P1 修正）。
 */

/** 分片内单条词条的值对象 */
export interface DictEntry {
  /** 释义（完整，不截断） */
  definition: string
  /** 拼音（源数据缺省为空串） */
  pinyin: string
  /** 分类（源数据缺省为空串） */
  category: string
}

/** 单个分片：词头 → 词条值对象 */
export interface DictChunk {
  [term: string]: DictEntry
}

/** 词典元信息（索引 `dicts[]` 元素；亦为分片 manifest 的子集） */
export interface DictMeta {
  id: string
  name: string
  totalChunks: number
  /** 过滤后词条数（term.trim().length >= 2） */
  entryCount: number
}

/** 每词典分片 manifest（较 `DictMeta` 多一个字节总量字段） */
export interface DictManifest extends DictMeta {
  /** 该词典全部分片的原始字节总和 */
  bytes: number
}

/** 索引内指向某词典某分片的引用：`[1-based 词典序数, 分片下标]` */
export type DictChunkRef = [dictId: number, chunkIndex: number]

/** 词典索引（`public/dict-index.json`） */
export interface DictIndex {
  /** 索引格式版本 */
  version: number
  /** 生成时间（ISO 8601） */
  generatedAt: string
  /** 单片累计原始字节硬上限（与切分口径一致，当前 262144 = 256KB） */
  chunkByBytes: number
  /** 词典元信息列表（顺序即 1-based 词典序数来源） */
  dicts: DictMeta[]
  /** 词头 → 分片引用列表（同词跨词典时含多条引用） */
  terms: Record<string, DictChunkRef[]>
}

/** 单次查词的命中结果（面向 UI 的扁平结构） */
export interface DictHit {
  dictId: string
  dictName: string
  term: string
  definition: string
}
