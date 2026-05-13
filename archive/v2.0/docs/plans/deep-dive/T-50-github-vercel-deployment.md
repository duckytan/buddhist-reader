# GitHub + Vercel 部署环境与限制分析 报告

> 任务编号：T-50
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

本项目（般若佛经阅读器 v2.0）计划采用 **GitHub 仓库 + Vercel Hobby 免费版** 作为部署方案。项目为纯前端 SPA（Vue 3 + Vite），需要支持：

- 用户通过浏览器直接访问
- 用户上传大型 MDX 词典文件（可能超过 100MB）
- IndexedDB 本地数据持久化（经文笔记、阅读进度、词典配置）
- 多分支预览部署

本报告旨在深度调研 Vercel Hobby 免费版和 GitHub 仓库的各项限制、规范及潜在问题，为 v2.1（MDX 词典分发方案）提供决策依据。

## 2. Vercel Hobby 限制

| 限制项 | 数值 | 影响 | 应对措施 |
|--------|------|------|----------|
| **构建时间** | 6,000 分钟/月 | 充足的月度构建配额，单个构建无明确超时上限（受 45 分钟实践限制） | SPA 构建通常 < 5 分钟，无需担心 |
| **带宽（Fast Data Transfer）** | 100 GB/月 | 大型 MDX 词典文件下载会快速消耗带宽 | 词典文件走外部 CDN 分发，不走 Vercel 带宽 |
| **构建产物大小** | 无明确硬限制，但受 Build disk size 23 GB 限制 | 若将大型 MDX 词典打入构建产物会导致构建失败 | MDX 词典不纳入 Git 仓库和构建产物 |
| **构建 vCPUs** | 4 vCPU | 构建资源有限，复杂构建可能较慢 | Vite 构建轻量，无影响 |
| **构建内存** | 8 GB | 构建时内存上限 | Vite 构建通常 < 2 GB，无影响 |
| **构建磁盘空间** | 23 GB | 构建过程中的磁盘可用空间 | 足够 SPA 构建使用 |
| **部署频率** | 100 次/天 | 频繁推送会消耗部署配额 | 日常开发足够，CI 合并部署时无需额外优化 |
| **项目数** | 200 个 | 单账号最多创建 200 个项目 | 单项目使用，无影响 |
| **自定义域名** | 每项目 50 个 | 可绑定多个域名 | 足够使用 |
| **Function 最大内存** | 2 GB / 1 vCPU | 本项目的纯 SPA 不使用 Vercel Functions | 无影响 |
| **Function 最大持续时间** | 默认 300s，Hobby 最多可配置到 300s | 纯 SPA 无需 Functions | 无影响 |
| **Function 包大小** | 压缩后 250 MB | 纯 SPA 无 Functions | 无影响 |
| **Function 数量** | 每部署最多 12 个 | 纯 SPA 无 Functions | 无影响 |
| **Runtime Logs** | 1 小时日志 / 最多 4000 行 | 无 Functions 时无日志需求 | 无影响 |
| **Speed Insights** | 10,000 数据点 / 1 个项目 | 可用于性能监控 | 可选开启 |
| **Web Analytics** | 50,000 Events / 月 / 1 个月数据保留 | 基础访问统计 | 可选开启 |
| **DDoS 防护** | 默认开启 | 免费的基础安全防护 | 自动生效 |
| **WAF 自定义规则** | 最多 3 条 | 安全规则有限 | SPA 无需复杂 WAF |
| **Fair Use** | 仅限非商业/个人用途 | 若项目商业化需升级 Pro | 当前为个人项目，合规 |

**关键结论**：Vercel Hobby 免费版对于纯前端 SPA 项目完全够用。唯一的风险是 **100 GB/月带宽**——如果用户频繁下载大型词典文件且走 Vercel CDN，很容易触顶。

## 3. GitHub 仓库限制

| 限制项 | 数值 | 影响 | 应对措施 |
|--------|------|------|----------|
| **单文件大小（Git push）** | 100 MB 硬限制（> 50 MB 警告） | MDX 词典文件 > 100 MB 时无法通过 Git 推送 | 词典文件不纳入 Git，通过外部存储分发 |
| **单文件大小（Web 上传）** | 25 MB | 网页界面上传限制更严格 | 仅用于代码提交，不涉及词典 |
| **仓库总大小建议** | < 10 GB | 仓库过大会导致克隆缓慢、CI 超时 | 本项目为纯前端，仓库将远小于 10 GB |
| **单目录条目数** | < 3,000 个 | 单个目录文件过多影响 Git 性能 | 词典文件不入库，无影响 |
| **私有仓库限制** | 每个 ≤ 500 MB（不含 LFS） | 若使用私有仓库需注意 | 本项目公开仓库，无此限制 |
| **Git LFS 免费额度** | 10 GB 存储 + 10 GB/月带宽 | LFS 可管理大文件，但带宽有限 | 可用但带宽有限，不适合频繁下载 |
| **Git LFS 单文件大小** | 最大 2 GB | 单个词典文件上限 | 多数 MDX 词典 < 2 GB，满足需求 |
| **文本文件渲染** | > 1 MB 无语法高亮，> 5 MB 不可预览 | 大文本文件在 Web 端体验差 | 词典文件不入库，无影响 |
| **Diff 截断** | > 20,000 行或 > 1 MB 差异被截断 | 大文件变更无法在 PR 中完整查看 | 词典文件不入库，无影响 |

### Git LFS 适用性分析

| 维度 | 评估 | 说明 |
|------|------|------|
| 存储容量 | 10 GB 够用 | 可存放多个中小型词典 |
| 带宽 | 10 GB/月 **不足** | 若有 10 个用户每月各下载 2 次 50 MB 词典，即达上限 |
| 用户体验 | 差 | Git LFS 下载需 `git lfs pull`，浏览器无法直接访问 |
| 适用场景 | 不适合 | 浏览器端无法直接使用 Git LFS 文件 |

**关键结论**：Git LFS **不适合**本项目词典分发场景。LFS 的 10 GB/月带宽太低，且浏览器无法直接访问 LFS 托管的文件。需要采用其他分发策略（如外部对象存储、IPFS 等），这将在 v2.1 方案中解决。

## 4. SPA 路由配置

Vercel 部署 SPA 时，必须配置 `vercel.json` 的 `rewrites` 规则，否则刷新非根路径会返回 404。

### vercel.json 配置示例

```json
{
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
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### 配置说明

| 规则 | 作用 |
|------|------|
| `rewrites[0]` | 将所有路径重写为 `/index.html`，由 Vue Router 客户端路由接管 |
| `headers[0]` | `/assets/` 下的构建产物设置 1 年缓存（Vite 构建文件名含 hash，安全缓存） |
| `headers[1]` | 所有带版本 hash 的静态资源设置 1 年缓存 |
| `headers[2]` | `index.html` 及其他 HTML 页面设置不缓存，确保每次获取最新版本 |

### 注意事项

- Vite 构建产物文件名包含内容 hash（如 `index-abc123.js`），可以安全设置长期缓存
- `index.html` 不应设置长期缓存，否则用户无法获取新版本
- `rewrites` 规则按顺序匹配，第一个匹配的规则生效
- 如果使用 Vue Router 的 `history` 模式（推荐），此配置是必需的

## 5. 预览部署与 IndexedDB

### 问题描述

Vercel 为每个 Git 分支自动创建独立的预览部署 URL，例如：

- 生产环境：`https://ai-buddhist-reader.vercel.app`
- 分支预览：`https://ai-buddhist-reader-git-feat-dict.vercel.app`

**IndexedDB 的存储是按源（origin）隔离的**。不同 URL = 不同 origin = 不同的 IndexedDB 数据库。这会导致：

| 场景 | 问题 |
|------|------|
| 用户在预览环境添加笔记 | 切回生产环境后笔记不可见 |
| 用户在预览环境上传词典 | 词典数据不共享到生产环境 |
| 多分支并行开发 | 每个预览 URL 的 IndexedDB 完全独立 |

### 解决方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **方案 A：前缀隔离** | 实现简单，数据天然隔离 | 预览环境数据不共享 | 推荐 |
| **方案 B：postMessage 同步** | 可在预览和生产间同步 | 复杂度高，安全性问题 | 不推荐 |
| **方案 C：生产 URL 回退** | 预览环境读取生产数据 | 读写冲突，数据一致性难保证 | 不推荐 |
| **方案 D：环境变量标记** | 预览环境使用独立 DB 名称 | 简单有效 | 推荐 |

### 推荐实现（方案 A + D）

```javascript
// src/storage/db.js
const DB_NAME = import.meta.env.VERCEL_ENV === 'preview'
  ? 'buddhist-reader-preview'
  : 'buddhist-reader'

const DB_VERSION = 1

export async function openDB() {
  return open(DB_NAME, DB_VERSION)
}
```

通过 `VERCEL_ENV` 环境变量区分预览和生产环境：

| 环境变量值 | 环境 | DB 名称 |
|-----------|------|---------|
| `production` | 生产部署 | `buddhist-reader` |
| `preview` | 预览部署 | `buddhist-reader-preview` |
| `development` | 本地开发 | `buddhist-reader-dev` |

### 用户提示策略

在预览环境中，可在页面底部显示提示：

> "当前为预览环境，数据与生产环境隔离，仅用于功能测试。"

## 6. 环境变量管理

### Vercel 环境变量 vs .env 文件

| 特性 | Vercel Dashboard 环境变量 | `.env` 文件 |
|------|--------------------------|-------------|
| 存储位置 | Vercel 云端 | 本地文件系统中 |
| 可见性 | 仅项目成员可见 | 若提交到 Git 则公开 |
| 环境隔离 | 可按环境（Production/Preview/Development）分别设置 | 需使用 `.env.production` 等文件区分 |
| 构建时可用 | 是 | 是 |
| 运行时可用 | 仅限 Serverless Functions | 仅限构建时 |
| 客户端代码可用 | 需特殊前缀 | 需特殊前缀 |

### 构建时 vs 运行时变量差异

本项目为 **纯前端 SPA**，所有环境变量必须在**构建时**注入到客户端代码中：

```
构建时注入 ──→ 打包进 JS 产物 ──→ 浏览器运行时直接读取
```

**没有运行时环境变量**——一旦构建完成，`index.html` 和 JS 文件就是静态资源，环境变量已被编译进去。

### Vite 环境变量约定

| 前缀 | 说明 | 示例 |
|------|------|------|
| `VITE_` | 暴露给客户端的环境变量 | `VITE_APP_VERSION` |
| 无 `VITE_` 前缀 | 仅构建脚本可用，不暴露给客户端 | `NODE_ENV` |

### 推荐配置

```bash
# .env（本地开发，不提交到 Git）
VITE_APP_NAME=般若佛经阅读器
VITE_APP_VERSION=2.0.0

# .env.production（构建时注入生产环境变量）
VITE_APP_NAME=般若佛经阅读器
VITE_APP_VERSION=2.0.0
```

在 Vercel Dashboard 中设置的环境变量（带 `VITE_` 前缀）会覆盖 `.env` 文件中的同名变量。

### Vercel 环境变量大小限制

- 每个部署所有环境变量总计不超过 **64 KB**
- 单个变量不超过 **64 KB**

对于纯 SPA 项目，此限制完全不构成问题。

## 7. 构建兼容性

### mdict-js + lzo-wasm 的 ESM/CJS 处理

这是构建过程中最可能出问题的环节。

#### 风险点

| 风险 | 原因 | 影响 |
|------|------|------|
| `global` 未定义 | `mdict-js` 使用 `global` 变量，浏览器中不存在 | 构建或运行时报错 |
| ESM/CJS 混合 | `lzo-wasm` 可能使用 CommonJS 格式 | Vite 默认 ESM，需额外转换 |
| WASM 加载 | `lzo-wasm` 依赖 `.wasm` 文件 | Vite 需正确配置 WASM 处理 |
| 构建产物过大 | `mdict-js` + `lzo-wasm` 体积较大 | 首屏加载变慢 |

#### Vite 配置（应对方案）

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    // 浏览器中不存在 global，映射到 globalThis
    global: 'globalThis',
  },
  optimizeDeps: {
    // 预构建 mdict-js，避免首次加载时阻塞
    include: ['mdict-js'],
  },
  build: {
    // CommonJS 和 ESM 混合时需要转换
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // 生成 sourcemap 便于调试
    sourcemap: true,
    rollupOptions: {
      output: {
        // 大文件单独分包
        manualChunks: {
          mdict: ['mdict-js', 'lzo-wasm'],
        },
      },
    },
  },
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
  },
})
```

### Vercel 构建环境

| 项目 | 默认值 | 说明 |
|------|--------|------|
| **Node.js 版本** | Vercel 自动检测，当前默认为 Node.js 18.x（最新支持到 22.x） | 建议在 `package.json` 中指定 `engines` |
| **npm 版本** | 跟随 Node.js 默认版本 | 无特殊要求 |
| **构建命令** | 自动检测框架（Vite → `npm run build`） | 可自定义 |
| **输出目录** | Vite 默认 `dist/` | 无需额外配置 |

### 推荐指定 Node.js 版本

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

或在 Vercel Dashboard → Settings → General → Node.js Version 中指定。

## 8. CDN 缓存策略

### Vercel CDN 特性

- **126+ PoPs**，覆盖 51 个国家
- 框架感知，自动应用最佳缓存策略
- 默认开启 DDoS 防护和防火墙
- 自动 HTTPS/TLS 1.2+

### 静态资源缓存配置

通过 `vercel.json` 的 `headers` 字段配置：

```json
{
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
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### Cache-Control 值说明

| 指令 | 含义 |
|------|------|
| `public` | 响应可被任何缓存（CDN、浏览器）存储 |
| `max-age=31536000` | 缓存 1 年（365 天 × 24 小时 × 3600 秒） |
| `immutable` | 文件内容不变时不发送条件请求（Vite 构建文件含 hash，安全使用） |
| `max-age=0` | 不缓存，每次重新验证 |
| `must-revalidate` | 缓存过期后必须向服务器验证 |

### 缓存策略总结

| 资源类型 | 缓存策略 | 原因 |
|----------|----------|------|
| Vite 构建产物（JS/CSS/字体/图片） | 1 年 + immutable | 文件名含 hash，内容不变则 URL 不变 |
| `index.html` | 不缓存 | 每次需要获取最新版本 |
| 用户数据/API 响应 | 不适用（本项目无后端 API） | 纯 SPA 无动态 API |

## 9. GitHub Actions CI/CD

### GitHub Actions 免费额度

| 资源 | GitHub Free（个人账户） | GitHub Pro |
|------|------------------------|------------|
| **存储** | 500 MB | 1 GB |
| **Linux 分钟数** | 2,000 分钟/月 | 3,000 分钟/月 |
| **Windows 分钟数** | 1,000 分钟/月（乘数 2x） | 1,500 分钟/月 |
| **macOS 分钟数** | 200 分钟/月（乘数 10x） | 300 分钟/月 |
| **并发作业** | 取决于计划，通常 2-3 个 | 更多 |
| **单作业执行时间** | 最长 6 小时 | 最长 6 小时 |
| **工作流运行时间** | 最长 35 天 | 最长 35 天 |
| **API 请求** | 每仓库每小时最多 1,000 次 | 相同 |

### 推荐 CI/CD 流水线

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
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

      - name: Upload build artifacts
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7
```

### 优化建议

| 优化项 | 说明 | 效果 |
|--------|------|------|
| **缓存 node_modules** | 使用 `actions/setup-node` 的 `cache: 'npm'` | 每次构建节省 30-60 秒 |
| **使用 `npm ci`** | 而非 `npm install`，确保可重复安装 | 构建一致性提升 |
| **仅 Linux runner** | Windows/macOS 分钟数乘数高 | 避免消耗额外分钟 |
| **精简触发条件** | 仅 main 分支和 PR 触发 | 减少不必要的构建 |
| **跳过无关变更** | 使用 `[skip ci]` 或 `[ci skip]` | 文档修改时不触发构建 |
| **Vercel 自动部署** | GitHub 推送后 Vercel 自动构建 | 无需手动配置部署步骤 |

### 与 Vercel 的关系

由于 Vercel 已集成 GitHub，每次 push 到 main 会自动触发 Vercel 的生产构建，每次 PR 会触发预览构建。GitHub Actions 的 CI 主要用于：

1. **代码质量检查**：lint、typecheck
2. **构建验证**：确保构建成功
3. **产物归档**：保存构建产物用于审查

Vercel 自身的构建独立于 GitHub Actions，因此实际消耗两份构建资源。若 CI 已验证构建成功，可在 Vercel 中跳过重复构建（Vercel 无此选项，但 Vercel 构建速度通常 < 1 分钟）。

## 10. 结论与建议

### 明确的部署策略

| 决策项 | 方案 | 理由 |
|--------|------|------|
| **部署平台** | Vercel Hobby 免费版 | 纯 SPA 完全够用，自动 HTTPS、CDN、CI/CD |
| **仓库可见性** | 公开仓库 | 私有仓库有 500 MB 限制，且免费 Actions 分钟更少 |
| **MDX 词典分发** | **不通过 Git/Vercel** | 100 MB 限制 + 100 GB 带宽不足以支撑 |
| **SPA 路由** | `vercel.json` rewrites → `/index.html` | 标准 SPA 部署配置 |
| **IndexedDB 隔离** | `VERCEL_ENV` 前缀区分环境 | 简单有效，数据天然隔离 |
| **环境变量** | `VITE_` 前缀，构建时注入 | 纯 SPA 无运行时变量 |
| **缓存策略** | 构建产物 1 年 + `index.html` 不缓存 | 标准 Vite SPA 最佳实践 |
| **CI/CD** | Vercel 自动部署 + GitHub Actions 质量检查 | 双重保障 |

### 带宽风险预警

```
100 GB/月 = 100,000 MB/月

假设场景：
- 每个 MDX 词典文件：50 MB
- 每个用户每月下载次数：4 次
- 单用户月带宽消耗：200 MB

⚠️  100,000 MB ÷ 200 MB = 500 用户/月 即达到带宽上限

若词典文件更大（如 200 MB），则仅 125 用户/月即触顶
```

**建议**：词典文件必须走外部存储分发（如 Cloudflare R2、阿里云 OSS、IPFS 等），不消耗 Vercel 带宽。

## 11. 对 v2.1 方案的影响

基于本分析结果，v2.1（MDX 词典分发方案）需满足以下约束：

1. **词典文件不得纳入 Git 仓库**：GitHub 单文件 100 MB 硬限制不可绕过
2. **词典分发不得走 Vercel CDN**：100 GB/月带宽极易触顶
3. **词典分发必须支持浏览器直接下载**：排除 Git LFS（浏览器无法直接访问）
4. **外部存储需支持 CORS**：前端直接从外部 CDN 加载词典
5. **词典下载不计入 Vercel 带宽**：必须走独立 CDN
6. **词典更新不得触发 Vercel 重建**：词典与代码解耦，独立分发
7. **预览环境的词典加载与生产环境一致**：不受 `VERCEL_ENV` 影响
8. **构建产物中不包含词典文件**：Vite 构建产物仅包含代码和少量内置词典数据
9. **用户可通过 URL 或文件选择器加载外部词典**：支持远程 URL 和本地文件两种导入方式
10. **外部存储建议方案**：Cloudflare R2（免费 10 GB 存储 + 100 万次读操作/月）、IPFS（去中心化，免费但有性能波动）、或自建对象存储

这些约束将直接影响 v2.1 词典分发方案的架构设计，需在方案中明确外部存储选型、CORS 配置、词典缓存策略等细节。
