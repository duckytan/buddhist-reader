import { describe, expect, it, vi } from 'vitest'

import { createDictRepository } from '@/data/repositories/dictRepository'
import type { DictChunk, DictIndex } from '@/types/dict'
import type { RequestFn } from '@/utils/async'

describe('dictRepository', () => {
  it('fetchIndex 请求 dict-index.json 并返回数据', async () => {
    const index: DictIndex = {
      version: 1,
      generatedAt: '2026-09-29T00:00:00Z',
      chunkByBytes: 262144,
      dicts: [],
      terms: {}
    }
    const spy = vi.fn(async () => index)
    const repo = createDictRepository({ baseUrl: '/base/', request: spy as unknown as RequestFn })

    await expect(repo.fetchIndex()).resolves.toBe(index)
    expect(spy).toHaveBeenCalledWith('/base/dict-index.json')
  })

  it('fetchChunk 请求 dict-chunks/{dictId}-{idx}.json', async () => {
    const chunk: DictChunk = { 般若: { definition: '智慧', pinyin: '', category: '' } }
    const spy = vi.fn(async () => chunk)
    const repo = createDictRepository({ baseUrl: '/base/', request: spy as unknown as RequestFn })

    await expect(repo.fetchChunk('dict-1', 3)).resolves.toBe(chunk)
    expect(spy).toHaveBeenCalledWith('/base/dict-chunks/dict-1-3.json')
  })

  it('未传 baseUrl 时回退到 BASE_URL 解析结果', async () => {
    const spy = vi.fn(async () => ({}) as DictIndex)
    const repo = createDictRepository({ request: spy as unknown as RequestFn })
    await repo.fetchIndex()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/dict-index\.json$/))
  })
})
