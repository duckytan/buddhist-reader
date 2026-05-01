/**
 * 词典定义文本格式化工具
 * 将 MDX 词典的纯文本定义转换为带段落排版的 HTML
 * 
 * MDX 词典文本特点：
 * - 使用 \n  （换行+全角空格）分段
 * - 使用 〔〕标记章节标题
 * - 末尾可能有"返回 總目錄"导航
 * - 【词条】作为词条标记
 */

/**
 * 将纯文本词典定义转换为 HTML
 * @param {string} text - 原始定义文本
 * @returns {string} - 格式化后的 HTML
 */
export function formatDefinition(text) {
  if (!text) return ''

  let content = text

  // 移除末尾的导航文本
  content = content.replace(/\n?\s*返回\s*總?目录\s*$/g, '')
  content = content.replace(/\n?\s*返回\s*總?目錄\s*$/g, '')

  // 移除开头的词条标记（如"【菩萨】"）
  content = content.replace(/^【[^】]*】\s*/, '')

  // 按换行分割
  const lines = content.split(/\n/)

  const paragraphs = []
  let currentParagraph = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      // 空行，结束当前段落
      if (currentParagraph) {
        paragraphs.push(currentParagraph)
        currentParagraph = ''
      }
      continue
    }

    // 判断是否是章节标题 〔...〕
    if (/^〔.+〕/.test(trimmed)) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph)
        currentParagraph = ''
      }
      paragraphs.push(`__HEADER__${trimmed}`)
      continue
    }

    // 判断是否是新段落（以全角空格开头，或者非空行）
    if (currentParagraph) {
      // 如果当前行以全角空格开头，说明是新段落
      if (/^\s{2,}/.test(line) || line.startsWith('\u3000')) {
        paragraphs.push(currentParagraph)
        currentParagraph = trimmed
      } else {
        // 同一段落继续
        currentParagraph += trimmed
      }
    } else {
      currentParagraph = trimmed
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph)
  }

  // 转换为 HTML
  const htmlParts = paragraphs.map(p => {
    if (p.startsWith('__HEADER__')) {
      const headerText = p.replace('__HEADER__', '')
      return `<p class="dict-section">${escapeHtml(headerText)}</p>`
    }
    return `<p>${escapeHtml(p)}</p>`
  })

  return htmlParts.join('')
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
