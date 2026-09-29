import { describe, expect, it, vi } from 'vitest'

import { createSutraRepository } from '@/data/repositories/sutraRepository'
import type { SutraMeta, SutraSource } from '@/types/sutra'
import type { RequestFn } from '@/utils/async'

describe('sutraRepository', () => {
  it('fetchManifest 请求 sutras/manifest.json', async () => {
    const manifest: SutraMeta[] = []
    const spy = vi.fn(async () => manifest)
    const repo = createSutraRepository({ baseUrl: '/base/', request: spy as unknown as RequestFn })

    await expect(repo.fetchManifest()).resolves.toBe(manifest)
    expect(spy).toHaveBeenCalledWith('/base/sutras/manifest.json', { signal: undefined })
  })

  it('fetchSutra 请求 sutras/{filename}', async () => {
    const sutra: SutraSource = {
      title: '心经',
      author: '玄奘',
      category: 'prajna',
      chapterCount: 1,
      totalParagraphs: 0,
      totalChars: 0,
      description: '',
      chapters: []
    }
    const spy = vi.fn(async () => sutra)
    const repo = createSutraRepository({ baseUrl: '/base/', request: spy as unknown as RequestFn })

    await expect(repo.fetchSutra('heart.json')).resolves.toBe(sutra)
    expect(spy).toHaveBeenCalledWith('/base/sutras/heart.json', { signal: undefined })
  })

  it('fetchSutra / fetchManifest 透传 AbortSignal（真取消，非事后判定）', async () => {
    const controller = new AbortController()
    const spy = vi.fn(async () => ({}))
    const repo = createSutraRepository({ baseUrl: '/base/', request: spy as unknown as RequestFn })

    await repo.fetchSutra('heart.json', controller.signal)
    expect(spy).toHaveBeenLastCalledWith('/base/sutras/heart.json', { signal: controller.signal })

    await repo.fetchManifest(controller.signal)
    expect(spy).toHaveBeenLastCalledWith('/base/sutras/manifest.json', { signal: controller.signal })
  })
})
