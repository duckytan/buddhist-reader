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

function splitChaptersAndParagraphs(content) {
  const lines = content.split('\n')
  const chapters = []
  let currentChapter = { title: '全文', paragraphs: [], paraIndex: 1 }
  
  const chapterPattern = /^第 [一二三四五六七八九十\d]+章/
  const sectionPattern = /^(释题 | 开经 | 结经 | 目录 | 序 | 附说 | 第 [一二三四五六七八九十\d]+部分)/
  
  function finalizeChapter() {
    if (currentChapter.paragraphs.length > 0) {
      chapters.push({
        title: currentChapter.title,
        paragraphs: currentChapter.paragraphs
      })
    }
  }
  
  function addParagraph(text) {
    const trimmed = text.trim()
    if (trimmed) {
      currentChapter.paragraphs.push({
        id: `p${currentChapter.paraIndex++}`,
        text: trimmed
      })
    }
  }
  
  let currentParaLines = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // 检查是否是章节标题
    if (chapterPattern.test(trimmed) || sectionPattern.test(trimmed)) {
      // 保存当前段落到当前章节
      if (currentParaLines.length > 0) {
        addParagraph(currentParaLines.join(' '))
        currentParaLines = []
      }
      // 保存当前章节
      finalizeChapter()
      // 开始新章节
      currentChapter = { title: trimmed, paragraphs: [], paraIndex: 1 }
    } else if (!trimmed) {
      // 空行，表示段落结束
      if (currentParaLines.length > 0) {
        addParagraph(currentParaLines.join(' '))
        currentParaLines = []
      }
    } else {
      // 普通文本行，添加到当前段落
      currentParaLines.push(trimmed)
    }
  }
  
  // 处理最后的段落和章节
  if (currentParaLines.length > 0) {
    addParagraph(currentParaLines.join(' '))
  }
  finalizeChapter()
  
  if (chapters.length === 0) {
    chapters.push({
      title: '全文',
      paragraphs: []
    })
  }
  
  return chapters
}

function processFile(filepath) {
  const filename = path.basename(filepath)
  const title = extractTitle(filename)
  const content = fs.readFileSync(filepath, 'utf-8')
  
  const chapters = splitChaptersAndParagraphs(content)
  
  // 计算总段落数和总字数
  const totalParagraphs = chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)
  const totalChars = chapters.reduce((sum, ch) => {
    return sum + ch.paragraphs.reduce((s, p) => s + p.text.replace(/\s/g, '').length, 0)
  }, 0)
  
  return {
    title,
    author: '冯达庵',
    category: detectCategory(title),
    chapters,
    chapterCount: chapters.length,
    totalParagraphs,
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
  
  let idx = 1
  
  for (const filename of files) {
    const filepath = path.join(SUTRAS_DIR, filename)
    console.log(`处理：${filename}`)
    
    const sutraData = processFile(filepath)
    const asciiName = `sutra-${String(idx).padStart(2, '0')}.json`
    sutraData.filename = asciiName
    sutras.push(sutraData)
    
    manifest.push({
      title: sutraData.title,
      filename: asciiName,
      author: sutraData.author,
      category: sutraData.category,
      chapterCount: sutraData.chapterCount,
      totalParagraphs: sutraData.totalParagraphs,
      totalChars: sutraData.totalChars,
      description: sutraData.description.substring(0, 100) + '...'
    })
    
    const outputFile = path.join(OUTPUT_DIR, asciiName)
    fs.writeFileSync(outputFile, JSON.stringify(sutraData, null, 2), 'utf-8')
    idx++
  }
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )
  
  console.log(`\n完成！共处理 ${sutras.length} 部经论`)
  console.log(`输出目录：${OUTPUT_DIR}`)
  
  // 统计
  const totalParas = sutras.reduce((sum, s) => sum + s.totalParagraphs, 0)
  const totalChars = sutras.reduce((sum, s) => sum + s.totalChars, 0)
  console.log(`\n总计:`)
  console.log(`  段落数：${totalParas.toLocaleString()}`)
  console.log(`  字数：${totalChars.toLocaleString()}`)
}

main()
