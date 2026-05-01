/**
 * 词典定义文本格式化工具
 * 将 MDX 词典的纯文本定义转换为带段落排版的 HTML
 * 
 * 支持多种词典格式：
 * 1. 换行 + 全角空格缩进（中华佛教百科全书）
 * 2. 制表符分隔段落（中国当代佛教网辞典）
 * 3. 普通换行（新编佛教辞典）
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
  content = content.replace(/[\n\t]*返回\s*總?目录\s*$/g, '')
  content = content.replace(/[\n\t]*返回\s*總?目錄\s*$/g, '')

  // 移除开头的词条标记（如"【菩萨】"）
  content = content.replace(/^【[^】]*】[\t\s]*/, '')

  // 判断是否为制表符分隔格式（如中国当代佛教网辞典）
  // 制表符格式特点：内容中包含多个制表符分隔不同部分
  if (content.includes('\t')) {
    return formatTabSeparated(content)
  }

  // 否则使用换行分段逻辑
  return formatNewlineSeparated(content)
}

/**
 * 处理制表符分隔的内容
 * 例：正文\t\t出处\t\t来源
 */
function formatTabSeparated(text) {
  // 按制表符分割
  const parts = text.split(/\t+/).map(p => p.trim()).filter(p => p)
  
  return parts.map(part => {
    // 判断是否是章节标题
    if (/^〔.+〕/.test(part)) {
      return `<p class="dict-section">${escapeHtml(part)}</p>`
    }
    // 判断是否是来源标注（方括号包裹的短文本）
    if (/^［.+］$/.test(part) || /^\[.+\]$/.test(part)) {
      return `<p class="dict-source">${escapeHtml(part)}</p>`
    }
    return `<p>${escapeHtml(part)}</p>`
  }).join('')
}

/**
 * 处理换行分隔的内容
 * 例：正文\n  新段落\n  〔参考资料〕
 */
function formatNewlineSeparated(text) {
  const lines = text.split(/\n/)

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

    // 判断是否是新段落
    if (currentParagraph) {
      // 以空白字符开头（全角空格、多个半角空格等）视为新段落
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
  return paragraphs.map(p => {
    if (p.startsWith('__HEADER__')) {
      const headerText = p.replace('__HEADER__', '')
      return `<p class="dict-section">${escapeHtml(headerText)}</p>`
    }
    return `<p>${escapeHtml(p)}</p>`
  }).join('')
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
