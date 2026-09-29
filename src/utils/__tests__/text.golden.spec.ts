import { describe, expect, it } from 'vitest'

import { cleanDefinition, extractDefinition, formatDefinition } from '@/utils/text'

/**
 * 金标准对照测试（方案 §13 · 隐性知识 `implicit-knowledge-handover.md` §3）。
 *
 * 与 `text.spec.ts` 的分工：本文件按 handover §3.2 的**十条正则编号**逐条验证，
 * 并**覆盖每条规则的边界**（如「仅行尾」而非「任意位置」），另加 §3.3「不截断」。
 * 每条断言都是**行为断言**：改坏对应正则即红（见各 it 注释的「红条件」）。
 *
 * ⚠️ 实测发现（见下方「规则⑧/⑨」组）：十条正则中的 ⑧、⑨ **不可达**（被 ⑦/⑥ 遮蔽），
 * 其设计意图未达成——已在 T10 报告中单列，此处以「现状锁定」用例记录。
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

  it('规则⑧ （参阅·带单引号形·）→ 删除（行为实由规则⑦覆盖，见下）', () => {
    expect(cleanDefinition("般若（参阅'智慧'见某书）")).toBe('般若')
  })

  it('规则⑨ ［参阅·带单引号形·］→ 删除（行为实由规则⑥覆盖，见下）', () => {
    expect(cleanDefinition("般若［参阅'智慧'见某书］")).toBe('般若')
  })

  /**
   * 【T10 实测发现 · 实现漂移】规则⑧、⑨ **不可达（dead code）**。
   *
   * 规则⑦ `（参阅[^）]*）` 与 ⑧ 的起始锚点相同（都在 `（参阅`），而 ⑦ **先行执行**；
   * 只要 ⑧ 的模式成立（其末尾必有 `）`），⑦ 必在**同一位置**命中并吞掉 `（参阅` 前缀
   * → ⑧ 再无机会命中。⑨ 对 ⑥ 同理（`［[^］]*］` 先吞）。
   *
   * 证据：对字母表 `（）'参阅甲［］` 的全部 ≤8 长度串穷举，**移除 ⑧ 或 ⑨ 后输出零差异**
   * （diffs=0）。故 ⑧/⑨ 的**设计意图**（处理引号内含 `）` 的情形）**并未达成**——见下条。
   */
  it('【实测】规则⑧ 被⑦遮蔽：引号内含「）」时残留（现状锁定）', () => {
    // ⑦ 贪婪吞到**首个**「）」→ 只剩残渣；⑧ 本应处理此形，但因⑦先跑而不可达。
    // 红条件：若有人把 ⑧ 提到 ⑦ 之前（修正顺序），此处会变为 '' → 红（提示更新本用例）
    expect(cleanDefinition("（参阅'智）慧'见）")).toBe("慧'见）")
  })

  it('【实测】规则⑨ 被⑥遮蔽：⑨ 从不生效（现状锁定）', () => {
    // ⑥ `［[^］]*］` 先吞掉整个 `［参阅…］`，⑨ 永不命中。
    expect(cleanDefinition("甲［参阅'x］y'］乙")).toBe("甲y'］乙")
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
