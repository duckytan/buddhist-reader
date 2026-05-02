# 般若佛经阅读器

> 禅意极简风格的佛经阅读与词典查询 Web 应用

[![GitHub stars](https://img.shields.io/github/stars/duckytan/buddhist-reader)](https://github.com/duckytan/buddhist-reader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 核心特性

| 特性 | 说明 |
|------|------|
| **禅意设计** | 宣纸色背景、墨色文字、檀木色强调，零阴影哲学 |
| **多词典高亮** | 内置佛学词典 + 用户上传 MDX/JSON/CSV 词典 |
| **流式释义** | 多词典并行查询，先返回先渲染 |
| **完全离线** | IndexedDB 存储，PWA 支持 |
| **响应式布局** | 适配手机 / 平板 / PC 三种设备 |

## 预览

### 原型演示

**https://5173-7b99689ba9fd24f5.monkeycode-ai.online**

包含 4 个完整页面：书架、阅读、词典管理、设置

### 响应式布局

| 设备 | 断点 | 导航方式 |
|------|------|----------|
| 桌面 | >= 1024px | 左侧边栏 |
| 平板 | 768-1023px | 底部 Tab |
| 手机 | < 768px | 底部 Tab |

## 技术架构

### 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 框架 | Vue 3 + Composition API | 响应式组件化 |
| 构建 | Vite 5 | 快速冷启动 |
| UI | Vant 4 | 移动端优化 |
| 状态 | Pinia | TypeScript 友好 |
| 存储 | IndexedDB + idb | 本地持久化 |
| 词典 | mdict-js + lzo-wasm | MDict 格式支持 |
| 渲染 | markdown-it + DOMPurify | 安全净化 |

### 项目结构

```
src/
├── services/       # 数据访问抽象层
├── storage/         # IndexedDB 存储层
├── engine/          # 核心引擎 (Trie/高亮/解析)
├── stores/          # Pinia 状态管理
├── components/      # UI 组件
├── pages/           # 页面
└── data/            # 静态数据

docs/
├── design/          # 设计系统规范
├── plans/           # 调研文档
│   ├── research/    # 52 个调研报告
│   ├── analysis/    # 分析报告
│   ├── verification/# 验证报告
│   └── deep-dive/   # 深度分析
└── v2.0-detailed-design.md  # 开发依据

prototype/           # 响应式原型演示
```

## 设计系统

### 配色

| 用途 | 色值 | 说明 |
|------|------|------|
| 强调 | `#8b7355` | 檀木色 |
| 画布 | `#ffffff` | 页面背景 |
| 宣纸 | `#f8f7f4` | 区域背景 |
| 墨 | `#2c2c2c` | 正文主色 |
| 淡墨 | `#6b6b6b` | 次要文字 |

### 主题

- **日间** — 宣纸白 + 墨黑文字
- **暗色** — 深灰背景 + 浅灰文字
- **护眼** — 暖黄背景 + 深棕文字

### 高亮分类

| 分类 | 颜色 | 用途 |
|------|------|------|
| 智慧 | 浅绿 | 般若/智慧类词汇 |
| 慈悲 | 浅蓝 | 慈悲/利他类词汇 |
| 禅定 | 浅紫 | 禅修/心法类词汇 |
| 仪轨 | 浅橙 | 仪轨/法事类词汇 |

详见 [docs/design/ZEN-DESIGN.md](docs/design/ZEN-DESIGN.md)

## 开发

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`

### 代码规范

```bash
npm run lint
```

### 构建

```bash
npm run build
```

输出到 `dist/`

## 文档

| 文档 | 说明 |
|------|------|
| [v2.0 详细设计](docs/v2.0-detailed-design.md) | 完整技术方案 |
| [禅意设计系统](docs/design/ZEN-DESIGN.md) | 设计规范 |
| [awesome-design-md 调研](docs/design/awesome-design-md-analysis.md) | 设计系统研究 |
| [AGENTS.md](AGENTS.md) | 开发指南 |

## 调研成果

已完成 52 个调研任务，产出 50+ 份文档：

| 类别 | 数量 | 内容 |
|------|------|------|
| 技术调研 | T-01 ~ T-15 | Vue3/Vite/Pinia/Vant/IndexedDB 等 |
| 功能分析 | T-16 ~ T-28 | 书架/阅读/词典/设置页面 |
| 决策验证 | T-29 ~ T-36 | Trie/流式渲染/MDX 策略等 |
| 深度分析 | T-37 ~ T-50 | 性能/安全/可访问性/部署 |

详见 [docs/plans/](docs/plans/)

## 版权说明

本应用仅供个人学习研究使用。经文内容版权归原作者或相关出版社所有。

## License

MIT
