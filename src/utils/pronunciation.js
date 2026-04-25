/**
 * 佛教术语读音映射
 * 提供多音字在佛教语境下的正确读音
 */

// 佛教专用读音映射表
export const pronunciationMap = {
  '般若': { pinyin: 'bō rě', note: '梵语 prajñā 的音译' },
  '菩萨': { pinyin: 'pú sà', note: '菩提萨埵的简称' },
  '摩诃': { pinyin: 'mó hē', note: '梵语 mahā，意为大' },
  '迦叶': { pinyin: 'jiā shè', note: '佛弟子，禅宗初祖' },
  '阿难': { pinyin: 'ā nán', note: '佛弟子，多闻第一' },
  '舍利': { pinyin: 'shè lì', note: '佛骨舍利' },
  '婆娑': { pinyin: 'pó suō', note: '娑婆世界的简称' },
  '提婆': { pinyin: 'tí pó', note: '梵语 deva，意为天' },
  '须弥': { pinyin: 'xū mí', note: '须弥山' },
  '南无': { pinyin: 'nā mó', note: '梵语 namas，意为致敬' },
  '波罗': { pinyin: 'bō luó', note: '梵语 pāramitā 的音译部分' },
  '末那': { pinyin: 'mò nà', note: '第八识' },
  '阿赖耶': { pinyin: 'ā lài yé', note: '第八识藏识' },
  '毗尼': { pinyin: 'pí ní', note: '戒律' },
  '那由他': { pinyin: 'nà yóu tuō', note: '印度大数名称' },
  '劫': { pinyin: 'jié', note: '时间单位，劫波' }
}

// 需要标注的术语列表（按长度降序，优先匹配长词）
const termsToAnnotate = Object.keys(pronunciationMap).sort((a, b) => b.length - a.length)

/**
 * 为文本添加拼音标注
 * 使用 HTML <ruby> 标签
 * @param {String} text - 原始文本
 * @returns {String} 带有拼音标注的 HTML
 */
export function addPinyinAnnotation(text) {
  let result = text

  termsToAnnotate.forEach(term => {
    const pinyin = pronunciationMap[term].pinyin
    const rubyTag = `<ruby>${term}<rt>${pinyin}</rt></ruby>`

    // 使用全局替换
    result = result.split(term).join(rubyTag)
  })

  return result
}

/**
 * 获取术语的拼音和备注
 * @param {String} term - 术语
 * @returns {Object|null} { pinyin, note } 或 null
 */
export function getPronunciation(term) {
  return pronunciationMap[term] || null
}

/**
 * 检查术语是否在读音映射中
 * @param {String} term - 术语
 * @returns {Boolean}
 */
export function hasPronunciation(term) {
  return term in pronunciationMap
}
