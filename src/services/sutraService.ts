/**
 * 经书领域服务（方案 §7 / §6.1）。
 *
 * 职责：书架清单与单部经书的加载编排，以及 **`globalId` 运行时派生**（§6.1）——
 * 源数据不含 `globalId`，故在加载时按 `${sutraId}:${chapterIdx}:${paraIdx}` 计算
 * 写入 `Paragraph.globalId`（纯函数 `utils/anchor.ts#makeGlobalId`）。
 *
 * 约定：**框架无关**（不 import Vue/Pinia），可在 Node 下单测；网络经仓库层
 * （`data/repositories/sutraRepository`），本层不裸 fetch。
 * `sutraId` 即磁盘文件名（`SutraMeta.filename`，如 `《八识规矩颂释》.json`），
 * 与路由 `/read/:id`、进度 key、`globalId` 前缀统一口径。
 */

import { createSutraRepository } from '@/data/repositories/sutraRepository'
import type { SutraRepository } from '@/data/repositories/sutraRepository'
import type { Chapter, Sutra, SutraMeta, SutraSource } from '@/types/sutra'
import { makeGlobalId } from '@/utils/anchor'

export interface SutraService {
  /** 拉取书架清单（带内存缓存；`force` 强制刷新） */
  loadManifest(force?: boolean): Promise<SutraMeta[]>
  /** 取某经元信息（需先 `loadManifest`；未加载或未命中返回 null） */
  getMeta(sutraId: string): SutraMeta | null
  /** 加载完整经书：清单元信息 + 原文合并，并派生 `globalId` */
  loadSutra(sutraId: string): Promise<Sutra>
  /** 清空内存缓存（测试/切库用） */
  clear(): void
}

export interface SutraServiceOptions {
  /** 覆盖仓库（测试注入） */
  repository?: SutraRepository
}

/** 将磁盘原文（无 globalId）转为渲染期章节结构（派生 globalId）。 */
function toChapters(sutraId: string, source: SutraSource): Chapter[] {
  return source.chapters.map((chapter, chapterIdx) => ({
    title: chapter.title,
    paragraphs: chapter.paragraphs.map((paragraph, paraIdx) => ({
      id: paragraph.id,
      text: paragraph.text,
      globalId: makeGlobalId(sutraId, chapterIdx, paraIdx)
    }))
  }))
}

/** 创建经书领域服务。 */
export function createSutraService(options: SutraServiceOptions = {}): SutraService {
  const repository = options.repository ?? createSutraRepository()
  let manifestCache: SutraMeta[] | null = null
  let manifestPromise: Promise<SutraMeta[]> | null = null

  async function loadManifest(force = false): Promise<SutraMeta[]> {
    if (manifestCache && !force) return manifestCache
    if (manifestPromise && !force) return manifestPromise
    manifestPromise = repository.fetchManifest().then((manifest) => {
      manifestCache = manifest
      manifestPromise = null
      return manifest
    })
    return manifestPromise
  }

  function getMeta(sutraId: string): SutraMeta | null {
    if (!manifestCache) return null
    return manifestCache.find((meta) => meta.filename === sutraId) ?? null
  }

  async function loadSutra(sutraId: string): Promise<Sutra> {
    const manifest = await loadManifest()
    const meta = manifest.find((item) => item.filename === sutraId)
    if (!meta) throw new Error(`未找到经书：${sutraId}`)
    const source = await repository.fetchSutra(sutraId)
    // 以 manifest 元信息为准（统计/标题与书架一致）；正文取源文件并派生 globalId
    return { ...meta, chapters: toChapters(sutraId, source) }
  }

  function clear(): void {
    manifestCache = null
    manifestPromise = null
  }

  return { loadManifest, getMeta, loadSutra, clear }
}

/** 应用级单例 */
export const sutraService = createSutraService()
