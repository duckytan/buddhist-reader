# 移动端适配全面分析 报告

> 任务编号：T-38
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/analysis/T-17-reader-page-design.md

## 1. 背景与目标

佛教经文阅读器 v2.0 的首要平台是 H5 Web（P0 优先级），需要覆盖手机、平板、PC 三种设备的响应式适配。本分析旨在：

- 确定响应式断点方案，指导各页面布局策略
- 设计触摸手势交互，确保阅读页的自然操作体验
- 解决移动端虚拟键盘对搜索、笔记编辑的布局影响
- 设计移动端底部导航栏，适配安全区域
- 评估 IndexedDB 在移动端的存储限制及应对策略
- 梳理 iOS Safari 的特殊兼容问题，提供可落地的解决方案

核心原则：手机优先（Mobile First），确保在最小屏幕（320px 宽）上核心功能完整可用。

## 2. 响应式断点设计

| 断点 | 设备 | 布局调整 |
|------|------|----------|
| `< 480px` | 小屏手机 | 单列布局，全宽内容区，底部导航栏 56px，页边距 12px，字号默认 16px，目录面板占 85% 宽 |
| `480px - 768px` | 手机/小平板 | 单列布局，内容区最大宽 65ch，页边距 16px，字号默认 17px，目录面板占 80% 宽 |
| `768px - 1024px` | 平板 | 可选双列（目录钉住左侧 240px），内容区 max-width 700px 居中，页边距 24px |
| `> 1024px` | PC | 双列或三列布局，内容区 max-width 800px 居中，页边距 48px，目录可钉住左侧 280px |

### 2.1 断点选择理由

- **480px**：iPhone SE (375px) 到 iPhone 15 Pro (393px) 都属于此范围，是移动端的基线。小于 480px 时需要更紧凑的布局
- **768px**：iPad mini (768px) 是平板的起点，也是横竖屏切换的关键断点
- **1024px**：标准 iPad (1024px) 和桌面浏览器的分界，内容区可以适当放宽

### 2.2 各页面断点适配要点

| 页面 | 手机 (`< 768px`) | 平板/PC (`>= 768px`) |
|------|-------------------|----------------------|
| 书架 | 单列卡片，每行 2 个 | 网格布局，每行 3-4 个 |
| 阅读页 | 全屏正文，工具栏覆盖式 | 内容区居中 max-width，两侧留白 |
| 词典管理 | 全宽列表，开关右对齐 | 左侧列表 + 右侧详情面板 |
| 设置页 | 单列分组 | 两列网格 |
| 统计页 | 单列图表 | 多列仪表盘 |

### 2.3 CSS 断点变量

```css
:root {
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

## 3. 触摸手势

### 3.1 手势定义

| 手势 | 场景 | 行为 |
|------|------|------|
| 单击屏幕中央 | 阅读页 | 呼出/隐藏顶部工具栏和底部状态栏 |
| 左滑 | 阅读页（翻页模式） | 翻到下一章/下一页 |
| 右滑 | 阅读页（翻页模式） | 翻到上一章/上一页 |
| 上滑/下滑 | 阅读页（滚动模式） | 原生滚动，不拦截 |
| 捏合（双指张合） | 阅读页 | 调节字号（放大/缩小），步进 1px |
| 长按 | 经文正文 | 选中文本，弹出复制/分享/笔记菜单 |
| 左滑边缘 | 全局 | 返回上一页（如果浏览器支持手势返回则不拦截） |
| 下拉 | 书架页顶部 | 刷新经书列表 |

### 3.2 手势实现要点

**滚动与手势的共存**：

- 阅读页（滚动模式）：`touch-action: pan-y`，允许竖向原生滚动，同时保留横向 touch 事件用于工具栏呼出
- 阅读页（翻页模式）：`touch-action: none`，完全接管触摸事件，手动处理滑动翻页
- 必须在 `touchstart` 阶段预判滑动方向，而非在 `touchmove` 中做重计算，避免滚动卡顿
- 添加 `addEventListener('touchmove', handler, { passive: false })` 才能调用 `preventDefault()`

**捏合缩放手势**：

- 需要禁用页面默认的双指缩放：`<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
- 在 pinch 事件中计算双指距离变化，映射到字号增减
- 捏合缩放的字号变化需持久化到 IndexedDB 设置

**单击检测**：

- 使用 `touchstart` + `touchend` 的坐标差和时间差判断是否为"轻触"而非"滑动"
- 阈值：位移 < 10px 且时间 < 300ms 视为单击
- 单击屏幕中央 60% 区域呼出工具栏，单击边缘区域不做响应

### 3.3 手势库选型

| 方案 | 体积 | 推荐度 | 说明 |
|------|------|--------|------|
| VueUse `useSwipe` | ~2KB | 推荐 | 与 Vue 3 生态集成好，轻量 |
| Hammer.js | ~73KB | 不推荐 | 体积过大，维护停滞 |
| 手写 TouchEvent | 0KB | 可选 | 适合简单手势，但需自行处理边界情况 |

**推荐**：使用 VueUse 的 `useSwipe` 处理滑动，手写捏合手势（因为 `useSwipe` 不支持 pinch）。

## 4. 键盘适配

### 4.1 虚拟键盘对布局的影响

| 问题 | iOS Safari | Android Chrome | 解决方案 |
|------|-----------|---------------|----------|
| 键盘弹出时视口变化 | 不触发 resize，压缩 visualViewport | 触发 resize，视口高度减小 | 监听 `visualViewport` API（iOS 15+） |
| Fixed 定位元素被遮挡 | bottom: 0 仍在屏幕底部，键盘上方 | bottom: 0 被键盘覆盖 | `bottom: env(keyboard-inset-bottom, 0px)` |
| 页面被顶起 | `position: fixed` 可能失效 | 整体页面上移 | 改用 `position: sticky` 或动态 padding |

### 4.2 搜索框适配

```css
/* 搜索框聚焦时，确保输入区域不被键盘遮挡 */
.search-container {
  position: sticky;
  top: 0;
  z-index: 100;
  padding-top: env(safe-area-inset-top, 0px);
}

/* iOS 16.4+：键盘弹出时底部按钮自动上浮 */
.search-actions {
  position: fixed;
  bottom: 0;
  bottom: env(keyboard-inset-bottom, 0px);
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- 搜索框使用 `type="search"` 触发移动端搜索键盘（带"搜索"按钮）
- 输入 `enter` 或键盘"搜索"按钮触发搜索
- 搜索页结果区域使用 `overflow-y: auto` 确保键盘弹出时仍可滚动查看结果

### 4.3 笔记编辑适配

- 笔记编辑使用 `<textarea>` 而非富文本编辑器，减少键盘兼容问题
- textarea 设置 `rows="4"` 确保最小可见高度
- 键盘弹出时，编辑区域自动滚动到可视范围内：监听 `focus` 事件，使用 `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- 笔记保存按钮使用 `position: sticky` 固定在编辑区底部，而非 `position: fixed`，避免被键盘遮挡

### 4.4 键盘降级方案

| 层级 | 方案 | 适用场景 |
|------|------|----------|
| 优先 | `env(keyboard-inset-bottom)` | iOS 16.4+ |
| 降级 | `visualViewport` API 监听高度变化 | iOS 15+ / Android Chrome |
| 兜底 | `focus` / `blur` + `window.innerHeight` 变化检测 | 所有浏览器 |

```javascript
// 兜底方案：检测键盘弹出
function detectKeyboardShow() {
  const initialHeight = window.innerHeight
  window.addEventListener('focusin', () => {
    setTimeout(() => {
      if (window.innerHeight < initialHeight * 0.75) {
        // 键盘已弹出
        document.body.classList.add('keyboard-visible')
      }
    }, 100)
  })
  window.addEventListener('focusout', () => {
    document.body.classList.remove('keyboard-visible')
  })
}
```

## 5. 底部导航栏

### 5.1 设计方案

```
┌──────────────────────────────┐
│         阅读内容区            │
│                              │
│                              │
├──────────────────────────────┤
│  📚书架  🔍搜索  ⚙️设置  📊统计│  ← 底部导航栏（移动端）
└──────────────────────────────┘
```

| 属性 | 值 | 说明 |
|------|-----|------|
| 高度 | 56px（不含安全区域） | 符合 Material Design 标准 |
| 背景色 | 日间 `#FAF8F3` / 夜间 `#1E1E1E` | 与主题一致 |
| 安全区域 | `padding-bottom: env(safe-area-inset-bottom, 0px)` | 适配 iPhone 刘海/手势条 |
| 导航项 | 书架、搜索、设置、统计 | 4 项，图标 + 文字 |
| 阅读页 | 不显示底部导航栏 | 沉浸式阅读体验 |

### 5.2 安全区域适配

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  z-index: 50;
}

/* 当安全区域存在时，增加底部导航栏总高度 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    height: calc(56px + env(safe-area-inset-bottom, 0px));
  }
}
```

### 5.3 Viewport 元标签

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

- `viewport-fit=cover` 是启用 `safe-area-inset-*` 的前提
- 必须与上面的 CSS 配合使用，否则内容会被刘海区域遮挡

### 5.4 阅读页导航

阅读页不使用底部导航栏，改用：

- 顶部工具栏：目录、TTS 播放控制、主题切换
- 顶部进度条：轻量细线，呼出工具栏时显示
- 底部阅读信息：章节名 + 进度百分比 + 已读时长（呼出时显示）

## 6. IndexedDB 移动端存储限制

### 6.1 各浏览器存储配额

| 浏览器/平台 | 单源配额上限 | 实际可用 | 说明 |
|------------|------------|---------|------|
| iOS Safari | 约 1GB 或设备剩余空间的 50% | 通常 200-500MB | 受 ITP 影响，隐私模式下数据可能被定期清理 |
| Android Chrome | 设备剩余空间的 60% | 可达数 GB | 受 StorageManager API 管控 |
| PC Chrome/Firefox | 设备剩余空间的 60% | 可达数 GB | 空间不足时触发 quota 事件 |

### 6.2 项目存储预估

| 数据类型 | 预估大小 | 存储位置 |
|---------|---------|---------|
| 经书正文（10 部） | 2-5MB | IndexedDB sutra_content |
| 内置词典（50 条） | < 100KB | IndexedDB dict_entries |
| 用户词典（单个 5MB 以内） | 1-5MB | IndexedDB dict_entries 或 fileCache |
| MDX 词典（大文件） | 5-50MB | File Cache（原文件存储） |
| 阅读进度/书签/笔记 | < 1MB | IndexedDB 各表 |
| 功德统计 | < 500KB | IndexedDB reading_stats |
| **总计（保守估计）** | **约 60MB** | - |

### 6.3 应对策略

| 策略 | 说明 | 优先级 |
|------|------|--------|
| 上传前检查配额 | 使用 `navigator.storage.estimate()` 查询已用/可用空间 | P0 |
| 大文件自动切换 direct 模式 | MDX > 5MB 不预解析，直接存原文件 | P0 |
| 文件缓存 LRU 淘汰 | 缓存满时自动清理最久未使用的 MDX 文件 | P1 |
| 配额不足提示 | 当剩余空间 < 50MB 时，提示用户清理或减少导入 | P1 |
| 隐私模式检测 | 检测 IndexedDB 可用性，降级到内存模式 | P2 |

```javascript
// 配额检查工具函数
async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    const usedMB = (estimate.usage || 0) / 1024 / 1024
    const totalMB = (estimate.quota || 0) / 1024 / 1024
    const availableMB = totalMB - usedMB
    return { usedMB, totalMB, availableMB }
  }
  return { usedMB: 0, totalMB: 0, availableMB: Infinity }
}
```

## 7. iOS Safari 特殊问题

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| **100vh 问题** | `height: 100vh` 包含地址栏高度，导致内容被截断或底部留白 | 使用 `min-height: 100dvh`（iOS 16.4+），降级方案：JS 动态设置 `--vh` 变量，CSS 中用 `calc(var(--vh, 1vh) * 100)` |
| **地址栏动态显隐** | 滚动时地址栏收起/展开，视口高度变化但 CSS 不重算 | 使用 `100dvh` 自动响应，或监听 `visualViewport` 的 resize 事件 |
| **PWA 支持受限** | 不支持后台同步、Service Worker 冷启动后可能被回收、`beforeinstallprompt` 事件不可靠 | 核心功能不依赖 Service Worker；使用缓存优先策略；PWA 仅作为"添加到主屏幕"的增强，不做关键功能依赖 |
| **ITP 存储清理** | Intelligent Tracking Prevention 可能定期清理 IndexedDB 中超过 7 天未访问的数据 | 关键用户数据（阅读进度、笔记、书签）在 `visibilitychange` 时同步到 localStorage 作为备份 |
| **TTS 兼容性** | Web Speech API 在 iOS Safari 中可用但功能受限：不支持 `onboundary` 事件（无法逐字高亮），语音列表有限 | 提供基础 TTS 朗读功能；逐字高亮在 iOS 上降级为段落高亮；提供语音选择但标注"仅 Android/PC 可用" |
| **安全区域（刘海屏）** | iPhone X+ 底部安全区域约 34px，不处理会导致内容被手势条遮挡 | 所有 `bottom: 0` 的固定元素加 `padding-bottom: env(safe-area-inset-bottom, 0px)` |
| **双指缩放** | 默认允许双指缩放页面，影响阅读体验 | `<meta name="viewport" content="..., user-scalable=no">`；手动实现捏合手势控制字号 |
| **点击延迟** | iOS Safari 对 touch 事件有 300ms 延迟（等待判断双击） | 使用 `touch-action: manipulation` 或 fastclick 类库消除延迟 |
| **`position: fixed` 失效** | 在模态弹窗或键盘弹出时，fixed 定位可能相对于滚动容器而非视口 | 弹窗打开时给 body 加 `overflow: hidden` 和固定高度；使用 JS 动态设置 height = `window.innerHeight` |
| **复制/选中文本** | iOS Safari 长按选中文本的行为不可控，可能与自定义长按手势冲突 | 阅读页正文允许原生选择：`-webkit-user-select: text; user-select: text`；工具栏区域禁止选择：`user-select: none` |

### 7.1 100vh 修复方案（完整代码）

```css
/* 方案 A：现代浏览器（推荐） */
.page-container {
  min-height: 100vh;
  min-height: 100dvh; /* iOS 16.4+, Chrome 109+ */
}

/* 方案 B：兼容老版本 iOS（JS + CSS 变量） */
.page-container {
  min-height: calc(var(--vh, 1vh) * 100);
}
```

```javascript
// 在 <head> 中内联执行，避免闪烁
function setViewportHeight() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setViewportHeight()
window.addEventListener('resize', setViewportHeight)
window.addEventListener('orientationchange', setViewportHeight)
```

### 7.2 iOS TTS 降级策略

```javascript
function isIOSTTSLimited() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream
}

// 在 TTS 服务中
const isIOS = isIOSTTSLimited()
if (isIOS) {
  // 禁用逐字高亮，改为段落高亮
  ttsConfig.highlightMode = 'paragraph'
  // 提示用户
  console.warn('iOS Safari TTS 不支持逐字高亮，已切换为段落模式')
}
```

### 7.3 PWA 能力清单

| PWA 特性 | iOS Safari 支持度 | 项目策略 |
|----------|------------------|---------|
| 添加到主屏幕 | 支持（手动通过 Safari 分享菜单） | 提供引导说明，不依赖 `beforeinstallprompt` |
| 离线访问 | 支持（Service Worker + Cache API） | 缓存核心静态资源，经书数据按需缓存 |
| 推送通知 | **不支持**（iOS 16.4+ 有限支持，但仅限欧洲经济区） | 不实现推送功能 |
| 后台同步 | **不支持** | 数据在 `visibilitychange` 时同步保存 |
| 存储持久性 | **不可靠**（ITP 可能清理） | 关键数据双写 IndexedDB + localStorage |

## 8. 结论与建议

### 8.1 移动端适配策略

| 维度 | 策略 | 理由 |
|------|------|------|
| 设计方法 | Mobile First | 手机是首要平台（P0），从小屏开始向上扩展 |
| 断点方案 | 3 个断点（480px / 768px / 1024px） | 覆盖主流设备，避免过多断点增加维护成本 |
| 触摸手势 | 以原生滚动为主，手势为辅 | 阅读页默认滚动模式，减少手势冲突；翻页模式可选 |
| 字号调节 | 滑块 + 捏合双通道 | 兼顾精确调节和自然直觉操作 |
| 底部导航 | 4 项图标导航，阅读页隐藏 | 符合移动端导航习惯，不干扰沉浸阅读 |
| 存储策略 | 配额检查 + LRU 淘汰 + 双写备份 | 应对 iOS ITP 清理和移动端存储限制 |
| iOS 适配 | dvh + visualViewport + 降级方案 | 覆盖 iOS 15-17 全版本 |

### 8.2 技术选型建议

| 工具/库 | 用途 | 推荐 |
|---------|------|------|
| VueUse `useSwipe` | 滑动手势检测 | 推荐，轻量且与 Vue 3 集成 |
| `visualViewport` API | 键盘弹出/地址栏变化检测 | 推荐，iOS 15+ 原生支持 |
| CSS `env()` | 安全区域适配 | 必需，iOS 刘海屏必备 |
| CSS `100dvh` | 动态视口高度 | 推荐，iOS 16.4+ 原生支持 |
| `navigator.storage.estimate()` | 存储配额检查 | 推荐，PWA 标准 API |
| Pinia 持久化插件 | 状态备份 | 可选，将关键状态双写 localStorage |

### 8.3 需要在 v2.0 开发中落实的事项

1. **Viewport 元标签**：项目初始化时设置 `viewport-fit=cover`
2. **CSS 变量体系**：包含断点变量和安全区域变量
3. **阅读页手势层**：区分滚动模式和翻页模式的手势处理
4. **底部导航组件**：4 项图标导航，含安全区域适配
5. **存储配额检查**：导入词典/经书前检查剩余空间
6. **iOS TTS 降级**：检测 iOS UA 自动切换高亮模式
7. **100dvh 兜底**：为老版本 iOS 提供 JS 动态视口高度方案

## 8. 对 v2.1 方案的影响

本分析结果对 v2.1（阅读页面实现）方案的具体影响：

1. **CSS 视口单位**：阅读页容器使用 `min-height: 100dvh` + JS `--vh` 兜底，确保全屏覆盖不被地址栏截断
2. **触摸手势层**：阅读页需要 `touch-action: pan-y`（滚动模式）或 `touch-action: none`（翻页模式），需根据用户设置动态切换
3. **捏合缩放手势**：需独立实现 pinch 手势监听器，与 `useSwipe` 配合使用，调节范围 14px-26px
4. **工具栏呼出检测**：需实现单击/轻触的坐标和时间阈值判断，避免与滑动/捏合冲突
5. **安全区域适配**：顶部工具栏加 `padding-top: env(safe-area-inset-top)`，底部信息栏加 `padding-bottom: env(safe-area-inset-bottom)`
6. **iOS TTS 限制**：TTS 服务需检测 iOS UA，在 iOS 上自动降级为段落高亮模式
7. **存储检查前置**：经书导入前调用 `navigator.storage.estimate()` 检查空间，不足时提示用户
8. **字体选择器**：`user-select: text` 在正文区启用，工具栏区 `user-select: none`，避免长按冲突
9. **双写备份策略**：阅读进度、书签、笔记等关键数据在 `visibilitychange` 时同步到 localStorage，应对 iOS ITP 清理
10. **底部导航条件渲染**：路由守卫判断是否为阅读页路由，阅读页不渲染底部导航组件
