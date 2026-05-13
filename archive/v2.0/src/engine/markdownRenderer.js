import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: true,
  breaks: true
})

md.disable(['image'])

export class MarkdownRenderer {
  constructor(options = {}) {
    this.options = {
      sanitize: options.sanitize ?? true,
      ...options
    }
  }

  render(markdown) {
    if (!markdown || typeof markdown !== 'string') return ''
    try {
      return md.render(markdown)
    } catch (error) {
      console.error('[MarkdownRenderer] Render error:', error)
      return this.escapeHtml(markdown)
    }
  }

  renderInline(markdown) {
    if (!markdown || typeof markdown !== 'string') return ''
    try {
      return md.renderInline(markdown)
    } catch (error) {
      console.error('[MarkdownRenderer] Inline render error:', error)
      return this.escapeHtml(markdown)
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.appendChild(document.createTextNode(text))
    return div.innerHTML
  }
}

export default new MarkdownRenderer()
