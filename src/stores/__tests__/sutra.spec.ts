import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, watch } from 'vue'

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

  it('§6.⑤ current 为 shallowRef：深嵌套变更不被追踪（大对象不深代理）', async () => {
    // 独立 fixture，避免污染共享 SUTRA
    const fresh: Sutra = {
      ...SUTRA,
      chapters: [{ title: '正文', paragraphs: [{ id: 'p1', text: 'x', globalId: '心经.json:0:0' }] }]
    }
    mocks.loadSutra.mockResolvedValue(fresh)
    const store = useSutraStore()
    await store.openSutra('心经.json')

    let triggers = 0
    watch(
      () => store.current?.chapters[0]?.paragraphs[0]?.text,
      () => {
        triggers += 1
      }
    )

    const para = store.current?.chapters[0]?.paragraphs[0]
    if (para) para.text = 'CHANGED'
    await nextTick()

    // shallowRef → 嵌套字段读取不被追踪 → 深变更不触发。
    // 红条件：把 current 改回深 ref（嵌套深代理）→ triggers = 1 → 红。
    expect(triggers).toBe(0)
  })
})
