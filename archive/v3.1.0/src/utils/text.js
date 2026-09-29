export function extractDefinition(def) {
  if (typeof def === 'string') return def
  if (Array.isArray(def)) {
    return def.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && item.c) return item.c
      return ''
    }).join('\n')
  }
  if (def && typeof def === 'object' && def.c) return def.c
  return ''
}

export function cleanDefinition(raw) {
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

export function formatDefinition(raw) {
  const extracted = extractDefinition(raw)
  const cleaned = cleanDefinition(extracted)
  const lines = cleaned.split('\n').filter(l => l.trim())
  return lines.join('\n')
}