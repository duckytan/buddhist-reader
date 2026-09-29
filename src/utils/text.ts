/**
 * 文本工具：释义提取 / 清洗 / 格式化（方案 §9 T04）。
 *
 * 清洗规则从 v3.1.0 `utils/text.js` **逐条等价移植**——这些正则承载了大量
 * 「隐性知识」（脏数据形态），改动即回归风险。故保留原正则与顺序，仅补类型。
 * 详见 `docs/refactor/2026-09-29-implicit-knowledge-handover.md` §3。
 */

/** 提取释义：字符串原样；数组逐项取文本换行拼接；对象取 `.c`；其余空串。 */
export function extractDefinition(def: unknown): string {
  if (typeof def === 'string') return def
  if (Array.isArray(def)) {
    return def
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'c' in item) {
          const c = (item as { c?: unknown }).c
          return typeof c === 'string' ? c : ''
        }
        return ''
      })
      .join('\n')
  }
  if (def && typeof def === 'object' && 'c' in def) {
    const c = (def as { c?: unknown }).c
    return typeof c === 'string' ? c : ''
  }
  return ''
}

/**
 * 清洗释义。
 *
 * ⚠️ 注意：`\\r\\n` / `\\r` / `\\t` 匹配的是**字面转义序列**（反斜杠+r 等），
 * 非真实控制字符——这是旧版针对数据中「已转义」内容的既定行为，等价保留。
 */
export function cleanDefinition(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return ''
  let text = raw
  text = text.replace(/\\r\\n/g, '\n')
  text = text.replace(/\\r/g, '\n')
  text = text.replace(/\\t/g, '')
  text = text.replace(/\t/g, '')
  text = text.replace(/[〔【][^〕】]*[〕】]\s*$/gm, '')
  text = text.replace(/［[^］]*］/g, '')
  text = text.replace(/（参阅[^）]*）/g, '')
  text = text.replace(/（参阅'[^']*'[^）]*）/g, '')
  text = text.replace(/［参阅'[^']*'[^］]*］/g, '')
  text = text.replace(/〔参考资料〕[^]*$/s, '')
  text = text.replace(/^\s*製作說明[^]*$/s, '')
  text = text.replace(/^\s*中国当代佛教网辞典[^]*$/s, '')
  text = text.replace(/^\s*阿彌陀佛[^]*$/s, '')
  text = text.trim()
  return text
}

/** 提取 → 清洗 → 去空行，得到可展示的完整释义（不截断）。 */
export function formatDefinition(raw: unknown): string {
  const extracted = extractDefinition(raw)
  const cleaned = cleanDefinition(extracted)
  return cleaned
    .split('\n')
    .filter((line) => line.trim())
    .join('\n')
}

/**
 * 数字短语字符集（**逐字保留旧版字面量**）。
 *
 * 原值为 `'零一二三四五六七八九十百千万亿兆〇○０-９'`——其中 `０-９` 是三个
 * 独立字符（全角零、连字符、全角九），并非全角数字区间。此处**有意保持原样**
 * 以维持语义等价（§6.2）；如需修正为完整全角区间，应作为独立变更评估。
 */
export const NUMERAL_CHARS = '零一二三四五六七八九十百千万亿兆〇○０-９'

/**
 * 判断某次命中是否处于「数字短语」上下文（命中词紧邻数字字符）。
 * 用于避免把「十七尊」误命中于「三十七尊」之中（§6.2 数字短语过滤）。
 */
export function isNumeralPhrase(text: string, start: number, matchLen: number): boolean {
  if (start > 0) {
    const prev = text.charAt(start - 1)
    if (NUMERAL_CHARS.includes(prev)) return true
  }
  if (start + matchLen < text.length) {
    const next = text.charAt(start + matchLen)
    if (NUMERAL_CHARS.includes(next)) return true
  }
  return false
}
