const fs = require('fs')
const path = require('path')

const DICTS_DIR = path.resolve(__dirname, '../public/dicts')
const MANIFEST_PATH = path.join(DICTS_DIR, 'manifest.json')
const CHUNKS_DIR = path.resolve(__dirname, '../public/dict-chunks')

const CHUNK_SIZE = 500

fs.mkdirSync(CHUNKS_DIR, { recursive: true })

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

for (const dict of manifest) {
  const dictPath = path.join(DICTS_DIR, dict.filename)
  if (!fs.existsSync(dictPath)) continue

  try {
    const data = JSON.parse(fs.readFileSync(dictPath, 'utf8'))
    const validEntries = data.entries.filter(e => e.term.trim().length >= 2)

    for (let i = 0; i < validEntries.length; i += CHUNK_SIZE) {
      const chunk = validEntries.slice(i, i + CHUNK_SIZE)
      const chunkData = {}

      for (const entry of chunk) {
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

        chunkData[entry.term.trim()] = {
          definition,
          pinyin: entry.pinyin || '',
          category: entry.category || ''
        }
      }

      const chunkIndex = Math.floor(i / CHUNK_SIZE)
      const outPath = path.join(CHUNKS_DIR, `${dict.id}-${chunkIndex}.json`)
      fs.writeFileSync(outPath, JSON.stringify(chunkData), 'utf8')
    }

    const totalChunks = Math.ceil(validEntries.length / CHUNK_SIZE)
    const manifestOut = {
      id: dict.id,
      name: dict.name,
      totalChunks,
      entryCount: validEntries.length
    }
    fs.writeFileSync(
      path.join(CHUNKS_DIR, `${dict.id}-manifest.json`),
      JSON.stringify(manifestOut),
      'utf8'
    )
    console.log(`${dict.id}: ${validEntries.length} entries → ${totalChunks} chunks`)
  } catch (e) {
    console.warn(`Error: ${dict.filename}: ${e.message}`)
  }
}