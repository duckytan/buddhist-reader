const fs = require('fs')
const path = require('path')

const DICTS_DIR = path.resolve(__dirname, '../public/dicts')
const MANIFEST_PATH = path.join(DICTS_DIR, 'manifest.json')
const DEFS_DIR = path.resolve(__dirname, '../public/dict-defs')

fs.mkdirSync(DEFS_DIR, { recursive: true })

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

for (const dict of manifest) {
  const dictPath = path.join(DICTS_DIR, dict.filename)
  if (!fs.existsSync(dictPath)) continue

  try {
    const data = JSON.parse(fs.readFileSync(dictPath, 'utf8'))
    const map = {}

    for (const entry of data.entries) {
      const term = entry.term.trim()
      if (term.length < 2) continue

      let definition = entry.definition
      if (Array.isArray(definition)) {
        definition = definition.map(item => {
          if (typeof item === 'string') return item
          if (item && item.c) return item.c
          return ''
        }).join('\n')
      } else if (typeof definition !== 'string') {
        definition = String(definition || '')
      }

      // Truncate to 300 chars for summary
      const summary = definition.length > 300 ? definition.slice(0, 300) + '...' : definition
      map[term] = summary
    }

    const outPath = path.join(DEFS_DIR, `${dict.id}.json`)
    fs.writeFileSync(outPath, JSON.stringify(map), 'utf8')
    console.log(`${dict.id}: ${Object.keys(map).length} entries → ${outPath}`)
  } catch (e) {
    console.warn(`Error: ${dict.filename}: ${e.message}`)
  }
}