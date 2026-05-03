export class Highlighter {
  constructor(matcher) {
    this.matcher = matcher
    this.highlightColors = ['#FFF3CD', '#D1ECF1', '#D4EDDA', '#E2D5F1', '#FADBD8']
  }

  highlight(content, activeDictIds = []) {
    if (!content || !this.matcher) return content

    const segments = []
    let idx = 0

    while (idx < content.length) {
      const match = this.matcher.match(content, idx)

      if (match && this.hasActiveDict(match.dictIds, activeDictIds)) {
        segments.push({
          type: 'highlight',
          term: match.term,
          dictIds: match.dictIds,
          text: match.term
        })
        idx = match.endIdx + 1
      } else {
        segments.push({
          type: 'text',
          text: content[idx]
        })
        idx++
      }
    }

    return this.renderSegments(segments)
  }

  renderSegments(segments) {
    let html = ''
    let currentText = ''

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (seg.type === 'highlight') {
        if (currentText) {
          html += this.escapeHtml(currentText)
          currentText = ''
        }
        const color = this.getHighlightColor(seg.dictIds[0])
        const safeTerm = this.escapeHtml(seg.term)
        const safeDictIds = seg.dictIds.join(',')
        html += `<span class="dict-highlight" data-term="${safeTerm}" data-dict-ids="${safeDictIds}" style="background-color:${color};cursor:pointer;border-radius:2px;padding:0 2px;">${safeTerm}</span>`
      } else {
        currentText += seg.text
      }
    }

    if (currentText) {
      html += this.escapeHtml(currentText)
    }

    return html
  }

  hasActiveDict(dictIds, activeDictIds) {
    if (!activeDictIds || activeDictIds.length === 0) return true
    return dictIds.some(id => activeDictIds.includes(id))
  }

  getHighlightColor(dictId) {
    return this.highlightColors[dictId % this.highlightColors.length]
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.appendChild(document.createTextNode(text))
    return div.innerHTML
  }
}
