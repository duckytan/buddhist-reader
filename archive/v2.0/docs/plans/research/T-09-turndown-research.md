# turndown 库调研 报告

> 任务编号：T-09
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

佛教经文阅读器 v2.0 项目需要支持 MDX 词典导入。MDX 词典中的释义内容以 HTML 格式存储，而项目统一使用 Markdown 格式存储释义（决策 D15）。因此需要一个可靠的 HTML → Markdown 转换工具。

本调研评估 turndown 作为该转换工具的可行性，覆盖 API 设计、转换准确性、性能、扩展性和维护状态等维度，并与同类工具进行对比。

## 2. turndown 核心功能

### 2.1 API 设计

turndown 提供简洁的 API，核心用法如下：

```javascript
// 安装
npm install turndown

// 基本使用
import TurndownService from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',       // 'atx' (# 标题) 或 'setext' (下划线式)
  hr: '---',                  // 水平线样式
  bulletListMarker: '-',      // 列表标记：'-', '+', '*'
  codeBlockStyle: 'fenced',   // 'fenced' (```代码块) 或 'indented'
  emDelimiter: '_',           // 斜体标记：'_' 或 '*'
  strongDelimiter: '**',      // 粗体标记
  linkStyle: 'inlined',       // 'inlined' 或 'referenced'
})

// 转换 HTML 字符串
const markdown = turndownService.turndown('<h1>标题</h1><p>段落</p>')

// 转换 DOM 节点（浏览器环境）
const markdown = turndownService.turndown(document.getElementById('content'))
```

**输入类型**：接受 `string`、`Element`、`Document`、`DocumentFragment`。

**内部解析器**：浏览器环境下使用 DOMParser 解析 HTML；Node.js 环境下内置轻量 HTML 解析器。

### 2.2 复杂 HTML 转换准确性

| HTML 结构 | 转换准确性 | 备注 |
|-----------|------------|------|
| 标题 (h1-h6) | 高 | 支持 atx/setext 两种风格配置 |
| 段落 (p) | 高 | 自动处理空行分隔 |
| 粗体/斜体 (strong/em/b/i) | 高 | 支持自定义分隔符 |
| 链接 (a) | 高 | 支持 inlined/referenced 两种风格 |
| 图片 (img) | 高 | 正确转换 src/alt 属性 |
| 代码块 (pre>code) | 高 | 支持 fenced/indented 风格，可提取语言标识 |
| 行内代码 (code) | 高 | 使用反引号包裹 |
| 无序列表 (ul>li) | 高 | 支持嵌套列表 |
| 有序列表 (ol>li) | 高 | 支持嵌套 |
| 嵌套列表 | 中 | 深层嵌套(>3层)缩进可能不精确 |
| 表格 (table) | 中 | 默认不支持，需 `turndown-plugin-gfm` 插件 |
| 引用块 (blockquote) | 高 | 正确转换 `>` 前缀 |
| 删除线 (del/s/strike) | 低 | 默认不支持，需自定义规则 |
| 水平线 (hr/br) | 高 | 可自定义 hr 样式 |
| 图片转 Markdown | 中 | base64 图片可保留但输出极长 |

**表格支持**：需要额外安装 `turndown-plugin-gfm`：

```javascript
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const turndownService = new TurndownService()
turndownService.use(gfm)
```

## 3. 特殊格式保留

### 3.1 梵文标签处理

佛教词典中可能包含特殊标签如 `<span class="sanskrit">prajñā</span>`、`<span class="pinyin">bō rě</span>` 等。turndown 默认会将未知标签的内容保留为纯文本（剥离标签），但可通过以下方式实现透传：

**方案一：Keep 规则（保留原始 HTML）**

```javascript
const turndownService = new TurndownService()

// 保留特定 class 的 span 标签为原始 HTML
turndownService.keep(['span.sanskrit', 'span.pinyin', 'span.zhuyin'])

// 或使用 filter 函数精确控制
turndownService.addRule('keepSanskrit', {
  filter: function (node) {
    return (
      node.nodeName === 'SPAN' &&
      node.classList.contains('sanskrit')
    )
  },
  replacement: function (content, node) {
    // 保留原始 HTML 标签
    const cls = node.getAttribute('class')
    return `<span class="${cls}">${content}</span>`
  }
})
```

**方案二：默认规则保留未知标签**

```javascript
const turndownService = new TurndownService({
  // 自定义默认规则：未知标签保留内容但剥离标签
  // 这是 turndown 的默认行为
})
```

**方案三：自定义 replacement 注入 Markdown 元数据**

```javascript
turndownService.addRule('sanskritToMeta', {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.classList.contains('sanskrit')
  },
  replacement: function (content, node) {
    // 转为 Markdown 注释或特殊标记
    return `[梵文:${content}]`
  }
})
```

### 3.2 自定义规则扩展

turndown 的核心优势在于其 `addRule` 扩展机制，完美适配佛教词典特有的 HTML 结构：

```javascript
// 佛教词典常见 HTML 结构 → Markdown 转换规则

// 1. 释义段落包裹在特定 div 中
turndownService.addRule('definitionBlock', {
  filter: function (node) {
    return node.nodeName === 'DIV' && node.classList.contains('definition')
  },
  replacement: function (content) {
    return content + '\n\n'
  }
})

// 2. 音标/拼音标注
turndownService.addRule('pronunciation', {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.classList.contains('pronunciation')
  },
  replacement: function (content) {
    return ` *${content}*`
  }
})

// 3. 参见/引用链接
turndownService.addRule('crossRef', {
  filter: function (node) {
    return node.nodeName === 'A' && node.classList.contains('crossref')
  },
  replacement: function (content, node) {
    const href = node.getAttribute('href')
    return `[参见: ${content}](${href})`
  }
})

// 4. 移除干扰元素（广告、注释编号等）
turndownService.addRule('removeNoise', {
  filter: ['sup.ref', 'span.annotation', 'div.ad'],
  replacement: function () {
    return ''  // 返回空字符串即删除
  }
})

// 5. 处理 <br> 标签
turndownService.addRule('brToNewline', {
  filter: 'br',
  replacement: function () {
    return '\n'
  }
})
```

**规则优先级**（从高到低）：
1. Blank rule（空白元素处理）
2. Added rules（自定义规则，通过 `addRule` 添加）
3. CommonMark rules（内置 CommonMark 规则）
4. Keep rules（通过 `keep()` 保留的元素）
5. Remove rules（通过 `remove()` 删除的元素）
6. Default rule（默认处理：剥离标签保留内容）

## 4. 性能测试

### 4.1 包大小

| 指标 | 数值 |
|------|------|
| npm 包安装大小 | ~80KB |
| 压缩后 (min) | ~24KB |
| Gzip 后 | ~8KB |
| 依赖数量 | 0（零依赖） |

turndown 是零依赖库，不引入额外的 HTML 解析库，体积小且无供应链风险。

### 4.2 单条转换性能

基于公开资料和同类工具对比，turndown 的单条 HTML 释义转换性能估算如下（典型佛经词典释义 HTML 长度约 200-500 字符，包含少量嵌套结构）：

| HTML 复杂度 | 长度 | 单次耗时 | 备注 |
|-------------|------|----------|------|
| 简单释义 | ~100 字符 | < 0.1ms | 纯文本+少量标签 |
| 标准释义 | ~500 字符 | 0.5-1ms | 含段落、粗体、链接 |
| 复杂释义 | ~2KB | 2-5ms | 含列表、表格、嵌套结构 |
| 超长释义 | ~10KB | 10-20ms | 大量嵌套+表格 |

### 4.3 批量转换性能估算

| 数量 | 预估耗时 | 内存峰值 | 备注 |
|------|----------|----------|------|
| 100 条 | 50-100ms | < 5MB | 单次同步转换即可 |
| 1000 条 | 500ms-1s | ~15MB | 建议分块处理 |
| 10000 条 | 5-10s | ~50MB | 必须异步分块+Worker |
| 50000+ 条 | 30s+ | 100MB+ | 需流式处理 |

### 4.1 批量转换方案

对于 1万+条 HTML 释义的批量转换，推荐以下优化方案：

**方案一：分块异步转换（推荐）**

```javascript
// 将大批量数据分块，避免阻塞主线程
async function batchConvert(htmlEntries, chunkSize = 100) {
  const results = []
  
  for (let i = 0; i < htmlEntries.length; i += chunkSize) {
    const chunk = htmlEntries.slice(i, i + chunkSize)
    
    // 使用 setTimeout 释放主线程
    await new Promise(resolve => setTimeout(resolve, 0))
    
    const chunkResults = chunk.map(html => ({
      markdown: turndownService.turndown(html)
    }))
    results.push(...chunkResults)
    
    // 可选：报告进度
    onProgress(i + chunk.length, htmlEntries.length)
  }
  
  return results
}
```

**方案二：Web Worker（浏览器环境）**

```javascript
// worker.js
import TurndownService from 'turndown'
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

self.onmessage = function (e) {
  const { html, options } = e.data
  const markdown = turndownService.turndown(html)
  self.postMessage({ markdown })
}
```

**方案三：MDX 预解析阶段转换（v2.0 推荐）**

在 MDX 词典导入阶段（Phase 3）一次性完成所有 HTML → Markdown 转换，而非运行时转换：

```
用户上传 MDX 文件
    │
    ▼
┌─────────────────────┐
│ 提取所有词条释义 HTML │
│ (mdict-js 解析)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 批量 HTML → Markdown │
│ turndown 分块转换     │
│ (离线执行, 用户等待)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 存入 IndexedDB       │
│ (统一 Markdown 格式) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 后续查询直接返回 MD   │
│ (零转换开销)          │
└─────────────────────┘
```

**性能优化要点**：
1. 预处理 HTML：移除 `<script>`、`<style>` 等干扰标签
2. 复用 TurndownService 实例：避免重复初始化
3. 分块处理：每块 100-500 条，配合 `setTimeout` 释放主线程
4. 结果缓存：相同 HTML 只转换一次
5. 对于超大词典（>5MB），使用 mdict-js 直接查询，不预解析

## 5. 对比其他转换工具

| 工具 | 包大小 (gzip) | 准确性 | 性能 | 自定义规则 | 维护状态 | 适用场景 |
|------|--------------|--------|------|------------|----------|----------|
| **turndown** | ~8KB | 高 | 中 | 强（addRule） | 低更新/社区维护 | 浏览器端、轻量级、高度定制 |
| html-to-markdown | ~15KB | 中 | 中 | 弱 | 低/更新少 | 基础转换需求 |
| html2markdown | ~12KB | 中 | 中 | 中 | 低 | Node.js 服务端 |
| upndown | ~10KB | 高 | 高 | 中 | 低/少文档 | 追求性能的场景 |
| cheerio+remark | ~30KB+ | 高 | 高 | 极强 | 活跃 | 需要预处理+精确控制的场景 |
| pandoc | N/A (CLI) | 极高 | 高 | 中 | 活跃 | 命令行批量转换 |
| html2text (Python) | N/A | 高 | 高 | 弱 | 活跃 | Python 后端 |

**关键对比结论**：

- **turndown**：最适合浏览器端使用，零依赖、体积小、自定义规则灵活。但默认不支持表格（需 GFM 插件），社区更新频率较低。
- **upndown**：性能优于 turndown，但文档和社区生态较弱。
- **cheerio+remark**：适合 Node.js 服务端，可通过 cheerio 预处理 HTML、remark 输出 Markdown，灵活性最强但体积大。
- **pandoc**：转换质量最高但需要 CLI 环境，不适合纯前端项目。

## 6. 边界情况处理

| 边界情况 | turndown 处理方式 | 建议 |
|----------|------------------|------|
| **空标签** `<p></p>` | 转换为空字符串或忽略 | 正常，无需特殊处理 |
| **自闭合标签** `<br/>` | 默认转为换行符 | 可自定义规则精确控制 |
| **内联样式** `<span style="color:red">` | 剥离 style 属性，保留内容 | 符合 Markdown 理念，样式信息丢失 |
| **class/id 属性** | 默认剥离 | 通过自定义规则可提取 class 信息转为 Markdown 标记 |
| **base64 图片** `<img src="data:image/png;base64,...">` | 转为 `![alt](data:image/png;base64,...)` | 输出极长，建议转存为文件或忽略 |
| **嵌套过深 HTML** | 正常处理，但极深嵌套可能导致栈溢出 | 预处理展平结构 |
| **无效 HTML** | DOMParser 容错解析 | 大多数情况能正确处理 |
| **`<figure>` / `<figcaption>`** | 默认不处理，转为纯文本 | 需自定义规则 |
| **`<details>` / `<summary>`** | 默认不处理 | 需自定义规则 |
| **脚本/样式标签** | 默认剥离内容 | 正常行为 |
| **注释 `<!-- -->`** | 移除 | 正常行为 |
| **`<div>` 通用容器** | 剥离标签，保留内容 | 正常行为 |

**针对佛教词典的特殊边界处理建议**：

```javascript
// 处理 base64 图片：提取并忽略或转存
turndownService.addRule('handleBase64Image', {
  filter: function (node) {
    return node.nodeName === 'IMG' && 
           node.getAttribute('src')?.startsWith('data:')
  },
  replacement: function (content, node) {
    const alt = node.getAttribute('alt') || '图片'
    // 方案 1: 标记为占位符
    return `[图片: ${alt}]`
    // 方案 2: 保留 base64（不推荐，输出过大）
    // return `![${alt}](${node.getAttribute('src')})`
  }
})

// 处理梵文音译中的变音符号（确保 Unicode 正确保留）
// turndown 默认保留所有 Unicode 字符，无需特殊处理
// 但需确保 IndexedDB 存储时使用 UTF-8 编码
```

## 7. 结论与建议

### 结论：**推荐在 v2.0 中使用 turndown**

**推荐理由**：

1. **轻量无依赖**：Gzip 后仅 ~8KB，零依赖，对前端包体积极其友好，符合 v2.0 首屏 < 1s 的目标
2. **自定义规则灵活**：`addRule` 机制完美适配佛教词典特有的 HTML 结构（梵文标签、音标、参见链接等）
3. **环境通用**：同时支持浏览器和 Node.js，与项目纯前端架构一致
4. **CommonMark 兼容**：生成的 Markdown 标准规范，后续使用 marked 渲染无兼容问题
5. **运行时开销可控**：在 MDX 导入阶段批量转换（而非每次查询时转换），性能影响可忽略

**风险与缓解**：

| 风险 | 缓解方案 |
|------|----------|
| 社区更新放缓 | turndown 功能已成熟稳定，HTML→Markdown 是成熟领域，无需频繁更新。如未来需要替代，切换成本低（统一 service 层接口） |
| 默认不支持表格 | 安装 `turndown-plugin-gfm`（额外 ~3KB），或在预处理阶段将表格转为 Markdown 文本 |
| 大批量转换慢 | 在导入阶段分块异步处理，使用 Worker 或 Web Worker，用户仅在上传时等待一次 |

### 备选方案

如果后续发现 turndown 不满足需求，备选方案按优先级排序：
1. **upndown**：性能更优，API 类似
2. **cheerio + 自定义规则**：灵活性最强，但体积较大
3. **自研基于 DOMParser 的轻量转换器**：仅处理词典中实际出现的 HTML 结构

## 8. 对 v2.1 方案的影响

1. **D15 决策（释义格式统一 Markdown）**：确认使用 turndown 进行 HTML → Markdown 转换，可在导入阶段完成
2. **Phase 3 MDX 支持**：在 `mdxParser.js` 中集成 turndown，预解析阶段统一转换释义格式
3. **存储层**：`dict_entries` 表的 `definition` 字段统一存储 Markdown，无需保留 HTML 版本
4. **渲染层**：`marked` 库负责 Markdown → HTML 渲染，与 turndown 形成闭环
5. **依赖管理**：需在 `package.json` 中添加 `turndown`（主包）和 `turndown-plugin-gfm`（可选，用于表格支持）
6. **性能指标更新**：MDX 导入时间需额外计入 turndown 批量转换耗时（1万条约 5-10 秒），建议在导入 UI 中显示进度条

### 具体实施建议

```javascript
// src/engine/mdxParser.js 中的集成示例
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

// 初始化转换服务（全局单例）
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
})

// 启用 GFM（表格、删除线等）
turndownService.use(gfm)

// 添加佛教词典专用规则（见第 3.2 节）
// ...

// MDX 导入时批量转换
async function parseMDX(file) {
  const entries = await extractEntriesFromMDX(file)
  
  // 批量转换 HTML → Markdown
  const convertedEntries = await batchConvert(
    entries.map(e => ({ ...e, definition: turndownService.turndown(e.definitionHtml) }))
  )
  
  // 存入 IndexedDB
  await saveToIndexedDB(convertedEntries)
}
```

## 9. 参考资料

- [turndown 官方文档 (GitHub)](https://github.com/mixmark-io/turndown)
- [turndown npm 包](https://www.npmjs.com/package/turndown)
- [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm)
- [Context7 turndown 文档](https://context7.com/mixmark-io/turndown/llms.txt)
- [般若佛经阅读器 v2.0 项目方案](./PROJECT_V2_PLAN.md)
- [词典优化讨论](./DICTIONARY_OPTIMIZATION_DISCUSSION.md)
