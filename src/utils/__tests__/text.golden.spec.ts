import { describe, expect, it } from 'vitest'

import { cleanDefinition, extractDefinition, formatDefinition } from '@/utils/text'

/**
 * 金标准对照测试（方案 §13 · 隐性知识 `implicit-knowledge-handover.md` §3）。
 *
 * 与 `text.spec.ts` 的分工：本文件按 handover §3.2 的**十条正则编号**逐条验证，
 * 并**覆盖每条规则的边界**（如「仅行尾」而非「任意位置」），另加 §3.3「不截断」。
 * 每条断言都是**行为断言**：改坏对应正则即红（见各 it 注释的「红条件」）。
 *
 * ⚠️ 关于规则⑧/⑨（见下方对应组）：T10 曾实测发现二者因**顺序反了**而沦为死代码，
 * 已按 **specific → general 重排**（⑧ 先于 ⑦、⑨ 先于 ⑥）修复；相关用例断言的是
 * **修好后的应有行为**（而非「现状锁定」）。
 */

describe('§3.1 三种释义数据结构的兼容（金标准）', () => {
  it('字符串：原样返回', () => {
    expect(extractDefinition('梵语 prajñā 的音译')).toBe('梵语 prajñā 的音译')
  })

  it('数组：逐项取 .c，以 \\n 拼接', () => {
    expect(extractDefinition([{ c: '释义1' }, { c: '释义2' }])).toBe('释义1\n释义2')
  })

  it('对象：取 .c', () => {
    expect(extractDefinition({ c: '释义' })).toBe('释义')
  })

  it('其它（null/number/boolean）→ 空串（不抛 TypeError）', () => {
    // 红条件：若直接对入参 .replace，非字符串会抛 TypeError（旧版真实踩过 1765d5d）
    expect(extractDefinition(null)).toBe('')
    expect(extractDefinition(42)).toBe('')
    expect(extractDefinition(true)).toBe('')
  })

  it('数组混合形态：字符串项原样、对象项取 .c、非法项空串', () => {
    expect(extractDefinition(['a', { c: 'b' }, 123, null, 'c'])).toBe('a\nb\n\n\nc')
  })
})

describe('§3.2 十条清洗正则 · 逐条 + 边界（金标准）', () => {
  it('规则① 字面 \\r\\n → 真实换行', () => {
    expect(cleanDefinition('a\\r\\nb')).toBe('a\nb')
  })

  it('规则② 孤立字面 \\r → 换行', () => {
    expect(cleanDefinition('a\\rb')).toBe('a\nb')
  })

  it('规则③ 字面 \\t → 删除', () => {
    expect(cleanDefinition('a\\tb')).toBe('ab')
  })

  it('规则④ 真实制表符 → 删除', () => {
    expect(cleanDefinition('a\tb')).toBe('ab')
  })

  it('边界：字面 \\n 不属十条规则 → 原样保留（不多不少，恰十条）', () => {
    // 红条件：若误加「\\n → 换行」第 11 条规则，此断言变红
    expect(cleanDefinition('a\\nb')).toBe('a\\nb')
  })

  it('规则⑤ 行尾 〔…〕/【…】 → 删除（含 m 多行）', () => {
    expect(cleanDefinition('般若〔大正藏〕')).toBe('般若')
    expect(cleanDefinition('般若【注】')).toBe('般若')
    // 多行：仅删除「行尾」者，行中者不动
    expect(cleanDefinition('甲〔注〕\n乙')).toBe('甲\n乙')
  })

  it('边界⑤：〔…〕在**行中**（非行尾）→ 不删（`$` 锚定行尾）', () => {
    // 红条件：若去掉规则⑤的 `\s*$` 锚定，此行变红（`〔注〕义` 会被误删）
    expect(cleanDefinition('般若〔注〕义')).toBe('般若〔注〕义')
  })

  it('规则⑥ 全角方括号 ［…］ → 任意位置删除', () => {
    expect(cleanDefinition('般若［注］义')).toBe('般若义')
  })

  it('规则⑦ 全角（参阅…） → 删除', () => {
    expect(cleanDefinition('般若（参阅智慧）')).toBe('般若')
  })

  it('规则⑧ （参阅·带单引号形·）→ 删除', () => {
    expect(cleanDefinition("般若（参阅'智慧'见某书）")).toBe('般若')
  })

  it('规则⑨ ［参阅·带单引号形·］→ 删除', () => {
    expect(cleanDefinition("般若［参阅'智慧'见某书］")).toBe('般若')
  })

  /**
   * 【T10 发现 → 已修】规则⑧、⑨ 曾因**顺序反了**而沦为**死代码**：⑦ `（参阅[^）]*）`
   * 与 ⑧ 起始锚点相同、⑦ **先行**，只要 ⑧ 的模式成立（末尾必有 `）`），⑦ 必在同一
   * 位置命中并吞掉 `（参阅` 前缀 → ⑧ 永不触发；⑨ 对 ⑥ 同理（`［[^］]*］` 先吞）。
   * 证据：穷举字母表 `（）'参阅甲［］` 的 ≤8 长度串，移除 ⑧ 或 ⑨ 后输出 diffs=0。
   *
   * **已按 specific → general 重排**（⑧ 先于 ⑦、⑨ 先于 ⑥），恢复其设计意图。
   * 下面两条断言的是**修好后的应有行为**——**不是**「现状锁定」：
   * 锁定 bug 会把错误固化成规格，让下一个发现者误以为「这是设计」。
   */
  it('规则⑧（重排后生效）：引号内含「）」→ ⑧ 整段清理（非 ⑦ 的残渣）', () => {
    // ⑦ 会贪婪吞到**首个**「）」只剩残渣；⑧ 先跑则整段清除。
    // 红条件：若把 ⑧ 移回 ⑦ 之后（恢复旧序）→ 此处变 "慧'见）" → 红。
    expect(cleanDefinition("（参阅'智）慧'见）")).toBe('')
  })

  it('规则⑨（重排后生效）：方括号内引号含「］」→ ⑨ 整段清理', () => {
    // 红条件：若把 ⑨ 移回 ⑥ 之后（恢复旧序）→ 此处变 "甲y'］乙" → 红。
    expect(cleanDefinition("甲［参阅'x］y'］乙")).toBe('甲乙')
  })

  it('重排未破坏通用规则：无引号的（参阅…）仍由 ⑦ 清理', () => {
    // 红条件：若重排时误删 ⑦，此处变 "般若（参阅智慧）" → 红。
    expect(cleanDefinition('般若（参阅智慧）')).toBe('般若')
  })

  it('规则⑩-a 〔参考资料〕起 → 截断至文末（跨行）', () => {
    expect(cleanDefinition('般若〔参考资料〕一大段内容\n第二行')).toBe('般若')
  })

  it('规则⑩-b 行首「製作說明」前缀 → 整段（跨行）丢弃', () => {
    expect(cleanDefinition('製作說明\n正文\n更多')).toBe('')
  })

  it('规则⑩-c 行首「中国当代佛教网辞典」前缀 → 整段丢弃', () => {
    expect(cleanDefinition('中国当代佛教网辞典\n正文')).toBe('')
  })

  it('规则⑩-d 行首「阿彌陀佛」前缀 → 整段丢弃', () => {
    expect(cleanDefinition('阿彌陀佛\n正文')).toBe('')
  })

  it('边界⑩：组合脏串（旧版用户可见的「一大串垃圾」）→ 清空', () => {
    // 红条件：任一条规则缺失，都会残留可见垃圾
    expect(cleanDefinition("（参阅'某某'）［製作說明］中国当代佛教网辞典 阿彌陀佛…")).toBe('')
  })

  it('非字符串 / 空值 → 空串', () => {
    expect(cleanDefinition(null)).toBe('')
    expect(cleanDefinition(undefined)).toBe('')
    expect(cleanDefinition(0)).toBe('')
  })

  it('首尾空白 → trim', () => {
    expect(cleanDefinition('  般若  ')).toBe('般若')
  })
})

describe('§3.3 取消构建期截断：长释义完整（金标准）', () => {
  /** 生成不含任何脏数据形态的长释义（长度可控） */
  function longDefinition(chars: number): string {
    return '般'.repeat(chars)
  }

  it('400 字释义经 formatDefinition 后长度不变（不截断到 300 字、不补 …）', () => {
    const source = longDefinition(400)
    const formatted = formatDefinition(source)

    // 红条件：若恢复旧版「截断 300 字 + 补 '...'」，长度变 303 或含 '…' → 红
    expect(formatted).toBe(source)
    expect(formatted).toHaveLength(400)
    expect(formatted).not.toContain('...')
    expect(formatted).not.toContain('…')
  })

  it('数组形态的长释义同样完整保留', () => {
    const source = longDefinition(500)
    const formatted = formatDefinition([{ c: source }])
    expect(formatted).toHaveLength(500)
  })

  it('formatDefinition：提取 → 清洗 → 去空行（保留非空行顺序）', () => {
    expect(formatDefinition(['第一行', '', '   ', '第二行'])).toBe('第一行\n第二行')
  })
})
