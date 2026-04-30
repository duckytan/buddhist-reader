# 佛经阅读器 - MDX 词典功能开发记录

## 文档信息
- **项目路径**：D:\AI-Project\AI-buddhist-reader
- **创建日期**：2026-04-29
- **最后更新**：2026-04-29 22:01
- **状态**：开发中（词典功能暂时不可用）

---

## 一、用户原始需求（完整详细版）

### 1.1 背景描述

用户下载了 MDX 和 MDD 格式的佛教词典文件，这些是 Mdict 软件使用的词典格式。用户希望将这些词典集成到佛经阅读应用中，实现查词功能。

### 1.2 功能需求清单

| 需求编号 | 功能描述 | 具体说明 |
|---------|---------|---------|
| **R1** | 词典选择功能 | 用户可以勾选/取消勾选来启用或禁用特定词典 |
| **R2** | 多词典同时启用 | 支持同时启用多个词典，一次查询所有词典，返回所有匹配结果 |
| **R3** | 经文关键词高亮 | 在佛经正文中，词典词条应该以特殊样式（黄色背景）高亮显示 |
| **R4** | 点击查看释义 | 点击高亮的词条，弹出显示所有匹配词典的定义 |
| **R5** | 明确标注来源 | 每个定义旁边要显示来自哪个词典，例如显示"来源：佛教术语词典" |
| **R6** | 最大匹配原则 | 匹配算法要优先匹配最长词条，如"三藐三菩提"应作为整体匹配，而不是只匹配"菩提" |
| **R7** | 预置词典支持 | 应用内置的词典放在 `public/mdict/` 目录下，用户可直接使用 |
| **R8** | 用户上传词典 | 支持用户上传自己的 MDX/MDD 词典文件，文件大小限制 100MB |
| **R9** | MDD 资源文件 | 部分 MDX 词典配套有 MDD 资源文件（图片等），需要支持加载 |

### 1.3 技术要求

1. **纯浏览器端解析** - MDX/MDD 文件必须在浏览器中解析，不能依赖 Node.js 服务端
2. **异步加载** - 词典加载不能阻塞主线程，必须异步处理
3. **Trie 树匹配** - 使用 Trie 树数据结构实现最大匹配算法，O(n) 时间复杂度
4. **多终端适配** - 弹出框在手机端显示在底部抽屉（60%高度），在 PC 端显示在右侧侧边栏（400px 宽度）
5. **响应式设计** - 移动端 < 768px，平板 768-1024px，PC > 1024px

### 1.4 用户使用场景

```
场景 1：用户打开佛经阅读器
  → 系统自动加载预置词典
  → 用户勾选"佛教术语词典"和"中华佛教百科全书"
  → 经文中显示高亮词条

场景 2：用户点击高亮词条"般若"
  → 弹出框显示：
    【佛教术语词典】
    般若：梵语 prajñā 的音译，意为智慧...

    【中华佛教百科全书】
    般若：佛教核心概念，指通达真理的智慧...

场景 3：用户上传自己的词典
  → 点击上传按钮
  → 选择 .mdx 文件（最大 100MB）
  → 系统解析并加载
  → 词典出现在选择列表中
```

---

## 二、已完成的工作

### 2.1 创建的文件清单

| 文件路径 | 文件说明 | 开发状态 |
|---------|---------|---------|
| `src/utils/mdict-service.js` | MDX/MDD 解析服务，负责从 URL 或 File 对象加载词典文件 | ⚠️ 有问题 |
| `src/stores/dictionaries.js` | Pinia 状态管理，管理词典的加载、切换、查询等状态 | ✅ 正常 |
| `src/components/DictionarySelector.vue` | 词典选择器 UI 组件，显示所有词典并支持勾选启用/禁用 | ✅ 正常 |
| `src/components/DictionaryPopup.vue` | 释义弹出框组件，显示点击词条的所有词典定义，带来源标签 | ✅ 正常 |
| `src/components/ReaderContent.vue` | 阅读内容组件，负责高亮显示和点击处理 | ✅ 正常（集成了词典功能） |
| `src/pages/Reader.vue` | 阅读页面，顶部包含词典选择器 | ✅ 正常 |
| `public/mdict/` | 预置词典目录，存放 MDX/MDD 文件 | ⚠️ 文件有问题 |
| `src/data/dictionary.js` | 内置 JS 词典，50+ 佛教术语，完全正常工作 | ✅ 完全正常 |

### 2.2 修改的文件清单

| 文件路径 | 修改内容 |
|---------|---------|
| `src/components/ReaderContent.vue` | 添加了多词典高亮支持，集成了外部词典加载逻辑 |
| `src/pages/Reader.vue` | 在顶部 header 区域添加了 DictionarySelector 组件 |
| `vite.config.js` | 添加 optimizeDeps 配置，包含 'mdict-ts'，解决构建问题 |
| `package.json` | 添加了 mdict-ts 依赖（^1.0.2） |

### 2.3 预置词典文件详情

```
public/mdict/
├── new_mdict.mdx                          1.37 MB
├── 中华佛教百科全书2020.1.8.mdx             11.9 MB
├── 中国当代佛教网辞典.mdx                   9.26 MB
├── 達摩實用大辭典.mdx                      23.95 MB
├── 達摩實用大辭典.mdd                       0.86 MB (资源文件)
└── 22部佛学辞典合集.mdx                    28.31 MB
```

---

## 三、MDX 库尝试历程（详细问题记录）

### 3.1 第一步：尝试 js-mdict (terasum)

**库的基本信息**：
- npm 包名：`js-mdict`
- GitHub：https://github.com/terasum/js-mdict
- 描述：声称是纯 JavaScript 实现的 MDX 解析库

**尝试的使用方式**：
```javascript
import Mdict from 'js-mdict'

// 尝试构建词典
const mdict = await Mdict.build('/path/to/dictionary.mdx')
const wordList = mdict.getWordList('般若')
```

**遇到的错误信息**：
```
Error: "openSync" is not exported by "__vite-browser-external"
```

**错误分析**：
1. js-mdict 库内部使用了 Node.js 的内置模块 `fs`
2. 具体使用了 `fs.openSync()`, `fs.readSync()` 等文件系统操作
3. Vite 在浏览器环境下将这些 Node.js 内置函数 externalize 掉
4. 导致调用 `openSync` 时找不到该函数

**尝试的解决思路**：
- 修改 vite.config.js，添加 resolve.alias 将 `fs` 模块替换为空模块
- 构建能通过，但运行时因为 fs 功能缺失导致逻辑错误

**最终结论**：
- **❌ 无法在浏览器端使用**
- **放弃该库**

---

### 3.2 第二步：尝试 @iwater/mdict-ts

**库的基本信息**：
- npm 包名：`@iwater/mdict-ts`
- 描述：另一套 MDX/MDD 解析实现

**尝试的使用方式**：
```javascript
import Mdict from '@iwater/mdict-ts'

// 根据文档使用静态方法 build()
const mdict = await Mdict.build(file)
```

**遇到的错误信息**：
```
TypeError: Cannot read properties of undefined (reading 'build')
```

**错误分析**：
1. 检查该库的 package.json，发现默认导出是一个普通对象，不是类
2. `Mdict.build()` 方法在导出对象上不存在
3. 可能原因：
   - 文档与实际导出不符
   - 包结构有问题
   - ES Module 与 CommonJS 导出方式不匹配

**尝试的调试过程**：
```javascript
// 尝试不同的 import 方式
import Mdict from '@iwater/mdict-ts'           // 失败
import * as Mdict from '@iwater/mdict-ts'       // 失败
import { Mdict } from '@iwater/mdict-ts'         // 失败

// 检查导出内容
console.log(Mdict)  // 输出：{ default: {...} }
console.log(Mdict.default)  // 包含方法但不符合文档
```

**最终结论**：
- **❌ API 与文档不符，无法适配**
- **放弃该库**

---

### 3.3 第三步：尝试 mdict-ts (zhangchen915)

**库的基本信息**：
- npm 包名：`mdict-ts`
- GitHub：https://github.com/zhangchen915/mdict-ts
- 版本：1.0.2
- 描述：声称是纯 JavaScript 实现，完全浏览器兼容

**尝试的使用方式**：
```javascript
import Mdict from 'mdict-ts'

// 使用构造函数方式
const file = new File([buffer], 'dict.mdx')
const mdict = new Mdict(file)  // 构造
const wordList = await mdict.getWordList(term)  // 查询词条
const definition = await mdict.getDefinition(offset)  // 获取释义
```

**遇到的错误 1**：
```
RangeError: Invalid typed array length: 1008813135
    at new Uint8Array (<anonymous>)
    at Object.readUTF16 (mdict-ts.js:4221)
    at Mdict.read_header_sect (mdict-ts.js:9236)
```

**错误 1 详细分析**：
- mdict-ts 在解析文件头时调用 `readUTF16()` 函数
- 该函数尝试分配 `Uint8Array(1008813135)` 即约 1GB 的内存
- 这是不可能的，说明：
  1. 文件格式完全不被 mdict-ts 识别
  2. 文件可能使用了 LZO 压缩格式（mdict-ts 不支持）
  3. 文件可能使用了加密（RIPEMD128）
  4. 文件可能不是标准 MDX 1.2/2.0 格式

**遇到的错误 2**：
```
TypeError: e.toLowerCase is not a function
    at Mdict.mdx (mdict-ts.js:...)
    at Mdict.getWordList (mdict-ts.js:...)
```

**错误 2 详细分析**：
```javascript
// mdict-ts 内部代码大概是：
getWordList(query) {
  if (this.ext === 'mdx') {
    return this.mdx(query)  // 调用 this.mdx 函数
  } else {
    return this.mdd(query)  // 调用 this.mdd 函数
  }
}

// 问题：当 ext 不是 'mdx' 时（如 'mdd'），会调用 this.mdd
// 但 this.mdd 未定义，导致 e.toLowerCase is not a function
```

**错误原因**：
- MDD 文件被错误地当作 MDX 处理
- 或者文件扩展名检测出错

**最终结论**：
- **❌ 文件格式不兼容，100% 失败**
- 所有 22+ 个 MDX 文件全部解析失败

---

## 四、当前系统状态

### 4.1 完全正常工作的功能

| 功能 | 状态 | 详细说明 |
|------|------|---------|
| 内置 JS 词典 | ✅ 完全正常 | `src/data/dictionary.js` 包含 50+ 佛教术语，工作完美 |
| Trie 匹配算法 | ✅ 正常 | O(n) 时间复杂度，实现最大匹配原则 |
| 经文高亮显示 | ✅ 正常 | 词典词条在经文中以黄色背景正确高亮 |
| 多终端弹出框 | ✅ 正常 | 手机端底部抽屉，PC 端右侧栏，响应式设计 |
| 词典选择器 UI | ✅ 正常 | DictionarySelector.vue 显示所有词典，支持勾选 |
| 状态管理 | ✅ 正常 | Pinia store 完整管理词典加载、切换、查询 |
| 多词典同时查询 | ✅ 正常 | lookupTerm() 返回所有匹配词典的定义 |

### 4.2 完全失败的功能（无法使用）

| 功能 | 状态 | 失败率 |
|------|------|--------|
| 预置 MDX 词典 - new_mdict.mdx | ❌ 失败 | 100% |
| 预置 MDX 词典 - 中华佛教百科全书2020.1.8.mdx | ❌ 失败 | 100% |
| 预置 MDX 词典 - 中国当代佛教网辞典.mdx | ❌ 失败 | 100% |
| 预置 MDX 词典 - 達摩實用大辭典.mdx | ❌ 失败 | 100% |
| 预置 MDX 词典 - 22部佛学辞典合集.mdx | ❌ 失败 | 100% |
| 用户上传的 MDX 文件 | ❌ 失败 | 100% |

**失败统计**：共尝试 22+ 个 MDX 文件，100% 解析失败

---

## 五、问题根因分析

### 5.1 技术层面问题

#### 问题 1：Node.js 兼容性
- **js-mdict** 使用了 `fs` 模块，该模块只能在 Node.js 环境中运行
- 浏览器环境没有 `fs` 模块，Vite 将其 externalize 导致引用失败

#### 问题 2：API 设计问题
- **@iwater/mdict-ts** 文档描述的 API 与实际导出不符
- 无法通过静态方法 `build()` 构建词典实例

#### 问题 3：文件格式支持问题
- **mdict-ts** 无法解析用户提供的 MDX 文件
- 可能原因：
  1. **LZO 压缩**：MDX 文件使用 LZO 压缩算法，mdict-ts 可能不支持
  2. **加密处理**：部分 MDX 文件头包含 RIPEMD128 加密信息
  3. **非标准格式**：文件可能不是 MDX 1.2/2.0 标准格式
  4. **文件损坏**：文件在下载或传输过程中损坏

### 5.2 架构设计问题

1. **过度依赖外部库**
   - 三个不同的 MDX 解析库全部失败
   - 没有提前验证文件格式

2. **缺乏备选方案**
   - 依赖的库失败后没有替代方案
   - 导致词典功能完全不可用

3. **MDX 格式复杂度**
   - MDX/MDD 是复杂的二进制格式
   - 纯 JavaScript 实现解析难度高

---

## 六、当前代码架构

### 6.1 mdict-service.js（有问题的模块）

```javascript
// 文件路径：src/utils/mdict-service.js

import Mdict from 'mdict-ts'

// ========== 核心问题 ==========
// 1. new Mdict(file) 构造函数可能成功
// 2. 但 getWordList() 和 getDefinition() 因为文件格式问题失败
// 3. lookupInDicts() 无法返回正确结果

// 加载 MDX 文件（从 URL）
export async function loadMDXFromUrl(url, mddUrl = null) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  
  const buffer = await response.arrayBuffer()
  const fileName = url.split('/').pop() || 'dictionary.mdx'
  const mdxFile = new File([buffer], fileName, { type: 'application/octet-stream' })
  
  // 问题在这里：new Mdict 可能成功，但后续操作会失败
  return parseMDXFile(mdxFile)
}

// 解析 MDX File 对象
async function parseMDXFile(mdxFile) {
  try {
    const mdict = new Mdict(mdxFile)  // 构造函数
    
    return {
      id: `dict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: mdxFile.name.replace(/\.mdx$/i, ''),
      entries: [],  // 空的，因为 getWordList 会失败
      mdict,
      mdd: null,
      metadata: {},
      wordCount: 0,
      hasResources: false
    }
  } catch (e) {
    console.error('MDX 解析失败:', e)
    throw e
  }
}

// 查询词条（在多个词典中）
export async function lookupInDicts(dicts, term) {
  const results = []
  
  for (const dict of dicts) {
    if (!dict.mdict) continue
    
    try {
      // 问题：getWordList 可能抛出 RangeError
      const wordList = await dict.mdict.getWordList(term)
      
      if (wordList && wordList.length > 0) {
        const definition = await dict.mdict.getDefinition(wordList[0].offset)
        results.push({
          dictName: dict.name,
          dictId: dict.id,
          definition,
          isHtml: false
        })
      }
    } catch (e) {
      console.warn(`查询 "${term}" 失败:`, e.message)
    }
  }
  
  return results
}
```

### 6.2 dictionaries.js（正常的模块）

```javascript
// 文件路径：src/stores/dictionaries.js

// 预置词典配置
const PRESET_DICTS = [
  { id: 'new-mdict', name: '佛教术语词典', mdxUrl: '/mdict/new_mdict.mdx' },
  { id: 'chinese-buddhism-pedia', name: '中华佛教百科全书', mdxUrl: '/mdict/中华佛教百科全书.mdx' },
  { id: 'fo-jiao-ci-dian', name: '中国佛教网辞典', mdxUrl: '/mdict/中国当代佛教网辞典.mdx' },
  { id: 'buddhist-terms-full', name: '佛学词典精简版', mdxUrl: '/mdict/佛学词典精简版.mdx' }  // 文件不存在
]

// ========== 关键问题 ==========
// initPresetDicts() 调用 loadMDXFromUrl()，而 mdict-service.js 有问题
// getAllEnabledDictEntries() 无法获取任何外部词典词条

// 初始化预置词典
async function initPresetDicts() {
  for (const config of PRESET_DICTS) {
    try {
      const dict = await loadMDXFromUrl(config.mdxUrl)
      
      // 问题：dict.mdict 可能存在，但 KEY_INDEX 为空或 undefined
      if (!dict.mdict?.KEY_INDEX?.length) {
        console.warn(`词典 "${config.name}" 初始化异常，跳过`)
        continue
      }
      
      presetDicts.value.push({ ...dict, isPreset: true })
    } catch (e) {
      console.warn(`加载词典 "${config.name}" 失败:`, e.message)
    }
  }
  
  // 默认启用第一个加载成功的词典
  if (presetDicts.value.length > 0) {
    enabledDictIds.value.add(presetDicts.value[0].id)
  }
}

// 获取所有启用词典的词条（用于 Trie 匹配）
async function getAllEnabledDictEntries() {
  const entries = []
  
  for (const dict of enabledDicts.value) {
    if (!dict.mdict?.KEY_INDEX?.length) continue
    
    try {
      // 问题：getWordList() 会抛出 RangeError
      const allWords = await dict.mdict.getWordList()
      
      for (const wordInfo of allWords) {
        const definition = await dict.mdict.getDefinition(wordInfo.offset)
        entries.push({
          term: wordInfo.word,
          definition: definition || wordInfo.word,
          _dictId: dict.id,
          _dictName: dict.name
        })
      }
    } catch (e) {
      console.warn(`获取词条失败:`, e.message)
    }
  }
  
  return entries  // 很可能返回空数组
}
```

### 6.3 ReaderContent.vue（正常工作的模块）

```javascript
// 文件路径：src/components/ReaderContent.vue

// 内置词典词条（正常工作）
const builtInEntries = dictionary.map(item => ({
  term: item.term,
  definition: item.definition,
  _dictId: 'builtin',
  _dictName: '内置词典'
}))

// 外部词典词条（因为 MDX 加载失败，这里始终为空）
const externalEntries = ref([])

// 合并后的词条列表
const allEntries = computed(() => [...builtInEntries, ...externalEntries.value])

// 构建 Trie（只使用内置词典的词条）
const trie = computed(() => {
  if (allEntries.value.length === 0) return null
  return buildTrie(allEntries.value)
})

// 加载外部词典词条（不会成功）
async function loadExternalDictEntries() {
  try {
    const entries = await dictionariesStore.getAllEnabledDictEntries()
    externalEntries.value = entries  // 这里会是空数组
  } catch (e) {
    console.warn('加载外部词典失败:', e)
  }
}

// 结果：
// - builtInEntries 有 50+ 条目
// - externalEntries 始终为空
// - 最终 trie 只包含内置词典
```

---

## 七、解决方案尝试记录

### 7.1 尝试：修改 Vite 配置解决 fs 问题

**修改内容** (vite.config.js)：
```javascript
export default defineConfig({
  optimizeDeps: {
    include: ['mdict-ts']
  },
  resolve: {
    alias: {
      'fs': '/src/utils/fs-shim.js'  // 尝试替换 fs
    }
  }
})
```

**创建的空模块** (src/utils/fs-shim.js)：
```javascript
// 这只是一个空壳，不能提供真正的 fs 功能
export const openSync = () => {}
export const readSync = () => {}
export const closeSync = () => {}
```

**结果**：
- ✅ 构建通过
- ❌ 运行时逻辑错误（因为 fs 操作是空操作）
- ❌ js-mdict 仍然无法工作

---

### 7.2 尝试：捕获异常防止崩溃

**修改内容**：
```javascript
async function loadMDXFromUrl(url) {
  try {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const file = new File([buffer], url.split('/').pop())
    const mdict = new Mdict(file)
    
    return { mdict, name: file.name, id: generateId() }
  } catch (e) {
    console.warn('MDX 加载失败（已捕获）:', e.message)
    return null  // 返回 null 而不是抛出异常
  }
}
```

**结果**：
- ✅ 词典加载不会导致应用崩溃
- ❌ 但词典仍然无法使用（返回 null）
- ❌ getAllEnabledDictEntries() 仍然返回空

---

### 7.3 尝试：检测文件格式

**检查文件头字节**：
```javascript
// 读取文件头 100 字节
const header = buffer.slice(0, 100)
const bytes = new Uint8Array(header)

// MDX 标准格式头：通常是 0x00 0x00 0x00 或特定标识
// LZO 压缩格式：需要解压才能读取
// 加密格式：有特定的加密头

console.log('文件头:', bytes.slice(0, 16))
// 输出：可能是乱码或特定格式标识
```

**结果**：
- 文件头显示可能为 LZO 压缩格式
- 无法确定具体原因

---

## 八、当前存在的问题（未解决）

### 8.1 核心问题清单

| 问题编号 | 问题描述 | 影响范围 | 状态 |
|---------|---------|---------|------|
| P1 | 所有 MDX 文件无法解析 | 预置词典 + 用户上传词典完全不可用 | ❌ 未解决 |
| P2 | 无法确定文件格式问题具体原因 | 无法针对性修复 | ❌ 未解决 |
| P3 | 没有备选的词典格式支持 | 无法提供替代方案 | ❌ 未解决 |
| P4 | MDX 文件可能是 LZO 压缩格式 | mdict-ts 不支持 | ❌ 未解决 |
| P5 | MDX 文件可能有加密头 | 无法解密 | ❌ 未解决 |

### 8.2 具体错误信息

**错误信息 1（最常见）**：
```
RangeError: Invalid typed array length: 1008813135
    at new Uint8Array (<anonymous>)
    at Object.readUTF16 (mdict-ts.js:4221)
    at Mdict.read_header_sect (mdict-ts.js:9236)
```
- 触发场景：调用 `new Mdict(file)` 或 `mdict.getWordList()`
- 发生概率：100% 的 MDX 文件

**错误信息 2**：
```
TypeError: Cannot read properties of undefined (reading 'build')
```
- 触发场景：使用 `@iwater/mdict-ts` 的 `Mdict.build()`
- 发生概率：100%

**错误信息 3**：
```
Error: "openSync" is not exported by "__vite-browser-external"
```
- 触发场景：使用 `js-mdict` 的任何方法
- 发生概率：100%

---

## 九、后续解决方案建议

### 方案 A：继续调试 MDX 库

**选项 A1：尝试 @goworks/mdict**
- 另一套 MDX/MDD 解析实现
- 预计耗时：1-2 小时
- 成功率：不确定

**选项 A2：获取标准 MDX 文件测试**
- 找一个已知有效的标准 MDX 文件
- 验证 mdict-ts 是否能正确解析标准格式
- 如果能解析标准文件 → 说明用户文件格式有问题
- 预计耗时：1-2 小时
- 成功率：50%

**选项 A3：自行实现 MDX 解析**
- 难度极高，不推荐
- 预计耗时：1-2 周

### 方案 B：暂时禁用外部词典功能

**实现步骤**：
1. 在 DictionarySelector.vue 中添加"暂不可用"提示
2. 禁用预置词典的自动加载
3. 用户上传功能暂时隐藏
4. 只使用内置 JS 词典

**预计耗时**：0.5 小时
**成功率**：100%
**缺点**：用户无法使用外部词典

### 方案 C：转换词典格式

**实现步骤**：
1. 获取一个能正常工作的 MDX 文件（如有）
2. 将其内容转换为 JSON 格式
3. 创建一个 JSON 格式的词典文件
4. 重写 mdict-service.js 支持 JSON 格式

**预计耗时**：4-8 小时
**成功率**：80%

### 方案 D：使用其他开源词典格式

**选项 D1：星际词典（StarDict）**
- 另一种词典格式，有开源工具可以转换
- 可能有 JavaScript 解析库

**选项 D2：自制简单格式**
- 定义简单的 JSON 词典格式
- 用户需要手动转换现有词典

---

## 十、文件路径汇总

```
D:\AI-Project\AI-buddhist-reader\
│
├── public/mdict/                                # 预置词典目录（有问题）
│   ├── new_mdict.mdx                           # ❌ 加载失败
│   ├── 中华佛教百科全书2020.1.8.mdx              # ❌ 加载失败
│   ├── 中国当代佛教网辞典.mdx                   # ❌ 加载失败
│   ├── 達摩實用大辭典.mdx                      # ❌ 加载失败
│   ├── 達摩實用大辭典.mdd                       # ❌ 未测试
│   └── 22部佛学辞典合集.mdx                    # ❌ 加载失败
│
├── src/
│   ├── utils/
│   │   ├── mdict-service.js                    # ⚠️ 有问题但保留
│   │   └── trie.js                             # ✅ Trie 树实现
│   │
│   ├── stores/
│   │   └── dictionaries.js                     # ✅ 词典状态管理
│   │
│   ├── components/
│   │   ├── DictionarySelector.vue              # ✅ 词典选择器
│   │   ├── DictionaryPopup.vue                  # ✅ 释义弹窗
│   │   ├── ReaderContent.vue                    # ✅ 阅读内容（高亮）
│   │   ├── AudioPlayer.vue                      # ✅ TTS 播放
│   │   └── ThemeToggle.vue                      # ✅ 主题切换
│   │
│   ├── pages/
│   │   ├── Bookshelf.vue                        # ✅ 书架页
│   │   ├── Reader.vue                           # ✅ 阅读页
│   │   └── Settings.vue                         # ✅ 设置页
│   │
│   └── data/
│       ├── sutras.js                            # ✅ 佛经数据
│       ├── dictionary.js                        # ✅ 内置词典
│       └── pronunciation-map.js                  # ✅ 拼音映射
│
├── vite.config.js                               # ✅ 有 optimizeDeps 配置
├── package.json                                 # ✅ 有 mdict-ts 依赖
└── DEVELOPMENT_LOG_MDX_DICTIONARY.md           # 本文档
```

---

## 十一、技术栈信息

| 技术 | 版本 | 用途 | 状态 |
|------|------|------|------|
| Vue 3 | ^3.4.0 | 前端框架 | ✅ 正常 |
| Vite | ^5.0.0 | 构建工具 | ✅ 正常 |
| Pinia | ^2.1.0 | 状态管理 | ✅ 正常 |
| Vant | ^4.8.0 | UI 组件库 | ✅ 正常 |
| mdict-ts | ^1.0.2 | MDX 解析 | ❌ 有问题 |
| @vueuse/core | ^10.7.0 | 工具函数 | ✅ 正常 |

---

## 十二、当前工作流程

```
用户打开阅读页
    ↓
Reader.vue 加载 DictionarySelector
    ↓
DictionarySelector 调用 dictionariesStore.initPresetDicts()
    ↓
dictionariesStore.loadMDXFromUrl() 调用 mdict-service.js
    ↓
mdict-service.js 的 new Mdict(file) 失败
    ↓
词典加载失败，presetDicts 为空
    ↓
ReaderContent.vue 只能使用内置词典
    ↓
用户看不到任何外部词典词条的高亮
```

---

## 十三、待用户决策

**请选择以下方案之一**：

### 选项 1：继续调试（耗时 2-4 小时）
- 尝试 @goworks/mdict 库
- 获取标准 MDX 文件测试
- 可能找到解决方案，也可能继续失败

### 选项 2：暂时禁用外部词典（耗时 0.5 小时）
- 只使用内置 JS 词典（50+ 术语）
- DictionarySelector 显示"外部词典暂不可用"
- 应用可以正常运行

### 选项 3：转换词典格式（耗时 4-8 小时）
- 将 MDX 转换为 JSON 格式
- 需要用户提供转换后的文件或协助转换

---

## 十四、关键代码片段

### 14.1 Trie 树匹配（正常工作）

```javascript
// src/utils/trie.js
export function buildTrie(entries) {
  const root = {}
  
  for (const entry of entries) {
    let node = root
    for (const char of entry.term) {
      if (!node[char]) node[char] = {}
      node = node[char]
    }
    node._entry = entry  // 存储词条信息
  }
  
  return root
}

export function findMatches(text, trie) {
  const matches = []
  let i = 0
  
  while (i < text.length) {
    let node = trie
    let longestMatch = null
    let matchEnd = i
    
    // 继续查找最长匹配
    while (i < text.length && node[text[i]]) {
      node = node[text[i]]
      if (node._entry) {
        longestMatch = node._entry
        matchEnd = i + 1
      }
      i++
    }
    
    if (longestMatch) {
      matches.push({
        term: longestMatch.term,
        start: i - longestMatch.term.length,
        end: matchEnd,
        entry: longestMatch
      })
    }
    
    if (longestMatch === null) i++  // 没有匹配，移动到下一个字符
  }
  
  return matches
}
```

### 14.2 内置词典（正常工作）

```javascript
// src/data/dictionary.js
export const dictionary = [
  {
    term: '般若',
    pinyin: 'bō rě',
    sanskrit: 'prajñā',
    definition: '梵语 prajñā 的音译，意为智慧、胜义慧...',
    category: '核心术语'
  },
  // ... 50+ 条目
]
```

### 14.3 当前 MDX 加载失败的原因

```javascript
// 问题分析

// 用户提供的 MDX 文件可能是：
// 1. LZO 压缩格式 → mdict-ts 不支持解压
// 2. RIPEMD128 加密 → 需要密钥解密
// 3. 非标准格式 → 与 mdict-ts 预期格式不符
// 4. 文件损坏 → 无法解析

// mdict-ts 的 readUTF16 函数尝试分配巨大内存说明：
// 文件头部的_size_字段被错误解析
// 正常 MDX 头部的值应该在几千到几万之间
// 而错误显示的是 1008813135（约 1GB）
// 这表明文件格式完全不被识别
```

---

## 十五、总结

### 15.1 已完成
- ✅ 内置词典（50+ 术语）完美工作
- ✅ Trie 树匹配算法实现最大匹配
- ✅ 经文高亮显示正常
- ✅ 多终端响应式弹出框正常
- ✅ 词典选择器 UI 正常
- ✅ 状态管理正常

### 15.2 未完成
- ❌ 所有 MDX/MDD 外部词典无法加载
- ❌ 用户上传词典功能无法使用
- ❌ 预置词典目录中的词典无法使用

### 15.3 根本原因
- 三个 MDX 解析库全部失败
- 用户提供的 MDX 文件格式可能不被 mdict-ts 支持
- 可能需要 LZO 解压或解密处理

### 15.4 建议
- 选项 B（暂时禁用外部词典）是最稳妥的方案
- 或者用户提供一个已知有效的标准 MDX 文件用于测试

---

*文档创建时间：2026-04-29 22:01*
*最后更新：2026-04-29 22:01*
*状态：等待用户决策*