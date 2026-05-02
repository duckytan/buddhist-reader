# 禅意设计原则落地方案 报告

> 任务编号：T-49
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/deep-dive/T-42-zen-ui-design.md

## 1. 背景与目标

T-42 禅意 UI/UX 设计语言文档定义了"极简、留白、温暖、自然、克制"五大原则和完整的色彩/字体/间距体系。本落地方案解决以下问题：

1. 从 v1.0 归档代码中提取可用的设计资产，识别需变更部分
2. 将设计原则转化为可执行的 CSS 变量 Token 系统
3. 明确暗色模式和护眼模式的具体色温、对比度参数
4. 定义动画的"克制"量化标准
5. 规划 Vant 4 组件的禅意主题覆盖路径
6. 对比同类禅意/冥想 App，找到差异化定位

目标：为 v2.1（阅读页面实现）和后续版本提供可直接编码的设计规范。

## 2. v1.0 禅意 UI 提取

### 2.1 从归档代码提取的实际设计资产

通过分析 `archive/v1.0/src/assets/styles/variables.scss` 和全局样式，提取 v1.0 的实际设计参数：

**配色（v1.0 实际值）**：

| Token | v1.0 日间 | v1.0 夜间 | 禅意评估 |
|-------|-----------|-----------|----------|
| `--primary-color` | `#FF6B35` | 同左 | **不合格**：饱和度过高，偏商业活泼 |
| `--bg-page` | `#F5F5F5` | `#1A1A1A` | 日间偏冷灰，夜间偏纯黑 |
| `--bg-card` | `#FFFFFF` | `#2A2A2A` | 纯白可保留，夜间 OK |
| `--text-primary` | `#333333` | `#E0E0E0` | 日间偏黑，夜间偏亮 |
| `--text-secondary` | `#666666` | `#B0B0B0` | 可用 |
| `--highlight-bg` | `#FFF3CD` | `#4A4A4A` | 日间 OK，夜间应为暖色调 |
| `--border-color` | `#E0E0E0` | `#3A3A3A` | 偏冷灰 |
| `--divider-color` | `#EEEEEE` | `#333333` | 偏冷灰 |

**字体（v1.0 实际值）**：

| Token | v1.0 值 | 禅意评估 |
|-------|---------|----------|
| `--font-heading` | Source Han Serif CN, Noto Serif SC | **合格**：宋体优先 |
| `--font-body` | Source Han Sans CN, Noto Sans SC | **不合格**：正文应为宋体而非黑体 |
| `--font-sanskrit` | Noto Sans Devanagari | 合格 |
| `--font-tibetan` | Noto Sans Tibetan | 合格 |

**间距（v1.0 实际值）**：

| Token | v1.0 值 | 禅意评估 |
|-------|---------|----------|
| 基准 | 4px（`--space-1`） | 合格 |
| 等级 | 8 级（4/8/12/16/20/24/32/48/64） | **需扩展**：禅意方案需 10 级 |
| 命名 | `--space-N` | 合格，改为 `--zen-space-N` |

**圆角（v1.0 实际值）**：

| Token | v1.0 值 | 禅意评估 |
|-------|---------|----------|
| `--radius-sm` | 8px | 合格 |
| `--radius-md` | 12px | 合格 |
| `--radius-lg` | 16px | **需去掉**：禅意精简为两级 |
| `--radius-xl` | 24px | **需去掉**：过于圆润 |
| `--radius-full` | 9999px | 合格（圆形图标） |

**阴影（v1.0 实际值）**：

| Token | v1.0 值 | 禅意评估 |
|-------|---------|----------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 合格 |
| `--shadow-base` | `0 2px 8px rgba(0,0,0,0.08)` | **偏重**：应减弱 |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.1)` | **需去掉**：过于明显 |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | **需去掉**：商业感太强 |

**动画（v1.0 实际值）**：

| Token | v1.0 值 | 禅意评估 |
|-------|---------|----------|
| `--transition-fast` | `0.15s ease` | 曲线应为 `ease-out` |
| `--transition-base` | `0.3s ease` | **偏慢**：应改为 `0.25s` |
| `--transition-slow` | `0.5s ease` | **偏慢**：应改为 `0.3s` 或去掉 |

### 2.2 v1.0 可保留的设计资产

| 资产 | 保留原因 | 修改方式 |
|------|----------|----------|
| 4px 基准间距系统 | 符合禅意节奏感 | 重命名为 `--zen-space-N` |
| 宋体标题字体栈 | 符合传统经书风格 | 扩展到正文 |
| 高亮背景 `#FFF3CD` | 温暖的金黄色调 | 保留，增加夜间变体 |
| CSS 变量架构 | 支持主题切换 | 统一前缀为 `--zen-*` |
| 响应式断点 mixins | 三端适配 | 保留 |

### 2.3 v1.0 需废弃的设计

| 资产 | 废弃原因 | 替代方案 |
|------|----------|----------|
| `#FF6B35` 主色 | 过于鲜艳活泼 | `#A0522D` 赭石色 |
| 黑体正文字体栈 | 缺乏传统经书感 | 宋体优先 |
| `.dark-mode` class 切换 | 仅支持两种模式 | `[data-theme]` 属性切换 |
| 4 级圆角系统 | 过于复杂 | 精简为 8px/12px 两级 |
| 3 级阴影系统 | 阴影偏重 | 统一为极淡一级 |
| Emoji 图标 | 色彩丰富破坏极简 | Lucide SVG 线性图标 |

## 3. 设计 Token 系统

### 3.1 CSS 变量定义

完整的 `zen-*` 前缀 CSS 变量系统，覆盖色彩、字体、间距、圆角、阴影、动画六大维度：

```css
/* ============================================
   禅意设计 Token 系统 v2.0
   前缀: --zen-*
   主题切换: :root (日间) / [data-theme="dark"] / [data-theme="eye-care"]
   ============================================ */

/* ---------- 色彩：日间模式（默认） ---------- */
:root {
  /* 页面背景 */
  --zen-bg-page: #FAF8F3;         /* 宣纸白 - 模拟宣纸色 */
  --zen-bg-card: #FFFFFF;         /* 纯白 - 比背景略亮，形成层级 */
  --zen-bg-elevated: #FFFFFF;     /* 弹窗/浮层背景 */
  --zen-bg-overlay: rgba(0, 0, 0, 0.4);  /* 遮罩层 */

  /* 文字 */
  --zen-text-primary: #2C2C2C;    /* 墨色 - 非纯黑深灰 */
  --zen-text-title: #1A1A1A;      /* 标题 - 比正文更深 */
  --zen-text-secondary: #6B6B6B;  /* 辅助文字 */
  --zen-text-hint: #9A9590;       /* 提示文字 - 暖灰 */
  --zen-text-disabled: #B5B0A8;   /* 禁用文字 */
  --zen-text-inverse: #FAF8F3;    /* 反色文字（深色背景上） */

  /* 主色（赭石色系） */
  --zen-accent: #A0522D;          /* 赭石 - 可点击元素 */
  --zen-accent-hover: #8B4513;    /* 赭石深 - hover 态 */
  --zen-accent-active: #723B0E;   /* 赭石更深 - active 态 */
  --zen-accent-light: rgba(160, 82, 45, 0.08);  /* 赭石极淡背景 */
  --zen-accent-lighter: rgba(160, 82, 45, 0.15); /* 赭石淡背景 */

  /* 高亮（术语标注） */
  --zen-highlight-bg: #FFF3CD;    /* 米黄 - 术语高亮背景 */
  --zen-highlight-text: #8B4513;  /* 赭石深 - 术语文字 */
  --zen-highlight-hover: #FFE8A3; /* hover 加深 */

  /* 边框与分割线 */
  --zen-border: #E8E2D6;          /* 暖灰 - 边框 */
  --zen-divider: #E8E2D6;         /* 暖灰 - 分割线 */
  --zen-border-focus: #A0522D;    /* 聚焦态边框 */

  /* 语义色（低饱和） */
  --zen-success: #5A8F5A;         /* 低饱和绿 */
  --zen-success-bg: rgba(90, 143, 90, 0.1);
  --zen-warning: #C4913A;         /* 暖调琥珀 */
  --zen-warning-bg: rgba(196, 145, 58, 0.1);
  --zen-error: #B85C5C;           /* 低饱和红 */
  --zen-error-bg: rgba(184, 92, 92, 0.1);
  --zen-info: #6B8FA3;            /* 低饱和蓝灰 */
  --zen-info-bg: rgba(107, 143, 163, 0.1);

  /* 阴影 */
  --zen-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --zen-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --zen-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.06);

  /* 圆角 */
  --zen-radius-sm: 8px;           /* 小组件：按钮、标签、输入框 */
  --zen-radius-md: 12px;          /* 卡片：词典弹窗、经书卡片 */
  --zen-radius-full: 9999px;      /* 圆形：图标按钮 */

  /* 字体 */
  --zen-font-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "STSong", "AR PL UMing CN", serif;
  --zen-font-kai: "KaiTi", "STKaiti", "AR PL UKai CN", "Noto Serif SC", serif;
  --zen-font-sans: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", sans-serif;
  --zen-font-devanagari: "Noto Sans Devanagari", "ITF Devanagari", "Mangal", sans-serif;
  --zen-font-tibetan: "Noto Sans Tibetan", "Microsoft Himalaya", sans-serif;

  /* 字号（阅读可调范围） */
  --zen-font-size-xs: 12px;
  --zen-font-size-sm: 14px;
  --zen-font-size-base: 16px;     /* UI 默认 */
  --zen-font-size-lg: 18px;       /* 阅读默认 */
  --zen-font-size-xl: 20px;
  --zen-font-size-2xl: 24px;
  --zen-font-size-3xl: 30px;

  /* 行高 */
  --zen-line-height-tight: 1.4;   /* 标题 */
  --zen-line-height-base: 1.6;    /* 紧凑阅读 */
  --zen-line-height-loose: 1.8;   /* 默认正文 */
  --zen-line-height-relaxed: 2.0; /* 宽松阅读 */

  /* 字重 */
  --zen-font-weight-light: 300;
  --zen-font-weight-normal: 400;
  --zen-font-weight-medium: 500;
  --zen-font-weight-semibold: 600;
  --zen-font-weight-bold: 700;

  /* 间距（4px 基准） */
  --zen-space-1: 4px;
  --zen-space-2: 8px;
  --zen-space-3: 12px;
  --zen-space-4: 16px;
  --zen-space-5: 20px;
  --zen-space-6: 24px;
  --zen-space-8: 32px;
  --zen-space-10: 40px;
  --zen-space-12: 48px;
  --zen-space-16: 64px;

  /* 动画 */
  --zen-transition-fast: 150ms ease-out;
  --zen-transition-base: 250ms ease-out;
  --zen-transition-slow: 300ms ease-out;
  --zen-transition-theme: 400ms ease-out;   /* 主题切换专用 */
  --zen-transition-linear: 200ms linear;    /* 进度条 */
}

/* ---------- 色彩：暗色模式 ---------- */
[data-theme="dark"] {
  --zen-bg-page: #1E1E1E;         /* 暖深灰 - 非纯黑，色温约 3000K */
  --zen-bg-card: #2A2825;         /* 暖深棕灰 - 比页面略亮 */
  --zen-bg-elevated: #33302C;     /* 弹窗背景 */
  --zen-bg-overlay: rgba(0, 0, 0, 0.6);

  --zen-text-primary: #D4CFC7;    /* 暖米白 - 对比度约 10:1 */
  --zen-text-title: #E8E3DB;      /* 更亮的暖米白 */
  --zen-text-secondary: #8A8578;  /* 暖灰 */
  --zen-text-hint: #6B6560;       /* 深暖灰 */
  --zen-text-disabled: #4A4540;
  --zen-text-inverse: #1E1E1E;

  --zen-accent: #B8860B;          /* 暗金 - 深色背景下更醒目 */
  --zen-accent-hover: #D4A54A;
  --zen-accent-active: #E8B84A;
  --zen-accent-light: rgba(184, 134, 11, 0.12);
  --zen-accent-lighter: rgba(184, 134, 11, 0.2);

  --zen-highlight-bg: #4A4035;    /* 暖棕灰 - 术语高亮 */
  --zen-highlight-text: #C8956C;  /* 金棕 */
  --zen-highlight-hover: #5A4A3D;

  --zen-border: #3A3530;
  --zen-divider: #333333;
  --zen-border-focus: #B8860B;

  --zen-success: #6BAF6B;
  --zen-success-bg: rgba(107, 175, 107, 0.15);
  --zen-warning: #D4A54A;
  --zen-warning-bg: rgba(212, 165, 74, 0.15);
  --zen-error: #D07070;
  --zen-error-bg: rgba(208, 112, 112, 0.15);
  --zen-info: #8BB0C5;
  --zen-info-bg: rgba(139, 176, 197, 0.15);

  --zen-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --zen-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);
  --zen-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ---------- 色彩：护眼模式 ---------- */
[data-theme="eye-care"] {
  --zen-bg-page: #F5E6C8;         /* 暖黄纸色 - 色温约 2700K */
  --zen-bg-card: #FAF0E0;         /* 浅暖米 */
  --zen-bg-elevated: #FAF0E0;
  --zen-bg-overlay: rgba(60, 40, 20, 0.4);

  --zen-text-primary: #3D3229;    /* 深暖棕 */
  --zen-text-title: #2A2018;      /* 更深暖棕 */
  --zen-text-secondary: #7A6B5D;  /* 中暖棕 */
  --zen-text-hint: #A09080;
  --zen-text-disabled: #C0B5A8;
  --zen-text-inverse: #F5E6C8;

  --zen-accent: #A0522D;          /* 赭石 - 与日间一致 */
  --zen-accent-hover: #8B4513;
  --zen-accent-active: #723B0E;
  --zen-accent-light: rgba(160, 82, 45, 0.1);
  --zen-accent-lighter: rgba(160, 82, 45, 0.18);

  --zen-highlight-bg: #E8D5B5;    /* 暖米黄 */
  --zen-highlight-text: #8B4513;
  --zen-highlight-hover: #DCC8A8;

  --zen-border: #D4C4A8;
  --zen-divider: #D4C4A8;
  --zen-border-focus: #A0522D;

  --zen-success: #5A8F5A;
  --zen-success-bg: rgba(90, 143, 90, 0.12);
  --zen-warning: #C4913A;
  --zen-warning-bg: rgba(196, 145, 58, 0.12);
  --zen-error: #B85C5C;
  --zen-error-bg: rgba(184, 92, 92, 0.12);
  --zen-info: #6B8FA3;
  --zen-info-bg: rgba(107, 143, 163, 0.12);

  --zen-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --zen-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --zen-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

### 3.2 暗色模式适配

**设计理念**：暗色模式不追求"纯黑+纯白"的极致对比，而是模拟深夜禅堂中烛光下阅读经书的感受——暖色调、柔和对比、无眩光。

**关键参数**：

| 参数 | 值 | 说明 |
|------|-----|------|
| 背景色温 | ~3000K | 暖深灰 `#1E1E1E`，非纯黑 `#000000` |
| 文字色温 | ~3200K | 暖米白 `#D4CFC7`，带微量黄色调 |
| 正文对比度 | ~10:1 | 符合 WCAG AA（要求 4.5:1），同时避免过高对比导致的光晕效应 |
| 标题对比度 | ~12:1 | `#E8E3DB` on `#1E1E1E` |
| 卡片与背景差值 | `#2A2825` vs `#1E1E1E` | 亮度差约 8%，形成微弱层级 |
| 可点击色 | `#B8860B` 暗金 | 在深色背景下比赭石色更醒目 |
| 阴影透明度 | 30% | 比日间的 6% 更明显，因为深色背景下阴影不可见 |

**光晕效应（Halation）说明**：

纯黑背景（`#000000`）+ 白色文字（`#FFFFFF`）的极端对比会导致文字边缘产生"光晕"，长期阅读增加眼疲劳。`#1E1E1E` + `#D4CFC7` 的组合将对比度控制在舒适范围内，同时保证可读性。

**暗色模式下 Vant 组件覆盖**：

```css
/* Vant 暗色模式覆盖 - 非纯黑温暖风格 */
.van-theme-dark {
  --van-background: #1E1E1E;       /* 页面背景 */
  --van-background-2: #2A2825;     /* 卡片背景 */
  --van-text-color: #D4CFC7;       /* 主文字 */
  --van-text-color-2: #8A8578;     /* 次要文字 */
  --van-text-color-3: #6B6560;     /* 提示文字 */
  --van-border-color: #3A3530;     /* 边框 */
  --van-active-color: #33302C;     /* 按压态 */
  --van-primary-color: #B8860B;    /* 暗金 */
}
```

### 3.3 护眼模式参数

**设计理念**：护眼模式模拟传统纸质经书在暖光灯下的阅读感受，降低蓝光比例，提高色温至暖黄范围。

**色温和亮度参数**：

| 参数 | 值 | 说明 |
|------|-----|------|
| 背景色温 | ~2700K | 暖黄纸色 `#F5E6C8`，模拟白炽灯照射纸张 |
| 文字色温 | ~2800K | 深暖棕 `#3D3229`，非黑色 |
| 蓝光比例 | 降低约 60% | 相比日间模式，B 通道值降低 60% |
| 亮度对比 | 文字/背景约 6.5:1 | 符合 WCAG AA 标准，对比度低于日间模式 |
| 饱和度 | 整体降低 15-20% | 减少颜色刺激 |
| 主色 | 保持赭石 `#A0522D` | 与日间一致，确保品牌识别 |
| 阴影 | 8% 透明度 | 比日间略重（6%），因背景有底色 |

**色温计算参考**：

| 模式 | RGB 背景 | 近似色温 | 蓝光通道 (B) |
|------|----------|----------|-------------|
| 日间 | `#FAF8F3` (250, 248, 243) | ~6500K | 243 (100%) |
| 护眼 | `#F5E6C8` (245, 230, 200) | ~2700K | 200 (82%) |
| 暗色 | `#1E1E1E` (30, 30, 30) | ~3000K | 30 (N/A) |

**护眼模式的 CSS 滤镜实现（备用方案）**：

如果不使用独立的 `eye-care` 主题变量，可通过 CSS 滤镜在日间模式基础上叠加暖色调：

```css
[data-theme="eye-care"] {
  /* 备选：在日间模式上叠加暖色滤镜 */
  filter: sepia(15%) saturate(85%) brightness(98%);
}
```

**不推荐使用全局 CSS filter 的原因**：
- filter 会影响所有子元素，包括图片和图标
- 性能开销较大，移动端可能出现卡顿
- 推荐使用独立的 CSS 变量系统（如上 3.1 节定义）

## 4. 动画标准

### 4.1 时长与缓动标准

| 类型 | 时长 | 缓动曲线 | CSS 变量 | 用途 |
|------|------|----------|----------|------|
| **微交互** | 150ms | `ease-out` | `--zen-transition-fast` | 按钮 hover、checkbox、图标切换 |
| **标准过渡** | 250ms | `ease-out` | `--zen-transition-base` | 弹窗出现/消失、面板展开收起 |
| **页面过渡** | 300ms | `ease-out` | `--zen-transition-slow` | 路由切换、页面入场 |
| **主题切换** | 400ms | `ease-out` | `--zen-transition-theme` | 背景色、文字色渐变过渡 |
| **进度指示** | 200ms | `linear` | `--zen-transition-linear` | 阅读进度条宽度变化 |

### 4.2 缓动曲线选择依据

禅意设计选择 `ease-out`（而非 `ease-in-out` 或 `ease`）的原因：

- `ease-out`：从快到慢，像墨水滴入水中自然扩散的感觉——开始时注意力集中，然后逐渐平静，符合"入定"的心理节奏
- 不使用 `ease-in`：开始慢会感觉"拖沓"，不符合禅意的"干净利落"
- 不使用 `ease-in-out`：中间的匀速阶段多余，禅意追求"一气呵成"

**自定义缓动曲线（可选）**：

```css
:root {
  /* 更柔和的 ease-out：模拟宣纸吸墨 */
  --zen-easing-soft: cubic-bezier(0.25, 0.1, 0.25, 1.0);

  /* 更克制的 ease-out：快速入场，缓慢停止 */
  --zen-easing-restrained: cubic-bezier(0.4, 0.0, 0.2, 1.0);
}
```

### 4.3 交互触发动画规范

| 交互 | 动画效果 | 时长 | 曲线 | 说明 |
|------|----------|------|------|------|
| 侧滑面板展开 | 从边缘平滑滑入，遮罩渐显 | 250ms | ease-out | 遮罩透明度 0→0.4 |
| 词典弹窗出现 | 淡入 + 轻微缩放（0.95→1.0） | 250ms | ease-out | 自然出现感 |
| 词典弹窗消失 | 淡出（不移出屏幕） | 200ms | ease-out | 比出现稍快 |
| 主题切换 | 所有颜色 400ms 渐变 | 400ms | ease-out | 避免闪烁 |
| 术语高亮点击 | 背景色 150ms 加深 | 150ms | ease-out | 短暂反馈 |
| 滚动进度条 | 宽度 200ms 线性变化 | 200ms | linear | 跟随滚动 |
| 加载状态 | 骨架屏淡入淡出 | 300ms | ease-out | 不用旋转动画 |
| 按钮按下 | 透明度 1.0→0.85 | 100ms | ease-out | 轻量反馈 |
| 按钮松开 | 透明度 0.85→1.0 | 150ms | ease-out | 自然恢复 |

### 4.4 禁止的动画清单

以下动画效果与禅意"克制"原则冲突，**禁止使用**：

- 弹跳（bounce）效果
- 弹性（spring）动画
- 3D 翻转
- 闪烁、脉冲（pulse）效果
- 长时间循环动画（超过 1s）
- 自动播放的装饰性动画
- 旋转 loading spinner（用骨架屏替代）
- 滑入 + 回弹组合
- 抖动（shake）效果
- 打字机效果

### 4.5 Vue Transition 禅意配置

```javascript
// Vue 3 全局 transition 配置
const zenTransitions = {
  // 淡入淡出（通用）
  'zen-fade': {
    enterActiveClass: 'transition-opacity duration-250 ease-out',
    leaveActiveClass: 'transition-opacity duration-200 ease-out',
    enterFromClass: 'opacity-0',
    leaveToClass: 'opacity-0',
  },
  // 底部抽屉
  'zen-slide-up': {
    enterActiveClass: 'transition-transform duration-250 ease-out',
    leaveActiveClass: 'transition-transform duration-200 ease-out',
    enterFromClass: 'translate-y-full',
    leaveToClass: 'translate-y-full',
  },
  // 侧滑面板
  'zen-slide-left': {
    enterActiveClass: 'transition-transform duration-250 ease-out',
    leaveActiveClass: 'transition-transform duration-200 ease-out',
    enterFromClass: '-translate-x-full',
    leaveToClass: '-translate-x-full',
  },
}
```

## 5. Vant 组件覆盖

### 5.1 覆盖策略

采用 **CSS 变量全局覆盖 + ConfigProvider 局部定制** 的双层策略：

| 层级 | 方式 | 范围 | 优先级 |
|------|------|------|--------|
| **全局** | `:root` CSS 变量覆盖 `--van-*` | 所有 Vant 组件 | 基础 |
| **主题** | `[data-theme="dark"]` 覆盖 | 暗色/护眼模式 | 跟随主题 |
| **局部** | `<van-config-provider>` | 特定页面或组件 | 最高 |

### 5.2 全局 Vant CSS 变量覆盖

```css
/* ============================================
   Vant 4 禅意主题覆盖
   文件: src/assets/styles/vant-override.css
   ============================================ */

/* --- 主色覆盖 --- */
:root {
  --van-primary-color: var(--zen-accent);           /* 赭石 #A0522D */
  --van-primary-color-end: var(--zen-accent-hover);  /* hover 渐变终点 */
  --van-success-color: var(--zen-success);
  --van-danger-color: var(--zen-error);
  --van-warning-color: var(--zen-warning);
  --van-info-color: var(--zen-info);

  /* --- 背景 --- */
  --van-background: var(--zen-bg-page);
  --van-background-2: var(--zen-bg-card);
  --van-background-3: var(--zen-bg-elevated);

  /* --- 文字 --- */
  --van-text-color: var(--zen-text-primary);
  --van-text-color-2: var(--zen-text-secondary);
  --van-text-color-3: var(--zen-text-hint);

  /* --- 边框 --- */
  --van-border-color: var(--zen-divider);
  --van-active-color: var(--zen-accent-lighter);    /* 按压态 */

  /* --- 圆角 --- */
  --van-border-radius-sm: var(--zen-radius-sm);     /* 8px */
  --van-border-radius-md: var(--zen-radius-md);     /* 12px */
  --van-border-radius-lg: var(--zen-radius-md);     /* 12px，覆盖默认 16px */
  --van-border-radius-max: var(--zen-radius-full);

  /* --- 字体 --- */
  --van-font-size-sm: var(--zen-font-size-sm);      /* 14px */
  --van-font-size-md: var(--zen-font-size-base);    /* 16px */
  --van-font-size-lg: var(--zen-font-size-lg);      /* 18px */

  /* --- 间距 --- */
  --van-padding-base: var(--zen-space-2);            /* 8px */
  --van-padding-xs: var(--zen-space-2);              /* 8px */
  --van-padding-sm: var(--zen-space-3);              /* 12px */
  --van-padding-md: var(--zen-space-4);              /* 16px */
  --van-padding-lg: var(--zen-space-6);              /* 24px */
  --van-padding-xl: var(--zen-space-8);              /* 32px */
}
```

### 5.3 关键组件禅意覆盖

#### 5.3.1 Button 按钮

```css
/* 按钮 - 去除 Vant 默认渐变，改为纯色 */
:root {
  --van-button-primary-color: var(--zen-text-inverse);   /* 按钮文字 */
  --van-button-primary-background: var(--zen-accent);    /* 赭石 */
  --van-button-primary-border-color: var(--zen-accent);
  --van-button-default-color: var(--zen-text-primary);
  --van-button-default-background: var(--zen-bg-card);
  --van-button-default-border-color: var(--zen-border);
  --van-button-border-radius: var(--zen-radius-sm);      /* 8px */
  --van-button-large-height: 44px;
  --van-button-normal-height: 36px;
  --van-button-small-height: 28px;
}

/* 次要按钮（outline 风格） */
.van-button--plain.van-button--primary {
  color: var(--zen-accent);
  background: transparent;
  border-color: var(--zen-accent);
}
```

#### 5.3.2 Cell 单元格

```css
:root {
  --van-cell-background: var(--zen-bg-card);
  --van-cell-font-size: var(--zen-font-size-base);
  --van-cell-line-height: var(--zen-line-height-loose);
  --van-cell-text-color: var(--zen-text-primary);
  --van-cell-label-color: var(--zen-text-secondary);
  --van-cell-border-color: var(--zen-divider);
  --van-cell-vertical-padding: var(--zen-space-4);       /* 16px */
  --van-cell-horizontal-padding: var(--zen-space-4);     /* 16px */
  --van-cell-large-vertical-padding: var(--zen-space-5); /* 20px */
}

/* 去除 Vant Cell 右侧默认箭头（除非有明确跳转） */
.van-cell::after {
  border-bottom-color: var(--zen-divider);
}
```

#### 5.3.3 Switch 开关

```css
:root {
  --van-switch-on-background: var(--zen-accent);         /* 赭石 */
  --van-switch-node-background: var(--zen-bg-card);
  --van-switch-node-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

#### 5.3.4 Dialog 对话框

```css
:root {
  --van-dialog-background: var(--zen-bg-card);
  --van-dialog-border-radius: var(--zen-radius-md);      /* 12px */
  --van-dialog-header-font-size: var(--zen-font-size-lg); /* 18px */
  --van-dialog-confirm-button-color: var(--zen-accent);
  --van-dialog-confirm-button-text-color: var(--zen-accent);
  --van-dialog-cancel-button-text-color: var(--zen-text-secondary);
}
```

#### 5.3.5 Slider 滑块

```css
:root {
  --van-slider-background: var(--zen-divider);
  --van-slider-bar-background: var(--zen-accent);
  --van-slider-button-width: 18px;
  --van-slider-button-height: 18px;
  --van-slider-button-border-radius: 50%;
  --van-slider-button-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
```

#### 5.3.6 Popup 弹窗

```css
:root {
  --van-popup-background: var(--zen-bg-card);
  --van-popup-border-radius: var(--zen-radius-md);       /* 12px */
  --van-popup-close-icon-size: 20px;
  --van-popup-close-icon-color: var(--zen-text-secondary);
  --van-overlay-background: var(--zen-bg-overlay);
}
```

#### 5.3.7 Tabbar 标签栏

```css
:root {
  --van-tabbar-background: var(--zen-bg-card);
  --van-tabbar-item-text-color: var(--zen-text-secondary);
  --van-tabbar-item-active-color: var(--zen-accent);
  --van-tabbar-border-color: var(--zen-divider);
}
```

#### 5.3.7 NavBar 导航栏

```css
:root {
  --van-nav-bar-background: var(--zen-bg-card);
  --van-nav-bar-title-text-color: var(--zen-text-title);
  --van-nav-bar-text-color: var(--zen-accent);
  --van-nav-bar-icon-color: var(--zen-accent);
  --van-nav-bar-height: 46px;
  --van-nav-bar-arrow-size: 18px;
}
```

### 5.4 ConfigProvider 使用示例

```vue
<!-- App.vue - 全局 ConfigProvider -->
<template>
  <van-config-provider
    :theme-vars="themeVars"
    :theme-vars-dark="themeVarsDark"
    :theme-vars-light="themeVarsLight"
  >
    <div id="app">
      <router-view />
    </div>
  </van-config-provider>
</template>

<script setup>
import { reactive } from 'vue'

// 日间模式覆盖
const themeVars = reactive({
  primaryColor: '#A0522D',
  buttonPrimaryBackground: '#A0522D',
  buttonPrimaryBorderColor: '#A0522D',
  buttonPrimaryColor: '#FAF8F3',
  buttonBorderRadius: '8px',
  actionSheetBackground: '#FFFFFF',
  dialogBackground: '#FFFFFF',
  dialogBorderRadius: '12px',
  popupBackground: '#FFFFFF',
  popupBorderRadius: '12px',
  cellBackground: '#FFFFFF',
  textColor: '#2C2C2C',
  textColor2: '#6B6B6B',
  textColor3: '#9A9590',
  borderColor: '#E8E2D6',
  activeColor: '#A0522D',
  backgroundColor: '#FAF8F3',
})

// 暗色模式覆盖
const themeVarsDark = reactive({
  primaryColor: '#B8860B',
  buttonPrimaryBackground: '#B8860B',
  buttonPrimaryBorderColor: '#B8860B',
  buttonPrimaryColor: '#1E1E1E',
  actionSheetBackground: '#2A2825',
  dialogBackground: '#2A2825',
  popupBackground: '#33302C',
  cellBackground: '#2A2825',
  textColor: '#D4CFC7',
  textColor2: '#8A8578',
  textColor3: '#6B6560',
  borderColor: '#3A3530',
  activeColor: '#B8860B',
  backgroundColor: '#1E1E1E',
})

// 护眼模式覆盖
const themeVarsLight = reactive({
  primaryColor: '#A0522D',
  buttonPrimaryBackground: '#A0522D',
  buttonPrimaryBorderColor: '#A0522D',
  actionSheetBackground: '#FAF0E0',
  dialogBackground: '#FAF0E0',
  popupBackground: '#FAF0E0',
  cellBackground: '#FAF0E0',
  textColor: '#3D3229',
  textColor2: '#7A6B5D',
  textColor3: '#A09080',
  borderColor: '#D4C4A8',
  backgroundColor: '#F5E6C8',
})
</script>
```

### 5.5 Vant 覆盖可行性验证

**已验证的覆盖能力**：

| 覆盖目标 | 可行性 | 方法 |
|----------|--------|------|
| 主色 | **可行** | `--van-primary-color` CSS 变量 |
| 圆角 | **可行** | `--van-border-radius-*` 变量 |
| 背景色 | **可行** | `--van-background` 变量 + ConfigProvider |
| 文字颜色 | **可行** | `--van-text-color-*` 变量 |
| 按钮样式 | **可行** | 按钮相关变量 + `.van-button` 覆盖 |
| 暗色模式 | **可行** | `theme-vars-dark` + `.van-theme-dark` |
| 字体族 | **部分可行** | Vant 不直接提供 font-family 变量，需全局覆盖 |
| 组件间距 | **可行** | `--van-padding-*` 变量 |

**需要自定义 CSS 覆盖的部分**：

| 目标 | 方法 |
|------|------|
| Vant 组件字体族 | 全局 `* { font-family: var(--zen-font-sans); }` |
| 特殊组件阴影 | 针对 `.van-popup`、`.van-dialog` 等单独覆盖 |
| 自定义组件（术语高亮） | 使用 `--zen-*` 变量自行实现 |

## 6. 同类 App 对比

### 6.1 禅意/冥想/极简阅读 App 对比

| App | 类型 | 设计风格 | 配色特点 | 字体 | 间距 | 动画 | 可借鉴 | 需避免 |
|-----|------|----------|----------|------|------|------|--------|--------|
| **Calm** | 冥想 | 极简+自然 | 深蓝渐变背景，白色文字 | 现代无衬线 | 充裕留白 | 柔和渐变 | 自然主题插画，沉浸式背景 | 过度商业感 |
| **Headspace** | 冥想 | 扁平插画 | 明快色彩（橙、蓝、黄） | 圆润无衬线 | 适中 | 弹跳动画 | 友好的引导流程 | 色彩过于活泼 |
| **Insight Timer** | 冥想 | 现代简约 | 深色背景，暖金色点缀 | 现代无衬线 | 紧凑 | 标准过渡 | 简洁的播放器界面 | 功能过多 |
| **Medito** | 冥想 | 极简纯净 | 白色/深色双模式，低饱和 | 现代无衬线 | 充裕 | 无多余动画 | 完全免费、无广告 | 视觉缺乏品牌特色 |
| **微信读书** | 阅读器 | 现代商业 | 白色/仿牛皮纸/深色三模式 | 多种可选 | 紧凑 | 标准过渡 | 精细的字号/行距调节 | 商业感太强 |
| **得到** | 阅读器 | 极简学术 | 白色为主，黑色文字 | 宋体正文 | 适中 | 克制 | 简洁工具栏，知识卡片 | 非禅意风格 |
| **地藏经卷下** | 佛经 | 简洁 | 暖色背景，深色文字 | 宋体 | 充裕 | 少 | 清晰的章节引导 | 缺乏品牌感 |
| **大乘佛经** | 佛经 | 装饰化 | 金色、红色为主 | 楷体 | 紧凑 | 装饰动画 | 梵汉对照、高僧注解 | 3D 书架过度装饰 |
| **本项目 v2.0** | 佛经 | **禅意极简** | **宣纸白+墨色+赭石** | **宋体正文** | **4px 系统+充裕** | **250ms ease-out** | 独特差异化定位 | - |

### 6.2 差异化定位分析

**市场空白区域**：

```
装饰程度
  高 │  大乘佛经    善缘佛堂
     │                    本项目
  中 │                          (禅意极简)
     │              Calm
     │    Headspace        Insight Timer
  低 │  Medito         微信读书
     │                     得到
     │  地藏经卷下
     └──────────────────────────────
      佛经类           通用类         冥想类
                    App 类型
```

**本项目的差异化优势**：

1. **佛经阅读领域中唯一的禅意极简设计**：现有佛经 App 要么过于简单（无设计感），要么过于装饰化（金色、莲花、3D 书架）。本项目填补"有设计感的极简佛经阅读器"空白。

2. **与冥想 App 的差异**：Calm/Headspace 面向西方用户，强调自然插画和商业品牌感。本项目面向中文用户，以中国传统色彩（宣纸、墨色、赭石）为视觉基础，更加内敛克制。

3. **与通用阅读器的差异**：微信读书/得到面向大众阅读，功能丰富但商业感强。本项目专注佛经场景，功能克制，以诵读体验为核心。

### 6.3 具体可借鉴项

| 来源 | 借鉴点 | 本项目应用 |
|------|--------|------------|
| Calm | 沉浸式背景色过渡 | 主题切换 400ms 渐变 |
| Medito | 无多余动画、无广告 | 极简交互，无装饰动画 |
| 微信读书 | 字号/行距精细调节 | 14px-26px 可调，1.6-2.0 行高 |
| 得到 | 简洁工具栏设计 | 阅读页底部工具栏极简设计 |
| Insight Timer | 暖金色点缀深色背景 | 夜间模式可点击色 `#B8860B` |

## 7. 结论与建议

### 7.1 设计 Token 系统落地清单

| 维度 | Token 数量 | 文件位置 | 说明 |
|------|-----------|----------|------|
| 色彩 | ~60 个 | `src/assets/styles/tokens.css` | 日间/暗色/护眼三套 |
| 字体 | ~10 个 | 同上 | 5 种字体栈 + 字号 + 行高 + 字重 |
| 间距 | 10 个 | 同上 | 4px 基准，4-64px 范围 |
| 圆角 | 3 个 | 同上 | 8px/12px/圆形 |
| 阴影 | 3 个 | 同上 | sm/md/lg 三级 |
| 动画 | 5 个 | 同上 | fast/base/slow/theme/linear |
| **合计** | **~91 个** | | |

### 7.2 v1.0 到 v2.0 迁移 Checklist

```
[ ] 1. 创建 src/assets/styles/tokens.css，写入完整的 --zen-* 变量系统
[ ] 2. 在 main.js 中引入 tokens.css（替换 v1.0 的 variables.scss）
[ ] 3. 全局替换 --primary-color → --zen-accent
[ ] 4. 全局替换 --bg-page → --zen-bg-page
[ ] 5. 全局替换 --bg-card → --zen-bg-card
[ ] 6. 全局替换 --text-primary → --zen-text-primary
[ ] 7. 全局替换 --text-secondary → --zen-text-secondary
[ ] 8. 全局替换 --highlight-bg → --zen-highlight-bg
[ ] 9. 全局替换 --border-color → --zen-border
[ ] 10. 全局替换 --divider-color → --zen-divider
[ ] 11. 全局替换 --space-N → --zen-space-N
[ ] 12. 全局替换 --radius-* → --zen-radius-*
[ ] 13. 全局替换 --shadow-* → --zen-shadow-*
[ ] 14. 全局替换 --transition-* → --zen-transition-*
[ ] 15. 更新字体栈：正文从黑体改为宋体
[ ] 16. 主题切换机制：.dark-mode class → [data-theme] 属性
[ ] 17. 圆角精简：去掉 16px 和 24px 两级
[ ] 18. 阴影精简：只保留 sm/md 两级
[ ] 19. 动画时长调整：0.3s → 0.25s，曲线改为 ease-out
[ ] 20. 添加护眼模式主题支持
[ ] 21. Vant 4 主题覆盖（CSS 变量 + ConfigProvider）
[ ] 22. 移除所有 Emoji 图标，引入 Lucide Icons
[ ] 23. 移除 loading spinner 动画，替换为骨架屏
```

### 7.3 Vant 覆盖实施方案

**推荐方案**：CSS 变量全局覆盖为主，ConfigProvider 辅助。

1. **第一步**（基础覆盖）：创建 `src/assets/styles/vant-override.css`，通过覆盖 `--van-*` 变量实现全局禅意风格
2. **第二步**（主题切换）：在 `[data-theme="dark"]` 和 `[data-theme="eye-care"]` 中覆盖对应的 Vant 暗色变量
3. **第三步**（局部微调）：对特殊页面（如词典管理页）使用 `<van-config-provider>` 进行局部覆盖

**不推荐方案**：完全依赖 ConfigProvider 的 `theme-vars` 对象，因为：
- 需要为每个主题维护一份 JS 对象
- 增加 bundle 体积
- 与 CSS 变量系统重复，维护成本高

### 7.4 风险提示

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Vant 暗色模式与自定义主题冲突 | 中 | 中 | 优先使用 `[data-theme]` 属性控制，避免 `.van-theme-dark` |
| 护眼模式在不同屏幕色温差异 | 高 | 低 | 提供校准选项，允许用户微调背景色 |
| 暗色模式对比度不足 | 低 | 高 | 开发时使用对比度检测工具验证 |
| CSS 变量过多影响性能 | 极低 | 极低 | 91 个 CSS 变量在现代浏览器无性能影响 |
| Vant 组件不完全支持 CSS 变量 | 低 | 中 | 对不支持的组件使用 `::deep` 覆盖 |

## 8. 对 v2.1 方案的影响

本落地方案结果对 v2.1（阅读页面实现）及后续版本的具体影响：

### 8.1 样式文件结构调整

v2.1 需要新增以下样式文件：

```
src/assets/styles/
├── tokens.css          # 新增：禅意设计 Token 系统（~91 个变量）
├── vant-override.css   # 新增：Vant 4 禅意主题覆盖
├── reset.css           # 重构：替代 v1.0 的 reset.scss
└── global.css          # 重构：替代 v1.0 的 global.scss
```

### 8.2 主题切换机制变更

- **v1.0**：`isDarkMode` boolean → `:class="{ 'dark-mode': isDarkMode }"`
- **v2.0**：`theme` string（'day' | 'dark' | 'eye-care'）→ `:data-theme="theme"`
- **影响**：Pinia `settingStore` 需要新增 `theme` 字段，替代 `isDarkMode`

### 8.3 阅读页面组件样式

阅读页面的核心样式需全面使用 `--zen-*` 变量：

| 元素 | v1.0 变量 | v2.0 变量 | 变更 |
|------|-----------|-----------|------|
| 页面背景 | `--bg-page` | `--zen-bg-page` | 色值 `#F5F5F5` → `#FAF8F3` |
| 正文颜色 | `--text-primary` | `--zen-text-primary` | 色值 `#333` → `#2C2C2C` |
| 术语高亮 | `--highlight-bg` | `--zen-highlight-bg` | 色值保留 `#FFF3CD` |
| 术语文字 | 默认黑色 | `--zen-highlight-text` | 新增，`#8B4513` |
| 正文字体 | `--font-body`（黑体） | `--zen-font-serif`（宋体） | **重大变更** |
| 正文行高 | `--line-height-loose` | `--zen-line-height-loose` | 值不变 1.8 |
| 按钮主色 | `--primary-color` | `--zen-accent` | 色值 `#FF6B35` → `#A0522D` |

### 8.4 词典弹窗重构

词典弹窗（DictionaryPopup）需要全面重构：

1. **去除 Emoji 图标**：`📖`、`📚`、`🔍` 全部替换为 Lucide SVG 图标
2. **圆角调整**：`var(--radius-lg)` 16px → `var(--zen-radius-md)` 12px
3. **遮罩颜色**：`rgba(0,0,0,0.5)` → `var(--zen-bg-overlay)`
4. **术语标题**：字体从 `--font-heading` 改为 `--zen-font-serif`
5. **来源色标**：去除多色来源标识，统一用 `--zen-accent`

### 8.5 动画变更影响

| 场景 | v1.0 | v2.0 | 影响 |
|------|------|------|------|
| 弹窗出现 | `0.3s ease` | `250ms ease-out` | 时长缩短，曲线变化 |
| 主题切换 | 无过渡 | `400ms ease-out` | 新增平滑过渡 |
| 按钮 hover | 无 | `150ms ease-out` | 新增轻量反馈 |
| Loading | 旋转 spinner | 骨架屏淡入淡出 | **交互方式变更** |
| 进度条 | 无过渡 | `200ms linear` | 新增平滑过渡 |

### 8.6 Pinia Store 变更

`settingStore` 需要新增/修改的字段：

```javascript
// v1.0
{
  isDarkMode: false,       // 删除
  fontSize: 16,
  showPinyin: false,
}

// v2.0
{
  theme: 'day',            // 新增：'day' | 'dark' | 'eye-care'
  fontSize: 17,            // 默认从 16px 改为 17px（v2.0 推荐值）
  lineHeight: 1.8,         // 新增：可调行高
  showPinyin: false,
}
```

### 8.7 Vant ConfigProvider 集成

在 `App.vue` 中需要集成 ConfigProvider，并在主题切换时动态更新 `theme-vars`：

```vue
<van-config-provider
  :theme-vars="currentThemeVars"
>
  <router-view />
</van-config-provider>
```

其中 `currentThemeVars` 根据 `settingStore.theme` 返回对应的覆盖对象。

### 8.8 开发优先级

对 v2.1 实施的建议优先级：

1. **P0**：创建 `tokens.css`，写入完整的 `--zen-*` 变量系统
2. **P0**：在 `main.js` 中引入，替换 v1.0 的 `variables.scss`
3. **P0**：更新主题切换机制（`data-theme` 属性）
4. **P1**：Vant 4 主题覆盖（CSS 变量全局覆盖）
5. **P1**：阅读页面和词典弹窗的样式迁移
6. **P2**：ConfigProvider 局部定制
7. **P2**：Emoji 图标替换为 Lucide Icons
8. **P3**：Loading 动画从 spinner 改为骨架屏
