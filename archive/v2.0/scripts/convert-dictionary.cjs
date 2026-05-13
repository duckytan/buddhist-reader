const fs = require('fs')

const INPUT_FILE = '/workspace/archive/v1.0/public/dictionary.json'
const OUTPUT_DIR = '/workspace/public/dicts'

function main() {
  console.log('读取 dictionary.json...')
  const content = fs.readFileSync(INPUT_FILE, 'utf-8')
  const data = JSON.parse(content)

  console.log(`总条目数: ${data.length}`)

  const byCategory = {}
  for (const item of data) {
    const cat = item.c || 'unknown'
    if (!byCategory[cat]) {
      byCategory[cat] = []
    }
    byCategory[cat].push({
      term: item.t || '',
      definition: item.d || '',
      pinyin: item.p || '',
      category: 'term'
    })
  }

  console.log(`分类数量: ${Object.keys(byCategory).length}`)

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  for (const [cat, entries] of Object.entries(byCategory)) {
    const output = {
      name: cat,
      version: '1.0',
      entries
    }
    const safeName = cat.replace(/[^\w\u4e00-\u9fa5]/g, '_')
    const outputPath = `${OUTPUT_DIR}/${safeName}.json`
    fs.writeFileSync(outputPath, JSON.stringify(output), 'utf-8')
    console.log(`  保存: ${outputPath} (${entries.length} 条)`)
  }

  console.log('\n完成!')
}

main()
