/**
 * Trie树（字典树）实现
 * 用于高效的词典匹配和词高亮
 */

/**
 * 构建Trie树
 * @param {Array} dictionary - 词典数组，每个元素包含 term 字段
 * @returns {Object} Trie树的根节点
 */
export function buildTrie(dictionary) {
  const root = {}

  dictionary.forEach(entry => {
    const term = entry.term
    let node = root

    for (let i = 0; i < term.length; i++) {
      const char = term[i]
      if (!node[char]) {
        node[char] = {}
      }
      node = node[char]
    }

    // 标记单词结束
    node.isEnd = true
    node.term = term
  })

  return root
}

/**
 * 在文本中查找所有匹配的词典词条
 * @param {Object} trie - Trie树的根节点
 * @param {String} text - 待匹配的文本
 * @returns {Array} 匹配结果数组，每项包含 { term, start, end }
 */
export function findMatches(trie, text) {
  const matches = []

  for (let i = 0; i < text.length; i++) {
    let node = trie
    let j = i

    while (node && j < text.length) {
      const char = text[j]
      if (node[char]) {
        node = node[char]
        j++

        // 如果匹配到完整词条，记录位置
        if (node.isEnd && node.term) {
          matches.push({
            term: node.term,
            start: i,
            end: j
          })
        }
      } else {
        break
      }
    }
  }

  return matches
}

/**
 * 移除重叠的匹配项，保留最长的匹配
 * @param {Array} matches - 匹配结果数组
 * @returns {Array} 去重后的匹配结果
 */
export function removeOverlaps(matches) {
  if (matches.length === 0) return []

  // 按起始位置排序
  matches.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start
    }
    // 起始位置相同时，保留更长的匹配
    return (b.end - b.start) - (a.end - a.start)
  })

  const result = []
  let lastEnd = -1

  matches.forEach(match => {
    // 如果当前匹配与上一个不重叠，加入结果
    if (match.start >= lastEnd) {
      result.push(match)
      lastEnd = match.end
    }
    // 如果重叠，已经在排序时保留了更长的匹配，直接跳过
  })

  return result
}
