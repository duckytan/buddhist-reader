import Mdict from 'mdict-ts'
import fs from 'fs'
import path from 'path'

const MDX_DIR = '/workspace/archive/v1.0/mdict'
const OUTPUT_DIR = '/workspace/public/dicts'

async function parseMDX(filePath) {
  console.log(`解析中: ${filePath}`)

  let m = null

  try {
    m = new Mdict(filePath)

    let retries = 0
    const maxRetries = 100
    while (!m.KEY_INDEX && retries < maxRetries) {
      await new Promise(r => setTimeout(r, 100))
      retries++
    }

    if (!m.KEY_INDEX) {
      throw new Error('MDict 初始化失败')
    }

    await new Promise(r => setTimeout(r, 200))

    console.log(`  关键词块数: ${m.KEY_INDEX.length}`)

    const entries = []
    const keys = []

    for (const kdx of m.KEY_INDEX) {
      const block = await m.loadKeys(kdx)
      for (const item of block) {
        keys.push({ word: item.word, offset: item.offset })
      }
    }

    console.log(`  总词条数: ${keys.length}`)

    for (let i = 0; i < keys.length; i++) {
      const { word, offset } = keys[i]

      try {
        const def = await m.getDefinition(offset)
        const definition = typeof def === 'object' ? (def.text || JSON.stringify(def)) : String(def || '')

        entries.push({
          term: word,
          definition,
          pinyin: '',
          category: 'term'
        })
      } catch (e) {
        entries.push({
          term: word,
          definition: '',
          pinyin: '',
          category: 'term'
        })
      }

      if ((i + 1) % 2000 === 0) {
        console.log(`  进度: ${i + 1}/${keys.length}`)
      }
    }

    return entries
  } finally {
    if (m && m._readFD) {
      try { fs.closeSync(m._readFD) } catch (e) {}
    }
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const files = fs.readdirSync(MDX_DIR).filter(f => f.endsWith('.mdx'))

  for (const file of files) {
    const inputPath = path.join(MDX_DIR, file)
    const outputName = file.replace('.mdx', '.json')
    const outputPath = path.join(OUTPUT_DIR, outputName)

    if (fs.existsSync(outputPath)) {
      console.log(`\n跳过(已存在): ${file}`)
      continue
    }

    console.log(`\n处理: ${file}`)
    const startTime = Date.now()

    try {
      const entries = await parseMDX(inputPath)

      const output = {
        name: file.replace('.mdx', ''),
        version: '1.0',
        entries
      }

      fs.writeFileSync(outputPath, JSON.stringify(output), 'utf-8')
      console.log(`  保存: ${outputPath} (${(Date.now() - startTime) / 1000}s, ${entries.length} 条)`)
    } catch (error) {
      console.error(`  错误: ${error.message}`)
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n完成!')
}

main()
