/**
 * MDX/MDD 词典服务
 * 基于 mdict-ts 实现，纯 JavaScript 实现，浏览器兼容
 */

import Mdict from 'mdict-ts'

// 文件大小限制: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024

/**
 * 验证 MDX 文件
 * @param {File} file
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export function validateMDXFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ valid: false, error: '未选择文件' })
      return
    }

    const extension = file.name.toLowerCase().split('.').pop()
    if (extension !== 'mdx') {
      resolve({ valid: false, error: '仅支持 .mdx 格式文件' })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      resolve({ valid: false, error: `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB` })
      return
    }

    resolve({ valid: true })
  })
}

/**
 * 从 URL 加载预置 MDX 文件
 * @param {string} url - MDX 文件的 URL
 * @param {string} mddUrl - 可选的 MDD 文件 URL
 * @returns {Promise<DictData>}
 */
export async function loadMDXFromUrl(url) {
  // 加载 MDX 文件
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load MDX: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  
  // 创建 File 对象
  const fileName = url.split('/').pop() || 'dictionary.mdx'
  const mdxFile = new File([buffer], fileName, { type: 'application/octet-stream' })

  return parseMDXFile(mdxFile)
}

/**
 * 从 File 对象加载用户上传的 MDX
 * @param {File} mdxFile - MDX File 对象
 * @returns {Promise<DictData>}
 */
export async function loadMDXFromFile(mdxFile) {
  const validation = await validateMDXFile(mdxFile)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  return parseMDXFile(mdxFile)
}

/**
 * 解析 MDX File
 * mdict-ts 使用 new Mdict(file) 构造，初始化是异步的
 * @param {File} mdxFile
 * @returns {Promise<DictData>}
 */
async function parseMDXFile(mdxFile) {
  // 使用 new Mdict(file) 构造，初始化是异步的
  const mdict = new Mdict(mdxFile)
  
  // mdict-ts 通过 getWordList 和 getDefinition 查询
  // 词条列表为空，查询时动态获取
  const entries = []

  return {
    id: `dict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: mdxFile.name.replace(/\.mdx$/i, ''),
    entries,
    mdict,
    mdd: null,
    metadata: {},
    wordCount: 0,
    hasResources: false
  }
}

/**
 * 在一个或多个词典中查询词条
 * @param {Array<{ mdict: Mdict, name: string, id: string }>} dicts
 * @param {string} term - 要查询的词条
 * @returns {Promise<Array<{ dictName, dictId, definition, isHtml }>>}
 */
export async function lookupInDicts(dicts, term) {
  const results = []

  for (const dict of dicts) {
    if (!dict.mdict) continue

    try {
      // mdict-ts 使用 getWordList 查找词条
      const wordList = await dict.mdict.getWordList(term)
      
      if (wordList && wordList.length > 0) {
        // 获取第一个匹配词条的释义
        const firstMatch = wordList[0]
        const definition = await dict.mdict.getDefinition(firstMatch.offset)
        
        results.push({
          dictName: dict.name,
          dictId: dict.id,
          definition: definition,
          isHtml: false // mdict-ts 返回纯文本
        })
      }
    } catch (e) {
      console.warn(`Lookup failed for "${term}" in ${dict.name}:`, e)
    }
  }

  return results
}

/**
 * 在 MDD 中查找资源
 * @param {MDD} mdd - MDD 实例
 * @param {string} path - 资源路径，如 \images\xxx.png
 * @returns {Promise<string|null>} - 资源数据
 */
export async function lookupInMdd(mdd, path) {
  if (!mdd) return null

  try {
    // js-mdict 的 MDD.locate 返回资源数据
    const normalizedPath = path.startsWith('\\') ? path : '\\' + path
    const result = mdd.locate(normalizedPath)
    return result
  } catch (e) {
    return null
  }
}
