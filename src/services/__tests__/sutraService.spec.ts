import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

import { createSutraService } from '@/services/sutraService'
import type { SutraMeta, SutraSource } from '@/types/sutra'

const FILENAME = '《心经》.json'

const META: SutraMeta = {
  title: '般若波罗蜜多心经',
  filename: FILENAME,
  author: '玄奘',
  category: 'prajna',
  chapterCount: 1,
  totalParagraphs: 2,
  totalChars: 20,
  description: '心经'
}

const SOURCE: SutraSource = {
  title: '心经',
  author: '玄奘',
  category: 'prajna',
  chapterCount: 1,
  totalParagraphs: 2,
  totalChars: 20,
  description: '心经',
  chapters: [
    {
      title: '正文',
      paragraphs: [
        { id: 'p1', text: '观自在菩萨' },
        { id: 'p2', text: '行深般若波罗蜜多时' }
      ]
    }
  ]
}

interface FakeRepo {
  fetchManifest: Mock<(signal?: AbortSignal) => Promise<SutraMeta[]>>
  fetchSutra: Mock<(filename: string, signal?: AbortSignal) => Promise<SutraSource>>
}

function makeRepo(): FakeRepo {
  const fetchManifest = vi.fn<(signal?: AbortSignal) => Promise<SutraMeta[]>>(async () => [META])
  const fetchSutra = vi.fn<(filename: string, signal?: AbortSignal) => Promise<SutraSource>>(
    async () => SOURCE
  )
  return { fetchManifest, fetchSutra }
}

describe('sutraService', () => {
  let repo: FakeRepo

  beforeEach(() => {
    repo = makeRepo()
  })

  it('loadManifest 带内存缓存；force 强制刷新', async () => {
    const service = createSutraService({ repository: repo })

    await service.loadManifest()
    await service.loadManifest()
    expect(repo.fetchManifest).toHaveBeenCalledTimes(1)

    await service.loadManifest(true)
    expect(repo.fetchManifest).toHaveBeenCalledTimes(2)
  })

  it('loadSutra 以 manifest 元信息为准并派生 globalId', async () => {
    const service = createSutraService({ repository: repo })

    const sutra = await service.loadSutra(FILENAME)

    expect(sutra.title).toBe('般若波罗蜜多心经') // 标题以 manifest 为准（与书架一致）
    expect(sutra.filename).toBe(FILENAME)
    expect(sutra.chapterCount).toBe(1)
    expect(sutra.totalChars).toBe(20)
    expect(sutra.chapters[0]?.paragraphs[0]?.globalId).toBe(`${FILENAME}:0:0`)
    expect(sutra.chapters[0]?.paragraphs[1]?.globalId).toBe(`${FILENAME}:0:1`)
    expect(repo.fetchSutra).toHaveBeenCalledWith(FILENAME, undefined)
  })

  it('loadSutra 透传 signal 至 fetchManifest / fetchSutra（真取消）', async () => {
    const service = createSutraService({ repository: repo })
    const controller = new AbortController()

    await service.loadSutra(FILENAME, controller.signal)

    expect(repo.fetchManifest).toHaveBeenCalledWith(controller.signal)
    expect(repo.fetchSutra).toHaveBeenCalledWith(FILENAME, controller.signal)
  })

  it('manifest 拉取失败不污染缓存（后续可重试）', async () => {
    const service = createSutraService({ repository: repo })
    repo.fetchManifest.mockRejectedValueOnce(new Error('网络错误'))

    await expect(service.loadManifest()).rejects.toThrow('网络错误')
    // 失败后 dedup promise 已重置 → 再次调用应重新发起（而非返回被缓存的 rejected promise）
    await expect(service.loadManifest()).resolves.toHaveLength(1)
    expect(repo.fetchManifest).toHaveBeenCalledTimes(2)
  })

  it('loadSutra 未知经书 → 抛错', async () => {
    const service = createSutraService({ repository: repo })

    await expect(service.loadSutra('不存在.json')).rejects.toThrow('未找到经书')
  })

  it('getMeta 在清单加载前返回 null，加载后命中', async () => {
    const service = createSutraService({ repository: repo })

    expect(service.getMeta(FILENAME)).toBeNull()
    await service.loadManifest()
    expect(service.getMeta(FILENAME)?.title).toBe('般若波罗蜜多心经')
    expect(service.getMeta('无.json')).toBeNull()
  })
})
