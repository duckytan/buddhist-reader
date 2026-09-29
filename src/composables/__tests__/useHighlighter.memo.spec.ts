import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

/**
 * §13 §2.⑥「35314 词 Trie 惰性构建」的**行为断言**（非时间断言）。
 *
 * 选择理由：方案 §13 原写「重建 < 100ms」，但**时间断言在 CI 上极易 flaky**；为「稳定」
 * 而放宽到必然通过的阈值＝装饰性护栏（与恒真断言同族）。故改断言两个**确定性**不变量：
 *   ① **惰性**——创建 highlighter 后、首次 `highlight` 前**不构建** Trie；
 *   ② **memo**——同词表引用只构建一次，**引用变化才重建**。
 * 这两条正是「惰性 + memo」的语义本身；「快不快」由不变量保证，而非计时。
 */

const mocks = vi.hoisted(() => ({ buildTrie: vi.fn() }))

vi.mock('@/utils/trie', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/trie')>()
  mocks.buildTrie.mockImplementation(actual.buildTrie)
  return { ...actual, buildTrie: mocks.buildTrie }
})

import { useHighlighter } from '@/composables/useHighlighter'

describe('useHighlighter（§2.⑥ 惰性 + memo 行为断言）', () => {
  beforeEach(() => {
    mocks.buildTrie.mockClear()
  })

  it('惰性：创建后、首次 highlight 前不构建 Trie', () => {
    const terms = ref<string[]>(['般若', '菩提'])
    useHighlighter(terms)

    // 红条件：若把 trie 改为创建时立即构建（eager），此处 > 0 → 红
    expect(mocks.buildTrie).not.toHaveBeenCalled()
  })

  it('memo：首次 highlight 构建一次，同实例再次 highlight 不重建（computed 缓存）', () => {
    const terms = ref<string[]>(['般若', '菩提'])
    const { highlight } = useHighlighter(terms)

    highlight('般若')
    expect(mocks.buildTrie).toHaveBeenCalledTimes(1)

    highlight('般若与菩提')
    // 红条件：若 highlight 内每次都重新 getTrie（绕过 computed 缓存），此处 = 2 → 红
    expect(mocks.buildTrie).toHaveBeenCalledTimes(1)
  })

  it('WeakMap identity memo：两个实例共享同一词表引用 → 只构建一次', () => {
    // 该用例**专测 WeakMap**（上一条只测到 computed 缓存）：两个独立 highlighter
    // 各有各的 computed，若去掉 `trieMemo` WeakMap，第二个实例会再建一次 → 2。
    const terms = ['般若', '菩提'] // 同一数组引用
    const h1 = useHighlighter(terms)
    h1.highlight('般若')
    expect(mocks.buildTrie).toHaveBeenCalledTimes(1)

    const h2 = useHighlighter(terms)
    h2.highlight('般若')
    // 红条件：移除 `getTrie` 里的 WeakMap（每次 buildTrie）→ 此处 = 2 → 红
    expect(mocks.buildTrie).toHaveBeenCalledTimes(1)
  })

  it('词表**引用**变化才重建（新数组 → 再次构建）', async () => {
    const terms = ref<string[]>(['般若'])
    const { highlight } = useHighlighter(terms)

    highlight('般若')
    expect(mocks.buildTrie).toHaveBeenCalledTimes(1)

    terms.value = ['般若', '菩提'] // 新引用
    await nextTick()
    highlight('般若')
    expect(mocks.buildTrie).toHaveBeenCalledTimes(2)
  })

  it('空词表：不构建 Trie 且 highlight 返回 null', () => {
    const { highlight } = useHighlighter([])

    expect(highlight('般若')).toBeNull()
    expect(mocks.buildTrie).not.toHaveBeenCalled()
  })
})
