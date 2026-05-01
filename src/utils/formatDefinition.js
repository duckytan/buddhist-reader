/**
 * 词典定义文本格式化工具
 * 将 MDX 词典的纯文本定义转换为带段落排版的 HTML
 * 
 * 支持多种词典格式：
 * 1. 换行 + 全角空格缩进（中华佛教百科全书）
 * 2. 制表符分隔段落（中国当代佛教网辞典）
 * 3. 普通换行（新编佛教辞典）
 * 4. HTML 内容（直接渲染）
 * 5. 混合编码（UTF-8、GBK、Big5）
 * 6. 简繁体混合
 * 7. 梵文、巴利文、藏文等特殊文字
 */

/**
 * 将纯文本词典定义转换为 HTML
 * @param {string} text - 原始定义文本
 * @returns {string} - 格式化后的 HTML
 */
export function formatDefinition(text) {
  if (!text || typeof text !== 'string') return ''

  // 预处理：清理编码问题和特殊字符
  let content = preprocessText(text)

  // 检测是否为 HTML 内容
  if (isHTML(content)) {
    return formatHTML(content)
  }

  // 移除末尾的导航文本
  content = content.replace(/[\n\t]*返回\s*總?目录\s*$/g, '')
  content = content.replace(/[\n\t]*返回\s*總?目錄\s*$/g, '')

  // 移除开头的词条标记（如"【菩萨】"）
  content = content.replace(/^【[^】]*】[\t\s]*/, '')

  // 判断是否为制表符分隔格式（如中国当代佛教网辞典）
  if (content.includes('\t')) {
    return formatTabSeparated(content)
  }

  // 判断是否为换行分段格式
  if (content.includes('\n')) {
    return formatNewlineSeparated(content)
  }

  // 默认：单段落（检测书写系统类型）
  const scriptType = detectScriptType(content)
  if (scriptType) {
    return `<p class="dict-sanskrit" data-script="${scriptType}">${escapeHtml(content)}</p>`
  }
  return `<p>${escapeHtml(content)}</p>`
}

/**
 * 预处理文本：清理编码问题和特殊字符
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
function preprocessText(text) {
  return text
    // 替换无效的 Unicode 替换字符
    .replace(/\uFFFD/g, '')
    // 替换常见乱码字符（GBK/Big5 转 UTF-8 时可能出现）
    .replace(/锘縖/g, '') // BOM
    .replace(/鈥？/g, '') // 常见的乱码
    // 标准化换行符
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 清理零宽字符
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 清理不可见控制字符（保留换行和制表符）
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * 检测是否为 HTML 内容
 * @param {string} text - 文本内容
 * @returns {boolean} - 是否为 HTML
 */
function isHTML(text) {
  // 检测是否有 HTML 标签
  const htmlPattern = /<[a-z][\s\S]*>/i
  return htmlPattern.test(text)
}

/**
 * 处理 HTML 内容
 * @param {string} html - HTML 内容
 * @returns {string} - 处理后的 HTML
 */
function formatHTML(html) {
  // 清理危险的 HTML（只保留安全的标签）
  let safeHTML = html
    // 移除 script 标签
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除 style 标签
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // 移除 onclick 等事件处理
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    // 移除 javascript: 协议
    .replace(/javascript:/gi, '')

  return `<div class="dict-html-content">${safeHTML}</div>`
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
    // 处理梵文/巴利文/藏文
    const scriptType = detectScriptType(part)
    if (scriptType) {
      return `<p class="dict-sanskrit" data-script="${scriptType}">${escapeHtml(part)}</p>`
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
    // 处理梵文/巴利文/藏文
    const scriptType = detectScriptType(p)
    if (scriptType) {
      return `<p class="dict-sanskrit" data-script="${scriptType}">${escapeHtml(p)}</p>`
    }
    return `<p>${escapeHtml(p)}</p>`
  }).join('')
}

/**
 * 检测文本的书写系统类型
 * @param {string} text - 文本内容
 * @returns {string|null} - 书写系统类型：'sanskrit' | 'tibetan' | 'pali' | null
 */
function detectScriptType(text) {
  // 藏文：U+0F00-U+0FFF
  if (/[\u0F00-\u0FFF]/.test(text)) {
    return 'tibetan'
  }
  
  // 梵文/天城文：U+0900-U+097F, U+A8E0-U+A8FF
  // 注意：辅助平面字符（如 U+11B00）需要使用 \u{...} 语法（ES2015+）
  if (/[\u0900-\u097F\uA8E0-\uA8FF]/u.test(text)) {
    return 'sanskrit'
  }
  
  return null
}

/**
 * HTML 转义
 * @param {string} text - 原始文本
 * @returns {string} - 转义后的文本
 */
function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
