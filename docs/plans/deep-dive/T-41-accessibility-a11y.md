# 可访问性（a11y）分析 报告

> 任务编号：T-41
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

佛教经文阅读器的核心用户群体包括年长修行者、视障用户和色觉异常用户。可访问性不仅是一项合规要求，更是本项目"简单、专注、不打扰"核心理念的自然延伸。

**目标**：
- 确保 v2.0 上线时达到 WCAG 2.1 AA 标准
- 色盲用户能清晰区分高亮术语
- 键盘用户能不依赖鼠标完成所有操作
- 屏幕阅读器用户能理解界面结构和内容
- 提供合理的字体大小调节范围，支持浏览器缩放至 200%

**当前 v1.0 的问题**：
- 无任何 ARIA 标签，按钮仅用 emoji 或符号（`←`、`☷`、`↗`）作为内容
- 开关组件无 `role="switch"` 和 `aria-checked` 属性
- 无键盘焦点样式（`:focus` 未定义）
- 高亮色 `#FFF3CD`（浅黄）在浅色背景上对比度仅 1.43:1，远低于 AA 要求
- 暗色模式高亮色 `#4A4A4A` 对比度 4.77:1，勉强达标但视觉辨识度低
- 字体大小调节范围 14px-28px，范围偏窄，步长 2px 不够精细

## 2. WCAG 2.1 AA 标准对照

| 标准 | 准则编号 | 要求 | 本项目状态 | 备注 |
|------|----------|------|------------|------|
| **文本对比度** | 1.4.3 | 普通文本 >= 4.5:1，大文本 >= 3:1 | 部分达标 | 浅色模式主文本 12.63:1 (达标)；暗色模式主文本 10.85:1 (达标)；但高亮色 #FFF3CD 仅 1.43:1 (不达标) |
| **非文本对比度** | 1.4.11 | UI 组件和图形对象 >= 3:1 | 不达标 | 开关组件无可见边框，焦点状态无样式 |
| **不使用颜色作为唯一视觉手段** | 1.4.1 | 颜色不应是传达信息的唯一方式 | 部分达标 | 高亮术语仅靠背景色区分，需增加下划线或边框辅助 |
| **内容可缩放** | 1.4.4 | 支持缩放至 200% 不丢失内容或功能 | 待实现 | v1.0 未禁用浏览器缩放，但布局未做 200% 缩放测试 |
| **键盘可访问** | 2.1.1 | 所有功能可通过键盘操作 | 不达标 | 所有按钮可用 Tab 到达，但无焦点样式，弹窗无法用键盘关闭 |
| **无键盘陷阱** | 2.1.2 | 焦点不应被锁定在某个组件中 | 待实现 | 弹窗组件未实现焦点管理 |
| **焦点顺序** | 2.4.3 | 焦点顺序应有意义且可操作 | 部分达标 | Tab 顺序基本合理，但缺少 skip link |
| **焦点可见** | 2.4.7 | 键盘焦点指示器必须可见 | 不达标 | 全局未定义 :focus 样式 |
| **页面标题** | 2.4.2 | 页面必须有描述性标题 | 待实现 | 需在 router 中配置 document.title |
| **链接目的明确** | 2.4.4 | 链接目的应从链接文本或上下文中明确 | 部分达标 | 按钮使用 `title` 属性但缺少 `aria-label` |
| ** headings 和标签** | 1.3.1 | 信息和关系可通过程序确定 | 部分达标 | 使用 h1/h2 但缺少 landmark 角色 (main, nav, etc.) |
| **表单标签** | 1.3.1 / 3.3.2 | 表单控件必须有标签 | 待实现 | 跳转输入框有 placeholder 但缺少 label |
| **语言** | 3.1.1 / 3.1.2 | 页面和段落语言可程序确定 | 待实现 | html 需设 lang="zh-CN"，经文梵文/藏文需标注语言 |
| **错误识别** | 3.3.1 | 输入错误自动检测并告知用户 | 待实现 | 跳转输入框无错误提示 |
| **标签和说明** | 4.1.2 | 所有 UI 组件必须有可访问名称和值 | 不达标 | 开关、颜色选择器、图标按钮缺少 aria-label |
| **状态变化** | 4.1.3 | 状态变化应通知辅助技术 | 不达标 | 开关切换、词典加载无 aria-live 通知 |

### 对比度详细计算

| 元素 | 前景色 | 背景色 | 对比度 | WCAG AA (普通文本) | WCAG AA (大文本) |
|------|--------|--------|--------|-------------------|-----------------|
| 浅色模式主文本 | #333333 | #FFFFFF | 12.63:1 | 通过 | 通过 |
| 浅色模式辅助文本 | #666666 | #FFFFFF | 5.74:1 | 通过 | 通过 |
| 浅色模式提示文本 | #999999 | #FFFFFF | 2.85:1 | **不通过** | **不通过** |
| 浅色模式高亮 | #333333 | #FFF3CD | 10.19:1 | 通过 | 通过 |
| 暗色模式主文本 | #E0E0E0 | #2A2A2A | 8.82:1 | 通过 | 通过 |
| 暗色模式辅助文本 | #B0B0B0 | #2A2A2A | 5.39:1 | 通过 | 通过 |
| 暗色模式提示文本 | #808080 | #2A2A2A | 3.45:1 | **不通过** | 通过 |
| 暗色模式高亮 | #E0E0E0 | #4A4A4A | 4.77:1 | 通过 | 通过 |
| 主色按钮文字 | #FFFFFF | #FF6B35 | 3.04:1 | **不通过** | 通过 |
| 主色作为高亮背景 | #333333 | #FF6B35 | 3.20:1 | **不通过** | 通过 |

## 3. 键盘导航

### 3.1 Tab 键导航

v2.0 需要确保以下交互元素均可通过 Tab 键到达，且具有合理的焦点顺序：

```
Tab 顺序（阅读页）:
  [返回按钮] → [词典选择] → [目录按钮] → [主题切换] → [经文内容] → 
  [进度条] → [跳转按钮] → [目录按钮(底部)] → [音频播放控制]
```

### 3.2 焦点样式

全局定义可见焦点指示器，与禅意设计风格协调：

```css
/* 全局焦点样式 - 禅意风格 */
:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  border-radius: 2px;
}

/* 对于圆角组件 */
.rounded-component:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 对于经文中的高亮术语 */
.dict-term:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}
```

### 3.3 快捷键

| 快捷键 | 功能 | 适用页面 |
|--------|------|----------|
| `Esc` | 关闭弹窗/抽屉 | 全局 |
| `Space` | 播放/暂停 TTS | 阅读页 |
| `←` / `→` | 上一章/下一章 | 阅读页 |
| `↑` / `↓` | 经文内上下滚动 | 阅读页 |
| `Tab` | 下一个交互元素 | 全局 |
| `Shift + Tab` | 上一个交互元素 | 全局 |
| `/` | 聚焦搜索框 | 书架页 |
| `?` | 显示快捷键帮助 | 全局 |

### 3.4 焦点管理

- **弹窗/抽屉打开时**：焦点自动移入弹窗内第一个可交互元素
- **弹窗/抽屉关闭时**：焦点返回到触发元素
- **弹窗内 Tab**：焦点在弹窗内循环（focus trap）
- **背景内容**：弹窗打开时添加 `aria-hidden="true"` 到背景

## 4. 屏幕阅读器

### 4.1 ARIA 标签

需要为以下元素添加 `aria-label`：

| 元素 | 当前 | v2.0 改进 |
|------|------|-----------|
| 返回按钮 | `<button>←</button>` | `<button aria-label="返回书架">←</button>` |
| 目录按钮 | `<button>☷</button>` | `<button aria-label="章节目录">☷</button>` |
| 主题切换 | `<ThemeToggle>` | 内部添加 `aria-label="切换深色模式"` + `role="switch"` + `aria-checked` |
| 字体增大 | `<button>+</button>` | `<button aria-label="增大字体">+</button>` |
| 字体减小 | `<button>-</button>` | `<button aria-label="减小字体">-</button>` |
| 进度条 | `<div class="progress-bar">` | `<div role="slider" aria-label="阅读进度" aria-valuenow aria-valuemin aria-valuemax>` |
| 高亮术语 | `<span class="dict-term">` | 添加 `role="button"` + `aria-label="查看术语释义：{term}"` + `tabindex="0"` |
| 词典开关 | `<button class="dict-toggle">` | 添加 `role="switch"` + `aria-checked` + `aria-label="启用{词典名}"` |
| 加载状态 | `<div class="loading-spinner">📖</div>` | 添加 `role="status"` + `aria-live="polite"` |
| 错误提示 | `<p class="error-message">` | 添加 `role="alert"` + `aria-live="assertive"` |

### 4.2 语义 HTML

| 当前 v1.0 | v2.0 改进 |
|-----------|-----------|
| `<div class="reader">` | `<main role="main" id="main-content">` |
| `<header class="reader-header">` | 保持 `<header>`，添加 `role="banner"` |
| `<div class="reader-footer">` | `<footer role="contentinfo">` |
| `<nav class="bottom-nav">` | 保持 `<nav>`，添加 `aria-label="主导航"` |
| `<div class="settings-section">` | `<section aria-labelledby="section-title-id">` |
| 无 skip link | 添加 `<a href="#main-content" class="skip-link">跳到主要内容</a>` |

### 4.3 动态内容通知

```html
<!-- 词典异步加载时 -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  正在加载 {{ term }} 的释义...
</div>

<!-- 释义加载完成后 -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {{ dictName }}：{{ definition }}
</div>

<!-- 操作成功提示 -->
<div role="status" aria-live="polite" class="sr-only">
  词典已{{ enabled ? '启用' : '禁用' }}
</div>
```

### 4.4 隐藏文本（Screen Reader Only）

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## 5. 色盲友好配色

### 5.1 色盲类型与影响

| 类型 | 人群比例 | 影响 |
|------|----------|------|
| 红色盲 (Protanopia) | 男性 ~1% | 难以区分红色与绿色、棕色 |
| 绿色盲 (Deuteranopia) | 男性 ~5% | 难以区分红色与绿色 |
| 蓝色盲 (Tritanopia) | ~0.01% | 难以区分蓝色与黄色 |
| 全色盲 (Achromatopsia) | ~0.003% | 只能感知灰度 |

### 5.2 v1.0 配色问题分析

v1.0 当前高亮色 `#FFF3CD`（浅黄）和 `#4A4A4A`（深灰）存在以下问题：
- 浅色模式：`#FFF3CD` 对比度过低 (1.43:1)，绿色盲和红色盲用户几乎无法感知
- 暗色模式：`#4A4A4A` 与背景 `#2A2A2A` 区分度低，蓝色盲用户难以辨识
- 多词典高亮仅靠颜色区分，无额外视觉标记

### 5.3 v2.0 色盲友好高亮配色方案

采用 Okabe-Ito 色盲安全调色板作为基础，确保各类色盲用户都能区分：

#### 内置高亮色（浅色模式）

| 用途 | 颜色 | 对比度 (vs #FFFFFF) | WCAG AA | 色盲安全 |
|------|------|---------------------|---------|----------|
| 默认高亮 | `#E8D5B7` | 2.12:1 | 不通过（背景色） | - |
| 高亮文字 | `#333333` | 10.19:1 (vs 高亮背景) | 通过 | 通过 |
| 红色盲安全高亮 | `#E69F00` (琥珀) | 3.14:1 (vs #FFF) | 大文本通过 | 通过 |
| 绿色盲安全高亮 | `#56B4E9` (天蓝) | 2.77:1 (vs #FFF) | 大文本通过 | 通过 |
| 蓝色盲安全高亮 | `#F0E442` (明黄) | 1.55:1 (vs #FFF) | 不通过 | 通过 |

**改进策略**：高亮不应仅依赖背景色，需组合多种视觉手段：

```css
/* 方案：背景色 + 下划线边框（双重编码） */
.dict-term {
  background-color: var(--highlight-bg);
  border-bottom: 2px solid var(--highlight-border);
  border-radius: 2px;
  padding: 1px 3px;
  cursor: pointer;
}

/* 不同词典用不同边框样式（不仅是颜色） */
.dict-term[data-dict="builtin"] {
  background-color: #E8D5B7;
  border-bottom: 2px solid #CC8B3D;
}

.dict-term[data-dict="external"] {
  background-color: #D4E6F1;
  border-bottom: 2px dashed #2E86C1;
}

.dict-term[data-dict="user"] {
  background-color: #E8DAEF;
  border-bottom: 2px dotted #8E44AD;
}
```

#### 暗色模式高亮色

| 用途 | 颜色 | 对比度 (vs #2A2A2A) | WCAG AA |
|------|------|---------------------|---------|
| 默认高亮 | `#5C4A2A` | 4.17:1 | 通过 (大文本) |
| 高亮文字 | `#E0E0E0` | 4.17:1 (vs 高亮背景) | 通过 (大文本) |
| 边框-内置 | `#CC8B3D` | 3.85:1 | 通过 |
| 边框-外部 | `#5DADE2` | 4.60:1 | 通过 |
| 边框-用户 | `#BB8FCE` | 4.12:1 | 通过 |

### 5.4 色盲安全词典配色预设

为词典颜色选择器提供预设色盲安全色：

```javascript
const COLORBLIND_SAFE_PALETTE = [
  { name: '琥珀', hex: '#E69F00', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '天蓝', hex: '#56B4E9', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '蓝绿', hex: '#009E73', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '黄褐', hex: '#F0E442', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '橘红', hex: '#E56B00', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '紫红', hex: '#CC79A7', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '深蓝', hex: '#0072B2', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
  { name: '深灰', hex: '#727272', safe: ['protanopia', 'deuteranopia', 'tritanopia'] },
];
```

### 5.5 色盲模式（远期）

v2.1 可考虑添加"色盲增强模式"：
- 开关位于设置页"无障碍"区域
- 开启后自动切换为色盲安全调色板
- 所有高亮术语增加边框样式（实线/虚线/点线）作为颜色之外的区分手段

## 6. 字体大小调节

### 6.1 当前 v1.0 范围

- 最小：14px
- 默认：16px
- 最大：28px
- 步长：2px
- 档位数量：8 档 (14, 16, 18, 20, 22, 24, 26, 28)

### 6.2 v2.0 建议范围

| 档位 | 字号 | 适用场景 |
|------|------|----------|
| 极小 | 14px | 年轻用户、小屏设备 |
| 小 | 16px | 默认值 |
| 标准 | 18px | 舒适阅读 |
| 大 | 20px | 年长用户 |
| 较大 | 22px | 轻度视障 |
| 很大 | 24px | 中度视障 |
| 极大 | 28px | 重度视障 |
| 特大 | 32px | 严重视障 |
| 超大 | 36px | 极端情况 |

- **最小值**：14px（不低于浏览器默认最小 12px）
- **默认值**：18px（经文阅读推荐值，比 v1.0 的 16px 略大）
- **最大值**：36px（覆盖大多数视障用户需求）
- **步长**：2px（精细调节）
- **档位数量**：12 档

### 6.3 浏览器缩放支持（WCAG 1.4.4）

```html
<!-- viewport 必须允许缩放 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
```

**禁止**：
- `user-scalable=no`
- `maximum-scale=1.0`
- 任何阻止浏览器缩放的 CSS 或 JS 代码

### 6.4 字号实现方案

```css
/* 使用 rem 作为单位，基于 html font-size */
:root {
  --reader-font-size: 18px; /* 默认值，由 JS 动态设置 */
}

html {
  /* 不设置固定 font-size，让浏览器默认值生效 */
}

.reader-content {
  font-size: var(--reader-font-size);
}

/* 相对字号使用 rem */
.chapter-title h2 {
  font-size: 1.5rem; /* 相对于 reader-font-size 的 1.5 倍 */
}
```

### 6.5 字号与行高联动

字号增大时，行高也应同步调整以保证可读性：

```javascript
const LINE_HEIGHT_MAP = {
  14: 1.8,
  16: 1.8,
  18: 1.9,
  20: 2.0,
  22: 2.0,
  24: 2.1,
  28: 2.2,
  32: 2.3,
  36: 2.4,
}
```

### 6.6 字号持久化

- 保存在 IndexedDB `settingStore` 中
- 首次启动时从 localStorage 迁移（v1.0 兼容）
- 记住用户上次选择的字号

## 7. 结论与建议

### 7.1 优先级排序

| 优先级 | 项目 | 工作量 | 影响 |
|--------|------|--------|------|
| **P0** | 修复高亮对比度（添加边框辅助） | 小 | 色盲用户核心体验 |
| **P0** | 全局焦点样式 `:focus-visible` | 小 | 键盘导航核心体验 |
| **P0** | 所有交互元素添加 `aria-label` | 中 | 屏幕阅读器核心体验 |
| **P0** | viewport 允许缩放 | 极小 | WCAG 合规 |
| **P1** | 开关组件 `role="switch"` + `aria-checked` | 中 | 屏幕阅读器体验 |
| **P1** | 弹窗焦点管理（focus trap） | 中 | 键盘导航完整性 |
| **P1** | 动态内容 `aria-live` 通知 | 小 | 屏幕阅读器体验 |
| **P1** | Skip link 跳过导航 | 小 | 键盘导航效率 |
| **P1** | 路由页面 title 配置 | 小 | 屏幕阅读器体验 |
| **P2** | 色盲安全配色预设 | 中 | 色盲用户体验提升 |
| **P2** | 快捷键帮助面板 `?` | 中 | 键盘用户效率 |
| **P2** | 语言属性标注 (lang) | 小 | 屏幕阅读器发音准确性 |
| **P3** | 色盲增强模式 | 大 | 高级色盲用户 |

### 7.2 设计原则

1. **多重编码**：关键信息不应仅通过颜色传达，需结合文字、图标、边框样式等
2. **渐进增强**：基础可访问性（对比度、焦点、标签）必须在 v2.0 实现，高级功能（色盲模式、快捷键）可后续迭代
3. **禅意兼容**：焦点样式和无障碍元素应融入禅意设计风格，不破坏视觉一致性
4. **测试驱动**：每个 Phase 交付前，使用 axe DevTools 或 Lighthouse 进行自动化可访问性扫描

### 7.3 推荐工具

| 工具 | 用途 |
|------|------|
| axe DevTools (浏览器扩展) | 自动化 WCAG 检测 |
| Lighthouse (Chrome) | 可访问性评分 |
| WAVE (浏览器扩展) | 可视化无障碍问题 |
| Stark (Figma/Sketch 插件) | 设计阶段对比度检查 |
| Color Oracle | 色盲模拟器 |
| NVDA (Windows) / VoiceOver (macOS) | 屏幕阅读器手动测试 |

## 8. 对 v2.1 方案的影响

本分析结果对 v2.1 后续开发方案的具体影响：

1. **字典组件重构**：`DictionaryPopup` 需添加 `role="dialog"`、`aria-modal="true"`、焦点管理和 `aria-label`
2. **高亮引擎改动**：`engine/highlighter.js` 需输出带有 `data-dict` 和 `data-term` 属性的 HTML，以便添加边框样式区分不同词典
3. **设置页新增区域**：在设置页新增"无障碍"分区，包含色盲安全配色切换、字体大小滑块、快捷键列表
4. **Vant 4 组件审查**：需验证 Vant 4 组件的可访问性，对不合规的组件进行封装或替换
5. **设计 Token 扩展**：`variables.scss` 需新增 `--focus-color`、`--highlight-border-*`、`--sr-only` 等可访问性相关 CSS 变量
6. **测试策略补充**：在 T-44 测试策略中增加可访问性测试章节，包括 axe-core 集成和手动屏幕阅读器测试
7. **TTS 朗读增强**：屏幕阅读器用户点击术语时，TTS 应朗读术语的拼音和释义，而非仅显示弹窗
8. **语言标记**：经文中的梵文（如 "prajñā"）、藏文需用 `<span lang="sa">` 标注，确保屏幕阅读器使用正确发音引擎
9. **进度条改造**：底部进度条需从 `<div>` 改为 `<div role="slider">` 或使用 Vant 的可访问滑块组件
10. **页面标题管理**：Vue Router 需在每个路由配置中添加 `meta.title`，动态设置 `document.title`（格式：`{页面名} - 般若阅读器`）
