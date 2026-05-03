const MALICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on(error|load|click|mouse|focus|blur|change)\s*=/i,
  /eval\s*\(/i,
  /document\s*\.\s*(cookie|write|location)/i,
  /window\s*\.\s*(location|open)/i,
  /import\s*\(/i,
  /require\s*\(/i
]

export function scanMdxContent(content) {
  const findings = []

  for (const pattern of MALICIOUS_PATTERNS) {
    const matches = content.match(pattern)
    if (matches) {
      findings.push({
        pattern: pattern.source,
        match: matches[0],
        severity: getSeverity(pattern)
      })
    }
  }

  return {
    safe: findings.length === 0,
    findings
  }
}

function getSeverity(pattern) {
  const highSeverities = ['<script', 'eval\\s*\\(', 'document\\s*\\.']
  for (const high of highSeverities) {
    if (pattern.source.includes(high)) return 'high'
  }
  return 'medium'
}

export function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:[^"']*/gi, '')
}
