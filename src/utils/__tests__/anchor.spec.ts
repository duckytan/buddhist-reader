import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeGlobalId, parseGlobalId, scrollToAnchor, setScrollTop, toElementId } from '@/utils/anchor'

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

  it('scrollToAnchor：定位到段落（无 offset）', () => {
    const para = document.createElement('p')
    para.id = toElementId('x.json:0:0')
    document.body.appendChild(para)

    expect(scrollToAnchor({ globalId: 'x.json:0:0' })).toBe(true)
    expect(para.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('scrollToAnchor：优先定位段内 [data-off][data-hit] 命中元素', () => {
    const para = document.createElement('p')
    para.id = toElementId('x.json:0:0')
    const span = document.createElement('span')
    span.setAttribute('data-off', '3')
    span.setAttribute('data-hit', '')
    para.appendChild(span)
    document.body.appendChild(para)

    // 每元素独立 spy（覆盖 prototype），以区分定位到的是段落还是段内命中元素
    const paraSpy = vi.fn()
    const spanSpy = vi.fn()
    para.scrollIntoView = paraSpy
    span.scrollIntoView = spanSpy

    expect(scrollToAnchor({ globalId: 'x.json:0:0', offset: 3 })).toBe(true)
    expect(spanSpy).toHaveBeenCalledWith({ block: 'start' })
    expect(paraSpy).not.toHaveBeenCalled()
  })

  it('scrollToAnchor：目标不存在返回 false', () => {
    expect(scrollToAnchor({ globalId: 'missing:0:0' })).toBe(false)
  })

  it('setScrollTop：写入滚动位置并夹紧到非负', () => {
    const container = document.createElement('div')
    setScrollTop(container, 120)
    expect(container.scrollTop).toBe(120)
    setScrollTop(container, -5)
    expect(container.scrollTop).toBe(0)
  })
})
