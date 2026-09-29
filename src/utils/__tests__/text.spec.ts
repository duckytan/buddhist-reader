import { describe, expect, it } from 'vitest'

import {
  NUMERAL_CHARS,
  cleanDefinition,
  extractDefinition,
  formatDefinition,
  isNumeralPhrase
} from '@/utils/text'

describe('extractDefinition', () => {
  it('字符串原样返回', () => {
    expect(extractDefinition('般若')).toBe('般若')
  })

  it('数组逐项取文本换行拼接', () => {
    expect(extractDefinition(['a', { c: 'b' }, 'c'])).toBe('a\nb\nc')
  })

  it('对象取 .c', () => {
    expect(extractDefinition({ c: 'x' })).toBe('x')
  })

  it('其余类型返回空串', () => {
    expect(extractDefinition(123)).toBe('')
    expect(extractDefinition(null)).toBe('')
    expect(extractDefinition(undefined)).toBe('')
  })
})

describe('cleanDefinition（金标准）', () => {
  it('字面转义序列 \\r\\n / \\r 转真实换行', () => {
    expect(cleanDefinition('a\\r\\nb\\rc')).toBe('a\nb\nc')
  })

  it('去除字面 \\t 与真实 tab', () => {
    expect(cleanDefinition('a\\tb')).toBe('ab')
    expect(cleanDefinition('a\tb')).toBe('ab')
  })

  it('删除行尾 〔…〕 / 【…】', () => {
    expect(cleanDefinition('般若〔大正藏〕')).toBe('般若')
    expect(cleanDefinition('般若【注】')).toBe('般若')
  })

  it('删除任意位置的 ［…］', () => {
    expect(cleanDefinition('般若［注］义')).toBe('般若义')
  })

  it('删除（参阅…）', () => {
    expect(cleanDefinition('般若（参阅智慧）')).toBe('般若')
    expect(cleanDefinition("般若（参阅'智慧'见某书）")).toBe('般若')
  })

  it('删除 ［参阅…］', () => {
    expect(cleanDefinition("般若［参阅'智慧'见某书］")).toBe('般若')
  })

  it('〔参考资料〕起截断至末尾', () => {
    expect(cleanDefinition('般若〔参考资料〕一大段内容')).toBe('般若')
  })

  it('製作說明 前缀整段丢弃', () => {
    expect(cleanDefinition('製作說明\n正文')).toBe('')
  })

  it('中国当代佛教网辞典 前缀整段丢弃', () => {
    expect(cleanDefinition('中国当代佛教网辞典\n正文')).toBe('')
  })

  it('阿彌陀佛 前缀整段丢弃', () => {
    expect(cleanDefinition('阿彌陀佛\n正文')).toBe('')
  })

  it('非字符串返回空串', () => {
    expect(cleanDefinition(null)).toBe('')
    expect(cleanDefinition(42)).toBe('')
  })

  it('首尾 trim', () => {
    expect(cleanDefinition('  般若  ')).toBe('般若')
  })
})

describe('formatDefinition', () => {
  it('提取 + 清洗 + 去空行', () => {
    expect(formatDefinition(['第一行', '', '第二行'])).toBe('第一行\n第二行')
  })
})

describe('isNumeralPhrase / NUMERAL_CHARS', () => {
  it('前置数字字符 → true', () => {
    expect(isNumeralPhrase('三十七尊', 1, 3)).toBe(true)
  })

  it('后置数字字符 → true', () => {
    expect(isNumeralPhrase('十七尊三', 0, 3)).toBe(true)
  })

  it('无相邻数字 → false', () => {
    expect(isNumeralPhrase('供养十七尊', 2, 3)).toBe(false)
  })

  it('NUMERAL_CHARS 逐字保留旧版字面量', () => {
    expect(NUMERAL_CHARS).toBe('零一二三四五六七八九十百千万亿兆〇○０-９')
  })
})
