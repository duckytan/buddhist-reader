const fs = require('fs')
const path = require('path')

const SUTRAS_DIR = './temp-sutras'
const OUTPUT_DIR = './public/sutras'

function extractTitle(filename) {
  let name = filename.replace('.txt', '')
  name = name.replace('《', '').replace('》', '')
  return name
}

function detectCategory(title) {
  if (title.includes('心经') || title.includes('金刚') || title.includes('般若')) return 'prajna'
  if (title.includes('大乘起信') || title.includes('八识')) return 'yogacara'
  if (title.includes('禅')) return 'chan'
  if (title.includes('密') || title.includes('咒') || title.includes('陀罗尼')) return 'mantra'
  if (title.includes('传记')) return 'biography'
  return 'general'
}

function splitChapters(content) {
  const lines = content.split('\n')
  const chapters = []
  let currentChapter = { title: '全文', content: [] }
  
  const chapterPattern = /^第[一二三四五六七八九十\d]+章/
  const sectionPattern = /^(释题|开经|结经|目录|序|附说|第[一二三四五六七八九十\d]+部分)/
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (chapterPattern.test(trimmed) || sectionPattern.test(trimmed)) {
      if (currentChapter.content.length > 5) {
        chapters.push({
          title: currentChapter.title,
          content: currentChapter.content.join('\n').trim()
        })
      }
      currentChapter = { title: trimmed, content: [] }
    } else if (trimmed) {
      currentChapter.content.push(line)
    }
  }
  
  if (currentChapter.content.length > 5) {
    chapters.push({
      title: currentChapter.title,
      content: currentChapter.content.join('\n').trim()
    })
  }
  
  if (chapters.length === 0) {
    chapters.push({
      title: '全文',
      content: content.trim()
    })
  }
  
  return chapters
}

function countChars(chapters) {
  let total = 0
  for (const ch of chapters) {
    total += ch.content.replace(/\s/g, '').length
  }
  return total
}

function processFile(filepath) {
  const filename = path.basename(filepath)
  const title = extractTitle(filename)
  const content = fs.readFileSync(filepath, 'utf-8')
  
  const chapters = splitChapters(content)
  const totalChars = countChars(chapters)
  
  return {
    title,
    author: '冯达庵',
    category: detectCategory(title),
    chapters,
    chapterCount: chapters.length,
    totalChars,
    description: content.substring(0, 200).trim()
  }
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  
  const sutras = []
  const manifest = []
  
  const files = fs.readdirSync(SUTRAS_DIR).filter(f => f.endsWith('.txt')).sort()
  
  for (const filename of files) {
    const filepath = path.join(SUTRAS_DIR, filename)
    console.log(`处理: ${filename}`)
    
    const sutraData = processFile(filepath)
    sutras.push(sutraData)
    
    manifest.push({
      title: sutraData.title,
      filename: filename.replace('.txt', '.json'),
      author: sutraData.author,
      category: sutraData.category,
      chapterCount: sutraData.chapterCount,
      totalChars: sutraData.totalChars,
      description: sutraData.description.substring(0, 100) + '...'
    })
    
    const outputFile = path.join(OUTPUT_DIR, filename.replace('.txt', '.json'))
    fs.writeFileSync(outputFile, JSON.stringify(sutraData, null, 2), 'utf-8')
  }
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  
  console.log(`\n完成！共处理 ${sutras.length} 部经论`)
  console.log(`输出目录: ${OUTPUT_DIR}`)
}

main()
