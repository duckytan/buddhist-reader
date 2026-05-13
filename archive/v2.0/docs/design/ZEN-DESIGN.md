---
version: "1.0"
name: "Zen"
description: "禅意极简阅读界面。纯净画布、墨色文字、檀木强调。灵感来自 Ollama 的零阴影哲学、Apple 的阅读节奏、Notion 的粉彩分类系统。"

# 1. Visual Theme & Atmosphere

Zen 的设计哲学是「少即是多」— 界面退让，让经文内容成为主角。采用零阴影、纯净画布、温和圆角的极简美学，创造沉浸式的阅读体验。

**Key Characteristics:**
- 零阴影哲学 — 深度通过背景和边框实现，非视觉层叠
- 二元圆角系统 — 8px（容器）或 9999px（交互元素）
- 墨色文字系统 — ink / ink-muted / ink-subtle 三级文字层级
- 檀木色单强调 — #8b7355 作为唯一的交互色
- 17px 正文节奏 — Apple 风格的宽松阅读体验
- 宣纸色表面 — #f8f7f4 用于区分区域
- 暗色模式完整支持 — 四级表面阶梯

# 2. Color Palette & Roles

## 亮色模式

### 品牌与强调
- **檀木** (`{colors.accent}` — #8b7355): 唯一的交互强调色，用于主按钮、链接、高亮标记
- **檀木深** (`{colors.accent-deep}` — #6b5540): 按下状态、强调深化
- **檀木浅** (`{colors.accent-light}` — #a89279): 悬停状态、次要强调

### 表面
- **画布白** (`{colors.canvas}` — #ffffff): 页面主背景，纯白
- **宣纸** (`{colors.surface}` — #f8f7f4): 区域背景，微暖米白
- **宣纸柔** (`{colors.surface-soft}` — #fafaf8): 柔和区分区域

### 文字
- **墨** (`{colors.ink}` — #2c2c2c): 标题和正文主色，近黑非纯黑
- **淡墨** (`{colors.ink-muted}` — #6b6b6b): 次要文字、说明
- **浅墨** (`{colors.ink-subtle}` — #999999): 辅助文字、占位符

### 分隔
- **细线** (`{colors.hairline}` — #e8e6e1): 卡片边框、分隔线
- **细线强** (`{colors.hairline-strong}` — #d0cdc6): 输入框聚焦边框

### 语义
- **成功** (`{colors.success}` — #4a7c59): 佛教绿
- **警告** (`{colors.warning}` — #c49a6c): 佛教金
- **错误** (`{colors.error}` — #a85656): 佛教红

## 暗色模式

### 表面阶梯
- **画布暗** (`{colors.canvas-dark}` — #1a1a1a): 默认页面背景
- **表面1** (`{colors.surface-dark-1}` — #242424): 卡片、面板
- **表面2** (`{colors.surface-dark-2}` — #2e2e2e): 悬浮卡片、选中态
- **表面3** (`{colors.surface-dark-3}` — #383838): 导航、下拉菜单

### 文字
- **墨暗** (`{colors.ink-dark}` — #e0e0e0): 暗色模式主文字
- **淡墨暗** (`{colors.ink-muted-dark}` — #888888): 次要文字
- **浅墨暗** (`{colors.ink-subtle-dark}` — #666666): 辅助文字

### 分隔
- **细线暗** (`{colors.hairline-dark}` — #333333): 暗色模式边框

# 3. Typography Rules

## 字体家族
- **标题**: `Noto Serif SC, Source Han Serif SC, Georgia, serif` — 宋体，传统经文感
- **正文**: `Noto Sans SC, Source Han Sans SC, system-ui, sans-serif` — 黑体，现代可读性
- **代码/梵文**: `Noto Sans Mono, ui-monospace, monospace` — 等宽，技术内容

## 层级

| Token | 大小 | 字重 | 行高 | 字间距 | 用途 |
|---|---|---|---|---|---|
| `{typography.display}` | 40px | 600 | 1.15 | -1px | 页面大标题 |
| `{typography.h1}` | 32px | 600 | 1.25 | -0.5px | 区块标题 |
| `{typography.h2}` | 24px | 600 | 1.30 | 0 | 卡片标题 |
| `{typography.h3}` | 20px | 600 | 1.35 | 0 | 小节标题 |
| `{typography.body-lg}` | 18px | 400 | 1.65 | 0 | 引导段落 |
| `{typography.body}` | 17px | 400 | 1.65 | 0 | 经文正文 |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | 辅助说明 |
| `{typography.caption}` | 12px | 400 | 1.40 | 0 | 注释、元数据 |
| `{typography.button}` | 14px | 500 | 1.30 | 0 | 按钮文字 |
| `{typography.tag}` | 12px | 500 | 1.30 | 0 | 标签、徽章 |

## 原则
- **正文 17px** — Apple 风格，创造「阅读而非扫描」的节奏
- **行高 1.65** — 比常规 1.50 更宽松，适合长文阅读
- **标题 600 字重** — 避免 700 过重，保持优雅
- **正文 400 字重** — 默认字重，最大化可读性

# 4. Component Stylings

## 按钮

**`button-primary`** — 檀木色主按钮
- 背景 `{colors.accent}`, 文字 `{colors.on-primary}`, 圆角 `{radius.pill}`, 内边距 `10px 20px`

**`button-secondary`** — 透明次要按钮
- 背景 `transparent`, 文字 `{colors.accent}`, 边框 `1px solid {colors.accent}`, 圆角 `{radius.pill}`

**`button-ghost`** — 幽灵按钮
- 背景 `transparent`, 文字 `{colors.ink-muted}`, 圆角 `{radius.pill}`, 内边距 `8px 14px`

## 卡片

**`card-base`** — 标准卡片
- 背景 `{colors.canvas}`, 圆角 `{radius.container}`, 内边距 `20px`, 边框 `1px solid {colors.hairline}`

**`card-sutra`** — 经文卡片（书架）
- 背景 `{colors.canvas}`, 圆角 `{radius.container}`, 内边距 `24px`, 边框 `1px solid {colors.hairline}`

## 输入框

**`text-input`** — 标准输入
- 背景 `{colors.canvas}`, 文字 `{colors.ink}`, 圆角 `{radius.pill}`, 边框 `1px solid {colors.hairline}`, 高度 `44px`

**`text-input-focused`** — 聚焦状态
- 边框 `2px solid {colors.accent}`

## 标签

**`tag-pill`** — 药丸形标签
- 背景 `{colors.surface}`, 文字 `{colors.ink-muted}`, 圆角 `{radius.pill}`, 内边距 `4px 12px`

**`tag-category-*`** — 分类标签（粉彩系统）
- `tag-category-mind`: 背景 `#e8f5e9`, 文字 `#2e7d32`
- `tag-category-sutra`: 背景 `#fff3e0`, 文字 `#e65100`
- `tag-category-commentary`: 背景 `#e3f2fd`, 文字 `#1565c0`
- `tag-category-mantra`: 背景 `#f3e5f5`, 文字 `#7b1fa2`

# 5. Layout Principles

## 间距系统
- **基础单位**: 4px
- **阶梯**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px

## 网格
- **最大内容宽度**: 1280px
- **书架网格**: 3 列 (桌面) → 2 列 (平板) → 1 列 (手机)
- **阅读界面**: 单列居中，最大宽度 680px

## 留白哲学
- **阅读优先** — 经文周围 generous 留白，最小 40px
- **区域通过背景色区分** — 非阴影或边框
- **区块间距 64px** — 呼吸感节奏

# 6. Depth & Elevation

| 层级 | 处理 | 用途 |
|---|---|---|
| 0 (平) | 无阴影，无边框 | 默认内容、文字 |
| 1 (边框) | `1px solid {colors.hairline}` | 卡片、面板 |
| 2 (悬浮) | `1px solid {colors.hairline-strong}` + `{colors.surface}` 背景 | 悬停卡片 |

**阴影哲学**: 零阴影。深度通过背景色变化和 1px 边框传达。

# 7. Do's and Don'ts

### Do
- 使用 `{colors.accent}` 檀木色作为唯一的交互强调色
- 所有交互元素使用 `{radius.pill}` (9999px) 圆角
- 容器使用 `{radius.container}` (8px) 圆角
- 正文使用 17px，行高 1.65
- 深度通过背景色变化实现，不使用阴影
- 保持内容密度低 — 每个区域传达一个清晰概念
- 暗色模式使用四级表面阶梯

### Don't
- 不要引入第二个强调色
- 不要对卡片或按钮使用阴影
- 不要使用 700+ 字重
- 不要混用圆角 — 坚持二元系统（8px 或 9999px）
- 不要使用装饰性渐变
- 不要让界面元素与经文内容竞争注意力

# 8. Responsive Behavior

## 断点

| 名称 | 宽度 | 关键变化 |
|---|---|---|
| 手机 | < 480px | 单列，标题 24px |
| 大手机 | 480-767px | 单列，标题 28px |
| 平板 | 768-1023px | 2 列网格 |
| 桌面 | 1024-1279px | 3-4 列网格 |
| 宽桌面 | ≥ 1280px | 最大宽度锁定 1280px |

## 触摸目标
- 最小 44x44px
- 按钮高度 40-44px
- 输入框高度 44px

# 9. Agent Prompt Guide

## 快速颜色参考
- 主强调: "檀木 (#8b7355)"
- 页面背景: "画布白 (#ffffff) / 画布暗 (#1a1a1a)"
- 主文字: "墨 (#2c2c2c) / 墨暗 (#e0e0e0)"
- 边框: "细线 (#e8e6e1) / 细线暗 (#333333)"

## 示例组件提示
- "创建阅读界面正文区域：纯白背景 (#ffffff)，17px Noto Sans SC 正文，行高 1.65，最大宽度 680px 居中，周围 40px 留白"
- "设计经文卡片：8px 圆角，1px 细线边框 (#e8e6e1)，24px 内边距，悬停时背景变为宣纸色 (#f8f7f4)"
- "构建分类标签系统：药丸形 (9999px 圆角)，粉彩背景，内边距 4px 12px"
