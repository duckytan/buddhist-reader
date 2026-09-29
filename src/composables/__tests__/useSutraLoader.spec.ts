import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope } from 'vue'

import type { Sutra } from '@/types/sutra'

const mocks = vi.hoisted(() => ({ loadSutra: vi.fn() }))

vi.mock('@/services/sutraService', () => ({
  sutraService: { loadSutra: mocks.loadSutra },
  createSutraService: vi.fn()
}))

import { useSutraLoader } from '@/composables/useSutraLoader'
import type { UseSutraLoader } from '@/composables/useSutraLoader'
import { useSutraStore } from '@/stores/sutra'

const SUTRA: Sutra = {
  title: '心经',
  filename: 'x.json',
  author: '玄奘',
  category: 'prajna',
  chapterCount: 1,
  totalParagraphs: 1,
  totalChars: 4,
  description: '',
  chapters: [{ title: '正文', paragraphs: [{ id: 'p1', text: '般若', globalId: 'x.json:0:0' }] }]
}

function create(): { loader: UseSutraLoader; store: ReturnType<typeof useSutraStore> } {
  const store = useSutraStore()
  const scope = effectScope()
  let loader!: UseSutraLoader
  scope.run(() => {
    loader = useSutraLoader()
  })
  return { loader, store }
}

describe('useSutraLoader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('load 成功 → status ready 且写入 store.current', async () => {
    mocks.loadSutra.mockResolvedValue(SUTRA)
    const { loader, store } = create()

    await loader.load('x.json')

    expect(loader.status.value).toBe('ready')
    expect(store.current?.title).toBe('心经')
    expect(loader.sutra.value?.filename).toBe('x.json')
  })

  it('load 失败 → status error 且 error 文案', async () => {
    mocks.loadSutra.mockRejectedValue(new Error('未找到经书：x.json'))
    const { loader, store } = create()

    await loader.load('x.json')

    expect(loader.status.value).toBe('error')
    expect(loader.error.value).toBe('未找到经书：x.json')
    expect(store.current).toBeNull()
  })

  it('retry 复用上次 id', async () => {
    mocks.loadSutra.mockRejectedValueOnce(new Error('boom'))
    const { loader } = create()
    await loader.load('x.json')
    expect(loader.status.value).toBe('error')

    mocks.loadSutra.mockResolvedValue(SUTRA)
    await loader.retry()
    expect(loader.status.value).toBe('ready')
    expect(mocks.loadSutra).toHaveBeenLastCalledWith('x.json', expect.any(AbortSignal))
  })

  it('取消后不写入状态（防卸载后 setState）', async () => {
    let resolveLoad: (value: Sutra) => void = () => {}
    mocks.loadSutra.mockReturnValue(new Promise<Sutra>((resolve) => (resolveLoad = resolve)))
    const { loader, store } = create()

    const pending = loader.load('x.json')
    loader.cancel()
    resolveLoad(SUTRA)
    await pending

    expect(loader.status.value).toBe('loading')
    expect(store.current).toBeNull()
  })

  it('load 把 controller.signal 真透传给 service；cancel() 后该 signal.aborted === true', async () => {
    // 反向验证「真取消」：捕获 service 收到的 signal，断言 ① 同一对象被 abort、
    // ② 调用时该 signal 尚未 abort。旧「假 abort」（不透传）会收到 undefined → 失败。
    let captured: AbortSignal | undefined
    let resolveLoad: (value: Sutra) => void = () => {}
    mocks.loadSutra.mockImplementation((_id: string, signal?: AbortSignal) => {
      captured = signal
      return new Promise<Sutra>((resolve) => (resolveLoad = resolve))
    })
    const { loader } = create()

    const pending = loader.load('x.json')

    expect(captured).toBeInstanceOf(AbortSignal)
    expect(captured?.aborted).toBe(false)

    loader.cancel()

    // 同一个 signal 对象被 abort（而非另造一个）——即透传成立
    expect(captured?.aborted).toBe(true)
    expect(mocks.loadSutra).toHaveBeenCalledWith('x.json', captured)

    resolveLoad(SUTRA)
    await pending
  })
})
