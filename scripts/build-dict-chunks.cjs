/**
 * build-dict-chunks.cjs — 词典数据「一次扫描」构建脚本（v4.0 数据层 T02）
 *
 * 职责：把 `data/dicts` 下的源数据（唯一真相源）编译为「索引 + 按字节切分分片 +
 * 每词典 manifest」三件套，全部输出到 `public/` 下由静态托管按需拉取。
 * 生成物不入库（见 `.gitignore` 与 `scripts/guard-forbidden.mjs`）。
 *
 * 关键变更（相对 v3.1.0）：
 *   - 源数据目录由 `public/dicts` 迁至 `data/dicts`（源数据不随 dist 部署）。
 *   - 切分键由「每 500 词一片」改为「累计原始字节 ≤ 256KB 一片」。
 *     旧口径在释义长度方差大时（最大/均值 ≈4.3 倍）会产出 2.7MB 单片；
 *     字节口径把单片上限钉死（见方案 §4.2/§4.3）。
 *   - 一次扫描同时产出：① 分片 ② `public/dict-index.json` ③ `*-manifest.json`。
 *   - `entryCount` 统一采用「过滤后」值（term.trim().length >= 2），与分片 manifest 对齐。
 *
 * 边界：单条词条若自身即超过上限（无法再拆，如超长索引类词条），单独成片并在
 *       日志显式告警——不截断（截断正是 v3.1.0 `dict-defs` 的功能性回归根因）。
 *
 * 用法：node scripts/build-dict-chunks.cjs
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DICTS_DIR = path.join(ROOT, 'data/dicts')
const MANIFEST_PATH = path.join(DICTS_DIR, 'manifest.json')
const CHUNKS_DIR = path.join(ROOT, 'public/dict-chunks')
const INDEX_PATH = path.join(ROOT, 'public/dict-index.json')

/** 单片累计原始字节硬上限：256KB（方案 §4.3 主切分键） */
const CHUNK_BYTES = 262144
/** 索引格式版本（方案 §4.7） */
const INDEX_VERSION = 1
/** 词条最短长度：过滤单字/空白，与 v3.1.0 口径一致以保证 entryCount 可对齐 */
const MIN_TERM_LEN = 2

/** UTF-8 字节长度 */
function byteLen(str) {
  return Buffer.byteLength(str, 'utf8')
}

/**
 * 归一化释义：数组逐项取文本后以换行拼接；非字符串统一 String()。
 * （沿用 v3.1.0 逻辑，避免丢失结构化释义内容。）
 * @param {*} definition 原始释义
 * @returns {string}
 */
function normalizeDefinition(definition) {
  if (Array.isArray(definition)) {
    return definition
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && item.c) return item.c
        return ''
      })
      .join('\n')
  }
  if (typeof definition !== 'string') {
    return String(definition || '')
  }
  return definition
}

/**
 * 把源词条规约为分片值对象。
 * @param {{definition: *, pinyin?: string, category?: string}} entry
 * @returns {{definition: string, pinyin: string, category: string}}
 */
function toChunkValue(entry) {
  return {
    definition: normalizeDefinition(entry.definition),
    pinyin: entry.pinyin || '',
    category: entry.category || ''
  }
}

/**
 * 按字节把一组词条切分为若干片。
 *
 * 采用「增量字节核算」：紧凑 JSON（`{"k":v,...}`，无空格）的字节数等于
 * 2 + Σ(逗号 + 键字节 + 冒号 + 值字节)，逐条累加即可，无需对整片反复
 * `JSON.stringify`（否则为 O(n²)）。收尾时以实测字节校验核算是否漂移。
 *
 * @param {Array<{term: string}>} entries 已过滤的词条
 * @returns {{chunks: Array<Object>, chunkBytes: number[], oversized: number[]}}
 */
function chunkByBytes(entries) {
  const chunks = []
  const chunkBytes = []
  const oversized = []

  let current = {}
  let size = 2 // "{}" 的空对象字节数
  let count = 0

  const flush = () => {
    if (count === 0) return
    const actual = byteLen(JSON.stringify(current))
    if (actual !== size) {
      // 理论不应发生：核算与实测不一致时提示漂移，便于定位口径问题
      console.warn(`  ⚠️ 字节核算漂移：估算 ${size} ≠ 实测 ${actual}`)
    }
    chunks.push(current)
    chunkBytes.push(actual)
    if (actual > CHUNK_BYTES) oversized.push(chunks.length - 1)
    current = {}
    size = 2
    count = 0
  }

  for (const entry of entries) {
    const term = entry.term.trim()
    const value = toChunkValue(entry)
    const keyBytes = byteLen(JSON.stringify(term))
    const valBytes = byteLen(JSON.stringify(value))

    // 预计加入后的累计字节（逗号分隔符仅在非首条时计 1）
    const projected = size + (count > 0 ? 1 : 0) + keyBytes + 1 + valBytes
    if (count > 0 && projected > CHUNK_BYTES) {
      flush()
    }

    // flush 后 count 归零、size 复位，此处按「首条」口径重新累加
    size += (count > 0 ? 1 : 0) + keyBytes + 1 + valBytes
    current[term] = value
    count++
  }
  flush()

  return { chunks, chunkBytes, oversized }
}

/** 主流程：一次扫描产出分片 + 索引 + manifest */
function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ 找不到词典 manifest：${path.relative(ROOT, MANIFEST_PATH)}`)
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

  // 先清空旧分片，避免词典增删后残留陈旧文件
  fs.rmSync(CHUNKS_DIR, { recursive: true, force: true })
  fs.mkdirSync(CHUNKS_DIR, { recursive: true })

  const indexDicts = []
  const terms = {}
  let totalChunks = 0
  let totalBytes = 0
  let maxChunkBytes = 0
  const oversizedAll = []

  manifest.forEach((dict, i) => {
    const ordinal = i + 1 // 索引内 dictId 采用 1-based 序数（1=dict-1 …）
    const dictPath = path.join(DICTS_DIR, dict.filename)
    if (!fs.existsSync(dictPath)) {
      console.warn(`⚠️ 跳过（源文件缺失）: ${dict.id} ← ${dict.filename}`)
      return
    }

    const data = JSON.parse(fs.readFileSync(dictPath, 'utf8'))
    const entries = (data.entries || []).filter(
      (e) => typeof e.term === 'string' && e.term.trim().length >= MIN_TERM_LEN
    )

    const { chunks, chunkBytes, oversized } = chunkByBytes(entries)

    let dictBytes = 0
    chunks.forEach((chunkData, idx) => {
      const json = JSON.stringify(chunkData)
      fs.writeFileSync(path.join(CHUNKS_DIR, `${dict.id}-${idx}.json`), json, 'utf8')

      const bytes = chunkBytes[idx]
      dictBytes += bytes
      totalChunks++
      totalBytes += bytes
      if (bytes > maxChunkBytes) maxChunkBytes = bytes

      // 建索引：term → [[ordinal, chunkIdx], ...]（同词跨词典时追加引用）
      for (const term of Object.keys(chunkData)) {
        if (!terms[term]) terms[term] = []
        terms[term].push([ordinal, idx])
      }
    })

    const manifestOut = {
      id: dict.id,
      name: dict.name,
      totalChunks: chunks.length,
      entryCount: entries.length,
      bytes: dictBytes
    }
    fs.writeFileSync(
      path.join(CHUNKS_DIR, `${dict.id}-manifest.json`),
      JSON.stringify(manifestOut),
      'utf8'
    )

    indexDicts.push({
      id: dict.id,
      name: dict.name,
      totalChunks: chunks.length,
      entryCount: entries.length
    })

    for (const idx of oversized) oversizedAll.push(`${dict.id}-${idx}`)

    console.log(
      `${dict.id} · ${dict.name}: ${entries.length} 条 → ${chunks.length} 片, ` +
        `${(dictBytes / 1048576).toFixed(2)}MB`
    )
  })

  const index = {
    version: INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    chunkByBytes: CHUNK_BYTES,
    dicts: indexDicts,
    terms
  }
  const indexJson = JSON.stringify(index)
  fs.writeFileSync(INDEX_PATH, indexJson, 'utf8')

  console.log('')
  console.log(
    `索引: public/dict-index.json  ${(byteLen(indexJson) / 1048576).toFixed(2)}MB raw, ` +
      `${Object.keys(terms).length} 个词头`
  )
  console.log(
    `分片: ${totalChunks} 片, 合计 ${(totalBytes / 1048576).toFixed(2)}MB raw, ` +
      `最大单片 ${(maxChunkBytes / 1024).toFixed(1)}KB`
  )
  if (oversizedAll.length > 0) {
    console.warn(
      `⚠️ ${oversizedAll.length} 个单片超过 ${(CHUNK_BYTES / 1024).toFixed(0)}KB 上限` +
        `（单条词条本身即超限，无法再拆，已单独成片）: ${oversizedAll.join(', ')}`
    )
  }
  console.log('✅ 完成')
}

main()
