# awesome-design-md 调研分析与项目应用

> **来源**: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (69.5k stars)
> **调研日期**: 2026-05-02
> **目的**: 提取对佛经阅读器 v2.0 项目有价值的设计模式与规范

---

## 1. 项目概述

`awesome-design-md` 是一个 DESIGN.md 文件集合，由 Google Stitch 引入的概念：用纯 Markdown 文件描述设计系统，AI 编码 Agent 可以直接读取并生成一致的 UI。

### 核心理念

| 概念 | 说明 |
|------|------|
| **DESIGN.md** | 纯文本设计 系统文档，定义颜色、字体、组件、布局 |
| **AGENTS.md** | 编码 Agent 行为指南（如何构建项目） |
| **DESIGN.md** | 设计 Agent 行为指南（项目应该长什么样） |

### 文件结构

每个设计包含：
- `DESIGN.md` — 设计系统规范（Agent 读取）
- `preview.html` — 视觉目录（色板、字体比例、按钮、卡片）
- `preview-dark.html` — 暗色模式视觉目录

---

## 2. DESIGN.md 标准格式

每个 DESIGN.md 遵循 [Stitch DESIGN.md 格式](https://stitch.withgoogle.com/docs/design-md/format/)，包含 9 个核心部分：

| # | 章节 | 内容 |
|---|------|------|
| 1 | Visual Theme & Atmosphere | 氛围、密度、设计哲学 |
| 2 | Color Palette & Roles | 语义化颜色名 + hex + 功能角色 |
| 3 | Typography Rules | 字体家族、完整层级表 |
| 4 | Component Stylings | 按钮、卡片、输入框、导航及其状态 |
| 5 | Layout Principles | 间距比例、网格、留白哲学 |
| 6 | Depth & Elevation | 阴影系统、表面层级 |
| 7 | Do's and Don'ts | 设计护栏和反模式 |
| 8 | Responsive Behavior | 断点、触摸目标、折叠策略 |
| 9 | Agent Prompt Guide | 快速颜色参考、即用提示词 |

---

## 3. 已调研设计分析

### 3.1 Notion — 温暖极简主义

**适用场景**: 工作台、温暖极简设计、Serif 字体主导

**关键特征**:
- 深海军蓝 hero 区域 + 紫色主 CTA（#5645d4）
- 柔和粉彩功能卡片（桃色、玫瑰、薄荷、薰衣草、天蓝）
- Notion Sans（基于 Inter）贯穿所有 UI 表面
- 8px 圆角按钮（非药丸形），12px 圆角卡片
- 居中 hero 布局（不同于左对齐的 B2B SaaS 常规）

**对我们的价值**:
- 粉彩卡片系统可用于词典分类标签
- 4px 基础单位的间距系统简洁实用
- 完善的按钮状态（primary/pressed/disabled）定义

### 3.2 Apple — 摄影优先博物馆

**适用场景**: 高端产品展示、内容优先界面

**关键特征**:
- 摄影优先，UI 退让让产品说话
- 全屏铺砖交替亮/暗画布
- 单一蓝色强调（#0066cc）承载所有交互元素
- SF Pro Display 负字间距 headline
- 整个系统仅一个阴影（用于产品图）

**对我们的价值**:
- 负字间距 headline 技巧可用于经文标题
- "单一强调色"原则适合我们项目的禅意设计
- 17px 正文（而非常规 16px）提升阅读节奏

### 3.3 Ollama — 激进极简主义

**适用场景**: 开发者工具、极简界面

**关键特征**:
- 纯白画布，零彩色（完全灰度）
- SF Pro Rounded headline 创造柔和感
- 二元圆角系统：12px（容器）或 9999px（交互元素）
- 零阴影 — 深度来自背景色变化和边框
- 内容密度极低，首页简短专注

**对我们的价值**:
- **高度相关**: 二元圆角系统简洁优雅
- 零阴影哲学符合禅意设计理念
- 纯灰度配色方案可用于阅读模式

### 3.4 Linear — 暗色技术文档

**适用场景**: 开发者工具、暗色主题、技术文档

**关键特征**:
- 超暗画布（#010102）— 本集合中最深暗色
- 单一薰衣草蓝强调（#5e6ad2）
- 四级表面阶梯（canvas → surface-1 → surface-2 → surface-3）
- 产品 UI 截图主导页面
-  aggressive 负字间距（-3.0px @ 80px）

**对我们的价值**:
- 四级表面阶梯可用于暗色模式层级定义
- 头发线边框系统（hairline/hairline-strong/hairline-tertiary）
- 完善的暗色模式文本层级（ink/ink-muted/ink-subtle/ink-tertiary）

---

## 4. 提取的通用设计模式

### 4.1 颜色系统模式

#### 语义化颜色命名

```yaml
# 推荐的颜色角色分类
colors:
  # 品牌色
  primary: "#主色调"
  primary-hover: "#悬停状态"
  primary-pressed: "#按下状态"
  primary-focus: "#焦点状态"
  on-primary: "#主色上的文字颜色"
  
  # 表面色
  canvas: "#页面背景"
  surface: "#区域背景"
  surface-soft: "#柔和区域"
  
  # 分隔线
  hairline: "#细线"
  hairline-soft: "#柔和细线"
  hairline-strong: "#强调细线"
  
  # 文字
  ink: "#主要文字"
  ink-muted: "#次要文字"
  ink-subtle: "#弱化文字"
  
  # 语义色
  semantic-success: "#成功"
  semantic-warning: "#警告"
  semantic-error: "#错误"
```

#### 表面阶梯模式

| 模式 | 层级 | 示例 |
|------|------|------|
| **Linear 暗色** | canvas → surface-1 → surface-2 → surface-3 → surface-4 | #010102 → #0f1011 → #141516 → #18191a → #191a1b |
| **Notion 亮色** | canvas → surface → surface-soft | #ffffff → #f6f5f4 → #fafaf9 |
| **Apple 交替** | canvas → parchment → tile-1 → tile-2 → tile-3 | #ffffff → #f5f5f7 → #272729 → #2a2a2c → #252527 |

**对我们项目的建议**: 采用 Notion 的 3 级亮色阶梯 + Linear 的 4 级暗色阶梯

### 4.2 排版系统模式

#### 字体层级最佳实践

| 层级 | 大小范围 | 字重 | 行高 | 字间距 | 用途 |
|------|----------|------|------|--------|------|
| Hero Display | 56-80px | 600 | 1.05-1.10 | -1~-3px | 主标题 |
| Display | 36-48px | 600 | 1.10-1.20 | -0.5~-1px | 区块标题 |
| Heading | 24-32px | 600 | 1.20-1.30 | 0 | 卡片标题 |
| Body Large | 17-18px | 400 | 1.50-1.55 | 0 | 引导段落 |
| Body | 14-16px | 400 | 1.50-1.55 | 0 | 正文 |
| Caption | 12-13px | 400 | 1.40 | 0 | 辅助说明 |
| Micro | 10-12px | 500 | 1.30-1.40 | 0 | 标签、徽章 |

#### 排版原则

1. **Display 使用负字间距** — 创造紧凑专业的 headline 感觉
2. **正文行高 1.50-1.55** — 保证可读性
3. **标题字重 600，正文 400** — 避免使用 700（太重）和 500（暧昧）
4. **Apple 特例**: 正文 17px（而非常规 16px），创造独特的阅读节奏

### 4.3 圆角系统模式

| 模式 | 容器 | 交互元素 | 特点 |
|------|------|----------|------|
| **Notion** | 4px → 24px 渐变 | 8px 按钮，12px 卡片 | 完整阶梯， editorial 几何 |
| **Apple** | 0px → 18px | 9999px 药丸形 | 药丸 CTA 是品牌信号 |
| **Ollama** | 12px | 9999px | 二元系统，极端极简 |
| **Linear** | 4px → 24px | 8px 按钮，12px 卡片 | 技术文档风格 |

**对我们项目的建议**: 采用 Ollama 的二元系统（8px 容器 + 9999px 交互）或 Notion 的渐变系统

### 4.4 阴影系统模式

| 品牌 | 阴影数量 | 哲学 |
|------|----------|------|
| **Apple** | 1 个 | 仅用于产品图，UI 元素无阴影 |
| **Ollama** | 0 个 | 完全扁平，深度来自边框和背景 |
| **Notion** | 4 级 | 0(扁平) → 1(悬停) → 2(卡片) → 3(模型卡片) → 4(模态) |
| **Linear** | 0 个 | 暗色模式下无阴影，用表面阶梯和边框 |

**对我们项目的建议**: 阅读界面采用 Ollama 的零阴影哲学；卡片采用 Notion 的轻量阴影

### 4.5 间距系统模式

| 品牌 | 基础单位 | 常用阶梯 | 区块间距 |
|------|----------|----------|----------|
| **Notion** | 4px | 4, 8, 12, 16, 20, 24, 32, 40 | 48-120px |
| **Apple** | 8px | 4, 8, 12, 17, 24, 32, 48, 80 | 80px |
| **Ollama** | 8px | 4, 6, 8, 9, 10, 12, 14, 16, 20, 24... | 88-112px |
| **Linear** | 4px | 4, 8, 12, 16, 24, 32, 48, 96 | 96px |

**对我们项目的建议**: 采用 4px 基础单位，阶梯：4, 8, 12, 16, 24, 32, 48, 64

---

## 5. 对佛经阅读器项目的具体应用建议

### 5.1 禅意设计系统推荐

基于调研，为佛经阅读器项目推荐以下设计方向：

#### 配色方案 — 灵感来自 Ollama + Notion

```css
/* 亮色模式 */
--zen-canvas: #ffffff;        /* 纯白画布 */
--zen-surface: #f8f7f4;       /* 宣纸色区域 */
--zen-ink: #2c2c2c;           /* 墨色文字 */
--zen-ink-muted: #6b6b6b;     /* 淡墨 */
--zen-hairline: #e8e6e1;      /* 细线 */
--zen-accent: #8b7355;        /* 檀木色强调 */

/* 暗色模式 */
--zen-canvas-dark: #1a1a1a;
--zen-surface-dark: #242424;
--zen-ink-dark: #e0e0e0;
--zen-ink-muted-dark: #888888;
--zen-hairline-dark: #333333;
--zen-accent-dark: #a89279;
```

#### 排版 — 灵感来自 Apple + Notion

```css
/* 经文标题 */
--zen-heading-1: 32px / 600 / 1.25 / -0.5px;
--zen-heading-2: 24px / 600 / 1.30 / 0;
--zen-heading-3: 20px / 600 / 1.35 / 0;

/* 正文 — Apple 风格的 17px 阅读节奏 */
--zen-body: 17px / 400 / 1.65 / 0;
--zen-body-small: 14px / 400 / 1.50 / 0;

/* 辅助文字 */
--zen-caption: 12px / 400 / 1.40 / 0;
```

#### 圆角 — Ollama 二元系统

```css
--zen-radius-container: 8px;   /* 卡片、面板 */
--zen-radius-interactive: 9999px; /* 按钮、标签、开关 */
```

#### 阴影 — 零阴影哲学

```css
/* 深度通过背景和边框实现，零阴影 */
--zen-elevation-0: none;
--zen-elevation-1: 1px solid var(--zen-hairline);
--zen-elevation-2: 1px solid var(--zen-hairline-strong);
```

### 5.2 组件设计建议

#### 阅读界面

- **纯白/纯暗画布**，无装饰
- **17px 正文**，1.65 行高（比常规 1.50 更宽松，适合经文阅读）
- **零阴影**，深度通过边框实现
- **药丸形高亮标记**（9999px 圆角，柔和背景色）

#### 书架界面

- **卡片采用 8px 圆角** + 1px hairline 边框
- **悬停通过背景色变化**，而非阴影
- **按钮采用药丸形**，檀木色强调

#### 词典界面

- **粉彩分类标签**（借鉴 Notion 的 pastel 系统）
- **药丸形搜索输入**
- **分段式标签导航**（类似 Notion 的 segmented-tab）

### 5.3 响应式策略

基于调研的通用断点：

| 断点 | 宽度 | 策略 |
|------|------|------|
| Mobile | < 480px | 单列，标题 28px |
| Large Phone | 480-767px | 单列，标题 36px |
| Tablet | 768-1023px | 2 列网格 |
| Desktop | 1024-1279px | 3-4 列网格 |
| Wide Desktop | ≥ 1280px | 最大内容宽度 1280px |

---

## 6. 可复用的 DESIGN.md 模板

基于调研，以下是适合我们项目的 DESIGN.md 模板结构：

```markdown
---
version: "1.0"
name: "Zen Buddhist Reader"
description: "禅意极简阅读界面，纯净画布、墨色文字、檀木强调"

colors:
  # 定义所有颜色令牌
  
typography:
  # 定义完整字体层级
  
rounded:
  # 定义圆角比例
  
spacing:
  # 定义间距系统
  
components:
  # 定义所有组件样式
---

## 概述
设计哲学和关键特征

## 颜色
详细颜色说明和使用指南

## 排版
字体家族、层级表、原则

## 布局
间距系统、网格、留白哲学

## 深度与提升
阴影/边框系统

## 应该做 / 不应该做
设计护栏

## 响应式行为
断点、触摸目标、折叠策略
```

---

## 7. 总结

### 最有价值的设计模式

| 模式 | 来源 | 适用场景 |
|------|------|----------|
| 零阴影哲学 | Ollama, Linear | 阅读界面 |
| 二元圆角系统 | Ollama | 按钮/容器区分 |
| 语义化颜色命名 | 所有 | 设计系统基础 |
| 负字间距 Display | Apple, Linear | 标题排版 |
| 17px 正文节奏 | Apple | 经文阅读 |
| 表面阶梯 | Linear, Notion | 暗色模式层级 |
| 粉彩分类标签 | Notion | 词典分类 |

### 推荐下一步

1. 基于本调研创建项目的 `DESIGN.md` 文件
2. 在 `docs/v2.0-detailed-design.md` 中引用本设计系统的令牌
3. 实现阶段使用本规范指导 CSS 变量和组件样式
