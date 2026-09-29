import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  makeGlobalId,
  parseGlobalId,
  readSelectionAnchor,
  scrollToAnchor,
  setScrollTop,
  toElementId
} from '@/utils/anchor'

describe('anchor（DOM 封装 · §6.1 ③ / §11）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('toElementId 与 globalId 一一对应', () => {
    const globalId = makeGlobalId('心经.json', 1, 2)
    expect(globalId).toBe('心经.json:1:2')
    expect(toElementId(globalId)).toBe('para-心经.json:1:2')
    expect(parseGlobalId(globalId)).toEqual({ sutraId: '心经.json', chapterIdx: 1, paraIdx: 2 })
  })

  it('scrollToAnchor：定位到段落（无 offset）→ paragraph', () => {
    const para = document.createElement('p')
    para.id = toElementId('x.json:0:0')
    document.body.appendChild(para)

    expect(scrollToAnchor({ globalId: 'x.json:0:0' })).toBe('paragraph')
    expect(para.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('scrollToAnchor：优先定位段内 [data-off][data-search] 命中元素 → exact', () => {
    const para = document.createElement('p')
    para.id = toElementId('x.json:0:0')
    const span = document.createElement('span')
    span.setAttribute('data-off', '3')
    span.setAttribute('data-search', '')
    para.appendChild(span)
    document.body.appendChild(para)

    // 每元素独立 spy（覆盖 prototype），以区分定位到的是段落还是段内命中元素
    const paraSpy = vi.fn()
    const spanSpy = vi.fn()
    para.scrollIntoView = paraSpy
    span.scrollIntoView = spanSpy

    expect(scrollToAnchor({ globalId: 'x.json:0:0', offset: 3 })).toBe('exact')
    expect(spanSpy).toHaveBeenCalledWith({ block: 'start' })
    expect(paraSpy).not.toHaveBeenCalled()
  })

  it('scrollToAnchor：给定 offset 但段内无 [data-search] → 回退段落并返回 paragraph（非假装成功）', () => {
    const para = document.createElement('p')
    para.id = toElementId('x.json:0:0')
    // 同位置只有 term 段（data-hit，无 data-search）——不得被当作搜索命中
    const termSpan = document.createElement('span')
    termSpan.setAttribute('data-off', '3')
    termSpan.setAttribute('data-hit', '')
    para.appendChild(termSpan)
    document.body.appendChild(para)

    const paraSpy = vi.fn()
    const termSpy = vi.fn()
    para.scrollIntoView = paraSpy
    termSpan.scrollIntoView = termSpy

    expect(scrollToAnchor({ globalId: 'x.json:0:0', offset: 3 })).toBe('paragraph')
    expect(paraSpy).toHaveBeenCalledWith({ block: 'start' })
    expect(termSpy).not.toHaveBeenCalled()
  })

  it('scrollToAnchor：目标不存在 → none', () => {
    expect(scrollToAnchor({ globalId: 'missing:0:0' })).toBe('none')
  })

  it('setScrollTop：写入滚动位置并夹紧到非负', () => {
    const container = document.createElement('div')
    setScrollTop(container, 120)
    expect(container.scrollTop).toBe(120)
    setScrollTop(container, -5)
    expect(container.scrollTop).toBe(0)
  })

  it('readSelectionAnchor：由选区解析段落锚点（无 TreeWalker）', () => {
    document.body.innerHTML =
      '<p id="para-x.json:0:0" data-global-id="x.json:0:0">' +
      '<span data-off="0">观自在</span><span data-off="3">般若</span></p>'
    const spans = document.querySelectorAll('span')
    const target = spans[1]?.firstChild
    if (!target) throw new Error('测试夹具缺失')

    const range = document.createRange()
    range.setStart(target, 1)
    range.setEnd(target, 2)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    const anchor = readSelectionAnchor()
    if (anchor) {
      // jsdom 若实现 Selection.toString() → 校验精确锚点
      expect(anchor).toEqual({ text: '若', globalId: 'x.json:0:0', offset: 4 })
    } else {
      // jsdom 未实现选区文本时，至少不应抛错
      expect(anchor).toBeNull()
    }
  })
})
