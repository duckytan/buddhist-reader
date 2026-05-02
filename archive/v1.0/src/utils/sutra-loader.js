/**
 * 动态加载 TXT 经文
 * 支持从本地或远程 URL 加载经文文件
 */

/**
 * 从 URL 加载 TXT 经文
 * @param {string} url - 经文文件的 URL (本地路径或远程地址)
 * @returns {Promise<string>} 经文文本内容
 */
export async function loadSutraFromUrl(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load sutra: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    console.error('Error loading sutra:', error)
    throw error
  }
}

/**
 * 加载经文并格式化为章节内容
 * @param {string} url - 经文文件的 URL
 * @param {string} chapterTitle - 章节标题 (默认为"全文")
 * @returns {Promise<Object>} 章节对象 { title, content }
 */
export async function loadSutraChapter(url, chapterTitle = '全文') {
  const content = await loadSutraFromUrl(url)
  return {
    title: chapterTitle,
    content: content.trim()
  }
}

/**
 * 批量加载多章节经文
 * @param {Array<{ url: string, title: string }>} chapters - 章节数组
 * @returns {Promise<Array<{ title, content }>>} 章节数组
 */
export async function loadMultiChapterSutra(chapters) {
  const chapterPromises = chapters.map(chapter =>
    loadSutraChapter(chapter.url, chapter.title)
  )
  return await Promise.all(chapterPromises)
}

/**
 * 创建动态经文对象
 * @param {Object} sutraInfo - 经文基本信息
 * @param {string} sutraInfo.id - 经文 ID
 * @param {string} sutraInfo.title - 经文标题
 * @param {string} sutraInfo.fullName - 经文全名
 * @param {string} sutraInfo.translator - 译者
 * @param {string} sutraInfo.cover - 封面 emoji
 * @param {string} sutraInfo.description - 描述
 * @param {number} sutraInfo.wordCount - 字数
 * @param {Array<{ url: string, title: string }>} sutraInfo.chapters - 章节数据 (URL 和标题)
 * @returns {Promise<Object>} 完整的经文对象
 */
export async function createDynamicSutra(sutraInfo) {
  const chapters = await loadMultiChapterSutra(sutraInfo.chapters)
  
  return {
    id: sutraInfo.id,
    title: sutraInfo.title,
    fullName: sutraInfo.fullName,
    translator: sutraInfo.translator,
    cover: sutraInfo.cover,
    description: sutraInfo.description,
    wordCount: sutraInfo.wordCount,
    chapters
  }
}
