# 目录导航侧栏 分析报告

> 任务编号：T-27
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

佛教经文阅读器 v2.0 的阅读页需要一个高效的目录导航侧栏，帮助用户快速定位和跳转经文章节。本项目面向的经文类型跨度较大：

- **单章节经文**：如心经（全文仅 260 字，无分品）
- **少章节经文**：如阿弥陀经（约 3-5 段）
- **多章节经文**：如金刚经（32 品）、法华经（28 品）、华严经（80 卷）

目录导航需要同时满足这几类经文的浏览需求，并在移动端、平板、PC 三种屏幕尺寸上保持一致的体验。

本分析旨在：
- 调研主流阅读 App 的目录导航交互设计
- 确定目录展示方式（单章节 vs 多章节）
- 设计快速跳转和当前章节高亮方案
- 解决长经书（32+ 章节）的目录折叠策略
- 为 v2.1 版本提供明确的目录导航实现指导

## 2. 同类 App 对比

| App | 目录展示 | 跳转方式 | 当前位置 | 特点 |
|-----|----------|----------|----------|------|
| 微信读书 | 右侧滑出面板，显示章节列表，支持多级目录展开/折叠 | 点击章节名直接跳转；支持从进度条旁章节名展开目录 | 当前章节高亮显示；自动滚动到当前章节位置 | 目录面板占 80% 宽度，右侧露出正文作为视觉锚点；支持目录内搜索章节名；网页版目录固定在右侧 |
| Kindle | 顶部菜单 → "前往" → 目录，全屏章节列表 | 点击章节名跳转；支持输入页码/位置精确跳转 | 顶部标注当前所处章节 | 全屏目录页（非侧栏），操作路径较深；适合 E-ink 屏，减少屏幕刷新 |
| Koodo Reader | 左侧抽屉式侧边栏，树形目录结构 | 点击章节跳转；支持搜索过滤 | 自动定位到当前阅读章节并高亮 | 开源阅读器，支持多级目录自动折叠；1.9.8 版新增自动折叠设置选项 |
| Readest | 左侧目录面板，多级章节树 | 点击章节一键跳转；配合底部进度条拖动 | 智能跟踪阅读进度，自动定位 | 桌面端支持鼠标悬停预览章节；移动端支持手势滑动切换章节 |
| KOReader | 基于触摸区域划分的目录导航 | 单指操作完成 90% 功能；支持语义级章节跳转 | 当前章节标记 | 开源阅读器，支持 E-ink 设备；误触率降低 65% |
| 本项目需求 | 左侧滑出式侧栏 | 点击章节定位滚动位置 | 当前章节高亮，小圆点标记 | 禅意风格，适配经文场景；支持品/章/节多级导航 |

### 关键洞察

1. **侧栏 vs 全屏**：微信读书、Koodo、Readest 均采用侧栏式目录，操作路径短（1 步即可打开）；Kindle 采用全屏目录，操作路径深（2-3 步），但适合 E-ink 设备。本项目为 Web App，应采用侧栏式。

2. **当前位置感知**：主流 App 都会自动高亮当前章节，并自动滚动到可视区域。Koodo Reader 1.9.8 版将此作为重点优化项。

3. **目录搜索**：微信读书和 Readest 在目录面板顶部提供搜索框，适合章节多的场景。金刚经 32 品虽然不多，但法华经等更长经书需要搜索支持。

4. **折叠策略**：多级目录默认展开到当前章节所在层级，其他层级折叠，兼顾信息量和可读性。

## 3. 目录展示设计

### 3.1 单章节 vs 多章节的展示策略

| 经书类型 | 章节数 | 目录展示策略 | 示例 |
|----------|--------|-------------|------|
| 单章节经文 | 1 | 隐藏目录按钮或显示"全文"一个条目 | 心经、大悲咒 |
| 少章节经文 | 2-10 | 直接展开全部章节，无需折叠 | 阿弥陀经、地藏经 |
| 中章节经文 | 11-30 | 默认展开，超出可视区域可滚动 | 六祖坛经 |
| 长经书 | 30+ | 默认折叠到品/卷级别，点击展开细分 | 金刚经 32 品、法华经 28 品 |

**判断逻辑**：
```javascript
// 根据 chapters 数组长度决定展示策略
const TOC_STRATEGY = {
  SINGLE: 1,       // 隐藏目录
  EXPANDED: 10,    // 全部展开
  SCROLLABLE: 30,  // 展开+滚动
  COLLAPSIBLE: Infinity, // 折叠策略
};
```

### 3.2 目录数据结构

与 v2.0 方案中 `sutra_index` 表的 chapters 字段对齐：

```javascript
// 单章节经文
{
  id: 'xin-jing',
  title: '心经',
  chapters: [
    { index: 0, title: '全文', wordCount: 260 }
  ]
}

// 多章节经文（金刚经）
{
  id: 'jin-gang-jing',
  title: '金刚经',
  chapters: [
    { index: 0, title: '第一品 法会因由分', wordCount: 180 },
    { index: 1, title: '第二品 善现启请分', wordCount: 150 },
    // ... 共 32 品
    { index: 31, title: '第三十二品 应化非真分', wordCount: 120 }
  ]
}
```

### 3.3 目录面板布局

```
┌──────────────────────────┐
│  ☰ 金刚经         [×]    │ ← 顶部：书名 + 关闭按钮
├──────────────────────────┤
│ 🔍 搜索章节...            │ ← 搜索框（章节 > 10 时显示）
├──────────────────────────┤
│                          │
│ ● 第一品 法会因由分       │ ← 当前章节：左侧圆点标记
│   第二品 善现启请分       │ ← 普通章节
│   第三品 大乘正宗分       │
│   第四品 妙行无住分       │
│   ...                    │
│   第三十二品 应化非真分   │
│                          │
├──────────────────────────┤
│ 阅读进度 32%              │ ← 底部：阅读进度（可选）
└──────────────────────────┘
```

## 4. 快速跳转

### 4.1 点击章节定位

用户点击目录中的章节名后：

1. **收起目录面板**：移动端自动收起，PC 端若钉住则保持
2. **平滑滚动到目标位置**：使用 `scrollIntoView({ behavior: 'smooth', block: 'start' })`
3. **高亮目标章节**：短暂高亮目标章节区域（1.5 秒后消退），帮助用户视觉确认

### 4.2 实现方案

```javascript
// 章节定位实现
async function jumpToChapter(chapterIndex) {
  // 1. 确保章节内容已加载（懒加载场景）
  const chapterEl = document.querySelector(`[data-chapter="${chapterIndex}"]`);
  if (!chapterEl) {
    await sutraService.getChapter(sutraId, chapterIndex);
    // 重新查询 DOM
  }

  // 2. 平滑滚动
  chapterEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 3. 短暂高亮反馈
  chapterEl.classList.add('toc-jump-highlight');
  setTimeout(() => chapterEl.classList.remove('toc-jump-highlight'), 1500);

  // 4. 更新阅读进度
  readerStore.setCurrentChapter(chapterIndex);
}
```

### 4.3 快捷键支持（PC 端）

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + M` | 打开/关闭目录 |
| `↑` / `↓` | 目录内上下选择章节 |
| `Enter` | 跳转到选中的章节 |
| `Esc` | 关闭目录 |

## 5. 当前章节高亮

### 5.1 滚动监听方案

采用 `IntersectionObserver` API 实现滚动时自动检测当前章节：

```javascript
// 高亮引擎
function initTocHighlight() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const chapterIndex = entry.target.dataset.chapter;
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        readerStore.setCurrentChapter(parseInt(chapterIndex));
      }
    });
  }, {
    rootMargin: '-20% 0px -60% 0px',  // 顶部 20% 到 底部 60% 为有效区域
    threshold: [0, 0.3, 0.5, 1.0]
  });

  // 监听所有章节标题
  document.querySelectorAll('[data-chapter]').forEach(el => observer.observe(el));
}
```

### 5.2 高亮样式

```css
/* 目录面板中当前章节的高亮样式 */
.toc-item--active {
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-primary-bg);
  border-left: 3px solid var(--color-primary);
  padding-left: 12px;
}

.toc-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}

/* 正文区域跳转后的高亮反馈 */
.toc-jump-highlight {
  animation: highlightFade 1.5s ease-out;
}

@keyframes highlightFade {
  0% { background: var(--color-highlight-temp); }
  100% { background: transparent; }
}
```

### 5.3 Pinia Store 状态

```javascript
// stores/reader.js
export const useReaderStore = defineStore('reader', {
  state: () => ({
    currentChapter: 0,       // 当前章节索引
    scrollPosition: 0,       // 滚动位置（像素）
    progress: 0,             // 阅读进度百分比
    tocVisible: false,       // 目录面板是否可见
    tocPinned: false,        // PC 端目录是否钉住
  }),
  actions: {
    setCurrentChapter(index) {
      if (this.currentChapter !== index) {
        this.currentChapter = index;
        this._saveProgress();
      }
    },
  }
});
```

## 6. 移动端适配

### 6.1 三种屏幕的目录行为

| 屏幕类型 | 断点 | 目录宽度 | 展示方式 | 动画 |
|----------|------|----------|----------|------|
| 手机 | < 768px | 80vw (最大 320px) | 抽屉式侧栏，带遮罩层 | 从左侧滑入，duration 300ms |
| 平板 | 768px - 1024px | 280px | 抽屉式侧栏，带遮罩层 | 从左侧滑入，duration 300ms |
| PC | > 1024px | 260px | 固定左侧，可钉住/收起 | 展开/收起，duration 200ms |

### 6.2 移动端展开/收起动画

```vue
<!-- TocSidebar.vue -->
<template>
  <Teleport to="body">
    <Transition name="toc-slide">
      <div v-if="tocVisible" class="toc-sidebar">
        <div class="toc-overlay" @click="closeToc" />
        <nav class="toc-panel">
          <div class="toc-header">
            <h3>{{ sutraTitle }}</h3>
            <button class="toc-close" @click="closeToc">×</button>
          </div>
          <div class="toc-content">
            <!-- 章节列表 -->
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 移动端滑入动画 */
.toc-slide-enter-active,
.toc-slide-leave-active {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.toc-slide-enter-from {
  transform: translateX(-100%);
}

.toc-slide-leave-to {
  transform: translateX(-100%);
}

/* 遮罩层淡入淡出 */
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 1;
  transition: opacity 300ms ease;
}

.toc-slide-enter-from .toc-overlay,
.toc-slide-leave-to .toc-overlay {
  opacity: 0;
}

/* 目录面板 */
.toc-panel {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(80vw, 320px);
  background: var(--bg-primary);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: flex;
  flex-direction: column;
}
</style>
```

### 6.3 PC 端钉住功能

PC 端用户可以选择将目录面板固定在左侧：

```
┌──────────┬──────────────────────────────────┐
│ 钉住目录 │                                  │
│ ├─ 品一  │         经文正文内容...            │
│ ├─ 品二  │                                  │
│ ├─ 品三  │                                  │
│ └─ ...   │                                  │
└──────────┴──────────────────────────────────┘
     ↑ 260px          自适应剩余宽度
```

- 点击 "📌" 图标切换钉住/收起状态
- 钉住状态下正文区域自动缩进，不留遮罩层
- 收起状态下正文区域占满全宽
- 钉住状态持久化到 IndexedDB

### 6.4 手势支持

| 手势 | 功能 |
|------|------|
| 从左边缘右滑 | 打开目录面板 |
| 面板内左滑 | 关闭目录面板 |
| 面板内上下滑动 | 滚动章节列表 |
| 双击章节名 | 跳转并关闭面板 |

## 7. 长经书目录折叠

### 7.1 金刚经 32 品的折叠策略

金刚经 32 品没有子章节层级，属于**单层长列表**。策略如下：

**默认展示**：
- 展开所有 32 品，因为单层列表即使 32 项也不复杂
- 自动滚动到当前阅读品的位置
- 列表最大高度为屏幕高度减去头部/底部区域，超出可滚动

**优化体验**：
- 顶部搜索框可快速定位到特定品
- 支持按品号快速跳转（如输入"15"跳到第十五品）
- 阅读进度百分比显示在每品旁边

### 7.2 多卷/多品经文的折叠策略

对于有层级结构的经文（如"卷 → 品 → 段"）：

```
金刚般若波罗蜜经（32 品，单层）
  直接展开全部 32 品

妙法莲华经（28 品，单层）
  直接展开全部 28 品

大方广佛华严经（80 卷，多层）
  ▼ 第一卷  12 品
    ├─ 世主妙严品第一之一
    ├─ 世主妙严品第一之二
    └─ ...
  ▶ 第二卷  8 品          ← 折叠
  ▶ 第三卷  10 品          ← 折叠
  ...
  ▶ 第八十卷 6 品          ← 折叠
```

**折叠规则**：
1. **默认展开当前卷/品所在的一级**：用户正在读第一卷，则第一卷展开，其余折叠
2. **点击折叠项展开**：点击 "▶ 第二卷" 展开其下的品列表
3. **记忆展开状态**：展开/收起状态持久化，下次打开时恢复
4. **搜索时全部展开**：目录搜索命中时自动展开命中级别

### 7.3 折叠组件实现

```vue
<!-- TocTreeItem.vue - 递归目录树节点 -->
<template>
  <div class="toc-tree-item">
    <div
      class="toc-item"
      :class="{
        'toc-item--active': chapter.index === currentChapter,
        'toc-item--has-children': chapter.children?.length
      }"
      @click="handleClick"
    >
      <!-- 展开/折叠图标 -->
      <span v-if="chapter.children?.length" class="toc-toggle">
        {{ expanded ? '▼' : '▶' }}
      </span>
      <!-- 当前章节标记 -->
      <span v-if="chapter.index === currentChapter" class="toc-dot" />
      <span class="toc-title">{{ chapter.title }}</span>
    </div>
    <!-- 子节点（递归） -->
    <Transition name="toc-expand">
      <div v-if="expanded && chapter.children?.length" class="toc-children">
        <TocTreeItem
          v-for="child in chapter.children"
          :key="child.index"
          :chapter="child"
        />
      </div>
    </Transition>
  </div>
</template>
```

### 7.4 虚拟滚动（性能优化）

当经文章节超过 100 项时，采用虚拟滚动避免 DOM 节点过多：

```javascript
// 虚拟滚动配置
const VIRTUAL_SCROLL_CONFIG = {
  ITEM_HEIGHT: 44,        // 每项高度
  BUFFER_SIZE: 5,         // 可视区域外缓冲区
  THRESHOLD: 100,         // 超过此数量启用虚拟滚动
};
```

使用 Vant 4 的 `van-list` 组件或自定义虚拟滚动实现。

## 8. 结论与建议

### 8.1 推荐的目录导航方案

| 项目 | 推荐方案 | 理由 |
|------|----------|------|
| 目录位置 | 左侧滑出式侧栏 | 符合移动端操作习惯，与 T-17 阅读页设计一致 |
| 目录宽度 | 手机 80vw(最大320px) / PC 260px | 保证章节名可读，同时不遮挡过多正文 |
| 打开方式 | 点击顶部目录图标 / 左边缘右滑手势 | 操作路径最短（1 步），微信读书已验证 |
| 关闭方式 | 点击章节后自动收起 / 点击遮罩层 / 左滑手势 | 多方式关闭，减少误触困扰 |
| 当前章节 | IntersectionObserver 自动检测 + 高亮标记 | 滚动时自动更新，无需手动操作 |
| 跳转动画 | smooth scroll + 短暂高亮反馈 | 视觉确认感，让用户知道跳到了哪里 |
| 长经书处理 | 单层长列表全部展开+搜索；多层级默认折叠 | 兼顾信息量和可读性 |
| PC 钉住功能 | 可选固定左侧 | 大屏幕用户偏好常驻目录 |
| 单章节经文 | 隐藏目录按钮 | 心经等单章节经文不需要目录 |

### 8.2 组件拆分建议

```
src/components/reader/
├── TocSidebar.vue          # 目录侧栏主组件
├── TocTreeItem.vue         # 目录树节点（递归组件）
├── TocSearch.vue           # 目录搜索框
└── TocProgress.vue         # 底部进度指示（可选）
```

### 8.3 与 T-17 阅读页设计的衔接

T-17 已确定阅读页的基本布局：
- 顶部工具栏（点击屏幕呼出）
- 底部状态栏（点击屏幕呼出）
- 中间为经文正文滚动区域

本方案中目录侧栏作为独立组件，通过以下方式与阅读页集成：
1. 顶部工具栏的 "☰" 图标触发 `tocVisible` 状态切换
2. 目录面板使用 `<Teleport to="body">` 避免 z-index 冲突
3. 滚动位置由 IntersectionObserver 同步到 `readerStore.currentChapter`
4. 阅读进度保存节流 30 秒或滚动距离变化 > 10%

## 9. 对 v2.1 方案的影响

本分析结果对 v2.1（阅读页面实现）方案的具体影响：

1. **新增 TocSidebar 组件**：需要实现左侧滑出式目录面板，支持抽屉动画（移动端）和展开/收起（PC 端）

2. **Pinia reader store 新增字段**：
   - `tocVisible`：目录面板可见性
   - `tocPinned`：PC 端目录钉住状态
   - `currentChapter`：当前章节索引（用于高亮）

3. **IntersectionObserver 集成**：在 Reader.vue 中初始化章节滚动监听，自动更新 `currentChapter`

4. **sutraManifest 数据结构确认**：chapters 数组需包含 `{ index, title, wordCount }` 字段，支持单层和多层次结构

5. **路由参数设计**：阅读页 URL 支持章节锚点 `#/reader/:sutraId?chapter=5`，便于分享和书签

6. **平滑滚动实现**：使用原生 `scrollIntoView({ behavior: 'smooth' })`，配合 CSS `scroll-behavior: smooth`

7. **Vant 4 组件选型**：目录搜索可使用 `van-search`，列表使用 `van-cell` 或自定义虚拟滚动

8. **阅读进度保存增强**：不仅要保存滚动位置，还要保存当前章节索引，用于恢复时快速定位

9. **性能考虑**：32 品以内的经文直接渲染全部 DOM 节点无性能问题；超过 100 项时需引入虚拟滚动

10. **禅意风格延续**：目录面板配色与 T-17 主题体系一致，使用相同的 CSS 变量（`--bg-primary`、`--color-primary` 等），保持禅意极简风格
