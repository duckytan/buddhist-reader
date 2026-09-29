import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

const mocks = vi.hoisted(() => ({
  readSelectionAnchor: vi.fn(),
  clearSelectionAnchor: vi.fn()
}))

vi.mock('@/utils/anchor', () => ({
  readSelectionAnchor: mocks.readSelectionAnchor,
  clearSelectionAnchor: mocks.clearSelectionAnchor
}))

import { useSelection } from '@/composables/useSelection'
import type { UseSelection } from '@/composables/useSelection'

function create(): UseSelection {
  const scope = effectScope()
  let sel!: UseSelection
  scope.run(() => {
    sel = useSelection()
  })
  return sel
}

describe('useSelection（选区 → 笔记锚点）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('有有效选区时记录并返回', () => {
    mocks.readSelectionAnchor.mockReturnValue({ text: '般若', globalId: 'x.json:0:0', offset: 3 })
    const sel = create()

    const info = sel.capture()

    expect(info).toEqual({ text: '般若', globalId: 'x.json:0:0', offset: 3 })
    expect(sel.selection.value?.text).toBe('般若')
  })

  it('无有效选区时保持原值（点击折叠不清掉已捕获内容）', () => {
    mocks.readSelectionAnchor.mockReturnValueOnce({ text: '般若', globalId: 'x.json:0:0', offset: 3 })
    const sel = create()
    sel.capture()

    mocks.readSelectionAnchor.mockReturnValueOnce(null)
    expect(sel.capture()).toBeNull()
    expect(sel.selection.value?.text).toBe('般若') // 未被清空
  })

  it('clear 清空状态并清除浏览器选区', () => {
    mocks.readSelectionAnchor.mockReturnValue({ text: '空', globalId: 'x.json:0:0', offset: 0 })
    const sel = create()
    sel.capture()

    sel.clear()
    expect(sel.selection.value).toBeNull()
    expect(mocks.clearSelectionAnchor).toHaveBeenCalled()
  })
})
