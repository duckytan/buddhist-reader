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
  const cleaned = cleanDefinition(raw)
  const lines = cleaned.split('\n').filter(l => l.trim())
  return lines.join('\n')
}