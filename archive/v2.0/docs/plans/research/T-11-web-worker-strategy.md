# Web Worker 技术方案 调研报告

> 任务编号：T-11
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/research/T-05-highlight-engine.md

## 1. 背景与目标

般若佛经阅读器 v2.0 需要在纯前端环境下处理两类耗时计算任务：

- **MDX 词典解析**：用户上传的 .mdx 词典文件可达 10MB+，解析过程包含 LZO 解压、二进制数据读取、词条提取，在主线程执行会导致 UI 冻结 200-500ms。
- **Trie 树构建**：10 万词条的 Trie 树构建需要 30-80ms，多词典并行构建时会叠加，直接阻塞主线程影响首屏渲染和交互响应。

**调研目标**：
1. 确定最优的 Worker 通信模式
2. 评估大文件解析和 Trie 构建在 Worker 中的实现方案
3. 确认移动端兼容性风险
4. 评估 SharedArrayBuffer 的可行性

## 2. Worker 通信模式对比

| 模式 | 性能 | 复杂度 | 适用场景 |
|------|------|--------|----------|
| **postMessage**（结构化克隆） | 中等：小对象快，大对象序列化/反序列化开销大（10MB 约 50-100ms） | 低：API 简单，`worker.postMessage(data)` | 控制命令、小数据量传输（词条列表、匹配结果） |
| **postMessage + Transferable** | 高：零拷贝，仅转移所有权（10MB 约 1-5ms），但发送方失去数据访问权 | 中：需显式指定 transfer 数组，数据类型受限（仅 ArrayBuffer/MessagePort/ImageBitmap） | 大文件二进制数据、Trie 序列化结果 |
| **MessageChannel** | 与 postMessage 相同性能 | 中高：需创建端口对，双向通信更清晰 | 多 Worker 协调、需要独立通信通道的场景 |
| **SharedArrayBuffer** | 最高：真正的零拷贝共享内存 | 高：需 COOP/COEP 响应头配置、手动 Atomics 同步 | 高频增量数据更新、实时渲染数据共享 |

### 2.1 通信模式选择

**推荐方案：postMessage + Transferable 为主，SharedArrayBuffer 不作为 v2.0 选项。**

理由：
- **postMessage 控制命令**：Worker 的创建、任务分配、状态查询等控制消息数据量小（< 1KB），结构化克隆开销可忽略。
- **Transferable 大文件**：MDX 文件以 ArrayBuffer 形式从 IndexedDB 读取，直接通过 transfer 转移给 Worker，避免 50-100ms 的序列化开销。
- **Trie 构建结果返回**：构建完成的 Trie 若需传回主线程，可序列化为 ArrayBuffer（使用自定义二进制格式或 JSON → TextEncoder）再 transfer。
- **不选 SharedArrayBuffer**：COOP/COEP 配置在 Vercel SPA 部署下会导致所有跨域资源（CDN、字体、第三方脚本）必须带 CORS 头，部署成本和兼容性风险过高，且本项目不需要毫秒级共享内存通信。

## 3. 大文件解析方案

### 3.1 文件传递

MDX 文件已在 IndexedDB 中以 Blob/ArrayBuffer 形式存储，传递方案如下：

```
主线程                          Worker
  │                                │
  │ 1. 从 IndexedDB 读取 Blob       │
  │    → fileReader.readAsArrayBuffer
  │                                │
  ├─ postMessage({                 │
  │    type: 'parse-mdx',          │
  │    dictId: 'user-001',         │
  │    buffer: arrayBuffer         │  ◄── Transferable
  │  }, [arrayBuffer]) ───────────►│
  │                                │
  │                                │ 2. mdict-js / lzo-wasm 解析
  │                                │    提取词条 + 释义
  │                                │    期间定期发送进度
  │                                │
  │◄─ postMessage({                │
  │    type: 'mdx-progress',       │
  │    percent: 45,                │
  │    stage: 'extracting-terms'   │
  │  }) ───────────────────────────┤
  │                                │
  │◄─ postMessage({                │
  │    type: 'mdx-result',         │
  │    terms: [...],               │
  │    entries: [...],             │
  │    health: {...}               │
  │  }) ───────────────────────────┤
```

**关键决策**：
- **文件读取**：主线程从 IndexedDB 读取为 ArrayBuffer（`idb` 库原生支持），然后通过 `[buffer]` 作为第二个参数传给 postMessage 实现 transfer。
- **Worker 内解析**：使用 `mdict-js` + `lzo-wasm` 进行解析。注意 lzo-wasm 是 WebAssembly 模块，在 Worker 中加载时需要独立的 wasm 文件路径。
- **Worker 文件策略**：使用 Vite 的 `new Worker(new URL('./mdx-parser.worker.js', import.meta.url), { type: 'module' })` 语法，Vite 自动处理 Worker 文件的打包和路径解析。

### 3.2 进度反馈

10MB+ MDX 解析可能需要 500-2000ms，必须提供进度反馈避免用户以为页面卡死：

```javascript
// Worker 内部：解析过程中定期发送进度
self.onmessage = async (e) => {
  const { type, buffer, dictId } = e.data
  if (type === 'parse-mdx') {
    const mdx = new Mdict(buffer)
    const totalEntries = mdx.header.keyBlockInfo.num_entries

    self.postMessage({
      type: 'mdx-progress',
      dictId,
      percent: 0,
      stage: 'initializing',
      message: '正在初始化词典...'
    })

    // 分批提取词条，每处理 1000 条发送一次进度
    for (let i = 0; i < totalEntries; i += 1000) {
      const batch = extractBatch(mdx, i, 1000)
      self.postMessage({
        type: 'mdx-progress',
        dictId,
        percent: Math.round((i / totalEntries) * 100),
        stage: 'extracting-terms',
        message: `正在提取词条... ${Math.round(i / totalEntries * 100)}%`
      })
    }

    self.postMessage({
      type: 'mdx-progress',
      dictId,
      percent: 100,
      stage: 'generating-report',
      message: '正在生成体检报告...'
    })

    // 最终结果
    self.postMessage({ type: 'mdx-result', dictId, terms, entries, health })
  }
}
```

**主线程处理**：
```javascript
worker.onmessage = (e) => {
  const { type, dictId, percent, stage, message } = e.data
  if (type === 'mdx-progress') {
    // 更新 UI 进度条（Vant 的 van-loading 或自定义进度组件）
    updateProgress(dictId, { percent, stage, message })
  }
}
```

## 4. Trie 构建方案

### 4.1 模块加载

| 方式 | 语法 | 浏览器支持 | Vite 兼容 | 适用场景 |
|------|------|-----------|-----------|----------|
| **ESM import** | `import { Trie } from './trie.js'` | Chrome 80+, Firefox 79+, Safari 15.4+ | 原生支持（`{ type: 'module' }`） | **推荐**：现代项目首选 |
| **importScripts** | `importScripts('./trie.js')` | 所有支持 Worker 的浏览器 | 需手动配置 | 旧项目兼容，不支持顶层 await |
| **Blob URL** | `new Worker(URL.createObjectURL(blob))` | 所有支持 Worker 的浏览器 | Vite 内联模式 | 动态生成 Worker 代码 |

**关键限制**：
- ESM Worker 中**不能使用 importScripts**，两者互斥。
- 模块 Worker 的路径必须是同源 URL，不能使用 CDN 或 data: URL。
- Vite 开发模式下，Worker 文件通过开发服务器 URL 加载；构建模式下，Vite 将其打包为独立文件或内联为 Blob URL。

**推荐方案：ESM Module Worker**

```javascript
// 主线程创建 Worker（Vite 语法）
const trieWorker = new Worker(
  new URL('./workers/trie-builder.worker.js', import.meta.url),
  { type: 'module', name: 'trie-builder' }
)
```

Worker 内部使用 ESM import：
```javascript
// workers/trie-builder.worker.js
import { Trie } from '../../engine/trie/index.js'
import { TrieNode } from '../../engine/trie/node.js'

self.onmessage = async (e) => {
  const { type, dictId, terms } = e.data
  if (type === 'build-trie') {
    const trie = new Trie(dictId)
    trie.build(terms)

    // 序列化 Trie 为可传输格式
    const serialized = trie.serialize()

    // 将序列化数据转为 ArrayBuffer transfer 回主线程
    const encoder = new TextEncoder()
    const buffer = encoder.encode(JSON.stringify(serialized)).buffer
    self.postMessage({ type: 'trie-built', dictId, serialized }, [buffer])
  }
}
```

### 4.2 数据返回

Trie 构建完成后返回主线程有两种策略：

**策略 A：Worker 构建 + 主线程重建（推荐）**
- Worker 中构建 Trie，返回词条列表或序列化数据
- 主线程收到后在主线程重建 Trie（30-80ms 在主线程可接受，因为 Worker 已完成"最脏的活"——数据解析和预处理）
- **优点**：Trie 是 Map/对象结构，无法直接 transfer，重建是最简单的方式
- **缺点**：主线程仍有 30-80ms 的重建开销

**策略 B：Worker 构建 + 二进制序列化 + 主线程反序列化**
- Worker 将 Trie 序列化为紧凑二进制格式（ArrayBuffer），transfer 回主线程
- 主线程直接反序列化使用，避免重建
- **优点**：主线程开销降至 5-10ms
- **缺点**：序列化/反序列化逻辑复杂，维护成本高

**策略 C：匹配逻辑也放在 Worker 中（T-05 调研已排除）**
- 匹配本身仅 3-8ms，低于 16ms 帧预算
- Worker 的序列化/反序列化开销（~2ms）会抵消大部分收益
- 每次匹配都需 postMessage，延迟显著

**最终推荐**：
- **Trie 构建放 Worker**：10 万词条的预处理（从 IndexedDB 读取、数据清洗、去重）是耗时大头，放 Worker 避免阻塞
- **Trie 匹配放主线程**：3-8ms 的匹配操作直接在主线程执行，避免消息传递开销
- **数据返回**：Worker 返回清洗后的词条列表（纯数组），主线程重建 Trie。对于超大词典（> 5 万词条），可考虑策略 B 的自定义序列化。

## 5. 移动端兼容性

| 平台 | Dedicated Worker | ESM Worker (`type: 'module'`) | Transferable | 备注 |
|------|------------------|-------------------------------|--------------|------|
| **iOS Safari 15.4+** | 支持 | 支持 | 支持 | Worker 内存限制约 128MB，超限静默终止 |
| **iOS Safari 15.0-15.3** | 支持 | **不支持** | 支持 | 需用 Blob URL + importScripts 降级 |
| **iOS Safari < 15.0** | 支持 | **不支持** | 支持 | 已低于本项目最低支持版本 |
| **Android Chrome 80+** | 支持 | 支持 | 支持 | 部分厂商 WebView 限制 Worker 数量（最多 4 个） |
| **Android WebView (Chromium 80+)** | 支持 | 支持 | 支持 | 低端设备可能限制并发 Worker 数 |
| **Android WebView (旧版)** | 支持 | **不支持** | 支持 | 需检测降级 |
| **Chrome (Desktop) 80+** | 支持 | 支持 | 支持 | 无限制 |
| **Firefox 79+** | 支持 | 支持 | 支持 | 无限制 |
| **Safari (Desktop) 15.4+** | 支持 | 支持 | 支持 | 无限制 |

**关键风险**：
1. **iOS Safari Worker 内存限制**：Worker 内存上限约 128MB。本项目 Trie 构建内存约 14-16MB，MDX 解析峰值约 20-40MB（取决于词典大小），在安全范围内。但需监控超大词典（> 20MB MDX）解析时的内存占用。
2. **Android WebView Worker 数量限制**：部分厂商限制最多 4 个并发 Worker。本项目仅使用 1 个常驻 Worker（复用构建任务），不会触发限制。
3. **ESM Worker 兼容性**：iOS 15.4+ (2022-03 发布) 和 Android Chrome 80+ (2020-01 发布) 已覆盖绝大多数用户。v2.0 最低支持版本建议为 iOS 15.4。
4. **Worker 静默终止**：iOS 上 Worker 内存超限不会触发 onerror，而是静默终止。**对策**：计算完成后立即 `self.close()`，避免长期驻留；主线程设置超时检测（超过 5 秒无响应则认为失败）。

**降级策略**：
```javascript
function createWorker(url) {
  // 优先尝试 ESM Worker
  try {
    return new Worker(url, { type: 'module' })
  } catch {
    // 降级为 Blob URL + importScripts
    return new Worker(
      URL.createObjectURL(
        new Blob([`importScripts('${url}');`], { type: 'application/javascript' })
      )
    )
  }
}
```

## 6. SharedArrayBuffer 可行性

### 6.1 COOP/COEP 头配置要求

| 要求 | 配置值 | 说明 |
|------|--------|------|
| Cross-Origin-Opener-Policy | `same-origin` | 页面不能被其他源窗口通过 window.opener 访问 |
| Cross-Origin-Embedder-Policy | `require-corp` | 所有跨域子资源必须带 CORS 头 |
| 所有跨域资源 | `crossorigin="anonymous"` + CORS 头 | 图片、字体、CDN 脚本都必须显式声明 |

### 6.2 Vercel 部署下的影响

Vercel 可通过 `vercel.json` 配置响应头：
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

**但启用 COOP/COEP 会带来严重副作用**：
1. **所有第三方资源必须 CORS**：Vant 的图标字体、Google Fonts、任何 CDN 资源都必须带 `crossorigin` 且服务端返回 `Access-Control-Allow-Origin`
2. **`window.open()` 受限**：COOP 导致通过 `window.open()` 打开的窗口无法与 opener 通信
3. **微信/支付宝 WebView 可能不兼容**：部分内嵌 WebView 对 COOP/COEP 支持不完整
4. **`crossOriginIsolated` 检测**：只要有一个资源不满足要求，`self.crossOriginIsolated` 就是 false，SharedArrayBuffer 不可用

### 6.3 收益分析

| 场景 | SharedArrayBuffer 收益 | 本项目是否需要 |
|------|------------------------|---------------|
| Trie 构建结果共享 | 避免序列化，但构建是一次性的 | 不需要 |
| 实时高亮匹配数据 | 零拷贝，但匹配本身仅 3-8ms | 不需要 |
| 大文件分块解析 | 多 Worker 并行处理同一文件 | 可能有用，但复杂度太高 |
| 进度状态共享 | 替代 postMessage 发送进度 | postMessage 已足够 |

**结论：v2.0 不启用 SharedArrayBuffer。**

理由：
- 配置成本高：需要全局 COOP/COEP，影响所有第三方资源加载
- 收益低：Trie 构建是一次性操作，匹配开销本身很小
- 兼容风险：微信 WebView、低版本 Android WebView 可能无法正常工作
- **保留选项**：如果 v2.1/v3.0 出现对毫秒级共享内存的强需求（如万字经文的实时高亮、超大型词典 > 50 万词条），再评估引入

## 7. 实现示例

### 7.1 Worker 管理器封装

```javascript
// engine/workers/workerManager.js
class WorkerManager {
  constructor() {
    this.workers = new Map()
    this.pendingTasks = new Map()
    this.taskId = 0
  }

  /**
   * 获取或创建 Worker
   */
  getWorker(name, url) {
    if (this.workers.has(name)) {
      return this.workers.get(name)
    }

    const worker = new Worker(new URL(url, import.meta.url), {
      type: 'module',
      name
    })

    worker.onmessage = (e) => this._handleMessage(e)
    worker.onerror = (err) => this._handleError(name, err)

    this.workers.set(name, worker)
    return worker
  }

  /**
   * 发送任务并返回 Promise
   */
  postTask(workerName, url, taskData, transferList = []) {
    return new Promise((resolve, reject) => {
      const id = ++this.taskId
      const worker = this.getWorker(workerName, url)

      this.pendingTasks.set(id, { resolve, reject, workerName, timer: null })

      // 超时检测（5 秒）
      const timer = setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id)
          reject(new Error(`Worker task timeout: ${taskData.type}`))
        }
      }, 5000)

      this.pendingTasks.get(id).timer = timer

      worker.postMessage({ taskId: id, ...taskData }, transferList)
    })
  }

  _handleMessage(e) {
    const { taskId, type } = e.data
    const task = this.pendingTasks.get(taskId)
    if (!task) return

    clearTimeout(task.timer)
    this.pendingTasks.delete(taskId)

    if (type === 'error') {
      task.reject(new Error(e.data.message))
    } else {
      task.resolve(e.data)
    }
  }

  _handleError(name, err) {
    console.error(`Worker ${name} error:`, err)
  }

  /**
   * 销毁指定 Worker
   */
  terminate(name) {
    const worker = this.workers.get(name)
    if (worker) {
      worker.terminate()
      this.workers.delete(name)
    }
  }

  /**
   * 销毁所有 Worker
   */
  terminateAll() {
    for (const [name, worker] of this.workers) {
      worker.terminate()
    }
    this.workers.clear()
    for (const task of this.pendingTasks.values()) {
      clearTimeout(task.timer)
    }
    this.pendingTasks.clear()
  }
}

export const workerManager = new WorkerManager()
```

### 7.2 Trie 构建 Worker

```javascript
// engine/workers/trie-builder.worker.js
import { Trie } from '../trie/index.js'

self.onmessage = (e) => {
  const { taskId, type, dictId, terms } = e.data

  if (type === 'build-trie') {
    try {
      self.postMessage({
        taskId,
        type: 'build-progress',
        dictId,
        percent: 0,
        message: '开始构建索引...'
      })

      const trie = new Trie(dictId)

      // 分批构建，定期发送进度
      const batchSize = 2000
      const total = terms.length
      for (let i = 0; i < total; i += batchSize) {
        const batch = terms.slice(i, i + batchSize)
        batch.forEach(term => trie.insert(term.term, term.dictId))

        self.postMessage({
          taskId,
          type: 'build-progress',
          dictId,
          percent: Math.round(((i + batchSize) / total) * 100),
          message: `已构建 ${Math.min(i + batchSize, total)}/${total} 词条`
        })
      }

      // 返回清洗后的词条数据（主线程重建 Trie）
      const termList = terms.map(t => ({
        term: t.term,
        dictId: t.dictId,
        pinyin: t.pinyin,
        category: t.category
      }))

      self.postMessage({
        taskId,
        type: 'build-complete',
        dictId,
        terms: termList,
        entryCount: total
      })
    } catch (error) {
      self.postMessage({
        taskId,
        type: 'error',
        message: error.message
      })
    }
  }
}
```

### 7.3 MDX 解析 Worker

```javascript
// engine/workers/mdx-parser.worker.js
import Mdict from 'mdict-js'

self.onmessage = async (e) => {
  const { taskId, type, dictId, buffer } = e.data

  if (type === 'parse-mdx') {
    try {
      self.postMessage({
        taskId,
        type: 'mdx-progress',
        dictId,
        percent: 0,
        stage: 'initializing',
        message: '正在解析词典文件...'
      })

      // mdict-js 解析
      const mdx = new Mdict(buffer)
      const header = mdx.header
      const totalEntries = header.keyBlockInfo.num_entries

      self.postMessage({
        taskId,
        type: 'mdx-progress',
        dictId,
        percent: 10,
        stage: 'extracting-terms',
        message: `共 ${totalEntries.toLocaleString()} 个词条，开始提取...`
      })

      const terms = []
      const batchSize = 500
      const batches = Math.ceil(totalEntries / batchSize)

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize
        const end = Math.min(start + batchSize, totalEntries)

        for (let j = start; j < end; j++) {
          const key = mdx._keyList[j]
          const def = mdx.lookup(key)
          terms.push({
            term: key,
            definition: def || '',
            _dictId: dictId
          })
        }

        const percent = Math.round(10 + ((end / totalEntries) * 80))
        self.postMessage({
          taskId,
          type: 'mdx-progress',
          dictId,
          percent,
          stage: 'extracting-terms',
          message: `已提取 ${end}/${totalEntries} 词条`
        })
      }

      // 生成体检报告
      const health = {
        totalEntries: terms.length,
        withDefinition: terms.filter(t => t.definition).length,
        withoutDefinition: terms.filter(t => !t.definition).length,
        avgDefLength: terms.reduce((sum, t) => sum + (t.definition?.length || 0), 0) / terms.length
      }

      self.postMessage({
        taskId,
        type: 'mdx-progress',
        dictId,
        percent: 95,
        stage: 'generating-report',
        message: '正在生成体检报告...'
      })

      // 返回词条数据（transfer 不可用，terms 是普通对象）
      self.postMessage({
        taskId,
        type: 'mdx-result',
        dictId,
        terms,
        health,
        fileSize: buffer.byteLength
      })

      // buffer 已经 transfer 给 Worker，主线程无法再访问
    } catch (error) {
      self.postMessage({
        taskId,
        type: 'error',
        dictId,
        message: error.message
      })
    }
  }
}
```

### 7.4 主线程调用示例

```javascript
// services/dictService.js 中的 Worker 调用
import { workerManager } from '../engine/workers/workerManager.js'

export async function buildTrieInWorker(dictId, terms) {
  const result = await workerManager.postTask(
    'trie-builder',
    '../engine/workers/trie-builder.worker.js',
    { type: 'build-trie', dictId, terms }
  )

  if (result.type === 'build-complete') {
    // 在主线程重建 Trie（30-80ms，可接受）
    const { Trie } = await import('../engine/trie/index.js')
    const trie = new Trie(dictId)
    trie.build(result.terms)
    return trie
  }

  throw new Error(`Trie build failed: ${result.message}`)
}

export async function parseMDXInWorker(dictId, arrayBuffer, onProgress) {
  const worker = workerManager.getWorker(
    'mdx-parser',
    '../engine/workers/mdx-parser.worker.js'
  )

  // 监听进度
  const progressHandler = (e) => {
    if (e.data.type === 'mdx-progress' && onProgress) {
      onProgress(e.data)
    }
  }
  worker.addEventListener('message', progressHandler)

  try {
    // buffer 通过 transfer 转移给 Worker
    const result = await workerManager.postTask(
      'mdx-parser',
      '../engine/workers/mdx-parser.worker.js',
      { type: 'parse-mdx', dictId, buffer: arrayBuffer },
      [arrayBuffer] // Transferable
    )

    return result
  } finally {
    worker.removeEventListener('message', progressHandler)
  }
}
```

## 8. 结论与建议

### 8.1 最终方案

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **Worker 类型** | Dedicated Worker | 单脚本使用场景，不需要 SharedWorker 的跨窗口共享 |
| **通信模式** | postMessage + Transferable | 大文件 transfer 零拷贝，控制命令结构化克隆 |
| **模块加载** | ESM Module Worker (`type: 'module'`) | Vite 原生支持，可用 import 语句，支持顶层 await |
| **Trie 构建位置** | Worker | 避免 30-80ms 阻塞主线程，尤其多词典并行时 |
| **Trie 匹配位置** | 主线程 | 3-8ms 远低于 16ms 帧预算，避免序列化开销 |
| **MDX 解析位置** | Worker | 500-2000ms 必须移出主线程，否则 UI 冻结 |
| **进度反馈** | postMessage 分段通知 | 足够低频（每 500-2000 条一次），不会压垮主线程 |
| **SharedArrayBuffer** | **不启用** | COOP/COEP 部署成本高、副作用大，v2.0 收益不明显 |
| **Worker 生命周期** | 常驻复用，SPA 路由切换不销毁 | 避免频繁创建/销毁的开销 |
| **超时策略** | 5 秒超时 + 降级 | 检测 Worker 静默终止（iOS 场景） |

### 8.2 架构设计

```
主线程                                    Worker 池
  │                                          │
  │ 词典管理操作                              │
  │ ├── 上传 MDX ───────────────────────────►│ mdx-parser.worker
  │ │    (transfer ArrayBuffer)               │    → 解析 → 进度 → 词条
  │ │◄── 词条数据 + 体检报告 ─────────────────┤
  │ │                                        │
  │ ├── 构建 Trie ──────────────────────────►│ trie-builder.worker
  │ │    (terms 数组)                         │    → 分批构建 → 进度
  │ │◄── 清洗后的词条数据 ────────────────────┤
  │ │    (主线程重建 Trie)                    │
  │ │                                        │
  │ 高亮匹配（主线程）                         │
  │ └── trie.search(text)                    │ 不参与
  │     (3-8ms，直接在主线程执行)              │
```

### 8.3 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| iOS Worker 内存超限静默终止 | 计算完立即 `self.close()`，主线程 5s 超时检测，失败后降级到主线程分片执行 |
| ESM Worker 旧浏览器不支持 | 检测降级为 Blob URL + importScripts |
| Vite 构建 Worker 路径问题 | 使用 `new URL('./xxx.worker.js', import.meta.url)` 语法 |
| Transferable 数据丢失 | buffer transfer 后主线程不可再访问，需克隆或重新读取 |
| Worker 中 mdict-js 兼容性 | 需验证 mdict-js 在 Worker 环境的 `globalThis` 兼容性 |

## 9. 对 v2.1 方案的影响

| v2.0 决策 | 影响说明 |
|-----------|----------|
| **Worker 通信层** | 需新增 `src/engine/workers/` 目录，包含 workerManager、各 Worker 文件 |
| **Vite 配置** | 需在 vite.config.js 中配置 `worker.format: 'es'`（默认 iife 不支持 import.meta） |
| **mdict-js 优化** | mdict-js 需在 Worker 中运行，可能需要 `optimizeDeps.include: ['mdict-js']` 和 `define: { global: 'globalThis' }`（v1.0 已有此配置） |
| **Trie 引擎接口** | `engine/trie/index.js` 的 `build()` 方法需拆分为"数据处理"（Worker）和"树构建"（主线程）两部分 |
| **进度 UI 组件** | 词典管理页面需新增进度条组件，监听 Worker 的 progress 消息 |
| **错误处理** | Worker 错误需通过 postMessage 传回主线程，主线程需有完善的错误提示和降级逻辑 |
| **内存预算** | Worker 内存与主线程分离，iOS 128MB 限制下：Trie ~16MB + MDX 解析峰值 ~40MB + 其他 < 60MB，安全 |
| **性能预期更新** | MDX 解析：主线程不阻塞，UI 流畅，总耗时不变但用户体验更好；Trie 构建：主线程从 30-80ms 降至 5-10ms（仅重建） |

## 10. 参考资料

1. **MDN Web Workers API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
2. **MDN Using Web Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
3. **MDN Transferable Objects**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
4. **MDN Structured Clone Algorithm**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
5. **Vite Worker Options**: https://vite.dev/config/worker-options
6. **Vite 内核解析 - Web Worker 插件**: https://m.alixixi.com/wz/384921.html
7. **SharedArrayBuffer COOP/COEP 配置**: php.cn FAQ - HTML COOP COEP 跨域隔离策略 (2026-04-20)
8. **ESM Worker 最佳实践**: php.cn FAQ - HTML ES Module Worker 使用方法 (2026-04-28)
9. **Worker 移动端兼容性**: php.cn FAQ - HTML 多线程配合页面卡顿技巧 (2026-04-04)
10. **SharedArrayBuffer 共享内存**: php.cn FAQ - HTML SharedArrayBuffer 共享内存技巧 (2026-04-17)
11. **Worker 通信优化实战**: 52jiewu.com - Web Worker 通信优化从 300ms 到 50ms (2026-04-12)
12. **项目 v2.0 方案**: docs/PROJECT_V2_PLAN.md
13. **高亮引擎方案**: docs/plans/research/T-05-highlight-engine.md
