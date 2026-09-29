import { describe, expect, it } from 'vitest'

import {
  decodeJumpQuery,
  encodeJumpQuery,
  JUMP_QUERY_KEYS
} from '@/utils/readerJump'

describe('utils/readerJump（§6.5 / §8.3 跳转单一入口）', () => {
  it('笔记锚点：encode → decode 往返一致（语义锚点路径）', () => {
    const query = encodeJumpQuery({
      sutraId: '《心经》.json',
      anchor: { chapterIdx: 2, paraId: 'p7', offset: 13 }
    })

    expect(query[JUMP_QUERY_KEYS.kind]).toBe('note')

    const decoded = decodeJumpQuery(query, '《心经》.json')
    expect(decoded).toEqual({
      sutraId: '《心经》.json',
      anchor: { chapterIdx: 2, paraId: 'p7', offset: 13 }
    })
  })

  it('书签：encode → decode 往返一致（像素路径）', () => {
    const query = encodeJumpQuery({ sutraId: 'a.json', chapterIdx: 3, position: 120 })

    expect(query[JUMP_QUERY_KEYS.kind]).toBe('bookmark')

    const decoded = decodeJumpQuery(query, 'a.json')
    expect(decoded).toEqual({ sutraId: 'a.json', chapterIdx: 3, position: 120 })
  })

  it('decode：非法 / 缺失 / 类别未知 → null', () => {
    expect(decodeJumpQuery({}, 'a.json')).toBeNull()
    expect(decodeJumpQuery({ [JUMP_QUERY_KEYS.kind]: 'nope' }, 'a.json')).toBeNull()
    // sutraId 缺失
    expect(
      decodeJumpQuery({ [JUMP_QUERY_KEYS.kind]: 'bookmark', chapter: '0', position: '1' }, '')
    ).toBeNull()
    // 非整数
    expect(
      decodeJumpQuery({ [JUMP_QUERY_KEYS.kind]: 'bookmark', chapter: 'x', position: '1' }, 'a.json')
    ).toBeNull()
    // 负值
    expect(
      decodeJumpQuery({ [JUMP_QUERY_KEYS.kind]: 'bookmark', chapter: '-1', position: '1' }, 'a.json')
    ).toBeNull()
    // 笔记缺 offset
    expect(
      decodeJumpQuery({ [JUMP_QUERY_KEYS.kind]: 'note', chapter: '0', para: 'p1' }, 'a.json')
    ).toBeNull()
  })

  it('decode：query 值为数组（重复参数）时视为非法（只认字符串）', () => {
    expect(
      decodeJumpQuery(
        { [JUMP_QUERY_KEYS.kind]: 'bookmark', chapter: ['0', '1'], position: '1' },
        'a.json'
      )
    ).toBeNull()
  })
})
