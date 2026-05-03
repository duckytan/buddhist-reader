export class DefinitionFormatter {
  format(definition, options = {}) {
    const {
      truncate = false,
      maxLength = 200,
      showPinyin = false,
      pinyin = null
    } = options

    let formatted = definition || ''

    if (truncate && formatted.length > maxLength) {
      formatted = formatted.slice(0, maxLength) + '...'
    }

    if (showPinyin && pinyin) {
      formatted = `${pinyin}\n${formatted}`
    }

    return formatted
  }

  formatMultiple(definitions, options = {}) {
    if (!definitions || definitions.length === 0) return []
    return definitions.map(def => this.format(def, options))
  }

  extractPlainText(htmlOrMarkdown) {
    if (!htmlOrMarkdown) return ''
    const div = document.createElement('div')
    div.innerHTML = htmlOrMarkdown
    return div.textContent || div.innerText || ''
  }

  getWordCount(text) {
    if (!text) return 0
    return text.replace(/\s/g, '').length
  }
}

export const definitionFormatter = new DefinitionFormatter()
