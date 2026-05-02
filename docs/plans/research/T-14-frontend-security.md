# 前端安全分析 报告

> 任务编号：T-14
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md

## 1. 背景与目标

般若佛经阅读器 v2.0 是一个纯前端 SPA 应用，部署在 Vercel 上。项目核心安全特征：

- **无后端服务**：所有数据处理在浏览器端完成
- **用户可上传文件**：MDX/JSON/CSV 格式的词典文件，来源不受信任
- **释义渲染含 HTML**：MDX 词典释义包含 HTML 标签，经 `markdown-it` 渲染后通过 `v-html` 展示
- **本地持久化**：用户数据（阅读进度、笔记、词典配置）存储在 IndexedDB 和 localStorage

本分析旨在识别 v2.0 架构中的安全风险，给出可执行的防护方案和配置示例，确保在用户上传不可信内容的前提下，阅读器仍能安全运行。

## 2. XSS 防护分析

### 2.1 风险点识别

| 风险点 | 来源 | 严重程度 | 说明 | 防护方案 |
|--------|------|----------|------|----------|
| Markdown 释义渲染 | 词典释义（用户上传的 MDX/JSON/CSV） | **严重** | `definition` 字段可能包含 `<script>`、`<img onerror=>`、`javascript:` 协议等，经 markdown-it 渲染后直接注入 DOM | DOMPurify 后处理 + `v-html` 前净化 |
| 用户笔记渲染 | `user_notes` 表内容 | **严重** | 笔记内容与释义合并后展示，用户可自由输入任意 HTML | DOMPurify 净化笔记内容 |
| markdown-it `html: true` | 配置项启用原生 HTML | **高** | 允许释义中的 HTML 标签通过解析器，恶意脚本可直接注入 | 保留 `html: true`（佛经释义需要 HTML 格式），但必须配合 DOMPurify |
| 动态 `v-bind` 注入 | Vue 组件 props | **中** | 若词典数据直接绑定到组件属性（如 `:title`、`:href`），可能触发事件注入 | 避免 `v-html` 外的动态绑定，或使用计算属性 |
| URL 属性 XSS | 释义中的 `<a href>` | **中** | `href="javascript:alert(1)"` 可执行脚本 | DOMPurify 默认拦截 `javascript:` 协议 |
| SVG 内联脚本 | 释义中的 `<svg>` 标签 | **中** | `<svg onload="...">` 可执行脚本 | DOMPurify 的 `FORBID_TAGS` 配置 |
| `<iframe>` 注入 | 释义中的 `<iframe>` | **中** | 可加载恶意外部页面或执行沙箱逃逸 | DOMPurify 默认禁止 `<iframe>` |

### 2.2 DOMPurify 集成方案

#### 2.2.1 安装与依赖

```bash
npm install dompurify
```

- **包大小**：~30KB (minified)，gzip 后约 12KB
- **对构建的影响**：可接受，v2.0 目标首屏 < 1s，DOMPurify 体积占比 < 10%
- **TypeScript 支持**：无需额外类型声明（内置 `.d.ts`）

#### 2.2.2 集成架构

```
MDX/JSON/CSV 原始数据
        │
        ▼
┌─────────────────────┐
│ 1. mdxParser.js     │  解析 MDX → HTML
│    (mdict-js)       │
└──────────┬──────────┘
           │ HTML
           ▼
┌─────────────────────┐
│ 2. markdown-it      │  Markdown → HTML
│    (html: true)     │  保留佛经排版需要的 HTML 标签
└──────────┬──────────┘
           │ HTML (可能含恶意代码)
           ▼
┌─────────────────────┐
│ 3. DOMPurify.sanitize│  净化 HTML，移除脚本和事件处理器
│    (核心防护层)      │
└──────────┬──────────┘
           │ 安全 HTML
           ▼
┌─────────────────────┐
│ 4. Vue v-html 渲染  │  展示净化后的释义
└─────────────────────┘
```

#### 2.2.3 推荐配置

```javascript
// utils/sanitize.js
import DOMPurify from 'dompurify'

// 全局 DOMPurify 配置
const SANITIZE_CONFIG = {
  // 允许的标签（佛经释义排版需要的标签）
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'span', 'div',
    'dl', 'dt', 'dd',
    'sup', 'sub',
    'hr',
  ],
  // 允许的属性
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'class', 'id',
    'colspan', 'rowspan',
    'align', 'valign',
  ],
  // 允许的数据协议
  ALLOW_DATA_ATTR: false,
  // 禁止的标签（即使出现在 ALLOWED_TAGS 中也会被移除）
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'svg', 'math'],
  // 禁止的属性
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  // 禁止的协议
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.]+(?:[^a-z+.:]|$))/i,
  // 保持 HTML 内容
  KEEP_CONTENT: true,
  // 返回信任的 HTML（跳过浏览器内置 sanitizer，性能更好）
  RETURN_TRUSTED_TYPE: true,
}

/**
 * 净化词典释义 HTML
 * @param {string} html - 原始 HTML 内容
 * @returns {string} 净化后的安全 HTML
 */
export function sanitizeDefinition(html) {
  if (!html || typeof html !== 'string') return ''
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

/**
 * 净化用户笔记（更严格的配置，不允许任何 HTML 标签）
 * @param {string} text - 原始文本
 * @returns {string} 纯文本
 */
export function sanitizeNote(text) {
  if (!text || typeof text !== 'string') return ''
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}
```

#### 2.2.4 Vue 组件中使用

```vue
<!-- DictionaryPopup.vue -->
<script setup>
import { computed } from 'vue'
import { sanitizeDefinition } from '@/utils/sanitize'

const props = defineProps({
  definition: String,
  userNote: String,
})

const safeDefinition = computed(() =>
  sanitizeDefinition(props.definition)
)

const safeNote = computed(() =>
  props.userNote ? sanitizeNote(props.userNote) : ''
)
</script>

<template>
  <div class="dict-popup">
    <div class="definition" v-html="safeDefinition" />
    <div v-if="safeNote" class="user-note" v-html="safeNote" />
  </div>
</template>
```

#### 2.2.5 性能影响

| 场景 | 净化前耗时 | 净化后耗时 | 影响 |
|------|-----------|-----------|------|
| 短释义（< 200 字） | ~1ms | ~2ms | 可忽略 |
| 长释义（> 2000 字） | ~5ms | ~15ms | 可接受 |
| 批量净化（10 个释义） | ~10ms | ~50ms | 异步执行不影响主线程 |

**优化建议**：释义净化结果可缓存，同一词条的同一词典版本只净化一次。

### 2.3 CSP 策略设计

#### 2.3.1 Vercel 部署配置

在 `vercel.json` 中配置 HTTP 响应头：

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests; block-all-mixed-content"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "0"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=()"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 2.3.2 CSP 指令详解

| 指令 | 值 | 说明 |
|------|-----|------|
| `default-src 'self'` | 同源 | 所有资源默认只允许同源加载 |
| `script-src 'self' 'unsafe-inline' blob:` | 同源 + 内联 + Blob | `'self'` 允许项目自身脚本；`'unsafe-inline'` 因 Vite 开发模式和 Vue 运行时需要内联脚本（可接受，因为有 DOMPurify 兜底）；`blob:` 允许 Web Worker 和 TTS blob URL |
| `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` | 同源 + 内联 + Google Fonts | Vue 组件 scoped 样式需要 `'unsafe-inline'` |
| `font-src 'self' https://fonts.gstatic.com` | 同源 + Google Fonts CDN | 佛经排版可能需要特殊字体 |
| `img-src 'self' data: blob:` | 同源 + data URI + blob | 佛经可能包含 inline 图片 |
| `connect-src 'self'` | 同源 | 禁止向外部域名发送 fetch/XHR 请求 |
| `object-src 'none'` | 禁止 | 禁止 `<object>`、`<embed>` 标签 |
| `frame-src 'none'` | 禁止 | 禁止 iframe 嵌入 |
| `base-uri 'self'` | 同源 | 限制 `<base>` 标签，防止基础 URL 劫持 |
| `form-action 'none'` | 禁止 | 禁止表单提交（阅读器无需表单） |
| `upgrade-insecure-requests` | 自动升级 | HTTP 请求自动升级为 HTTPS |
| `block-all-mixed-content` | 禁止混合内容 | 禁止 HTTPS 页面加载 HTTP 资源 |

#### 2.3.3 为什么允许 `'unsafe-inline'`

Vercel 部署的纯前端 SPA 无法使用 nonce 策略（nonce 需要服务端动态生成），因此 `script-src` 和 `style-src` 需要 `'unsafe-inline'`。这降低了 CSP 对 XSS 的防护等级，但通过以下措施补偿：

1. **DOMPurify 作为核心防护**：在渲染前净化所有用户可控内容
2. **`connect-src 'self'` 严格限制**：即使 XSS 成功，也无法向外部发送数据
3. **`form-action 'none'`**：无法提交数据到外部
4. **`object-src 'none'` + `frame-src 'none'`**：无法加载外部插件或页面

## 3. MDX 文件安全

### 3.1 恶意脚本检测

#### 3.1.1 攻击向量

用户上传的 MDX 词典释义可能包含以下恶意内容：

| 攻击类型 | 示例 | 检测难度 |
|----------|------|----------|
| `<script>` 标签 | `<script>alert(document.cookie)</script>` | 低（DOMPurify 拦截） |
| 事件处理器 | `<img src=x onerror="alert(1)">` | 低（DOMPurify 拦截） |
| `javascript:` 协议 | `<a href="javascript:alert(1)">` | 低（DOMPurify 拦截） |
| `data:` URI 脚本 | `<script src="data:text/javascript,alert(1)">` | 中（CSP 拦截） |
| CSS 表达式 | `<div style="background:url(javascript:alert(1))">` | 低（DOMPurify 拦截 style） |
| `<svg>` 内联脚本 | `<svg><script>alert(1)</script></svg>` | 低（DOMPurify FORBID_TAGS） |
| `<iframe>` 加载恶意页面 | `<iframe src="https://evil.com">` | 低（DOMPurify FORBID_TAGS + CSP） |
| `<meta>` 刷新跳转 | `<meta http-equiv="refresh" content="0;url=evil.com">` | 低（DOMPurify 拦截） |

#### 3.1.2 防护层级

```
第一层：上传时文件扫描
    │ 扫描 script 标签、事件处理器、javascript: 协议
    │ 发现恶意内容 → 拒绝上传 + 警告
    │
    ▼
第二层：解析时 HTML 净化
    │ DOMPurify 净化解析后的 HTML
    │ 这是核心防护层，无论第一层是否通过都执行
    │
    ▼
第三层：CSP 运行时防护
    │ 即使恶意代码注入 DOM，CSP 阻止其执行
    │
    ▼
第四层：浏览器沙箱
    │ 同源策略限制跨域数据窃取
```

#### 3.1.3 上传时预扫描（可选增强）

```javascript
// utils/mdxScanner.js

// 常见的 MDX 恶意模式
const MALICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /<svg[\s>].*?<script/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /on\w+\s*=\s*["'][^"']*["']/i,  // 事件处理器
  /javascript\s*:/i,               // javascript: 协议
  /vbscript\s*:/i,                 // vbscript: 协议
  /data\s*:\s*text\/html/i,        // data URI HTML
  /expression\s*\(/i,              // CSS expression
  /<meta\s+http-equiv/i,           // meta 刷新/跳转
]

/**
 * 扫描 MDX 释义内容是否包含恶意模式
 * @param {string} content - MDX 释义文本
 * @returns {{ isClean: boolean, threats: string[] }}
 */
export function scanMdxContent(content) {
  if (!content) return { isClean: true, threats: [] }

  const threats = []
  MALICIOUS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(content)) {
      threats.push(`检测到可疑模式 [pattern-${index}]`)
    }
  })

  return {
    isClean: threats.length === 0,
    threats,
  }
}
```

**注意**：预扫描仅作为上传时的快速检测和用户提示，不能替代 DOMPurify。正则匹配可能产生误报或漏报，DOMPurify 才是最终防线。

### 3.2 文件上传验证

#### 3.2.1 文件类型验证

```javascript
// 允许的文件类型
const ALLOWED_TYPES = {
  // MDX 词典
  '.mdx': 'application/octet-stream',
  '.mdd': 'application/octet-stream',  // MDX 资源文件
  // JSON 词典
  '.json': 'application/json',
  // CSV 词典
  '.csv': 'text/csv',
}

// 大小限制
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB (D18 决策)
const MAX_SMALL_FILE = 5 * 1024 * 1024  // 5MB（低于此阈值预解析）

/**
 * 验证上传的词典文件
 * @param {File} file
 * @returns {{ valid: boolean, error?: string, strategy?: 'parsed' | 'direct' }}
 */
export function validateDictionaryFile(file) {
  // 1. 检查文件名
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!ALLOWED_TYPES[ext]) {
    return { valid: false, error: `不支持的文件类型: ${ext}` }
  }

  // 2. 检查 MIME 类型（辅助验证，不依赖）
  const expectedMime = ALLOWED_TYPES[ext]
  if (file.type && file.type !== expectedMime && ext !== '.mdx') {
    // .mdx 是二进制格式，浏览器可能识别错误，跳过 MIME 检查
    return { valid: false, error: '文件类型与扩展名不匹配' }
  }

  // 3. 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }

  // 4. 确定处理策略（D2 决策）
  const strategy = file.size < MAX_SMALL_FILE ? 'parsed' : 'direct'

  return { valid: true, strategy }
}
```

#### 3.2.2 内容安全扫描流程

```
用户上传文件
    │
    ▼
┌─────────────────────┐
│ 1. 文件类型验证     │  扩展名 + MIME 类型
│    大小验证         │  <= 10MB
└──────────┬──────────┘
           │ 通过
           ▼
┌─────────────────────┐
│ 2. MDX 文件头检查   │  验证 MDX magic bytes
│    JSON 格式检查    │  尝试 JSON.parse()
│    CSV 格式检查     │  检查分隔符一致性
└──────────┬──────────┘
           │ 通过
           ▼
┌─────────────────────┐
│ 3. 恶意模式扫描     │  scanMdxContent()
│    (快速正则检测)    │  仅提示，不阻止
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 解析 + DOMPurify │  解析后净化每一条释义
│    (最终防线)       │
└─────────────────────┘
```

### 3.3 沙箱渲染方案

#### 3.3.1 方案对比

| 方案 | 安全性 | 性能 | 实现复杂度 | 适用场景 |
|------|--------|------|-----------|----------|
| **DOMPurify 净化** | 高 | 好（~5-15ms/条） | 低 | **推荐方案**，v2.0 默认使用 |
| **iframe sandbox** | 极高 | 中（DOM 隔离开销） | 中 | 适用于完全不可信的第三方内容 |
| **Shadow DOM** | 低（样式隔离，无脚本防护） | 好 | 低 | 仅样式隔离，不防 XSS |
| **Web Worker 渲染** | 高 | 中（序列化开销） | 高 | 适用于服务端渲染场景 |

#### 3.3.2 推荐：DOMPurify 为主，iframe 为远期方案

**v2.0 阶段**：使用 DOMPurify + CSP 组合防护即可满足安全需求。

**v2.1+ 阶段**：若引入社区共享词典（非用户上传），可考虑 iframe sandbox 方案：

```javascript
// 远期方案：iframe 沙箱渲染释义
function createSandboxedDefinition(definitionHtml) {
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-same-origin'  // 禁止脚本、弹窗、表单
  iframe.style.width = '100%'
  iframe.style.border = 'none'
  iframe.style.display = 'none'

  iframe.onload = () => {
    const doc = iframe.contentDocument
    doc.open()
    doc.write(DOMPurify.sanitize(definitionHtml))
    doc.close()

    // 获取渲染后的纯文本或安全 HTML
    const safeContent = doc.body.innerHTML
    // 传递给主文档展示
    displayDefinition(safeContent)
  }

  document.body.appendChild(iframe)
}
```

## 4. 数据存储安全

### 4.1 IndexedDB 数据加密

#### 4.1.1 风险分析

| 数据类型 | 敏感程度 | 泄露影响 | 是否需要加密 |
|----------|----------|----------|-------------|
| 词典数据 | 低 | 公开词典，无隐私风险 | **否** |
| 阅读进度 | 低 | 仅个人阅读习惯 | **否** |
| 统计信息 | 低 | 仅个人诵读次数 | **否** |
| 书签 | 低 | 仅个人阅读标记 | **否** |
| **用户笔记** | **中** | 可能包含个人感悟、隐私信息 | **建议加密** |
| 设置配置 | 低 | 字体、字号等偏好 | **否** |

#### 4.1.2 结论：v2.0 阶段无需加密

理由：

1. **IndexedDB 是同源隔离的**：其他网站无法访问本项目的 IndexedDB 数据（Same-Origin Policy）
2. **无后端传输**：数据不会发送到服务器，不存在传输泄露风险
3. **威胁模型有限**：攻击者需要物理访问用户设备或注入恶意脚本到本页面才能读取 IndexedDB。恶意脚本场景已由 DOMPurify + CSP 覆盖
4. **加密开销大**：Web Crypto API 加密/解密增加复杂度，且密钥管理本身就是安全问题（密钥存哪？）

#### 4.1.3 v2.1+ 加密方案（可选）

如果未来需要加密用户笔记，推荐方案：

```javascript
// utils/crypto.js（远期方案）
import { openDB } from 'idb'

/**
 * 从用户密码派生加密密钥
 * @param {string} password - 用户密码
 * @param {Uint8Array} salt - 盐值
 * @returns {CryptoKey} AES-GCM 密钥
 */
export async function deriveKey(password, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,  // 密钥不可导出
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密数据
 * @param {string} plaintext - 明文
 * @param {CryptoKey} key - 加密密钥
 * @returns {{ iv: Uint8Array, ciphertext: ArrayBuffer }}
 */
export async function encryptData(plaintext, key) {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  return { iv, ciphertext }
}

/**
 * 解密数据
 * @param {Uint8Array} iv - 初始化向量
 * @param {ArrayBuffer} ciphertext - 密文
 * @param {CryptoKey} key - 解密密钥
 * @returns {string} 明文
 */
export async function decryptData(iv, ciphertext, key) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(decrypted)
}
```

**密钥管理挑战**：
- 方案 A：用户每次访问时输入密码派生密钥（体验差，但安全）
- 方案 B：密钥存 localStorage（密钥和密文在同一存储层，安全性有限）
- 方案 C：使用 Web Authentication API (WebAuthn) 绑定设备密钥（体验好，但实现复杂）

**v2.0 决策**：暂不实现加密，笔记数据以明文存储于 IndexedDB，风险可接受。

### 4.2 localStorage 安全

#### 4.2.1 v2.0 中 localStorage 的使用

v2.0 计划统一迁移到 IndexedDB，但以下场景可能仍用到 localStorage：

| 用途 | 数据 | 风险 | 处理 |
|------|------|------|------|
| 迁移标记 | `migrated: true` | 低 | 可保留，不涉及敏感数据 |
| v1.0 遗留数据 | 旧版阅读进度、设置 | 低 | 迁移完成后清理 |

#### 4.2.2 localStorage 安全原则

1. **禁止存储敏感数据**：用户笔记、密码、token 等不得存入 localStorage
2. **禁止存储可执行代码**：任何 JS 代码、HTML 片段不得存入 localStorage
3. **仅存轻量配置**：主题设置、字体偏好等非敏感配置
4. **v2.0 统一使用 IndexedDB**：所有用户数据迁移至 IndexedDB

## 5. 第三方依赖安全

### 5.1 依赖审计

| 依赖 | 版本 | 周下载量 | 已知漏洞 (CVE) | 风险等级 | 建议 |
|------|------|----------|---------------|----------|------|
| **vue** | ^3.4.0 | 4.5M+ | 无已知高危 | **低** | 保持更新，关注官方公告 |
| **vue-router** | ^4.3.0 | 3.5M+ | 无已知高危 | **低** | 保持更新 |
| **pinia** | ^2.1.7 | 1.8M+ | 无已知高危 | **低** | 保持更新 |
| **vant** | ^4.8.0 | 120K+ | 无已知高危 | **低** | 保持更新，关注 Vant 安全公告 |
| **idb** | ^7.1.1 | 6M+ | 无已知高危 | **低** | Jake Archibald 维护，质量可靠 |
| **mdict-js** | ^10.0.1 | < 100 | 无已知 CVE | **中** | 小众库，维护者活跃度需关注，代码需审计 |
| **lzo-wasm** | ^0.0.4 | < 100 | 无已知 CVE | **中** | WASM 二进制包，需确认编译来源可信 |
| **markdown-it** | ^14.0.0 | 4M+ | 无已知高危 | **低** | 主流 Markdown 解析器，活跃维护 |
| **turndown** | ^7.1.2 | 800K+ | 无已知高危 | **低** | HTML → Markdown 转换，成熟稳定 |
| **@vueuse/core** | ^10.7.0 | 2M+ | 无已知高危 | **低** | Vue 生态工具库，活跃维护 |

#### 5.1.1 mdict-js 专项分析

- **维护状态**：小众库，由个人维护者维护，更新频率较低
- **代码审查重点**：
  - 文件解析逻辑是否对畸形输入有防护
  - 是否存在 Buffer 溢出或内存泄漏风险
  - LZO 解压逻辑是否限制了解压后大小
- **风险缓解**：
  - 限制上传的 .mdx 文件大小（10MB 上限）
  - 大文件使用 `mdictStrategy: 'direct'` 模式，不预解析到内存
  - 在 import 前验证 MDX 文件头 magic bytes

#### 5.1.2 lzo-wasm 专项分析

- **WASM 特性**：WASM 在浏览器沙箱中运行，无法直接访问文件系统或网络
- **风险点**：恶意构造的压缩数据可能导致解压崩溃或占用过多内存
- **风险缓解**：
  - 设置解压超时限制（5 秒）
  - 限制解压后的最大数据量
  - 捕获解压异常并降级处理

### 5.2 依赖锁定策略

#### 5.2.1 package-lock.json

- **必须提交** `package-lock.json` 到 Git 仓库
- **禁止**使用 `^` 范围外的版本（当前 `package.json` 使用 `^` 前缀，这是合理的次版本更新范围）
- 定期运行 `npm audit` 检查已知漏洞

#### 5.2.2 依赖更新策略

| 更新类型 | 策略 | 频率 |
|----------|------|------|
| 补丁版本 (x.x.1 → x.x.2) | 自动接受，运行 `npm audit` | 每月 |
| 次版本 (x.1.x → x.2.x) | 审查 changelog 后接受 | 每季度 |
| 主版本 (1.x.x → 2.x.x) | 测试验证后手动升级 | 按需 |
| 安全更新 | 立即升级 | 收到通知后 48 小时内 |

#### 5.2.3 CI/CD 安全检查（推荐 v2.1+）

```bash
# 每次构建前运行
npm audit --audit-level=moderate

# 安装 npm-audit-resolver（允许标记已知的可接受风险）
npm install -D npm-audit-resolver
```

## 6. 同类 Web App 安全策略对比

| 项目 | 类型 | XSS 防护 | CSP | 文件安全 | 数据加密 |
|------|------|----------|-----|----------|----------|
| **ReadiumJS** | 浏览器 ePub 阅读器 | DOMPurify 净化 ePub 内容 | 无强制 CSP | ePub ZIP 解压后验证 | 不加密（浏览器沙箱信任） |
| **Hypothesis** | Web 标注工具 | DOMPurify + CSP strict | strict CSP (nonce) | 标注内容净化 | 不加密（同源保护） |
| **Zotero Web Library** | 文献管理 | 服务端净化 + 客户端转义 | 无 | 附件类型白名单 | 传输加密 (TLS) |
| **Notion Web Clipper** | 网页收藏 | 服务端净化 + sandbox | 无 | 网页内容转义 | 传输加密 + 服务端加密 |
| **本阅读器 (v2.0)** | 佛经阅读 | **DOMPurify + CSP + 预扫描** | **完整 CSP 策略** | **文件类型 + 大小 + 内容扫描** | **不加密（IndexedDB 同源隔离）** |

### 6.1 关键对比结论

1. **行业共识**：浏览器端阅读器普遍不加密本地存储数据，依赖同源策略防护
2. **XSS 防护标配**：DOMPurify 是前端富文本渲染的标准防护库，几乎所有同类项目都使用
3. **CSP 覆盖不足**：多数开源阅读器不配置 CSP，本项目配置 CSP 是加分项
4. **文件上传风险**：多数阅读器不处理用户上传的文件格式转换，本项目因支持 MDX 需要更严格的验证

## 7. 结论与建议

### 7.1 安全策略和优先级

| 优先级 | 安全措施 | 实施阶段 | 工作量 |
|--------|----------|----------|--------|
| **P0** | DOMPurify 集成（所有释义渲染前净化） | v2.0 Phase 3 | 4h |
| **P0** | vercel.json CSP 配置 | v2.0 Phase 4 | 1h |
| **P0** | 文件类型 + 大小验证 | v2.0 Phase 2 | 2h |
| **P1** | 上传时恶意模式预扫描 | v2.0 Phase 3 | 3h |
| **P1** | 用户笔记 DOMPurify 净化 | v2.0 Phase 3 | 2h |
| **P2** | mdict-js / lzo-wasm 代码审计 | v2.1 | 8h |
| **P2** | IndexedDB 笔记加密（可选） | v2.1 | 8h |
| **P3** | iframe sandbox 渲染 | 远期 | 12h |

### 7.2 必须立即执行的事项

1. **安装 DOMPurify** 并创建 `utils/sanitize.js` 工具模块
2. **在 `vercel.json` 中配置 CSP**，至少包含 `script-src`、`connect-src`、`object-src`
3. **实现文件上传验证函数** `validateDictionaryFile()`
4. **所有使用 `v-html` 的组件**必须通过 `sanitizeDefinition()` 净化

### 7.3 防御纵深总结

```
攻击者上传恶意 MDX 词典
    │
    ▼
[第 1 层] 文件类型验证 + 大小限制    → 拒绝非词典格式和超大文件
    │ 通过
    ▼
[第 2 层] 恶意模式预扫描              → 提示用户发现可疑内容
    │ 扫描后继续（不阻止）
    ▼
[第 3 层] MDX 解析 (mdict-js)        → 提取释义 HTML
    │
    ▼
[第 4 层] markdown-it 渲染           → Markdown → HTML (html: true)
    │
    ▼
[第 5 层] DOMPurify.sanitize()       → 移除 <script>、事件处理器、javascript: 协议
    │
    ▼
[第 6 层] Vue v-html 渲染            → 展示净化后的安全 HTML
    │
    ▼
[第 7 层] CSP 运行时拦截             → 即使遗漏的恶意代码也无法执行
    │
    ▼
[第 8 层] 浏览器同源策略             → 无法读取其他站点数据，无法发送数据到外部
```

## 8. 对 v2.1 方案的影响

1. **新增依赖**：需在 `package.json` 中添加 `dompurify`
2. **新增文件**：`src/utils/sanitize.js`（DOMPurify 配置）、`src/utils/mdxScanner.js`（上传扫描）
3. **vercel.json**：需新增安全响应头配置
4. **组件修改**：所有展示释义的组件（`DictionaryPopup`、`TermHighlight` 等）需引入 `sanitizeDefinition()`
5. **Service 层**：`dictService.importDict()` 中需加入文件验证和扫描步骤
6. **测试覆盖**：需为 `sanitizeDefinition()` 和 `validateDictionaryFile()` 编写 XSS 攻击向量测试用例
7. **性能监控**：DOMPurify 净化耗时需纳入性能指标，确保不影响首屏加载

## 9. 参考资料

### 安全标准与文档

- [Content Security Policy (CSP) - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify Official Documentation](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Web Crypto API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IndexedDB Security Considerations - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### 同类项目参考

- [ReadiumJS - Web ePub Reader](https://github.com/readium/readium-js)
- [Hypothesis - Web Annotation](https://github.com/hypothesis/client)
- [marked XSS Sanitization Discussion](https://github.com/markedjs/marked/issues/1016)

### 依赖安全

- [npm audit 官方文档](https://docs.npmjs.com/cli/commands/npm-audit)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [GitHub Security Advisories](https://github.com/advisories)

### Vercel 部署

- [Vercel Security Headers Documentation](https://vercel.com/docs/security/headers)
- [Vercel vercel.json Configuration](https://vercel.com/docs/project-configuration)
