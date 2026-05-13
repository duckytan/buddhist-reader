# PWA 离线能力分析 报告

> 任务编号：T-39
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 采用纯前端架构（Vue 3 + Vite + Vant 4），所有数据存储在浏览器端（IndexedDB + Cache API），不依赖后端服务器。这使得项目天然适合构建为 PWA（Progressive Web Application），为用户提供离线阅读体验。

**核心目标**：
- 用户在地铁、飞机、山区等无网络场景下，仍能正常使用已导入的词典和已加载的经书
- 提供"添加到主屏幕"的原生应用体验
- 离线时优雅降级，明确告知用户哪些功能不可用
- 不影响在线场景下的正常使用和更新体验

**技术前提**：项目为 SPA（单页应用），Vue Router 使用 History 模式，静态资源通过 Vite 构建，业务数据通过 IndexedDB 存取。这些条件与 PWA 技术栈高度匹配。

## 2. Service Worker 策略

### 2.1 缓存策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **缓存优先（Cache First）** | 响应极快，无需网络；离线完全可用 | 可能返回过期资源，需要版本控制 | 静态资源（HTML/CSS/JS/字体/图标）、已构建的 SPA 壳 |
| **网络优先（Network First）** | 始终获取最新内容 | 网络差时体验下降；离线时依赖 fallback | 需要实时性的动态内容 |
| **先缓存后验证（Stale While Revalidate）** | 兼顾速度与新鲜度；离线时返回缓存 | 需要两次请求（返回缓存 + 后台更新） | 不关键但希望保持更新的 API 数据 |
| **预缓存（Precache）** | 安装时即缓存，首次离线即可用 | 首次加载体积增大；需要管理缓存版本 | App Shell 核心文件 |

### 2.2 推荐方案

采用 **混合策略**，按请求类型分配不同的缓存策略：

```
┌──────────────────────────────────────────────────────────┐
│                    Service Worker 路由策略                 │
├──────────────────────┬─────────────────────┬──────────────┤
│ 请求类型              │ 缓存策略             │ 说明         │
├──────────────────────┼─────────────────────┼──────────────┤
│ 构建产物              │ Precache            │ Vite 构建的  │
│ (*.js, *.css,        │ (Cache First)       │ JS/CSS/HTML  │
│ index.html)          │                     │ 带 hash 命名 │
├──────────────────────┼─────────────────────┼──────────────┤
│ 字体/图片资源         │ CacheFirst          │ 首次下载后   │
│ (/assets/*)          │ + Expiration        │ 长期缓存     │
├──────────────────────┼─────────────────────┼──────────────┤
│ 导航请求              │ NetworkFirst        │ 在线优先获取 │
│ (request.mode=       │ + navigateFallback  │ 新内容，离线 │
│ navigate)            │ → index.html        │ 回退 SPA 壳  │
├──────────────────────┼─────────────────────┼──────────────┤
│ 外部 API (TTS 等)    │ NetworkFirst        │ 需要网络，   │
│ (/api/* 如有)        │ + timeout           │ 失败时降级   │
└──────────────────────┴─────────────────────┴──────────────┘
```

**关键设计决策**：

1. **为什么导航请求用 NetworkFirst 而非 CacheFirst？**
   - 本项目为 SPA，所有路由都指向 `index.html`，预缓存的 `index.html` 已经包含了完整的 JS 应用
   - 但用户可能通过 URL 直接访问深层路由（如 `/#/reader/xin-jing`），这种情况下 NetworkFirst 可以在在线时获取最新版本
   - 离线时通过 `navigateFallback: '/index.html'` 回退，Vue Router 接管路由恢复页面

2. **为什么不需要为业务数据（经书/词典）配置 Service Worker 缓存？**
   - 业务数据已存储在 IndexedDB 中，Service Worker 的 Cache API 主要用于缓存网络请求的响应（HTTP 资源）
   - IndexedDB 本身就是持久化存储，天然支持离线读写
   - Service Worker + IndexedDB 的分工：SW 管静态资源缓存，IndexedDB 管业务数据

3. **SPA 的特殊处理**：
   - Vite 构建产物使用文件名 hash（如 `app-abc123.js`），天然解决了缓存失效问题
   - `navigateFallback` 是 SPA 必须的配置，否则未预缓存的路由在离线时会返回 404

### 2.3 实现方案：vite-plugin-pwa

推荐使用 `vite-plugin-pwa` 插件，它集成了 Workbox，无需手写 Service Worker：

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: '般若佛经阅读器',
        short_name: '般若经读',
        description: '专注佛教经文诵读的阅读工具',
        theme_color: '#F5F0E8',
        background_color: '#F5F0E8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
```

## 3. 离线功能

### 3.1 离线词典

**完全离线可用。**

已导入的词典数据存储在 IndexedDB 的 `dict_index`、`dict_entries` 和 `dict_config` 表中。Service Worker 缓存了应用壳（JS/CSS/HTML），IndexedDB 存储了词典数据。离线时的数据读取链路：

```
用户点击术语 → 检查 LRU 内存缓存 → 查询 IndexedDB (dict_entries) → 渲染释义
```

**无需网络的原因**：
- 词典数据在导入时已完整写入 IndexedDB
- 小词典（<5MB）预解析为 JSON 存储在 `dict_entries`
- 大词典保留原 .mdx 文件在 File Cache 区域，通过 `mdict-js` 在本地解析查询
- Trie 引擎在内存中运行，所有匹配操作无需网络

**离线时的完整能力**：
- 术语高亮匹配（Trie 引擎）
- 点击术语查看释义
- 多词典流式展示
- 用户笔记查看和编辑（`user_notes` 表）

### 3.2 离线经书

**完全离线可用。**

已加载的经书数据存储在 IndexedDB 的 `sutra_index` 和 `sutra_content` 表中。离线时：

```
打开阅读页 → 从 IndexedDB 加载经书元信息 → 按需加载章节内容 → 渲染经文
```

**无需网络的原因**：
- 经书内容在导入或首次加载时分块存储在 `sutra_content` 表
- 阅读进度、书签均存储在 IndexedDB（`reading_progress`、`bookmarks` 表）
- 功德统计存储在 `reading_stats` 表

**离线时的完整能力**：
- 打开已加载的经书
- 翻阅所有章节
- 查看/添加书签
- 记录诵读时间（功德统计）
- 保存阅读进度

### 3.3 离线功能降级

离线时以下功能 **不可用或受限**：

| 功能 | 离线状态 | 降级策略 |
|------|----------|----------|
| **TTS 语音朗读** | 部分可用 | Web Speech API 是浏览器内置能力，**不依赖网络**，但某些浏览器可能需要首次在线加载语音包。建议在设置页标注"离线语音可能受限" |
| **导入新词典** | 不可用 | 隐藏上传按钮或显示"需要网络"提示 |
| **导入新经书** | 不可用 | 隐藏上传按钮或显示"需要网络"提示 |
| **应用更新检查** | 不可用 | Service Worker 的 `autoUpdate` 模式在离线时不触发，下次在线时自动更新 |
| **Vercel 部署统计** | 不可用 | 无影响，这是服务端功能 |
| **词典分享** | 不可用 | 标记为"不做清单"（D22） |
| **外部在线词典** | 不可用 | 如果未来支持远程词典 API，离线时跳过该词典的查询 |

**离线状态提示设计**：

```
┌──────────────────────────────────────┐
│  ⚡ 当前为离线模式                    │
│  已导入的词典和经书可正常使用          │
│  [知道了]                            │
└──────────────────────────────────────┘
```

- 仅在从在线切换到离线时显示一次（通过 `navigator.onLine` 事件）
- 使用 toast 或 banner，不打断用户操作
- 可手动在网络状态栏查看当前连接状态

**实现方式**：

```javascript
// 主线程监听网络状态
window.addEventListener('offline', () => {
  // 显示离线提示（仅首次）
  if (!sessionStorage.getItem('offline-notified')) {
    showOfflineBanner()
    sessionStorage.setItem('offline-notified', 'true')
  }
  // 更新全局状态
  useSettingStore().setOnlineStatus(false)
})

window.addEventListener('online', () => {
  hideOfflineBanner()
  useSettingStore().setOnlineStatus(true)
  // 清除通知标记，下次离线时再次提示
  sessionStorage.removeItem('offline-notified')
})
```

## 4. PWA 安装

### 4.1 安装条件

浏览器自动显示"添加到主屏幕"提示需要满足以下条件：

| 条件 | 说明 | 本项目满足方式 |
|------|------|----------------|
| HTTPS 部署 | Service Worker 只能在安全上下文中运行 | Vercel 自动提供 HTTPS |
| Web App Manifest | 提供应用元数据（名称、图标、启动方式） | `manifest.json` 由 vite-plugin-pwa 生成 |
| Service Worker 注册 | 必须有注册并激活的 Service Worker | `vite-plugin-pwa` 自动注册 |
| 用户互动要求 | 用户至少访问过一次，且有一定互动 | 自然满足 |

### 4.2 Manifest 配置建议

```json
{
  "name": "般若佛经阅读器",
  "short_name": "般若经读",
  "description": "专注佛教经文诵读的阅读工具，支持词典高亮、TTS 朗读、功德统计",
  "start_url": "/?utm_source=homescreen",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#F5F0E8",
  "background_color": "#F5F0E8",
  "categories": ["education", "books", "lifestyle"],
  "lang": "zh-CN",
  "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**关键配置说明**：
- `display: "standalone"`：隐藏浏览器地址栏和导航栏，提供类原生 App 体验
- `start_url` 带 `utm_source` 参数，便于统计从主屏幕启动的用户
- `purpose: "maskable"` 图标用于 Android 自适应图标
- `theme_color` 和 `background_color` 使用项目的禅意色调（#F5F0E8 米白色）

### 4.3 自定义安装提示

浏览器默认的安装提示可能不够明显。可以通过监听 `beforeinstallprompt` 事件，在合适的时机主动引导用户安装：

```javascript
// composables/usePwaInstall.js
import { ref, onMounted } from 'vue'

export function usePwaInstall() {
  const isInstallable = ref(false)
  const isInstalled = ref(false)
  let deferredPrompt = null

  onMounted(() => {
    // 检查是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
      return
    }

    // 监听安装提示事件
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      isInstallable.value = true
    })

    // 监听安装成功事件
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      isInstallable.value = false
      deferredPrompt = null
    })
  })

  async function promptInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('用户已安装 PWA')
    }
    deferredPrompt = null
    isInstallable.value = false
  }

  return { isInstallable, isInstalled, promptInstall }
}
```

**引导时机建议**：
- 不要在首次访问时就提示安装（用户体验差）
- 在用户完成一次完整阅读（如读完一章心经）后，在设置页或书架页底部温和提示
- 使用非侵入式 banner，而非弹窗

### 4.4 iOS Safari 特殊处理

iOS Safari 不支持 `beforeinstallprompt` 事件，需要手动引导：

```html
<!-- iOS 专属引导 -->
<div v-if="isIOS && !isInstalled" class="ios-install-guide">
  <p>添加到主屏幕，离线也能使用</p>
  <p>1. 点击底部分享按钮 <img src="/share-icon.svg" alt="分享" /></p>
  <p>2. 选择"添加到主屏幕"</p>
</div>
```

```javascript
// 检测 iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  && !window.MSStream
```

### 4.5 Service Worker 更新策略

使用 `registerType: 'autoUpdate'` 模式：
- 检测到新的 Service Worker 时，自动跳过等待并激活
- 用户无需手动刷新
- 新的缓存版本会在后台下载，下次访问生效

**注意事项**：
- 更新发生在用户关闭并重新打开应用时
- 如果用户长期不关闭 PWA（如一直停留在后台），可能需要通过 `workbox-window` 发送更新通知
- 建议在每次更新后显示 toast："应用已更新到最新版本"

## 5. 同类 App 对比

| App | 平台 | 离线策略 | 词典离线 | 内容离线 | 安装方式 | 特点 |
|-----|------|----------|----------|----------|----------|------|
| **微信读书** | 原生 App | 完整离线 | N/A | 已下载书籍完全离线 | 应用商店下载 | 书籍需主动下载，支持离线划线笔记 |
| **Kindle** | 原生 App / 设备 | 完整离线 | N/A | 已下载书籍完全离线 | 应用商店下载 | DRM 保护，需先同步下载 |
| **佛教网（fojiao.cn）** | H5 | 无离线 | N/A | 不可离线 | 浏览器访问 | 纯在线阅读，无 PWA 支持 |
| **佛弟子文库** | H5 | 无离线 | N/A | 不可离线 | 浏览器访问 | 传统网站，无 PWA 能力 |
| ** Bible App (YouVersion)** | 原生 + PWA | 完整离线 | 内置多语言 | 已下载译本完全离线 | 应用商店 / PWA | 支持 PWA 安装，离线阅读圣经，多译本切换 |
| **Quran.com** | PWA | 完整离线 | 多语言翻译 | 已加载章节完全离线 | PWA 安装 | 优秀的 PWA 实现，离线可用，支持音频缓存 |
| **本项目（般若经读）** | PWA | 完整离线 | 已导入词典完全离线 | 已加载经书完全离线 | PWA 安装 | 纯前端，无需后端，所有数据在本地 |

**关键洞察**：

1. **Bible App (YouVersion)** 是最值得参考的同类产品：它同时提供原生 App 和 PWA，PWA 版本支持离线阅读、多语言词典、书签和笔记。其 PWA 策略与本项目高度一致。

2. **Quran.com** 的 PWA 实现是技术参考标杆：采用 Service Worker + IndexedDB 架构，离线时完整可用，且音频资源也可缓存。

3. **传统佛教网站均无离线能力**：这是一个差异化优势。提供离线阅读能力的佛教阅读工具在 H5 领域较为稀缺。

4. **纯前端 PWA vs 原生 App**：
   - PWA 优势：无需应用商店审核、更新即时生效、包体积极小（本项目预计 <2MB）、跨平台统一
   - PWA 劣势：iOS 支持有限（不支持后台同步、推送通知受限）、无法使用部分系统 API
   - 对于阅读类应用，PWA 已能满足核心需求

## 6. 结论与建议

### 6.1 明确的 PWA 策略

**推荐在 v2.0 中集成 PWA 离线支持**，理由如下：

1. **技术可行**：项目纯前端架构天然适合 PWA，无需额外的后端支持
2. **用户体验**：佛教修行者常在寺庙、禅修营等网络不稳定场所使用，离线能力是刚需
3. **开发成本低**：`vite-plugin-pwa` 几乎零配置即可启用，核心工作在于 Manifest 设计和安装引导
4. **差异化优势**：同类佛教阅读工具几乎没有离线能力

### 6.2 实施建议

| 阶段 | 任务 | 优先级 | 工时估算 |
|------|------|--------|----------|
| **Phase 4 集成** | 安装 `vite-plugin-pwa`，配置 manifest 和 workbox | P0 | 2h |
| **Phase 4 集成** | 设计 PWA 图标（192x192, 512x512, maskable） | P0 | 2h |
| **Phase 4 集成** | 实现网络状态监听和离线提示 | P1 | 2h |
| **Phase 4 集成** | iOS Safari 安装引导 | P1 | 1h |
| **Phase 4 集成** | 自定义安装提示（afterinstallprompt） | P2 | 2h |
| **Phase 4 集成** | Service Worker 更新通知 | P2 | 1h |

### 6.3 技术要点总结

```
PWA 离线 = Service Worker (静态资源缓存) + IndexedDB (业务数据存储)

┌─────────────────────────────────────────────────────────┐
│                    离线能力全貌                          │
├─────────────────────────────┬───────────────────────────┤
│ 缓存层                       │ 存储内容                   │
├─────────────────────────────┼───────────────────────────┤
│ Service Worker Cache API    │ HTML/CSS/JS/字体/图标     │
│                             │ （Vite 构建产物）          │
├─────────────────────────────┼───────────────────────────┤
│ IndexedDB                   │ 经书内容、词典数据、       │
│                             │ 阅读进度、书签、笔记、统计  │
├─────────────────────────────┼───────────────────────────┤
│ LRU 内存缓存                 │ 近期查询的词典释义          │
├─────────────────────────────┼───────────────────────────┤
│ File Cache (IndexedDB Blob) │ 大 MDX 词典原文件           │
└─────────────────────────────┴───────────────────────────┘

离线完全可用：✅ 阅读已加载经书、✅ 查看已导入词典释义、
              ✅ 高亮术语匹配、✅ 书签和笔记、✅ 功德统计
离线不可用：❌ 导入新词典/经书、❌ TTS 语音包首次加载（部分浏览器）
```

## 7. 对 v2.1 方案的影响

| 影响点 | 说明 | 建议 |
|--------|------|------|
| **v2.0 Phase 4 需提前** | PWA 集成建议从 Phase 4 提前到 Phase 1 或 Phase 2，因为 Service Worker 会影响整体架构 | 在 Phase 1 项目初始化时就配置好 PWA 基础框架 |
| **存储容量规划** | 离线场景下用户可能导入更多词典和经书，需要关注 IndexedDB 存储限制 | T-38 已分析移动端存储限制，需在此基础上评估 PWA 离线数据量 |
| **缓存策略与 T-47 联动** | T-47 分析了多级缓存策略，PWA 的 Service Worker 缓存是其中的一环 | 确保 T-47 的缓存策略与 SW 策略一致，避免重复缓存 |
| **离线功能测试** | 需要增加离线场景的测试用例 | 在 T-44 测试策略中增加 PWA 离线测试 |
| **安装引导时机** | 需要在用户流程中设计安装引导的触发点 | 建议在用户完成首次经文阅读后弹出引导，而非首次访问 |
| **版本号管理** | Service Worker 缓存需要版本管理，与 IndexedDB schema 版本需协调 | 在 `db.js` 的 version 递增时，同步更新 SW 的 CACHE_NAME |
| **不影响 v2.0 核心架构** | PWA 是增强功能，不改变 Service 层和 Storage 层的设计 | 保持 v2.0 架构不变，PWA 作为构建层配置 |
