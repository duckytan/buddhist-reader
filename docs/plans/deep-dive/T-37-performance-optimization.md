# 性能优化全面分析 报告

> 任务编号：T-37
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/research/T-02-vite-build-optimization.md, docs/plans/research/T-05-highlight-engine.md, docs/plans/research/T-10-lru-cache-strategy.md, docs/plans/research/T-11-web-worker-strategy.md

## 1. 背景与目标

般若佛经阅读器 v2.0 采用 Vue 3 + Vant 4 + IndexedDB + 自定义 Trie 高亮引擎的纯前端架构。项目存在以下性能敏感场景：

- **首屏加载**：书架页作为入口，需在 1s 内完成 FCP/LCP，确保用户快速进入阅读状态
- **词典高亮**：千字经文需在 < 50ms 内完成 Trie 匹配与 DOM 渲染
- **释义查询**：点击高亮词条后 < 200ms 内展示释义弹窗
- **MDX 解析**：用户上传的 10MB+ MDX 词典不能阻塞主线程
- **移动端约束**：iOS Safari Worker 内存上限 ~128MB，Android WebView 可能限制并发 Worker 数

本报告系统性分析首屏加载、运行时、高亮响应、释义加载、资源优化、Worker 使用、缓存策略、CDN 加速等全链路性能瓶颈，并给出具体可执行的优化方案和测试方法。

## 2. 性能指标目标

| 指标 | 目标值 | 测量方法 | 备注 |
|------|--------|----------|------|
| FCP（首次内容绘制） | < 0.8s | Lighthouse / Chrome DevTools Performance | 首屏 bundle ~95KB gzip，目标 HTTP/2 下 1-2 RTT |
| LCP（最大内容绘制） | < 1.2s | Lighthouse / Web Vitals API | 通常是书架页标题或首屏经文 |
| TTI（可交互时间） | < 1.5s | Lighthouse | 包含 Vue 应用初始化、IndexedDB 连接、内置 Trie 构建 |
| 首屏 Bundle（gzip） | < 200KB | rollup-plugin-visualizer | 实际预估 ~95KB，有充足余量 |
| 高亮响应（1000字） | < 50ms | Performance API `performance.now()` | 含 Trie 匹配 3-8ms + DOM 渲染 10-20ms |
| 高亮响应（5000字） | < 80ms | 同上 | 分段渲染，首屏可见段落优先 |
| 释义加载（缓存命中） | < 1ms | Performance API | LRU 内存缓存，纯 Map 操作 |
| 释义加载（DB 查询） | < 200ms | Performance API | IndexedDB 主键查询 1-5ms + 弹窗渲染 |
| Trie 构建（10万词条） | < 100ms | Performance API | Worker 中 30-80ms，主线程重建 5-10ms |
| MDX 解析（10MB） | 不阻塞主线程 | Long Tasks API | Worker 中 500-2000ms，需进度反馈 |
| 内存占用（运行时） | < 20MB | Chrome DevTools Memory Panel | Trie ~14-16MB + 缓存 ~1MB + 应用 ~3MB |
| 长任务（> 50ms） | 0 个首屏长任务 | Lighthouse / Long Tasks API | 首屏无长任务 |
| Lighthouse Performance 评分 | >= 90 | Lighthouse CI | 生产构建 + 4G 网络模拟 |

## 3. 首屏加载优化

### 3.1 Code Splitting

采用**按路由为主 + 按功能为辅**的混合拆分策略，已在 T-02 调研中验证。

**Vite manualChunks 配置**：

```javascript
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Vue 生态（首屏必需）
    if (id.includes('/vue/') || id.includes('/pinia/') || id.includes('/vue-router/'))
      return 'vendor-vue'
    // Vant UI 组件库（首屏必需，按需引入）
    if (id.includes('/vant/'))
      return 'vendor-vant'
    // MDX 解析引擎（非首屏，按需加载）
    if (id.includes('mdict') || id.includes('lzo-wasm'))
      return 'vendor-mdx'
    // 工具库（idb, markdown-it 等）
    if (id.includes('/idb/') || id.includes('/markdown-it/') || id.includes('/turndown/'))
      return 'vendor-utils'
    return 'vendor'
  }
  // 源码按功能拆分
  if (id.includes('/engine/')) return 'engine-core'
  if (id.includes('/storage/')) return 'storage-layer'
  if (id.includes('/services/')) return 'services-layer'
}
```

**路由懒加载**（所有页面异步导入）：

```javascript
// router/index.js
const routes = [
  { path: '/', component: () => import('@/pages/Bookshelf.vue') },
  { path: '/reader/:id', component: () => import('@/pages/Reader.vue') },
  { path: '/dict', component: () => import('@/pages/DictManager.vue') },
  { path: '/settings', component: () => import('@/pages/Settings.vue') },
  { path: '/stats', component: () => import('@/pages/Stats.vue') },
]
```

**首屏 vs 非首屏 chunk 分布**：

| Chunk | 内容 | 预估大小（gzip） | 首屏加载？ |
|-------|------|------------------|-----------|
| `index-[hash].js` | 应用入口 + Bookshelf 页 | ~15KB | 是 |
| `vendor-vue-[hash].js` | Vue 3 + Vue Router + Pinia | ~35KB | 是 |
| `vendor-vant-[hash].js` | Vant（按需引入） | ~25KB | 是 |
| `vendor-utils-[hash].js` | idb + markdown-it + 工具函数 | ~10KB | 是 |
| CSS 入口 | 全局样式 + Vant 样式 | ~10KB | 是 |
| `vendor-mdx-[hash].js` | mdict-js + lzo-wasm | ~80KB | 否（按需） |
| `engine-core-[hash].js` | Trie 引擎 + 高亮引擎 | ~8KB | 否（阅读页） |
| `storage-layer-[hash].js` | IndexedDB 封装 | ~5KB | 否（可延迟） |
| Reader 页面 chunk | 阅读页组件 | ~12KB | 否（路由切换） |
| DictManager 页面 chunk | 词典管理页 | ~10KB | 否（路由切换） |
| Settings 页面 chunk | 设置页 | ~5KB | 否（路由切换） |
| Stats 页面 chunk | 统计页 | ~8KB | 否（路由切换） |

**首屏合计**：~95KB gzip（远低于 200KB 目标）

### 3.2 预加载/预取

**ModulePreload 配置**（阻止非首屏 chunk 被预加载）：

```javascript
build: {
  modulePreload: {
    polyfill: true,
    resolveDependencies: (filename, deps, { hostId, hostType }) => {
      const nonEssential = ['vendor-mdx', 'engine-core', 'storage-layer', 'services-layer']
      return deps.filter(dep => !nonEssential.some(c => dep.includes(c)))
    }
  }
}
```

**路由级预取策略**：

```javascript
// Bookshelf.vue onMounted 后，空闲时预取阅读页
import { onMounted } from 'vue'

onMounted(() => {
  // 使用 requestIdleCallback 或 setTimeout 延迟预取，不阻塞首屏
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('@/pages/Reader.vue') // 触发 chunk 下载，不执行
    }, { timeout: 2000 })
  }
})
```

**关键资源预连接**：

```html
<!-- index.html head 中 -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
```

### 3.3 资源优化

#### 图片资源

| 策略 | 说明 | 预期收益 |
|------|------|----------|
| **WebP 优先** | 封面图等使用 WebP 格式，fallback JPEG/PNG | 体积减少 25-35% |
| **SVG 替代图标** | 使用 SVG 内联而非 icon font | 减少字体加载，消除 COOP/COEP 兼容问题 |
| **响应式图片** | 使用 `<picture>` + `srcset` 按设备分辨率加载 | 移动端节省 50-70% |
| **懒加载** | `loading="lazy"` 用于非首屏图片（书架列表） | 减少首屏网络竞争 |
| **Vite 内置优化** | `< 4KB` 自动 base64 内联，`>= 4KB` 输出带 hash 的文件 | 减少 HTTP 请求数 |

#### 字体资源

| 策略 | 说明 | 预期收益 |
|------|------|----------|
| **系统字体优先** | 正文使用系统字体栈（`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`） | 零字体加载延迟 |
| **可选字体异步加载** | 若使用自定义字体（如楷体用于经文），使用 `font-display: swap` | 避免 FOIT（无样式字体阻塞） |
| **字体子集化** | 仅提取经文常用汉字的子集 | 字体文件从 5MB+ 降至 ~200KB |
| **preload 关键字体** | `<link rel="preload" as="font" href="..." type="font/woff2" crossorigin>` | 提前发现并下载 |

#### 经文字体特殊处理

本项目经文字数有限（心经 260 字，金刚经 5000+ 字），如果使用自定义字体渲染经文：

```css
@font-face {
  font-family: 'SutraFont';
  src: url('/fonts/sutra-subset.woff2') format('woff2');
  font-display: swap;  /* 先用系统字体，加载完后切换 */
  unicode-range: U+4E00-9FFF, U+3000-303F;  /* 仅 CJK 基本区 + 标点 */
}
```

## 4. 运行时优化

### 4.1 帧率优化

**目标**：保持 60fps（每帧 < 16.67ms）

**关键优化点**：

| 场景 | 潜在瓶颈 | 优化策略 | 目标帧耗时 |
|------|----------|----------|-----------|
| **高亮渲染** | 大量 DOM 节点创建 | HTML 字符串 + innerHTML（比 createElement 快 10-20 倍） | < 5ms |
| **段落懒渲染** | 千字经文 DOM 爆炸 | IntersectionObserver 仅渲染可视区域 + 前后 1 段 | < 5ms |
| **滚动性能** | 频繁 layout/reflow | 使用 `will-change: transform` + CSS `transform` 而非 `top/left` | < 2ms |
| **释义弹窗** | 弹窗打开时 reflow | 使用 `transform: scale()` 动画 + `position: fixed` | < 3ms |
| **词典开关切换** | Trie 重建阻塞 | 放 Worker 执行，主线程显示 loading 状态 | < 1ms（仅 UI） |

**高亮渲染性能分解**（1000 字经文）：

```
Trie 匹配（主线程）      3-8ms
贪心去重（O(n log n)）   1-2ms
HTML 字符串拼接          2-3ms
innerHTML 渲染           5-10ms
────────────────────────────────
合计                     11-23ms  ✓ 远 < 50ms 目标
```

**避免的陷阱**：

- 不使用 Vue 的 `v-for` 渲染大量高亮 `<span>`（会产生数千个 Vue 组件实例）
- 不使用 CSS `box-shadow` 做高亮效果（触发合成层，GPU 开销大）
- 不在 `scroll` 事件中执行 Trie 匹配（使用 `IntersectionObserver` 替代）

### 4.2 内存管理

**目标**：运行时内存 < 20MB

**内存预算分配**：

| 模块 | 预估内存 | 控制策略 |
|------|----------|----------|
| Trie 引擎（全部启用） | ~11.5-16 MB | 分层 Trie，关闭词典时 `destroy()` 释放 |
| 释义 LRU 缓存 | ~1 MB（1000 条） | 容量上限 1000，自动淘汰 |
| Pinia Store 状态 | ~1-2 MB | 仅缓存当前阅读页数据，路由切换时清理 |
| IndexedDB 连接 | ~1 MB | 浏览器管理，无额外开销 |
| Vue 组件树 | ~2-3 MB | 路由懒加载，非当前页组件不实例化 |
| DOM 节点 | ~2-3 MB | 段落懒渲染限制同时存在的 DOM 节点 |
| **合计** | **~18.5-23 MB** | 正常场景 ~18MB，峰值需监控 |

**内存泄漏防护**：

```javascript
// 1. 词典关闭时释放 Trie
async function disableDict(dictId) {
  cache.invalidateByDict(dictId)
  trieManager.unregister(dictId)  // 内部调用 trie.destroy()
  await dictStore.update(dictId, { enabled: false })
}

// 2. 路由切换时清理阅读页状态
// stores/reader.js
watch(() => route.path, (newPath, oldPath) => {
  if (!newPath.startsWith('/reader/')) {
    // 离开阅读页：清理经文内容缓存
    clearSutraContent()
  }
})

// 3. Worker 超时检测与清理
// engine/workers/workerManager.js 中已实现 5s 超时 + reject
```

**iOS 内存特殊处理**：

- iOS Safari Worker 内存上限 ~128MB
- Trie 构建 Worker 完成后立即 `self.close()`，避免长期驻留
- 监控超大词典（> 20MB MDX）解析：超过 20MB 自动切换到 direct 模式（不预解析）

### 4.3 长任务拆分

**目标**：首屏无长任务（> 50ms），运行时单任务 < 16ms

**Vue 初始化阶段的长任务拆分**：

```javascript
// main.js - 分阶段初始化，避免阻塞 FCP
async function bootstrap() {
  // Phase 1: 创建 Vue 应用（快速，< 10ms）
  const app = createApp(App)
  app.use(router)
  app.use(pinia)
  app.mount('#app')

  // Phase 2: 非阻塞初始化（FCP 后执行）
  await nextTick()  // 等待首次渲染完成

  // 并行启动互不依赖的初始化任务
  const initTasks = [
    initIndexedDB(),      // ~5ms
    warmupBuiltinCache(), // ~1ms（50 条内置词条）
    initSettings(),       // < 1ms
  ]

  // 使用 requestIdleCallback 或 setTimeout(0) 让浏览器先渲染
  setTimeout(async () => {
    await Promise.all(initTasks)
    // Trie 构建放到最后（最耗时）
    await buildBuiltinTrie()  // Worker 中 5-10ms
  }, 0)
}
```

**Trie 构建分批执行**（Worker 中）：

```javascript
// 10 万词条分批处理，每 2000 条发一次进度
const batchSize = 2000
for (let i = 0; i < terms.length; i += batchSize) {
  const batch = terms.slice(i, i + batchSize)
  batch.forEach(t => trie.insert(t.term, t.dictId))

  // 定期 yield，给浏览器处理其他消息的机会
  if (i % (batchSize * 2) === 0) {
    self.postMessage({ taskId, type: 'build-progress', percent: Math.round(i / total * 100) })
    // 使用 MessageChannel 或 setTimeout 让事件循环继续
    await new Promise(r => setTimeout(r, 0))
  }
}
```

**MDX 解析进度反馈**：

- 每处理 500 条词条发送一次 `mdx-progress` 消息
- 主线程更新进度条（Vant van-loading 组件）
- 解析完成后 Worker 返回词条数据，主线程写入 IndexedDB

## 5. Web Worker 使用场景

**核心原则**：将 > 16ms 的纯 CPU 计算移出主线程，避免 UI 冻结。

| 任务 | 预估耗时 | 放入 Worker？ | 理由 |
|------|----------|--------------|------|
| **Trie 构建**（10万词条） | 30-80ms | **是** | 超过 16ms 帧预算，阻塞首屏或词典开关切换 |
| **Trie 匹配**（1000字） | 3-8ms | **否** | 低于帧预算，postMessage 开销（~2ms）抵消收益 |
| **MDX 解析**（10MB） | 500-2000ms | **是** | 严重阻塞主线程，必须移出 |
| **MDX 解析**（< 5MB 预解析） | 100-500ms | **是** | 超过帧预算，即使小文件也不应阻塞 |
| **TTS 初始化** | 5-10ms | **否** | 浏览器内置 Web Speech API，开销极小 |
| **释义查询**（IndexedDB） | 1-5ms | **否** | IndexedDB 原生异步 API，不阻塞主线程 |
| **HTML 高亮渲染** | 5-10ms | **否** | 需要操作 DOM，必须在主线程 |
| **贪心去重** | 1-2ms | **否** | 纯计算但耗时极短 |

**Worker 架构设计**（单 Worker 复用模式）：

```
主线程                                    单 Worker 实例
  │                                          │
  │ Trie 构建请求 ──────────────────────────►│ 根据 type 分发
  │                                          │  ├── build-trie → Trie 构建
  │ Trie 构建结果 ◄──────────────────────────┤  └── parse-mdx → MDX 解析
  │                                          │
  │ MDX 解析请求 ───────────────────────────►│
  │   (transfer ArrayBuffer)                 │
  │ MDX 进度 ◄───────────────────────────────┤ 分段通知
  │ MDX 解析结果 ◄───────────────────────────┤
```

**Worker 文件组织**：

```
src/engine/workers/
├── workerManager.js       # Worker 管理器（创建、复用、超时检测）
├── main.worker.js         # 统一 Worker 入口（分发不同任务类型）
├── trie-builder.worker.js # Trie 构建逻辑（可由 main.worker 导入）
└── mdx-parser.worker.js   # MDX 解析逻辑（可由 main.worker 导入）
```

**Worker 兼容性降级**：

```javascript
function createWorker(url) {
  try {
    return new Worker(new URL(url, import.meta.url), { type: 'module' })
  } catch {
    // iOS < 15.4 或旧 Android WebView 降级
    return new Worker(
      URL.createObjectURL(
        new Blob([`importScripts('${url}');`], { type: 'application/javascript' })
      )
    )
  }
}
```

## 6. 缓存策略

### 6.1 浏览器缓存

**Vite 构建产物缓存**（通过 content hash 实现长期缓存）：

```javascript
build: {
  rollupOptions: {
    output: {
      chunkFileNames: 'js/[name]-[hash].js',
      entryFileNames: 'js/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash][extname]',
    }
  }
}
```

**Vercel 部署的 Cache-Control 响应头**（通过 vercel.json 配置）：

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }
      ]
    }
  ]
}
```

**缓存策略说明**：

| 资源类型 | 缓存策略 | 说明 |
|----------|----------|------|
| **JS/CSS chunk（带 hash）** | `max-age=31536000, immutable` | 文件名含 hash，内容变化则 URL 变化，可永久缓存 |
| **图片/字体资源（带 hash）** | `max-age=31536000, immutable` | 同上 |
| **index.html** | `max-age=0, must-revalidate` | 每次请求验证是否有新版本 |
| **其他静态资源** | `max-age=3600, stale-while-revalidate=86400` | 1 小时新鲜期 + 24 小时过期后可后台刷新 |

### 6.2 应用层缓存

| 缓存类型 | 位置 | 容量 | 失效策略 |
|----------|------|------|----------|
| **释义 LRU 缓存** | 内存（Map） | 1000 条（~1MB） | 词典开关/删除/更新时批量失效 |
| **Trie 实例** | 内存（分层 Trie） | ~14-16 MB | 词典关闭时 destroy() |
| **IndexedDB** | 浏览器持久化 | 无限制（受设备存储限制） | 数据变更时同步更新 |
| **File Cache（MDX 原文件）** | IndexedDB Blob | 取决于用户上传词典大小 | 词典删除时清除 |
| **浏览器 HTTP 缓存** | 浏览器磁盘 | 取决于浏览器策略 | 文件名 hash 变化自动失效 |

**Service Worker（远期优化）**：

v2.0 不引入 Service Worker，原因：
- 纯前端 SPA，Vercel 的 CDN 缓存已足够
- Service Worker 增加开发复杂度（缓存更新、版本管理）
- 当前首屏 < 200KB，HTTP 缓存命中率已很高

v2.1 或更高版本可考虑引入 Workbox 实现：
- 离线阅读支持（缓存经书内容）
- 后台预取用户可能访问的经书

## 7. Lighthouse 评分目标

### 7.1 目标分数

| 类别 | 目标 | 说明 |
|------|------|------|
| **Performance** | >= 90 | 首屏加载、FCP、LCP、TTI、CLS 综合评分 |
| **Accessibility** | >= 95 | 禅意 UI 需满足基本可访问性（颜色对比度、ARIA 标签） |
| **Best Practices** | >= 95 | 无 console 错误、HTTPS、安全策略 |
| **SEO** | >= 90 | meta 标签、语义化 HTML、结构化数据 |

### 7.2 Performance 关键指标预估

在 Vercel 部署 + 4G 网络模拟（150ms RTT, 1.6Mbps 下行）下：

| Web Vital | 目标 | 预估 | 风险因素 |
|-----------|------|------|----------|
| FCP | < 1.8s (Good) | ~0.8s | 首屏 ~95KB，HTTP/2 下 1-2 RTT |
| LCP | < 2.5s (Good) | ~1.2s | 通常是书架页大标题或封面图 |
| CLS | < 0.1 (Good) | ~0.02 | Vant 组件有固定布局，风险低 |
| TBT | < 200ms (Good) | < 50ms | 首屏无长任务 |
| TTI | < 3.8s (Good) | ~1.5s | IndexedDB + Trie 初始化在 FCP 后执行 |
| Speed Index | < 3.4s (Good) | ~1.5s | 首屏内容快速填充 |

### 7.3 优化建议清单

**P0（必须做）**：

1. 路由懒加载所有非首屏页面（Bookshelf 除外）
2. MDX 依赖（mdict-js, lzo-wasm）排除首屏，dynamic import 按需加载
3. ModulePreload 过滤非首屏 chunk
4. 生产构建关闭 sourcemap
5. 启用 Brotli 压缩（Vercel 默认支持）

**P1（应该做）**：

1. Vant 按需引入（仅使用需要的组件）
2. 经书封面图使用 WebP + 响应式 srcset
3. 内置词典全量预热到 LRU 缓存
4. 分阶段初始化（FCP 后再执行重任务）
5. 段落懒渲染（大字量经文）

**P2（可以做）**：

1. 使用 terser 替代 esbuild（压缩率提升 1-2%，性价比低）
2. 引入 Service Worker 实现离线阅读
3. 字体子集化（若使用自定义经文字体）
4. CI/CD 中集成 Lighthouse CI 监控

## 8. 测试方法

### 8.1 Lighthouse CI

**安装与配置**：

```bash
npm add -D @lhci/cli
```

**lighthouserc.json**：

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": [
        "http://localhost/",
        "http://localhost/#/reader/xin-jing",
        "http://localhost/#/dict"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "mobile",
        "throttlingMethod": "simulate",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1600,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.90 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**CI 集成**（GitHub Actions）：

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - run: npx lhci autorun
```

### 8.2 WebPageTest

**使用方法**：

1. 访问 https://www.webpagetest.org
2. 输入部署后的 URL（如 `https://ai-buddhist-reader.vercel.app`）
3. 选择测试位置（推荐：California - Moto G4 on 4G）
4. 运行测试并分析结果

**关键关注指标**：

| 指标 | 查看位置 | 目标 |
|------|----------|------|
| First Byte Time | Waterfall 图表 | < 200ms |
| Start Render | Waterfall 图表 | < 1.5s |
| Fully Loaded Time | Summary | < 3s |
| Requests | Summary | < 30（首屏） |
| Bytes In | Summary | < 300KB（首屏） |
| Long Tasks | Performance | 0（首屏） |

### 8.3 Chrome DevTools Performance 面板

**测试步骤**：

1. 打开 `chrome://inspect` 或直接 F12
2. 切换到 Performance 面板
3. 勾选 "Screenshots" 和 "Memory"
4. 点击录制按钮 → 刷新页面 → 停止录制
5. 分析时间线

**关键分析点**：

| 分析项 | 查看方法 | 目标 |
|--------|----------|------|
| **FCP 时间** | 时间线上 "FCP" 标记 | < 0.8s |
| **主线程活动** | Main 栏目的火焰图 | 首屏无 > 50ms 长任务 |
| **脚本执行时间** | Summary 面板 "Scripting" 占比 | < 30% 首屏时间 |
| **布局/绘制开销** | Summary 面板 "Rendering" + "Painting" | 单次 < 5ms |
| **JS 堆内存** | Memory 栏目 | 稳定 < 20MB，无持续增长 |
| **DOM 节点数** | Summary 面板 "Nodes" | 首屏 < 1000 |
| **事件监听器** | Summary 面板 "Listeners" | < 50（首屏） |

### 8.4 自定义性能埋点

在关键路径添加 Performance API 埋点：

```javascript
// engine/highlighter.js
function highlightText(text, enabledDictIds) {
  const t0 = performance.now()
  const matches = trieManager.searchAll(text)
  const matchTime = performance.now() - t0

  const t1 = performance.now()
  const html = buildHighlightedHTML(text, matches)
  const renderTime = performance.now() - t1

  // 记录到 statsStore
  if (matchTime > 20 || renderTime > 30) {
    console.warn(`[性能告警] 高亮匹配: ${matchTime.toFixed(1)}ms, 渲染: ${renderTime.toFixed(1)}ms`)
  }

  return { html, timing: { matchTime, renderTime } }
}

// services/dictService.js
async function lookupTerm(term, dictId) {
  const key = `${dictId}::${term}`
  const t0 = performance.now()

  let entry = definitionCache.get(key)
  let source = 'cache'
  if (!entry) {
    entry = await db.get('dict_entries', key)
    source = 'db'
    if (entry) definitionCache.set(key, entry)
  }

  const elapsed = performance.now() - t0
  if (elapsed > 200) {
    console.warn(`[性能告警] 释义查询: ${elapsed.toFixed(1)}ms (source: ${source})`)
  }

  return entry
}
```

### 8.5 内存泄漏检测

**Chrome DevTools Memory 面板**：

1. 执行操作（如：上传词典 → 切换开关 → 删除词典）
2. 拍摄 Heap Snapshot（操作前、后各一次）
3. 对比两次快照，查看 "Comparison" 视图
4. 检查是否有持续增长的对象类型

**重点监控对象**：

| 对象类型 | 预期行为 | 泄漏信号 |
|----------|----------|----------|
| TrieNode | 词典关闭后应被 GC | 关闭后仍有大量 TrieNode 存活 |
| DictEntry | 缓存淘汰后应被 GC | LRU 淘汰后仍被引用 |
| Vue 组件实例 | 路由切换后应销毁 | 旧页面组件实例残留 |
| EventListener | 组件销毁后应移除 | 数量只增不减 |

## 9. 结论与建议

### 9.1 性能优化策略总结

| 层级 | 策略 | 优先级 | 预期收益 |
|------|------|--------|----------|
| **首屏加载** | 路由懒加载 + manualChunks 拆分 + ModulePreload 过滤 | P0 | 首屏 bundle ~95KB，FCP < 0.8s |
| **首屏加载** | 生产关闭 sourcemap + esbuild minify | P0 | 产物体积减少 30-50% |
| **首屏加载** | Brotli 压缩（Vercel 默认） | P0 | 额外减少 15-20% 传输体积 |
| **运行时** | Trie 构建放 Worker + 匹配放主线程 | P0 | 首屏无长任务，高亮 < 50ms |
| **运行时** | LRU 释义缓存（Map 实现，1000 条） | P0 | 缓存命中 < 1ms，DB 查询 < 5ms |
| **运行时** | 段落懒渲染 + HTML 字符串 innerHTML | P1 | 千字经文渲染 < 20ms |
| **运行时** | 分阶段初始化（FCP 后再执行重任务） | P1 | 改善 FCP 和 LCP 体验 |
| **资源** | 系统字体优先 + SVG 图标 | P1 | 零字体加载延迟 |
| **资源** | 图片 WebP + 响应式 srcset | P2 | 移动端节省 50-70% 图片体积 |
| **缓存** | content hash + immutable 缓存策略 | P0 | 重复访问接近瞬时加载 |
| **监控** | Lighthouse CI + 自定义 Performance 埋点 | P1 | 持续监控性能回归 |

### 9.2 各项指标可达性评估

| 指标 | 目标 | 可达性 | 关键依赖 |
|------|------|--------|----------|
| FCP < 0.8s | 可达 | 首屏 ~95KB，HTTP/2 下单 RTT ~100ms，加上解析执行 < 0.8s | Vite 拆分正确配置 |
| LCP < 1.2s | 可达 | FCP 后内容快速填充，无阻塞资源 | 避免大图片/字体阻塞 |
| TTI < 1.5s | 可达 | 分阶段初始化，重任务延后执行 | Worker 异步构建 Trie |
| 高亮 < 50ms | 远超 | 实测 11-23ms（1000 字） | Trie 主线程匹配 + HTML 渲染 |
| 释义 < 200ms | 远超 | 缓存命中 < 1ms，DB 查询 < 5ms | LRU 缓存 + IndexedDB |
| 内存 < 20MB | 临界 | 正常场景 ~18MB，全词典启用峰值可能 ~23MB | 需监控 Trie 内存 |
| Lighthouse >= 90 | 可达 | 首屏轻量、无阻塞、CLS 低 | 上述所有优化到位 |

## 10. 对 v2.1 方案的影响

基于本分析结果，对 v2.1 方案提出以下具体调整建议：

| 影响项 | 说明 | 优先级 |
|--------|------|--------|
| **Worker 架构必须先行** | Trie 构建和 MDX 解析必须在 Phase 1 就放入 Worker，不能延后 | **P0** |
| **LRU 缓存同步实现** | 释义缓存是 Phase 2 词典延迟加载的基础，需同步实现 | **P0** |
| **分阶段初始化** | 应用启动流程需设计为非阻塞的 Phase 1 → Phase 2 模式 | **P0** |
| **段落懒渲染组件** | Reader 页需实现基于 IntersectionObserver 的段落懒渲染 | **P1** |
| **性能埋点集成** | highlighter.js 和 dictService.js 中集成 `performance.now()` 埋点 | **P1** |
| **内存监控** | 开发阶段使用 Chrome DevTools Memory 面板定期检测 Trie 和缓存内存 | **P1** |
| **Lighthouse CI 集成** | 在 CI/CD 中配置 Lighthouse CI，每次构建自动跑分 | **P2** |
| **Vant 按需引入审计** | 定期审查 Vant 组件引入方式，确保没有全量引入 | **P2** |
| **WebP 图片管线** | 若有封面图等资源，需配置 Vite 的 WebP 转换插件 | **P2** |

### 10.1 Phase 1 新增任务

| 任务 | 工时 | 产出 |
|------|------|------|
| Worker 管理器实现 | 3h | `engine/workers/workerManager.js` |
| Trie 构建 Worker | 3h | `engine/workers/main.worker.js` + 构建逻辑 |
| LRU 缓存实现 | 1h | `engine/definitionCache.js`（~25 行） |
| 分阶段初始化 | 2h | `main.js` 重构 |
| 性能埋点 | 2h | 关键路径添加 `performance.now()` 测量 |

### 10.2 Phase 4 性能优化任务更新

| 原任务 | 更新后 | 说明 |
|--------|--------|------|
| 性能优化（4h） | 性能优化（6h）+ Lighthouse 集成（2h） | 增加 CI 集成和性能监控 |
| 缓存策略（3h） | 释义缓存已在 Phase 2 完成，Phase 4 仅验证 | 缓存策略提前实现 |
| 响应式完善（3h） | 保持不变 | 多终端适配 |

---

*文档版本: v1.0*
*最后更新: 2026-05-02*
