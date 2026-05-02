/**
 * 浏览器端 MDX 解析工具
 * 使用 mdict-ts 解析 MDX 文件为 JSON 格式
 */

import { Mdict } from 'mdict-ts'

/**
 * 解析 MDX 文件为 JSON 数组
 * @param {File} file - MDX 文件
 * @param {Function} onProgress - 进度回调 (current, total)
 * @returns {Promise<Array>} - 词条数组
 */
export async function parseMDX(file, onProgress) {
  try {
    // 将 File 对象转换为 ArrayBuffer
    const buffer = await file.arrayBuffer()
    
    // 使用 mdict-ts 解析
    const parser = new Mdict(buffer)
    await parser.load()
    
    // 获取所有词条
    const entries = []
    const keys = parser.keys()
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const definition = parser.lookup(key)
      
      entries.push({
        t: key,
        d: definition || '',
        p: '',
        s: '',
        c: ''
      })
      
      // 更新进度
      if (onProgress && (i + 1) % 1000 === 0) {
        onProgress(i + 1, keys.length)
      }
    }
    
    if (onProgress) {
      onProgress(keys.length, keys.length)
    }
    
    return entries
  } catch (error) {
    // mdict-ts 可能不支持某些格式的 MDX
    console.error('MDX parse error:', error)
    throw new Error('无法解析此 MDX 文件，请先使用 Python 脚本转换为 JSON 格式')
  }
}
