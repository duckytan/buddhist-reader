#!/usr/bin/env node
/**
 * check-bundle-budget.mjs — 构建产物 + 数据产物「体积预算」护栏（T11 · 方案 §4.8 / §12.1）
 *
 * 为什么需要它：旧版护栏对 `public/` 下的静态分片**结构性失明**（P0-3），
 * 导致 20.8MB 全量内联、分片膨胀等病灶在 CI 里不可见。本脚本把预算变成
 * **机器可执行、可失败**的断言。
 *
 * 检查项（阈值集中见下方 BUDGET，来源标注在注释里）：
 *   ① dist 内单个 JS chunk      ≤ 2MB raw / ≤ 600KB gzip   （方案 §12.1 ①，gzip 用 zlib 实算）
 *   ② public/dict-index.json    ≤ 2MB raw                   （方案 §4.8 / §12.1 ④）
 *   ③ public/dict-chunks/*.json 单片 ≤ 256KB raw            （方案 §12.1 ②）
 *        —— 例外（team-lead 裁决）：单条词条自身即超限、不可再拆时豁免并告警
 *        （依据：全库 9 条 >64KB 的长条目均为《中华佛教百科全书》正常长篇条目，
 *          截断即回归旧版 dict-defs 病灶；故 entries==1 的分片豁免）
 *   ④ public/dict-chunks/*.json 分片总量 ≤ 50MB raw         （方案 §12.1 ③）
 *
 * 退出码：全部在预算内 = 0；任一超限 = 1（CI 中禁止 `|| true` / continue-on-error）。
 * 产物缺失（未构建）→ 明确跳过并说明，**不**静默通过；「构建了但超限」才 FAIL。
 *
 * 用法：node scripts/check-bundle-budget.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const KB = 1024
const MB = 1024 * 1024

/**
 * 预算阈值（集中一处，便于审计；来源：方案 §4.8 预算表 + §12.1 分片三上限）。
 */
export const BUDGET = {
  /** ① dist 内单个 JS chunk 原始上限 */
  jsChunkRaw: 2 * MB,
  /** ① dist 内单个 JS chunk gzip 上限 */
  jsChunkGzip: 600 * KB,
  /** ② 词典索引原始上限 */
  indexRaw: 2 * MB,
  /** ③ 单个分片原始上限（>1 条词条时硬失败；==1 条时豁免） */
  chunkRaw: 256 * KB,
  /** ④ 分片总量原始上限 */
  chunksTotalRaw: 50 * MB
}

const passes = []
const warnings = []
const skips = []
const failures = []

/** 相对项目根的可读路径 */
function rel(abs) {
  return path.relative(ROOT, abs) || abs
}

/** 人类可读体积（KB，保留 1 位小数） */
function human(bytes) {
  return `${(bytes / KB).toFixed(1)}KB`
}

/** 递归遍历目录内所有文件 */
function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, onFile)
    else if (entry.isFile()) onFile(abs)
  }
}

// ───────────────────────── ① dist 内 JS chunk ─────────────────────────

function checkDistJsChunks() {
  const distDir = path.join(ROOT, 'dist')
  if (!fs.existsSync(distDir)) {
    skips.push(
      'dist/ 不存在（尚未构建）→ 跳过 JS chunk 检查。请先运行 `npm run build`。'
    )
    return
  }

  const jsFiles = []
  walk(distDir, (abs) => {
    if (abs.endsWith('.js')) jsFiles.push(abs)
  })

  if (jsFiles.length === 0) {
    skips.push('dist/ 内未找到 .js 产物 → 跳过 JS chunk 检查。')
    return
  }

  let offenders = 0
  for (const abs of jsFiles) {
    const raw = fs.statSync(abs).size
    const gzip = zlib.gzipSync(fs.readFileSync(abs)).length
    const overRaw = raw > BUDGET.jsChunkRaw
    const overGzip = gzip > BUDGET.jsChunkGzip
    if (overRaw || overGzip) {
      offenders++
      failures.push(
        `[JS] ${rel(abs)} 超预算：raw ${human(raw)}（≤${human(BUDGET.jsChunkRaw)}）` +
          `${overRaw ? ' ❌' : ' ✓'}，gzip ${human(gzip)}（≤${human(BUDGET.jsChunkGzip)}）` +
          `${overGzip ? ' ❌' : ' ✓'}`
      )
    }
  }

  if (offenders === 0) {
    passes.push(
      `[JS] dist 内 ${jsFiles.length} 个 JS chunk 均在预算内` +
        `（≤${human(BUDGET.jsChunkRaw)} raw / ≤${human(BUDGET.jsChunkGzip)} gzip）`
    )
  }
}

// ───────────────────────── ② 词典索引 ─────────────────────────

function checkIndex() {
  const indexFile = path.join(ROOT, 'public/dict-index.json')
  if (!fs.existsSync(indexFile)) {
    skips.push(
      'public/dict-index.json 不存在（尚未生成）→ 跳过索引检查。' +
        '请先运行 `npm run build`（会触发 prebuild 生成索引）。'
    )
    return
  }

  const raw = fs.statSync(indexFile).size
  if (raw > BUDGET.indexRaw) {
    failures.push(
      `[索引] public/dict-index.json ${human(raw)} > 上限 ${human(BUDGET.indexRaw)}`
    )
  } else {
    passes.push(
      `[索引] public/dict-index.json ${human(raw)} ≤ ${human(BUDGET.indexRaw)}`
    )
  }
}

// ───────────────────────── ③④ 分片单片 + 总量 ─────────────────────────

/** 统计分片 JSON 的词条数（key 个数）；解析失败返回 -1 */
function countEntries(abs) {
  try {
    const obj = JSON.parse(fs.readFileSync(abs, 'utf8'))
    return obj && typeof obj === 'object' ? Object.keys(obj).length : -1
  } catch {
    return -1
  }
}

function checkChunks() {
  const chunksDir = path.join(ROOT, 'public/dict-chunks')
  if (!fs.existsSync(chunksDir)) {
    skips.push(
      'public/dict-chunks/ 不存在（尚未生成）→ 跳过分片检查。' +
        '请先运行 `npm run build`（会触发 prebuild 生成分片）。'
    )
    return
  }

  const chunkFiles = fs
    .readdirSync(chunksDir)
    .filter((name) => name.endsWith('.json') && !name.endsWith('-manifest.json'))

  if (chunkFiles.length === 0) {
    skips.push('public/dict-chunks/ 内未找到分片 → 跳过分片检查。')
    return
  }

  let totalBytes = 0
  let oversizedMulti = 0
  let oversizedSingle = 0

  for (const name of chunkFiles) {
    const abs = path.join(chunksDir, name)
    const raw = fs.statSync(abs).size
    totalBytes += raw

    if (raw <= BUDGET.chunkRaw) continue

    const entryCount = countEntries(abs)
    if (entryCount < 0) {
      failures.push(`[分片] ${name} ${human(raw)} 超限且无法解析为 JSON 对象`)
      continue
    }
    if (entryCount > 1) {
      oversizedMulti++
      failures.push(
        `[分片] ${name} ${human(raw)} > ${human(BUDGET.chunkRaw)} 且含 ${entryCount} 条词条` +
          ` → FAIL（多词条可再拆而未拆）`
      )
    } else {
      oversizedSingle++
      warnings.push(
        `[分片] ${name} ${human(raw)} 超 ${human(BUDGET.chunkRaw)}，但仅 1 条词条` +
          `（单条原子词条不可再拆，不截断）→ 豁免`
      )
    }
  }

  if (oversizedMulti === 0) {
    passes.push(
      `[单片] ${chunkFiles.length} 片已检查，无「多词条超限」片` +
        `${oversizedSingle > 0 ? `（${oversizedSingle} 片单词条超限已豁免）` : ''}`
    )
  }

  if (totalBytes > BUDGET.chunksTotalRaw) {
    failures.push(
      `[分片总量] ${human(totalBytes)} > 上限 ${human(BUDGET.chunksTotalRaw)}（${chunkFiles.length} 片）`
    )
  } else {
    passes.push(
      `[分片总量] ${chunkFiles.length} 片 / ${human(totalBytes)} ≤ ${human(BUDGET.chunksTotalRaw)}`
    )
  }
}

// ───────────────────────── 主流程 ─────────────────────────

checkDistJsChunks()
checkIndex()
checkChunks()

for (const line of passes) console.log(`✓ ${line}`)
for (const line of warnings) console.warn(`⚠️  ${line}`)
for (const line of skips) console.log(`ℹ️  ${line}`)

if (failures.length > 0) {
  console.error('\n❌ check-bundle-budget: 预算超限：')
  for (const line of failures) console.error(`  ${line}`)
  console.error(
    `\n共 ${failures.length} 项超限，${passes.length} 项通过，${warnings.length} 项告警，${skips.length} 项跳过。`
  )
  process.exit(1)
}

console.log(
  `\n✅ check-bundle-budget: 全部在预算内（${passes.length} 项通过，${warnings.length} 项告警，${skips.length} 项跳过）。`
)
process.exit(0)
