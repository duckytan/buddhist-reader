# 部署与 CI/CD 报告

> 任务编号：T-45
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/deep-dive/T-50-github-vercel-deployment.md

## 1. 背景与目标

般若佛经阅读器 v2.0 为纯前端 SPA 项目（Vue 3 + Vite + Vant），部署在 Vercel Hobby 免费版上，代码托管于 GitHub。本报告旨在优化现有的部署流程和 CI/CD 流水线，解决以下问题：

- 当前 `vercel.json` 配置缺少缓存策略和安全响应头
- 缺少 GitHub Actions 自动化检查（lint、typecheck、构建验证）
- 构建产物大小缺乏持续监控机制
- 环境变量管理不规范
- 预览部署的 IndexedDB 隔离已在 T-50 中分析，需在部署配置中落地

目标：建立可靠、可重复、可监控的部署和 CI/CD 流程。

## 2. Vercel 部署配置

### 2.1 vercel.json 配置

以下为完整的优化后 `vercel.json` 配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",

  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],

  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*\\.(js|css|woff2|woff|ttf|svg|png|jpg|ico))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate, proxy-revalidate"
        },
        {
          "key": "Pragma",
          "value": "no-cache"
        },
        {
          "key": "Expires",
          "value": "0"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
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
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### 2.2 配置说明

| 配置项 | 作用 |
|--------|------|
| `installCommand` | 显式使用 `npm ci` 确保依赖安装可重复，比 `npm install` 更快且一致性更好 |
| `framework: "vite"` | 告知 Vercel 使用 Vite 框架预设，自动优化构建配置 |
| `rewrites[0]` | SPA 路由重写，将所有路径指向 `index.html`，由 Vue Router 客户端路由接管 |
| `headers[0]` | `/assets/` 下的构建产物设置 1 年缓存（Vite 文件名含内容 hash，可安全缓存） |
| `headers[1]` | 根目录下的静态资源文件（JS/CSS/字体/图片）设置 1 年缓存 |
| `headers[2]` | `index.html` 设置强不缓存策略，确保用户始终获取最新版本，避免 SPA 白屏问题 |
| `headers[3]` | 全局安全响应头，防护 MIME sniffing、点击劫持、XSS 等常见攻击 |

### 2.3 缓存策略详解

| 资源类型 | Cache-Control 值 | 原因 |
|----------|-----------------|------|
| Vite 构建产物（JS/CSS/字体/图片） | `public, max-age=31536000, immutable` | 文件名含内容 hash（如 `index-abc123.js`），内容不变则 URL 不变，可安全设置长期缓存 |
| `index.html` | `no-store, no-cache, must-revalidate, proxy-revalidate` + `Pragma: no-cache` + `Expires: 0` | SPA 入口文件，必须每次从服务器获取最新版本。`no-store` 防止任何缓存，`no-cache` 作为兜底，`Pragma` 和 `Expires` 兼容老旧代理 |
| 全局安全头 | 应用于所有响应 | 与缓存策略无关，提升应用安全性 |

**注意事项**：
- `headers` 规则按从上到下顺序匹配，第一个匹配的规则生效
- `index.html` 的缓存规则必须精确匹配 `/index.html`，不要写成 `/` 否则会影响全站
- 部署后通过 DevTools Network 面板验证缓存头是否生效：查看 `index.html` 的 Response Headers 和 Size 列

### 2.4 安全响应头说明

| 响应头 | 值 | 作用 |
|--------|---|------|
| `X-Content-Type-Options` | `nosniff` | 阻止浏览器 MIME 类型嗅探，防止将非 JS 文件当作脚本执行 |
| `X-Frame-Options` | `DENY` | 禁止页面被嵌入 iframe，防止点击劫持攻击 |
| `X-XSS-Protection` | `0` | 禁用浏览器内置 XSS 过滤器（现代浏览器已有 CSP 保护，内置过滤器反而可能干扰） |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 同源请求发送完整 Referer，跨源请求只发送 origin |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 禁用摄像头、麦克风、地理位置 API 权限（阅读器不需要这些功能） |

> **关于 CSP**：本项目为纯前端 SPA，不涉及内联脚本（Vite 构建产物均为外部引用）。如需进一步增强安全性，可考虑添加 `Content-Security-Policy` 头。但由于 Vite 构建时生成的 script nonce 是动态的，在 vercel.json 中静态配置 CSP 会导致构建产物被拦截。建议通过 `<meta>` 标签在 `index.html` 中设置 CSP。

### 2.5 环境变量管理

#### 构建时 vs 运行时变量

本项目为**纯前端 SPA**，所有环境变量必须在**构建时**注入到客户端代码中：

```
构建时注入 --> 打包进 JS 产物 --> 浏览器运行时直接读取
```

**不存在运行时环境变量**——构建完成后 `index.html` 和 JS 文件就是静态资源，环境变量已被编译进代码。

#### Vite 环境变量约定

| 前缀 | 说明 | 示例 |
|------|------|------|
| `VITE_` | 暴露给客户端代码，通过 `import.meta.env.VITE_XXX` 读取 | `VITE_APP_VERSION` |
| 无 `VITE_` 前缀 | 仅构建脚本可用，不暴露给客户端 | `NODE_ENV` |

#### 推荐环境变量配置

```bash
# .env（本地开发，不提交到 Git）
VITE_APP_NAME=般若佛经阅读器
VITE_APP_VERSION=2.1.0

# .env.production（生产构建时覆盖，可提交到 Git）
VITE_APP_NAME=般若佛经阅读器
VITE_APP_VERSION=2.1.0
```

#### Vercel Dashboard 环境变量设置

在 Vercel Dashboard → Project Settings → Environment Variables 中按环境分别设置：

| 变量名 | Production | Preview | Development | 说明 |
|--------|------------|---------|-------------|------|
| `VITE_APP_VERSION` | `2.1.0` | `2.1.0-preview` | - | 版本号，可用于展示和调试 |
| `VITE_ENABLE_DEV_TOOLS` | - | `true` | `true` | 预览环境开启调试工具栏 |

**环境变量大小限制**：
- 每个部署所有环境变量总计不超过 **64 KB**
- 单个变量不超过 **64 KB**
- 对于纯 SPA 项目，此限制完全不构成问题

#### `.gitignore` 配置

确保 `.env` 文件不被提交到 Git：

```
# .gitignore
.env
.env.local
.env.*.local
```

`.env.production` 可以提交（仅包含非敏感配置），但建议将敏感配置统一在 Vercel Dashboard 管理。

#### 代码中使用环境变量

```javascript
// src/utils/env.js
export const APP_NAME = import.meta.env.VITE_APP_NAME || '般若佛经阅读器'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.1.0'
export const IS_PREVIEW = import.meta.env.VERCEL_ENV === 'preview'
export const IS_PRODUCTION = import.meta.env.VERCEL_ENV === 'production'
export const IS_DEVELOPMENT = import.meta.env.DEV

// 预览环境标识
export const isPreview = () => import.meta.env.VERCEL_ENV === 'preview'
```

#### Vercel 自动注入的环境变量

Vercel 在构建和运行时自动注入以下环境变量，无需手动配置：

| 变量 | 说明 |
|------|------|
| `VERCEL_ENV` | `production`、`preview` 或 `development` |
| `VERCEL_URL` | 部署的域名（预览环境为 `*.vercel.app`） |
| `VERCEL_GIT_COMMIT_SHA` | Git 提交 SHA |
| `VERCEL_GIT_COMMIT_REF` | Git 分支名 |
| `VERCEL_GIT_COMMIT_MESSAGE` | 提交信息 |
| `CI` | `true`（标识在 CI 环境中运行） |

## 3. 预览部署流程

### 3.1 分支到预览 URL 的流程

```
开发者推送代码到 GitHub
        │
        ▼
┌──────────────────────────────┐
│  GitHub Webhook 通知 Vercel   │
└──────────────┬───────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│ push main    │  │ push 其他分支 │
└──────┬──────┘  └──────┬───────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│ 生产部署     │  │ 预览部署      │
│              │  │              │
│ URL:         │  │ URL:         │
│ *.vercel.app │  │ *-git-*.    │
│ 或自定义域名  │  │ vercel.app  │
└─────────────┘  └──────────────┘
```

| Git 操作 | Vercel 行为 | URL 模式 | 环境变量 `VERCEL_ENV` |
|----------|------------|----------|----------------------|
| `push main` | 生产部署 | `https://<project>.vercel.app` | `production` |
| `push feat-xxx` | 预览部署 | `https://<project>-git-feat-xxx.vercel.app` | `preview` |
| Pull Request | 预览部署 + PR 评论 | 同上，并在 PR 中添加评论 | `preview` |
| `push main` + 自定义域名 | 生产部署 | 自定义域名 | `production` |

### 3.2 IndexedDB 环境隔离

根据 T-50 的分析结果，采用 `VERCEL_ENV` 前缀方案隔离不同环境的 IndexedDB：

```javascript
// src/storage/db.js
import { open } from 'idb'

const getDBName = () => {
  const env = import.meta.env.VERCEL_ENV || 'development'
  switch (env) {
    case 'production':
      return 'buddhist-reader'
    case 'preview':
      return 'buddhist-reader-preview'
    default:
      return 'buddhist-reader-dev'
  }
}

const DB_VERSION = 2

export async function openDB() {
  return open(getDBName(), DB_VERSION, (upgradeDb) => {
    // 数据库升级逻辑
  })
}
```

| 环境变量值 | 环境 | DB 名称 | 数据隔离 |
|-----------|------|---------|----------|
| `production` | 生产部署 | `buddhist-reader` | 用户正式数据 |
| `preview` | 预览部署 | `buddhist-reader-preview` | 测试数据，与生产隔离 |
| `development` | 本地开发 | `buddhist-reader-dev` | 开发数据 |

### 3.3 预览环境用户提示

在预览环境中显示环境提示，帮助用户区分：

```vue
<!-- src/components/common/EnvBanner.vue -->
<template>
  <div v-if="isPreview" class="env-banner">
    当前为预览环境，数据与生产环境隔离，仅用于功能测试。
  </div>
</template>

<script setup>
import { isPreview } from '@/utils/env'
</script>

<style scoped>
.env-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff3cd;
  color: #856404;
  text-align: center;
  padding: 4px 16px;
  font-size: 12px;
  z-index: 9999;
}
</style>
```

### 3.4 部署配额管理

| 配额项 | 限制 | 当前使用 | 备注 |
|--------|------|----------|------|
| 构建时间 | 6,000 分钟/月 | SPA 构建 ~2 分钟/次 | 充足 |
| 部署次数 | 100 次/天 | 通常 < 10 次/天 | 充足 |
| 带宽 | 100 GB/月 | 取决于用户量和词典分发策略 | 词典文件走外部 CDN，代码构建产物很小 |
| 项目数 | 200 个 | 单项目 | 充足 |

## 4. 构建产物监控

### 4.1 当前构建配置

项目已集成 `rollup-plugin-visualizer` 用于构建产物分析（见 `vite.config.js`）：

```javascript
// vite.config.js 中的分析模式
plugins: [
  vue(),
  mode === 'analyze' ? visualizer({ open: true, filename: 'dist/stats.html' }) : null
].filter(Boolean)
```

通过 `npm run build:analyze` 可生成交互式可视化报告。

### 4.2 构建产物大小优化策略

#### 4.2.1 Vite 构建配置优化

```javascript
// vite.config.js - 优化后的 build 配置
build: {
  sourcemap: true,
  chunkSizeWarningLimit: 500,  // 500KB 警告阈值
  commonjsOptions: {
    transformMixedEsModules: true
  },
  rollupOptions: {
    output: {
      manualChunks: {
        // 第三方库单独分包
        vue: ['vue', 'vue-router', 'pinia'],
        vant: ['vant'],
        mdict: ['mdict-js', 'lzo-wasm'],
        markdown: ['markdown-it', 'turndown'],
        vueuse: ['@vueuse/core']
      }
    }
  }
}
```

#### 4.2.2 分包策略

| Chunk 名称 | 包含依赖 | 预估大小 (gzip) | 说明 |
|------------|---------|----------------|------|
| `vue` | vue, vue-router, pinia | ~55 KB | Vue 核心生态 |
| `vant` | vant | ~40 KB | UI 组件库 |
| `mdict` | mdict-js, lzo-wasm | ~30 KB | MDX 词典解析 |
| `markdown` | markdown-it, turndown | ~25 KB | Markdown 渲染 |
| `vueuse` | @vueuse/core | ~8 KB | Vue 工具函数 |
| `index` | 业务代码 | 取决于功能 | 应用主入口 |

#### 4.2.3 产物大小预算

| 资源类型 | 预算 (gzip) | 说明 |
|----------|------------|------|
| 首屏 JS | < 150 KB | 仅包含 Vue 核心 + 路由 + 首屏组件 |
| 首屏 CSS | < 30 KB | Vant 按需导入 + 自定义样式 |
| 完整 JS 包 | < 300 KB | 所有代码和第三方库 |
| 完整 CSS | < 50 KB | 所有样式 |
| 构建产物总计 | < 500 KB | 不含 sourcemap |
| Sourcemap | 不限制 | 仅用于调试，不发给用户 |

> **注意**：Vercel CDN 自动启用 Brotli 压缩，实际传输大小比 gzip 更小约 15-20%。

### 4.3 CI 中的产物大小检查

在 GitHub Actions 中添加构建产物大小检查步骤：

```yaml
- name: Check bundle size
  run: |
    # 获取 dist 目录总大小（不含 sourcemap）
    TOTAL_SIZE=$(du -sh dist/ | cut -f1)
    JS_SIZE=$(find dist/assets -name "*.js" -not -name "*.map" -exec du -ch {} + | tail -1 | cut -f1)

    echo "Total dist size: $TOTAL_SIZE"
    echo "Total JS size: $JS_SIZE"

    # 可选：设置阈值告警
    echo "## Build Artifacts Size" >> $GITHUB_STEP_SUMMARY
    echo "| Resource | Size |" >> $GITHUB_STEP_SUMMARY
    echo "|----------|------|" >> $GITHUB_STEP_SUMMARY
    echo "| Total dist | $TOTAL_SIZE |" >> $GITHUB_STEP_SUMMARY
    echo "| JS files | $JS_SIZE |" >> $GITHUB_STEP_SUMMARY
```

### 4.4 构建产物大小趋势监控

推荐使用以下方案之一持续监控产物大小：

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **GitHub PR 评论** | 使用 `preactjs/compressed-size-action` 在 PR 中显示产物大小变化 | 推荐 |
| **Step Summary** | 构建后将大小写入 `$GITHUB_STEP_SUMMARY` | 简单有效 |
| **定期报告** | 每周运行一次分析构建，记录趋势 | 长期跟踪 |

#### 推荐：compressed-size-action

```yaml
- name: Report bundle size
  uses: preactjs/compressed-size-action@v2
  with:
    repo-token: '${{ secrets.GITHUB_TOKEN }}'
    pattern: './dist/assets/**/*.{js,css}'
    minimum-change-threshold: 100
```

此 Action 会在每次 PR 中自动评论，显示与 main 分支相比的产物大小变化。

## 5. CI/CD 流水线

### 5.1 GitHub Actions 配置

#### 5.1.1 完整 CI 工作流

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/ISSUE_TEMPLATE/**'
  pull_request:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/ISSUE_TEMPLATE/**'

  # 允许手动触发
  workflow_dispatch:

# 防止重复运行
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Report bundle size
        uses: preactjs/compressed-size-action@v2
        if: github.event_name == 'pull_request'
        with:
          repo-token: '${{ secrets.GITHUB_TOKEN }}'
          pattern: './dist/assets/**/*.{js,css}'
          minimum-change-threshold: 100
```

#### 5.1.2 配置说明

| 配置项 | 说明 |
|--------|------|
| `on.push.paths-ignore` | Markdown 和文档修改不触发 CI，节省构建分钟数 |
| `concurrency` | 同一分支的重复推送会取消旧运行，避免资源浪费 |
| `npm ci` | 使用 CI 模式安装依赖，确保可重复性且比 `npm install` 更快 |
| `cache: 'npm'` | 缓存 `node_modules`，每次构建节省 30-60 秒 |
| `compressed-size-action` | 仅在 PR 中触发，评论显示产物大小变化 |

#### 5.1.3 跳过 CI 的约定

当提交信息包含以下关键词时，GitHub Actions 会自动跳过：

- `[skip ci]`
- `[ci skip]`

适用于纯文档更新或格式修改：

```bash
git commit -m "docs: 更新部署文档 [skip ci]"
```

### 5.2 部署检查清单

#### 5.2.1 推送前检查

| 检查项 | 命令/方式 | 说明 |
|--------|----------|------|
| Lint 检查 | `npm run lint` | 无 ESLint 错误和警告 |
| 构建成功 | `npm run build` | 构建产物生成到 `dist/` |
| 产物大小 | 检查 `dist/` 大小 | 首屏 JS < 150 KB (gzip) |
| 本地预览 | `npm run preview` | 功能在本地正常工作 |
| 无调试代码 | 全局搜索 `console.log`、`debugger` | 移除所有调试输出 |
| 无硬编码密钥 | 检查 `.env` 和代码 | 敏感信息不入库 |
| 依赖无漏洞 | `npm audit` | 无严重级别漏洞 |

#### 5.2.2 部署后验证

| 检查项 | 验证方式 | 说明 |
|--------|---------|------|
| 页面可访问 | 浏览器打开 URL | 首页正常加载 |
| SPA 路由 | 刷新非根路径页面 | `vercel.json` rewrites 生效 |
| 缓存头正确 | DevTools Network 检查 Response Headers | 资源缓存策略正确 |
| 安全头正确 | DevTools Network 检查 Response Headers | 安全响应头已设置 |
| 控制台无报错 | DevTools Console | 无运行时错误 |
| 移动端适配 | 手机浏览器或 DevTools 设备模拟 | 响应式正常 |

#### 5.2.3 Vercel Dashboard 检查项

| 检查项 | 位置 | 说明 |
|--------|------|------|
| 构建日志 | Deployments → 查看日志 | 构建成功，无警告 |
| 环境变量 | Settings → Environment Variables | 按环境正确配置 |
| Node.js 版本 | Settings → General → Node.js Version | 与 `package.json` engines 一致 |
| 自定义域名 | Settings → Domains | 域名解析正常，HTTPS 自动生效 |
| 带宽使用 | Analytics → 查看用量 | 未超过 100 GB/月 |

### 5.3 Vercel 与 GitHub Actions 的关系

```
┌───────────────────────────────────────────────────┐
│                   GitHub 推送代码                  │
└──────────────────────┬────────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
    ┌─────────────────┐  ┌─────────────────┐
    │  GitHub Actions  │  │   Vercel Auto    │
    │  (CI 质量检查)   │  │   Deploy (部署)  │
    └────────┬────────┘  └────────┬────────┘
             │                    │
             ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ lint + build    │  │ 生产/预览部署    │
    │ bundle size     │  │ 自动 CDN 分发   │
    │ PR comment      │  │ 自动 HTTPS      │
    └─────────────────┘  └─────────────────┘
```

| 平台 | 作用 | 消耗资源 |
|------|------|----------|
| GitHub Actions | 代码质量检查、构建验证、产物大小报告 | 2,000 分钟/月（免费） |
| Vercel | 自动构建和部署、CDN 分发 | 6,000 分钟/月（免费） |

**双重构建说明**：GitHub Actions 和 Vercel 会分别执行构建。这是有意为之的设计：
- GitHub Actions 用于 PR 质量把关（lint、产物大小检查）
- Vercel 用于实际部署（产物推送到全球 CDN）
- SPA 构建通常 < 2 分钟，双重构建的资源消耗可接受

### 5.4 Node.js 版本管理

在 `package.json` 中指定最低 Node.js 版本：

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

同时在 GitHub Actions 和 Vercel 中保持一致：

| 环境 | 配置方式 | 版本 |
|------|---------|------|
| GitHub Actions | `actions/setup-node@v4` 的 `node-version` | `18` |
| Vercel | Settings → General → Node.js Version | `18.x` |
| 本地开发 | `.nvmrc` 文件（可选） | `18` |

> **注意**：Node.js 18 将于 2025 年 4 月结束 LTS 支持。建议关注 Node.js 20 LTS 的兼容性，并在 2025 年前升级到 Node.js 20。

## 6. 结论与建议

### 明确的部署和 CI/CD 策略

| 决策项 | 方案 | 理由 |
|--------|------|------|
| **部署平台** | Vercel Hobby 免费版 | 纯 SPA 完全够用，自动 HTTPS、全球 CDN、Git 集成 |
| **vercel.json** | 完整配置缓存策略和安全头 | 当前配置缺少缓存头，需补充 |
| **CI/CD** | GitHub Actions 质量检查 + Vercel 自动部署 | 双重保障，PR 中显示产物大小变化 |
| **环境变量** | `VITE_` 前缀，Vercel Dashboard 按环境配置 | 纯 SPA 无运行时变量 |
| **IndexedDB 隔离** | `VERCEL_ENV` 区分环境 DB 名称 | 预览和生产数据天然隔离 |
| **产物大小监控** | `rollup-plugin-visualizer` + `compressed-size-action` | 本地分析 + CI 趋势跟踪 |
| **缓存策略** | 构建产物 1 年 + `index.html` 强不缓存 | 防止 SPA 白屏问题 |
| **安全头** | vercel.json headers 统一配置 | 防护常见 Web 攻击 |

### 关键实施步骤

1. **更新 `vercel.json`**：补充缓存策略和安全响应头（参考 2.1 完整配置）
2. **创建 `.github/workflows/ci.yml`**：添加 lint、build、产物大小检查
3. **更新 `vite.config.js`**：添加 `manualChunks` 分包策略
4. **配置 Vercel 环境变量**：按 Production/Preview/Development 分别设置
5. **更新 `package.json`**：添加 `engines` 字段指定 Node.js 版本

### 带宽风险提醒

Vercel Hobby 免费版带宽上限为 **100 GB/月**。当前项目为纯前端 SPA，构建产物约 500 KB，假设月访问量为 10 万次：

```
100,000 次访问 x 500 KB = 50,000 KB = ~50 GB/月
```

代码分发的带宽完全足够。**但如果词典文件走 Vercel CDN 分发**（如 T-50 分析的风险），50 MB 词典 x 4 次下载/用户 x 500 用户 = 100 GB，即触顶。因此：

- **词典文件必须走外部 CDN**（Cloudflare R2、阿里云 OSS 等）
- **Vercel 带宽仅用于代码和内置资源分发**

## 7. 对 v2.1 方案的影响

基于本部署和 CI/CD 策略，v2.1（MDX 词典分发方案）需满足以下约束和影响：

1. **词典分发独立于 Vercel**：词典文件不纳入 Git 仓库、不参与构建、不走 Vercel CDN，必须通过外部对象存储分发
2. **CI 流水线不包含词典检查**：GitHub Actions 仅检查代码质量，不涉及词典文件
3. **构建产物大小预算不含词典**：500 KB 预算仅包含代码和内置词典数据（50 条术语约 5 KB）
4. **环境变量预留词典 CDN 地址**：需要在 Vercel Dashboard 中配置 `VITE_DICT_CDN_BASE_URL` 等变量，指向外部词典存储
5. **预览环境的词典加载与生产一致**：`VERCEL_ENV` 不影响词典 CDN URL，预览和生产环境加载同一词典源
6. **部署检查清单需增加词典 CDN 验证**：部署后需验证词典 CDN 可访问、CORS 配置正确
7. **产物大小监控仅监控代码产物**：`compressed-size-action` 的 pattern 不包含词典相关文件
8. **Vercel 构建命令不变**：`npm run build` 仅构建代码，词典数据通过运行时动态加载
9. **安全头需适配词典 CDN**：若词典 CDN 与主域名不同，需在 `Permissions-Policy` 或 CSP 中允许跨域加载词典资源
10. **带宽预算重新计算**：Vercel 100 GB/月仅用于代码分发，词典带宽走外部 CDN 独立计费
