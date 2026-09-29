import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { DictHit, DictMeta } from '@/types/dict'

const mocks = vi.hoisted(() => ({
  loadIndex: vi.fn(),
  getDicts: vi.fn(),
  getEnabledDictIds: vi.fn(),
  setEnabled: vi.fn(),
  isEnabled: vi.fn(),
  lookup: vi.fn()
}))

vi.mock('@/services/dictService', () => ({
  dictService: mocks,
  createDictService: vi.fn()
}))

import { useDictStore } from '@/stores/dict'

const DICTS: DictMeta[] = [
  { id: 'dict-1', name: '甲典', totalChunks: 1, entryCount: 1 },
  { id: 'dict-2', name: '乙典', totalChunks: 1, entryCount: 1 }
]

const HITS: DictHit[] = [{ dictId: 'dict-1', dictName: '甲典', term: '般若', definition: '甲·般若' }]

describe('stores/dict', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loadIndex 同步轻量状态（词典列表 + 启用 id），不持有大对象', async () => {
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getDicts.mockReturnValue(DICTS)
    mocks.getEnabledDictIds.mockReturnValue(['dict-1', 'dict-2'])
    const store = useDictStore()

    await store.loadIndex()

    expect(store.indexLoaded).toBe(true)
    expect(store.dicts).toHaveLength(2)
    expect(store.enabledIds).toEqual(['dict-1', 'dict-2'])
    expect(store.enabledDicts.map((item) => item.id)).toEqual(['dict-1', 'dict-2'])
  })

  it('lookup 记入结果引用缓存', async () => {
    mocks.lookup.mockResolvedValue(HITS)
    const store = useDictStore()

    const hits = await store.lookup('般若')

    expect(hits).toEqual(HITS)
    expect(store.getCached('般若')).toEqual(HITS)
    expect(store.getCached('无')).toBeNull()
  })

  it('setEnabled 更新启用列表', async () => {
    mocks.loadIndex.mockResolvedValue(undefined)
    mocks.getDicts.mockReturnValue(DICTS)
    mocks.getEnabledDictIds.mockReturnValue(['dict-1', 'dict-2'])
    const store = useDictStore()
    await store.loadIndex()

    mocks.getEnabledDictIds.mockReturnValue(['dict-2'])
    store.setEnabled('dict-1', false)

    expect(mocks.setEnabled).toHaveBeenCalledWith('dict-1', false)
    expect(store.enabledIds).toEqual(['dict-2'])
    expect(store.isEnabled('dict-1')).toBe(false)
  })

  it('clearResults 清空引用缓存', async () => {
    mocks.lookup.mockResolvedValue(HITS)
    const store = useDictStore()
    await store.lookup('般若')

    store.clearResults()
    expect(store.getCached('般若')).toBeNull()
  })
})
