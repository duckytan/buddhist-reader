export const pronunciationMap = {
  '般若': 'bō rě',
  '波罗蜜多': 'bō luó mì duō',
  '南无': 'nā mó',
  '摩诃': 'mó hē',
  '禅那': 'chán nuó',
  '舍利': 'shè lì',
  '伽': 'qié',
  '梵': 'fàn',
  '刹': 'chà',
  '那': 'nà',
  '阿': 'ē',
  '弥': 'mí',
  '陀': 'tuó',
  '娑婆': 'suō pó',
  '比丘': 'bǐ qiū',
  '三昧': 'sān mèi'
}

export function getPronunciation(text) {
  return pronunciationMap[text] || null
}

export function applyPronunciation(text) {
  let result = text
  for (const [term, pinyin] of Object.entries(pronunciationMap)) {
    if (result.includes(term)) {
      result = result.replaceAll(term, `${term}（${pinyin}）`)
    }
  }
  return result
}
