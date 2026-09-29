/**
 * 词典仓库（方案 §7：`DictRepository`）。
 *
 * 职责：从静态资源按需拉取「索引」与「分片」，不含业务逻辑（查词/缓存归 service）。
 * - 索引：`{base}dict-index.json`（≤2MB raw，含 `terms` 词头→分片引用）；
 * - 分片：`{base}dict-chunks/{dictId}-{chunkIndex}.json`（≤256KB raw）。
 * 所有请求经 `utils/async.ts`（超时 + 重试），禁止裸 fetch（§11）。
 */

import type { DictChunk, DictIndex } from '@/types/dict'
import { fetchJson } from '@/utils/async'
import type { RequestFn } from '@/utils/async'

import { resolveBaseUrl } from './baseUrl'

export interface DictRepository {
  /** 拉取词典索引（首次查词/高亮时懒加载一次） */
  fetchIndex(): Promise<DictIndex>
  /** 拉取指定词典的指定分片 */
  fetchChunk(dictId: string, chunkIndex: number): Promise<DictChunk>
}

export interface DictRepositoryOptions {
  /** 静态资源根路径（默认取 Vite `BASE_URL`，末尾补 `/`） */
  baseUrl?: string
  /** 覆盖请求实现（测试注入） */
  request?: RequestFn | undefined
}

/** 创建词典仓库。 */
export function createDictRepository(options: DictRepositoryOptions = {}): DictRepository {
  const baseUrl = options.baseUrl ?? resolveBaseUrl()
  const request: RequestFn = options.request ?? fetchJson

  return {
    fetchIndex(): Promise<DictIndex> {
      return request<DictIndex>(`${baseUrl}dict-index.json`)
    },
    fetchChunk(dictId: string, chunkIndex: number): Promise<DictChunk> {
      return request<DictChunk>(`${baseUrl}dict-chunks/${dictId}-${chunkIndex}.json`)
    }
  }
}
