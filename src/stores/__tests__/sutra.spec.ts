import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { Sutra, SutraMeta } from '@/types/sutra'

const mocks = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadSutra: vi.fn(),
  getMeta: vi.fn(),
  clear: vi.fn()
}))

vi.mock('@/services/sutraService', () => ({
  sutraService: mocks,
  createSutraService: vi.fn()
}))

import { useSutraStore } from '@/stores/sutra'

function meta(title: string, category: SutraMeta['category']): SutraMeta {
  return {
    title,
    filename: `${title}.json`,
    author: '作者',
    category,
    chapterCount: 1,
    totalParagraphs: 1,
    totalChars: 1,
    description: ''
  }
}

const MANIFEST: SutraMeta[] = [meta('心经', 'prajna'), meta('坛经', 'chan'), meta('金刚经', 'prajna')]

const SUTRA: Sutra = {
  ...MANIFEST[0]!,
  chapters: [{ title: '正文', paragraphs: [{ id: 'p1', text: 'x', globalId: '心经.json:0:0' }] }]
}

describe('stores/sutra', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loadManifest 写入清单', async () => {
    mocks.loadManifest.mockResolvedValue(MANIFEST)
    const store = useSutraStore()

    await store.loadManifest()

    expect(store.manifest).toHaveLength(3)
    expect(mocks.loadManifest).toHaveBeenCalledWith(false)
  })

  it('setCategory 过滤清单', async () => {
    mocks.loadManifest.mockResolvedValue(MANIFEST)
    const store = useSutraStore()
    await store.loadManifest()

    expect(store.filtered).toHaveLength(3)
    store.setCategory('prajna')
    expect(store.filtered.map((item) => item.title)).toEqual(['心经', '金刚经'])
    store.setCategory('all')
    expect(store.filtered).toHaveLength(3)
  })

  it('openSutra 设当前经书；closeSutra 清空', async () => {
    mocks.loadSutra.mockResolvedValue(SUTRA)
    const store = useSutraStore()

    await store.openSutra('心经.json')
    expect(store.current?.title).toBe('心经')
    expect(mocks.loadSutra).toHaveBeenCalledWith('心经.json')

    store.closeSutra()
    expect(store.current).toBeNull()
  })
})
