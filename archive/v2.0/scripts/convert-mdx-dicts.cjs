const fs = require('fs')
const path = require('path')
const { Mdict } = require('mdict-ts')

const MDX_DIR = './archive/v1.0/mdict'
const OUTPUT_DIR = './public/dicts'

async function parseMDX(filePath) {
  console.log(`解析中: ${filePath}`)
  const buffer = fs.readFileSync(filePath)
  const parser = new Mdict(buffer)
  await parser.load()

  const keys = parser.keys()
  const entries = []

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    let definition = parser.lookup(key)

    if (typeof definition === 'object' && definition !== null) {
      definition = definition.text || JSON.stringify(definition)
    } else if (definition === null || definition === undefined) {
      definition = ''
    }

    entries.push({
      term: key,
      definition: String(definition),
      pinyin: '',
      category: 'term'
    })

    if ((i + 1) % 5000 === 0) {
      console.log(`  进度: ${i + 1}/${keys.length}`)
    }
  }

  console.log(`  完成: ${entries.length} 条词条`)
  return entries
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
      console.log(`  保存: ${outputPath} (${(Date.now() - startTime) / 1000}s)`)
    } catch (error) {
      console.error(`  错误: ${error.message}`)
    }
  }

  console.log('\n完成!')
}

main()
