#!/usr/bin/env node
/**
 * guard-forbidden.mjs — 「已裁决废弃项」构建期 / CI 护栏断言
 *
 * 背景：v3.1.0 的头号 P0 病灶是 20.8MB 词典索引内联（src/data/dictIndex.js），
 * 它有一条「确定性自动复活链路」：vite 钩子 + 生成器脚本 + 已 tracked 生成物。
 * 本脚本把「已裁决废弃」从文档结论升级为**机器可执行、不可绕过**的断言。
 *
 * 三类断言：
 *   A 类 · 绝对断言  —— 文件 / 钩子「不该存在」
 *   B 类 · 棘轮断言  —— 数量「只减不增」
 *   C 类 · 基线治理  —— 基线入库、只能人工显式下调、缺失即判失败
 *
 * 用法：node scripts/guard-forbidden.mjs
 * 退出码：全部通过 = 0；任一失败 = 1（CI 中禁止 `|| true` / continue-on-error）
 *
 * 铁律：
 *   - 本脚本【不】自动更新基线（否则护栏退化为「永远通过」）。
 *   - 基线文件缺失 / 被删 = 判失败（不得当作「无基线、跳过」）。
 *   - 已跟踪文件列表优先【纯 Node 解析 .git/index】（不依赖 git 二进制，环境无关），
 *     解析失败才回退 `git ls-files`。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = path.join(ROOT, 'scripts/guard-baseline.json')
const DIST_JSON_MAX_BYTES = 2 * 1024 * 1024 // dist 内单个 .json 上限 2MB（补 §11 对 public/ 失明的洞）

const failures = []
const passes = []

/** 相对项目根的可读路径 */
function rel(abs) {
  return path.relative(ROOT, abs) || abs
}

/** 简易 glob → RegExp（仅支持 * 与 ?，用于根目录/单层文件名匹配） */
function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`)
}

/** 展开单层 glob（pattern 可含目录前缀，如 'vite.config.*' / '.eslintrc.cjs'） */
function expandGlob(pattern) {
  const dir = path.dirname(pattern)
  const base = path.basename(pattern)
  const absDir = dir === '.' ? ROOT : path.join(ROOT, dir)
  if (!fs.existsSync(absDir)) return []
  if (!base.includes('*') && !base.includes('?')) {
    const abs = path.join(absDir, base)
    return fs.existsSync(abs) ? [abs] : []
  }
  const rx = globToRegExp(base)
  return fs
    .readdirSync(absDir)
    .filter((name) => rx.test(name))
    .map((name) => path.join(absDir, name))
}

/** 递归遍历目录下所有文件 */
function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, onFile)
    else if (entry.isFile()) onFile(abs)
  }
}

/**
 * 剥离 JS/TS/CJS 源码中的注释（保留字符串字面量内容）。
 *
 * 目的：A 类「禁止模式」断言只应命中**可执行内容**。若对整段原文匹配，
 * 「在注释里解释该禁令」（如 vite.config.ts 顶部红线说明、.eslintrc.cjs
 * 的说明块）会被误判为违规——那恰恰是应当鼓励的文档。故先剥离注释再匹配。
 */
function stripComments(src) {
  let out = ''
  let i = 0
  const n = src.length
  let state = null // null | "'" | '"' | '`' | '//' | '/*'
  while (i < n) {
    const c = src[i]
    const c2 = src[i + 1]
    if (state === null) {
      if (c === '/' && c2 === '/') {
        state = '//'
        i += 2
        continue
      }
      if (c === '/' && c2 === '*') {
        state = '/*'
        i += 2
        continue
      }
      if (c === "'" || c === '"' || c === '`') {
        state = c
        out += c
        i++
        continue
      }
      out += c
      i++
      continue
    }
    if (state === '//') {
      if (c === '\n') {
        state = null
        out += c
      }
      i++
      continue
    }
    if (state === '/*') {
      if (c === '*' && c2 === '/') {
        state = null
        i += 2
        continue
      }
      i++
      continue
    }
    // 字符串字面量内部：原样保留，处理转义
    if (c === '\\') {
      out += c + (c2 || '')
      i += 2
      continue
    }
    if (c === state) {
      state = null
      out += c
      i++
      continue
    }
    out += c
    i++
  }
  return out
}

// ───────────────────────── A 类 · 绝对断言 ─────────────────────────

function assertNoFile(relPath) {
  const abs = path.join(ROOT, relPath)
  if (fs.existsSync(abs)) {
    failures.push(`[A] 禁止存在的文件仍然存在: ${relPath}`)
  } else {
    passes.push(`[A] 文件不存在 ✓ ${relPath}`)
  }
}

function assertNoMatch(pattern, regex) {
  const files = expandGlob(pattern)
  if (files.length === 0) {
    passes.push(`[A] 无匹配文件（跳过内容检查）: ${pattern}`)
    return
  }
  for (const abs of files) {
    // 只匹配可执行内容（剥离注释），避免「注释里解释禁令」被误判
    const content = stripComments(fs.readFileSync(abs, 'utf8'))
    if (regex.test(content)) {
      failures.push(`[A] 禁止模式命中: ${rel(abs)} 匹配 ${regex}`)
    } else {
      passes.push(`[A] 未命中禁止模式 ✓ ${rel(abs)}`)
    }
  }
}

// ───────────────────────── B 类 · 棘轮断言 ─────────────────────────

/** 解析 .git 目录（兼容 worktree 的 .git 文件写法） */
function resolveGitDir(root) {
  const dotGit = path.join(root, '.git')
  if (!fs.existsSync(dotGit)) throw new Error('.git 不存在')
  if (fs.statSync(dotGit).isDirectory()) return dotGit
  const m = fs.readFileSync(dotGit, 'utf8').trim().match(/^gitdir:\s*(.+)$/)
  if (!m) throw new Error('.git 文件格式异常')
  return path.resolve(root, m[1])
}

/** 纯 Node 解析 git index（v2 / v3），返回仓库相对路径列表（正斜杠） */
function readGitIndexPaths(root) {
  const idxPath = path.join(resolveGitDir(root), 'index')
  const b = fs.readFileSync(idxPath)
  if (b.toString('ascii', 0, 4) !== 'DIRC') throw new Error('index magic 非 DIRC')
  const version = b.readUInt32BE(4)
  if (version !== 2 && version !== 3) throw new Error(`暂不支持的 index 版本 v${version}`)
  const count = b.readUInt32BE(8)
  const paths = []
  let off = 12
  for (let i = 0; i < count; i++) {
    const entryStart = off
    const flags = b.readUInt16BE(entryStart + 60)
    const extended = (flags & 0x4000) !== 0
    let p = entryStart + 62
    if (extended && version >= 3) p += 2
    let end = p
    while (end < b.length && b[end] !== 0) end++
    paths.push(b.toString('utf8', p, end))
    const entryLen = end + 1 - entryStart
    off = entryStart + Math.ceil(entryLen / 8) * 8
  }
  return paths
}

let trackedPathsCache = null
/** 已跟踪文件列表：优先纯 Node 解析 index，失败回退 git ls-files */
function getTrackedPaths() {
  if (trackedPathsCache) return trackedPathsCache
  try {
    trackedPathsCache = readGitIndexPaths(ROOT)
    return trackedPathsCache
  } catch (indexErr) {
    try {
      const out = execFileSync('git', ['ls-files', '-z'], {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024
      })
      trackedPathsCache = out.split('\0').filter(Boolean)
      return trackedPathsCache
    } catch (gitErr) {
      throw new Error(
        `无法获取已跟踪文件列表：index 解析失败(${indexErr.message}) 且 git 不可用(${gitErr.message})`
      )
    }
  }
}

function assertTrackedCount(dirPrefix, baseline) {
  let paths
  try {
    paths = getTrackedPaths()
  } catch (e) {
    failures.push(`[B] ${e.message}`)
    return
  }
  const prefix = dirPrefix.endsWith('/') ? dirPrefix : dirPrefix + '/'
  const count = paths.filter((p) => p.startsWith(prefix)).length
  if (typeof baseline !== 'number') {
    failures.push(`[C] 基线缺失: "${dirPrefix}"（基线是护栏前提，不得跳过）`)
    return
  }
  if (count > baseline) {
    failures.push(
      `[B] 棘轮违规: ${dirPrefix} 已跟踪 ${count} 个文件 > 基线 ${baseline}（生成物不得新增入库）`
    )
  } else {
    passes.push(`[B] 棘轮通过 ✓ ${dirPrefix} = ${count} <= ${baseline}`)
  }
}

/**
 * B 类 · 单文件「不得入库」断言（精确匹配，无需基线；被跟踪即失败）。
 * 用于锁定「构建期生成、绝不入库」的确定产物（方案 §12.3）。
 */
function assertNotTracked(relPath) {
  let paths
  try {
    paths = getTrackedPaths()
  } catch (e) {
    failures.push(`[B] ${e.message}`)
    return
  }
  if (paths.includes(relPath)) {
    failures.push(`[B] 禁止入库的文件已被跟踪: ${relPath}（生成物不得入库）`)
  } else {
    passes.push(`[B] 未入库 ✓ ${relPath}`)
  }
}

function assertNoFileInDist(namePattern, maxBytes) {
  const distDir = path.join(ROOT, 'dist')
  if (!fs.existsSync(distDir)) {
    passes.push('[B] dist 不存在（尚无构建产物，跳过 dist 体积检查）')
    return
  }
  const rx = globToRegExp(namePattern)
  const offenders = []
  walk(distDir, (abs) => {
    if (!rx.test(path.basename(abs))) return
    const size = fs.statSync(abs).size
    if (size > maxBytes) {
      offenders.push(`${rel(abs)} (${(size / 1048576).toFixed(2)}MB)`)
    }
  })
  if (offenders.length > 0) {
    failures.push(
      `[B] dist 内 ${namePattern} 超过 ${(maxBytes / 1048576).toFixed(0)}MB 上限: ${offenders.join(', ')}`
    )
  } else {
    passes.push(`[B] dist 内无超限 ${namePattern} ✓`)
  }
}

// ───────────────────────── C 类 · 基线治理 ─────────────────────────

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    // 护栏自身的存在性断言：基线缺失 = 判失败，不得跳过
    failures.push(
      '[C] 基线文件缺失: scripts/guard-baseline.json（护栏前提，缺失即判失败；请勿删除）'
    )
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  } catch (e) {
    failures.push(`[C] 基线文件无法解析: ${e.message}`)
    return null
  }
}

// ───────────────────────── 主流程 ─────────────────────────

const baseline = loadBaseline()

// A 类 · 绝对断言（文件或钩子不该存在）
assertNoFile('scripts/build-dict-index.cjs') // 20.8MB 病灶生成器
assertNoFile('scripts/build-dict-defs.cjs') // 300 字截断版生成器
assertNoMatch('vite.config.*', /build-dict-index/) // 自动复活钩子
assertNoFile('src/data/dictIndex.js') // 病灶产物本体
assertNoMatch('.eslintrc.cjs', /dictIndex\.js/) // 复活链路第四件
// 补充（规格之外）：该测试内部 execSync 重新生成病灶产物，本身即一条复活向量
assertNoFile('scripts/__tests__/build-dict-index.test.cjs')

// B 类 · 棘轮断言（数量只减不增）
if (baseline) {
  const tracked = baseline.trackedCount || {}
  assertTrackedCount('public/dict-chunks/', tracked['public/dict-chunks/'])
  assertTrackedCount('public/dict-defs/', tracked['public/dict-defs/'])
}
// 新增索引产物「不得入库」（方案 §12.3；T02 引入 public/dict-index.json 后启用）
assertNotTracked('public/dict-index.json')
assertNoFileInDist('*.json', DIST_JSON_MAX_BYTES)

// 汇总输出
for (const line of passes) console.log(line)

if (failures.length > 0) {
  console.error('\n❌ guard-forbidden: 护栏断言失败：')
  for (const line of failures) console.error('  ' + line)
  console.error(`\n共 ${failures.length} 项失败，${passes.length} 项通过。`)
  process.exit(1)
}

console.log(`\n✅ guard-forbidden: 全部通过（${passes.length} 项断言）。`)
process.exit(0)
