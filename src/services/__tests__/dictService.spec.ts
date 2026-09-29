import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

import { LruCache } from '@/data/cache/lruCache'
import { TermCache } from '@/data/cache/termCache'
import { createDictService } from '@/services/dictService'
import type { DictService } from '@/services/dictService'
import type { DictChunk, DictEntry, DictIndex } from '@/types/dict'

/** 构造词条值对象 */
function entry(definition: string): DictEntry {
  return { definition, pinyin: '', category: '' }
}

const INDEX: DictIndex = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  chunkByBytes: 262144,
  dicts: [
    { id: 'dict-1', name: '甲典', totalChunks: 2, entryCount: 4 },
    { id: 'dict-2', name: '乙典', totalChunks: 1, entryCount: 2 }
  ],
  terms: {
    般若: [[1, 0]],
    般若经: [[1, 0]],
    大般若经: [[1, 1]],
    金刚经: [[2, 0]],
    双词: [
      [1, 0],
      [2, 0]
    ]
  }
}

const CHUNKS: Record<string, DictChunk> = {
  'dict-1::0': { 般若: entry('甲·般若'), 般若经: entry('甲·般若经'), 双词: entry('甲·双词') },
  'dict-1::1': { 大般若经: entry('甲·大般若经') },
  'dict-2::0': { 金刚经: entry('乙·金刚经'), 双词: entry('乙·双词') }
}

interface FakeRepo {
  fetchIndex: Mock<() => Promise<DictIndex>>
  fetchChunk: Mock<(dictId: string, chunkIndex: number) => Promise<DictChunk>>
}

function makeRepo(delayMs: (dictId: string) => number = () => 0): FakeRepo {
  const fetchIndex = vi.fn<() => Promise<DictIndex>>(async () => INDEX)
  const fetchChunk = vi.fn<(dictId: string, chunkIndex: number) => Promise<DictChunk>>(
    async (dictId, chunkIndex) => {
      const delay = delayMs(dictId)
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      const chunk = CHUNKS[`${dictId}::${chunkIndex}`]
      if (!chunk) throw new Error(`缺少分片 ${dictId}::${chunkIndex}`)
      return chunk
    }
  )
  return { fetchIndex, fetchChunk }
}

describe('dictService', () => {
  let termCache: TermCache

  beforeEach(() => {
    localStorage.clear()
    termCache = new TermCache()
  })

  function makeService(repo: FakeRepo): DictService {
    return createDictService({
      repository: repo,
      termCache,
      chunkCache: new LruCache<string, DictChunk>({ maxEntries: 8 })
    })
  }

  it('① termCache 命中 → 不发任何网络请求（离线可查已查过的词）', async () => {
    termCache.set('dict-1', '般若', { definition: '离线释义', pinyin: 'b', name: '甲典' })
    const repo = makeRepo()
    const service = makeService(repo)

    const hits = await service.lookup('般若')

    expect(hits).toHaveLength(1)
    expect(hits[0]?.definition).toBe('离线释义')
    expect(hits[0]?.dictName).toBe('甲典')
    expect(repo.fetchIndex).not.toHaveBeenCalled()
    expect(repo.fetchChunk).not.toHaveBeenCalled()
  })

  it('② 索引命中 → 拉分片 → 写入 termCache', async () => {
    const repo = makeRepo()
    const service = makeService(repo)

    const hits = await service.lookup('般若')

    expect(repo.fetchIndex).toHaveBeenCalledTimes(1)
    expect(repo.fetchChunk).toHaveBeenCalledWith('dict-1', 0)
    expect(hits[0]?.definition).toBe('甲·般若')
    expect(termCache.get('dict-1', '般若')?.definition).toBe('甲·般若')
  })

  it('③ 索引未命中 → 返回空数组且不拉分片', async () => {
    const repo = makeRepo()
    const service = makeService(repo)

    const hits = await service.lookup('不存在之词')

    expect(hits).toEqual([])
    expect(repo.fetchChunk).not.toHaveBeenCalled()
  })

  it('④ 多词典真并行 + 先返回先展示', async () => {
    const repo = makeRepo((dictId) => (dictId === 'dict-1' ? 25 : 5))
    const service = makeService(repo)
    const order: string[] = []

    const hits = await service.lookup('双词', { onResult: (hit) => order.push(hit.dictId) })

    expect(hits).toHaveLength(2)
    // 乙典（5ms）先于甲典（25ms）返回 → 先返回先展示
    expect(order).toEqual(['dict-2', 'dict-1'])
    expect(hits.map((hit) => hit.dictId)).toEqual(['dict-2', 'dict-1'])
  })

  it('⑤ 停用的词典不参与查词', async () => {
    const repo = makeRepo()
    const service = makeService(repo)
    await service.loadIndex()
    service.setEnabled('dict-1', false)

    const hits = await service.lookup('般若')

    expect(hits).toEqual([])
    expect(service.isEnabled('dict-1')).toBe(false)
    expect(service.getEnabledTerms()).not.toContain('般若')
  })

  it('⑥ 章节级预取 → 后续查词命中内存 LRU（不再网络）', async () => {
    const repo = makeRepo()
    const service = makeService(repo)

    await service.prefetchForChapter(['般若'])
    expect(repo.fetchChunk).toHaveBeenCalledWith('dict-1', 0)

    repo.fetchChunk.mockClear()
    const hits = await service.lookup('般若')

    expect(hits[0]?.definition).toBe('甲·般若')
    expect(repo.fetchChunk).not.toHaveBeenCalled()
  })

  it('⑦ searchTerms 词头三级匹配：完全 > 前缀 > 包含', async () => {
    const repo = makeRepo()
    const service = makeService(repo)
    await service.loadIndex()

    expect(service.searchTerms('般若')).toEqual(['般若', '般若经', '大般若经'])
    // 前缀组先于包含组；包含组内按索引插入序（大般若经 在 金刚经 之前）
    expect(service.searchTerms('经')).toEqual(['般若经', '大般若经', '金刚经'])
    expect(service.searchTerms('般若', 2)).toEqual(['般若', '般若经'])
    expect(service.searchTerms('')).toEqual([])
  })

  it('⑧ getEnabledTerms 仅含启用词典中出现的词头', async () => {
    const repo = makeRepo()
    const service = makeService(repo)
    await service.loadIndex()

    expect(service.getEnabledTerms().sort()).toEqual(['双词', '大般若经', '般若', '般若经', '金刚经'].sort())

    service.setEnabled('dict-2', false)
    expect(service.getEnabledTerms()).not.toContain('金刚经')
  })

  it('⑨ loadIndex 幂等：并发只发一次请求', async () => {
    const repo = makeRepo()
    const service = makeService(repo)

    await Promise.all([service.loadIndex(), service.loadIndex()])

    expect(repo.fetchIndex).toHaveBeenCalledTimes(1)
    expect(service.isIndexLoaded()).toBe(true)
  })
})
