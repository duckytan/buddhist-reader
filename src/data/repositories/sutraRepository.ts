/**
 * 经书仓库（方案 §7 / §5 文件清单：`data/repositories/sutraRepository`）。
 *
 * 职责：从静态资源拉取书架清单与单部经书原文，不含业务逻辑。
 * - 清单：`{base}sutras/manifest.json`（`SutraMeta[]`）；
 * - 经书：`{base}sutras/{filename}`（`SutraSource`，段落无 globalId）。
 * `globalId` 由 `sutraService` 加载时派生（§6.1），故此处返回原始结构。
 */

import type { SutraMeta, SutraSource } from '@/types/sutra'
import { fetchJson } from '@/utils/async'
import type { RequestFn } from '@/utils/async'

import { resolveBaseUrl } from './baseUrl'

export interface SutraRepository {
  /** 拉取书架清单 */
  fetchManifest(): Promise<SutraMeta[]>
  /** 拉取单部经书原文（`filename` 含 `.json` 后缀） */
  fetchSutra(filename: string): Promise<SutraSource>
}

export interface SutraRepositoryOptions {
  /** 静态资源根路径（默认取 Vite `BASE_URL`，末尾补 `/`） */
  baseUrl?: string
  /** 覆盖请求实现（测试注入） */
  request?: RequestFn | undefined
}

/** 创建经书仓库。 */
export function createSutraRepository(options: SutraRepositoryOptions = {}): SutraRepository {
  const baseUrl = options.baseUrl ?? resolveBaseUrl()
  const request: RequestFn = options.request ?? fetchJson

  return {
    fetchManifest(): Promise<SutraMeta[]> {
      return request<SutraMeta[]>(`${baseUrl}sutras/manifest.json`)
    },
    fetchSutra(filename: string): Promise<SutraSource> {
      return request<SutraSource>(`${baseUrl}sutras/${filename}`)
    }
  }
}
