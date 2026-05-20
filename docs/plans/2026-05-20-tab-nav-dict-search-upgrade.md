# 佛经阅读器 v3.1 升级方案：Tab 导航框架 + 词典搜索页

**日期**: 2026-05-20
**状态**: 审计修订版
**版本**: v3.1
**分支**: `260520-feat-tab-nav-dict-search`
**审计记录**: 2026-05-20 全面审计后修订（10 维度分析，修正 3 个核心问题）

---

## 1. 项目背景

### 1.1 当前状态

v3.0 版本已实现完整的佛经阅读器核心功能：
- 书架浏览（30 篇经文，分类筛选）
- 沉浸式阅读（段落导航、进度记忆、主题切换）
- 点击查词（Trie 前向最大匹配、3 词典 35781 词条）
- 笔记与书签（localStorage 持久化）
- 全文搜索（段落级精确跳转）

### 1.2 问题与挑战

1. **缺乏全局导航**：各页面独立管理 header，用户体验碎片化
2. **词典功能入口隐蔽**：词典管理页面无可见入口，用户难以发现
3. **缺少词典独立搜索**：当前仅支持阅读中点击查词，无法主动搜索词汇
4. **笔记无法汇总浏览**：笔记散落在各经文中，无法集中查看和搜索
5. **设置分散**：阅读设置、词典管理、数据管理分布在不同位置

### 1.3 升级目标

- 建立统一的 Tab 导航框架，始终在屏幕窄边自适应
- 新增词典搜索页，支持全文关键词搜索佛教词汇释义
- 新增笔记汇总页，支持按经书筛选、搜索、跳转
- 整合设置页，统一管理主题、阅读、词典、数据

---

## 2. 整体架构（审计修订）

### 2.1 布局模式

采用 Vue Router **嵌套路由**方案，AppShell 作为父组件包裹 Tab 子页面。

```
App.vue
├── <router-view /> (渲染第一层路由)
│   │
│   ├── AppShell.vue (Tab 框架容器)
│   │   ├── AppTabBar (响应式 Tab 栏)
│   │   │   ├── 手机 (< 768px): 底部固定
│   │   │   ├── 平板竖屏 (768-1024px portrait): 底部固定
│   │   │   ├── 平板横屏 (768-1024px landscape): 左侧固定
│   │   │   └── PC (>= 1024px): 左侧固定
│   │   │
│   │   └── <KeepAlive :include="['Bookshelf','Notes','DictSearch','Settings']">
│   │       └── <router-view /> (渲染 Tab 子页面)
│   │           ├── Bookshelf.vue (书架)
│   │           ├── Notes.vue (笔记)
│   │           ├── DictSearch.vue (词典搜索)
│   │           └── Settings.vue (设置)
│   │
│   └── Reader.vue (阅读器，独立全屏，无 Tab 栏)
│
└── 离线检测横幅 (App.vue 内建)
```

**实现方式**：
- `App.vue` 只保留 `<router-view />`，不包裹 KeepAlive
- `AppShell.vue` 作为嵌套路由的父组件，内部包含 Tab 栏和 `<KeepAlive>` 包裹的子 `<router-view />`
- Reader.vue 与 AppShell 平级，通过路由配置区分

### 2.2 路由配置（嵌套路由）

```js
const routes = [
  {
    path: '/',
    component: () => import('../components/AppShell.vue'),
    children: [
      { path: '', name: 'bookshelf', component: () => import('../pages/Bookshelf.vue') },
      { path: 'notes', name: 'notes', component: () => import('../pages/Notes.vue') },
      { path: 'dicts', name: 'dicts', component: () => import('../pages/DictSearch.vue') },
      { path: 'settings', name: 'settings', component: () => import('../pages/Settings.vue') },
    ]
  },
  { path: '/reader/:id', name: 'reader', component: () => import('../pages/Reader.vue') }
]
```

**关键决策**：
- Tab 切换使用 `router.push()`，产生历史栈（用户按返回可回到上一个 Tab）
- Reader 使用 `router.push()`，返回时通过 `query.from` 参数智能判断返回目标

### 2.3 阅读器位置缓存策略（审计修订）

**方案：不使用 KeepAlive 缓存 Reader，改为 localStorage 保存/恢复滚动位置。**

原方案使用 KeepAlive 缓存 Reader 实例存在内存泄漏风险：
- 最长经文 579K 字，3869 段落，单个 Reader DOM 节点 10,000+
- 缓存多个 Reader 实例在移动设备（2GB 内存）上可能崩溃
- KeepAlive :max="10" 对 Reader 来说过于宽松

**修订方案**：

| 场景 | 行为 |
|------|------|
| 书架 → 阅读《金刚经》，滚到第 50 段 | 正常进入 |
| 返回书架 | Reader 组件销毁，`onUnmounted` 保存滚动位置到 localStorage |
| 再次点击《金刚经》 | 新实例从 localStorage 读取 `scrollTop`，恢复滚动位置 |
| 点击《心经》 | 新页面从顶部开始 |
| 返回后再次点《金刚经》 | 新实例恢复滚动位置，DOM 重建但视觉无感 |

**技术要点**：
- `onUnmounted` 中保存：`storage.setNumber(`scroll-${sutraId}`, scrollTop)`
- `onMounted` 中恢复：读取 `scrollTop`，`nextTick` 后调用 `contentRef.value.scrollTo(0, scrollTop)`
- 仅对 Tab 子页面（Bookshelf/Notes/DictSearch/Settings）使用 KeepAlive
- Reader 的 `:key="dictStore.refreshKey"` 保持不变，确保词典切换时高亮刷新

### 2.4 返回逻辑设计（审计新增）

**Reader 返回路径智能判断**：

```js
// 进入 Reader 时携带来源信息
router.push({
  name: 'reader',
  params: { id: sutraId },
  query: { from: route.fullPath }  // 记录来源
})

// Reader 返回时判断
function goBack() {
  const from = route.query.from
  if (from && from.startsWith('/#/')) {
    // 从内部页面跳转（笔记、词典），返回来源页
    router.push(from)
  } else {
    // 默认返回书架
    router.push('/')
  }
}
```

| 场景 | 来源 | 返回目标 |
|------|------|----------|
| 书架点击经文 | `/` | `/` (书架) |
| 笔记页 `[→跳转]` | `/notes` | `/notes` (笔记页) |
| 词典搜索页跳转 | `/dicts` | `/dicts` (词典页) |
| 书签跳转 | `/` | `/` (书架) |

---

## 3. Tab 栏设计

### 3.1 Tab 项

| Tab | 路由 | 图标 | 含义 |
|-----|------|------|------|
| 书架 | `/` | 经卷 | 展开的经书 |
| 笔记 | `/notes` | 毛笔 | 书写记录 |
| 词典 | `/dicts` | 莲花 | 智慧之花 |
| 设置 | `/settings` | 念珠 | 修行工具 |

### 3.2 视觉风格

- **图标**：内联 SVG，极简线条风格（手绘感，非通用图标库）
- **颜色**：
  - 未选中态：`--color-ink-muted` (#6b6b6b)
  - 选中态：`--color-accent` (#8b7355 檀木色)
- **文字**：书法体（`--font-serif`）+ 禅意图标
- **尺寸**：
  - 底部 Tab：图标 24px + 文字 12px，高度 60px
  - 侧边 Tab：图标 20px + 文字 14px，宽度 72px

### 3.3 响应式定位

核心原则：**Tab 栏始终在屏幕窄边，推开内容（非 floating 覆盖）**。

| 设备 | 断点 | 位置 | 布局 |
|------|------|------|------|
| 手机 | `< 768px` | 底部固定 | 横向排列 4 Tab |
| 平板竖屏 | `768-1024px` + portrait | 底部固定 | 横向排列 4 Tab |
| 平板横屏 | `768-1024px` + landscape | 左侧固定 | 纵向排列 4 Tab |
| PC | `>= 1024px` | 左侧固定 | 纵向排列 4 Tab |

**CSS 实现**：
```css
/* 默认窄屏：底部，推开内容 */
.app-tab-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 60px;
  display: flex; flex-direction: row;
}
.app-shell-content {
  padding-bottom: 60px; /* 推开内容区 */
}

/* 宽屏：左侧 */
@media (min-width: 768px) {
  .app-tab-bar {
    top: 0; bottom: auto; right: auto;
    width: 72px; height: 100vh;
    flex-direction: column;
  }
  .app-shell-content {
    padding-bottom: 0;
    margin-left: 72px; /* 推开内容区 */
  }
}
```

**平板横竖屏检测**：使用 `@media (min-width: 768px) and (orientation: landscape)` + `@media (min-aspect-ratio: 1/1)` 双重检测，确保桌面浏览器模拟移动端时也能正确判断。

---

## 4. 词典搜索页 (DictSearch.vue)

### 4.1 页面布局

```
┌─────────────────────────────────────┐
│  搜索框 [ 请输入关键词搜索...  🔍]  │  ← 顶部固定
├─────────────────────────────────────┤
│  词典来源：☑ dict-1  ☑ dict-2 ...   │  ← 可折叠，默认展开
├─────────────────────────────────────┤
│  搜索结果                            │
│                                     │
│  🔹 般若                            │  ← 词条卡片
│  ─────────────────────────────      │
│  📖 中国当代佛教网辞典               │  ← 词典来源标签
│     梵语 prajñā 的音译。指超越...   │  ← 释义正文
│                                     │
│  📖 新编佛教辞典                     │
│     智慧之义。梵语 prajñā...        │
│  ─────────────────────────────      │
│                                     │
│  🔹 金刚                            │  ← 下一个词条
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

### 4.2 搜索逻辑

**数据源**：
- `dictTerms`: 35781 个词条的扁平列表
- `dictDefinitions`: `{ dictId: { term: definition } }` 释义数据
- `enabledDicts`: 已启用词典列表（与阅读时共享状态，来自 `useDictStore`）

**匹配策略**（四级优先级）：

| 优先级 | 匹配类型 | 规则 | 示例 |
|--------|----------|------|------|
| 1 | 完全匹配 | `term === query` | 搜索"般若" → "般若"置顶 |
| 2 | 前缀匹配 | `term.startsWith(query)` | 搜索"般" → "般若、般若波罗蜜多..." |
| 3 | 词条包含 | `term.includes(query)` | 搜索"智慧" → 含"智慧"的词条 |
| 4 | 释义包含 | `definition.includes(query)` | 兜底匹配 |

**性能保障（审计修订）**：
- debounce 300ms，避免高频重算
- 35781 词条线性扫描在主流设备 < 10ms，低端设备可能 50-100ms
- **第 4 级释义搜索仅在无前三级结果时触发**，且限制为前 50 个高频词条
- 结果限制 200 条，超出提示"结果过多，请缩小搜索范围"
- 仅在已启用词典中搜索
- **低端设备备选方案**：如检测到搜索耗时 > 200ms，提示用户"正在搜索，请稍候..."

### 4.3 交互细节

| 场景 | 行为 |
|------|------|
| 空状态 | 提示 "输入关键词搜索佛教词汇释义" |
| 无结果 | 显示 "未找到匹配词条" |
| 自动聚焦 | PC/平板自动聚焦搜索框，手机不自动聚焦（避免键盘遮挡） |
| 词典切换 | 点击词典来源区可快速切换启用状态（与设置页共享 `useDictStore`） |
| 展开/收起 | 点击词条可展开/收起释义（默认展开） |
| 点击词条跳转 | 可选：点击词条后跳转到阅读器，搜索该词条在经文中的位置 |

---

## 5. 笔记页 (Notes.vue)

### 5.1 页面布局

```
┌─────────────────────────────────────┐
│  笔记汇总                           │  ← 页面标题
├─────────────────────────────────────┤
│  🔍 [ 搜索笔记...              ]    │  ← 搜索框
├─────────────────────────────────────┤
│  筛选：全部 | 《金刚经》 | 《心经》  │  ← 按经书筛选
├─────────────────────────────────────┤
│  笔记列表                            │
│                                     │
│  📖 《金刚经》                       │  ← 经书来源
│     "应无所住，而生其心"            │  ← 引用原文
│     这句讲的是不执著于相...          │  ← 用户笔记
│     2025-06-12 14:30        [→跳转] │  ← 时间 + 跳转按钮
│  ─────────────────────────────      │
│                                     │
│  📖 《心经》                        │
│     "色即是空，空即是色"            │
│     色蕴与空性不二的道理...          │
│     2025-06-10 09:15        [→跳转] │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 交互

| 操作 | 行为 |
|------|------|
| 按经书筛选 | 顶部筛选器，按经书分组显示 |
| 搜索笔记 | 同时匹配原文引用和笔记内容 |
| 点击 `[→跳转]` | 进入阅读器对应段落，URL 携带 `?from=/notes`，高亮显示引用原文 |
| 点击笔记卡片 | 展开编辑（可修改笔记内容） |
| 删除笔记 | 长按或左滑 → 删除确认 |

### 5.3 数据存储（审计修订）

**现状**：当前笔记功能由 `ReaderNotes.vue` 组件内部管理，直接读写 localStorage，**不存在 `stores/notes.js`**。

**需要新增**：
- `src/stores/notes.js` — 将笔记管理从组件中抽离为 Pinia Store
- 笔记结构：`{ id, sutraId, paragraphId, text, quote, createdAt, updatedAt }`
- 存储键：`br-notes-{sutraId}`（与现有 `storage` 工具一致）
- Store 方法：`getNotes()`, `getNotesBySutra(sutraId)`, `addNote()`, `updateNote()`, `deleteNote()`, `searchNotes(query)`

**工作量调整**：笔记页实际预估 6-8 小时（原方案 4.5h 被低估，需抽离 Store）。

---

## 6. 设置页 (Settings.vue)

### 6.1 页面布局

```
┌─────────────────────────────────────┐
│  设置                               │
├─────────────────────────────────────┤
│  主题外观                            │
│  ○ 宣纸 ○ 墨夜 ○ 护眼                │  ← 主题切换
│                                     │
│  阅读设置                            │
│  字号  [ - | A | + ]                │
│  行距  [ 1.5 | 1.8 | 2.0 ]          │
│  字体  ○ 宋体 ○ 黑体                 │
│                                     │
│  词典管理                            │
│  ☑ 中国当代佛教网辞典         [详情] │
│  ☑ 新编佛教辞典               [详情] │
│  ☑ 中华佛教百科全书           [详情] │
│                                     │
│  数据管理                            │
│  清除缓存                    [清除]  │
│  导出笔记                    [导出]  │
│                                     │
│  关于                                │
│  版本 v3.0.0                        │
│  GitHub ↗                            │
└─────────────────────────────────────┘
```

### 6.2 功能整合

| 模块 | 来源 | 说明 |
|------|------|------|
| 主题外观 | `stores/settings.js` | 宣纸/墨夜/护眼，即时生效 |
| 阅读设置 | `stores/settings.js` | 字号、行距 |
| 词典管理 | `stores/dict.js` | 启用/禁用词典，与阅读时共享状态 |
| 数据管理 | 新增 | 清除缓存、导出笔记（JSON 格式） |
| 关于 | 新增 | 版本号、GitHub 链接 |

**事实修正（审计发现）**：
- 方案原文说"从 ReaderSettings 中抽离 useSettingsStore"，但**当前 `stores/settings.js` 已经是独立的 Store**，不需要抽离
- 设置页直接复用 `useSettingsStore` 和 `useDictStore` 即可

**阅读中快速设置**：
- Reader.vue 中保留 `ReaderSettings.vue` 面板，但**仅保留最常用的 3 项**：主题切换、字号调节、行距调节
- 其他设置（词典管理、数据管理、关于）只出现在 Settings 页
- ReaderSettings 面板增加"更多设置"按钮，跳转到 `/settings` Tab

---

## 7. 技术方案

### 7.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/AppShell.vue` | Tab 框架容器（嵌套路由父组件） |
| `src/components/AppTabBar.vue` | 响应式 Tab 栏 |
| `src/pages/Notes.vue` | 笔记汇总页 |
| `src/pages/DictSearch.vue` | 词典搜索页 |
| `src/pages/Settings.vue` | 设置页 |
| `src/stores/notes.js` | 笔记 Store（新增，从 ReaderNotes 抽离） |
| `src/composables/useDictSearch.js` | 词典搜索逻辑 |
| `src/utils/dictSearchEngine.js` | 词典匹配引擎 |

### 7.2 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/router/index.js` | 改为嵌套路由配置，AppShell 作为父组件 |
| `src/App.vue` | **不修改**，保持 `<router-view />` 不变 |
| `src/pages/Bookshelf.vue` | 移除自建 header，适配 AppShell 内容区 |
| `src/pages/Reader.vue` | 增加返回逻辑：读取 `route.query.from` 智能返回 |
| `src/components/reader/ReaderSettings.vue` | 精简为常用 3 项 + "更多设置"跳转 |
| `src/pages/DictManager.vue` | 保留，可从设置页词典管理区跳转访问 |

### 7.3 状态管理

| Store | 状态 | 说明 |
|-------|------|------|
| `useDictStore` | 复用 | 词典启用状态、词条索引、释义缓存 |
| `useSettingsStore` | 复用 | 字号、行距、主题（已独立存在，无需抽离） |
| `useNotesStore` | **新增** | 笔记 CRUD、按经书筛选、搜索 |
| `useSutraStore` | 复用 | 经文列表、当前经文（笔记页显示经书标题） |

---

## 8. 实施计划

### 8.1 任务分解

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| **Phase 1: 框架搭建** | | |
| | 1.1 创建 AppShell + AppTabBar 组件 | 2h |
| | 1.2 调整路由配置（嵌套路由） | 1h |
| | 1.3 Bookshelf 适配 AppShell（移除 header） | 1h |
| | 1.4 Reader 返回逻辑优化（query.from） | 1h |
| | 1.5 Reader 滚动位置保存/恢复（localStorage） | 1h |
| **Phase 2: 词典搜索页** | | |
| | 2.1 创建 DictSearch.vue 页面 | 2h |
| | 2.2 实现词典搜索引擎（四级匹配） | 2h |
| | 2.3 搜索结果渲染与交互 | 2h |
| | 2.4 低端设备性能优化（debounce、释义搜索限制） | 1h |
| **Phase 3: 笔记页** | | |
| | 3.1 新增 stores/notes.js（抽离 ReaderNotes 逻辑） | 2h |
| | 3.2 创建 Notes.vue 页面 | 2h |
| | 3.3 实现笔记搜索与筛选 | 1.5h |
| | 3.4 跳转阅读器定位功能（携带 from 参数） | 1h |
| | 3.5 笔记编辑/删除交互 | 1.5h |
| **Phase 4: 设置页** | | |
| | 4.1 创建 Settings.vue 页面 | 2h |
| | 4.2 整合主题、阅读、词典管理 | 2h |
| | 4.3 精简 ReaderSettings（3 项 + 更多设置） | 1h |
| | 4.4 导出笔记功能（JSON 格式） | 1h |
| **Phase 5: 禅意设计与测试** | | |
| | 5.1 禅意图标设计（4 个 SVG） | 2h |
| | 5.2 响应式适配测试（手机/平板/PC） | 2h |
| | 5.3 单元测试（搜索引擎、笔记 Store） | 2h |
| | 5.4 ESLint + 手动测试 + 性能验证 | 1h |

**总预估**: ~32 小时（审计后调整，原 25h 被低估）

### 8.2 优先级

- **P0**（核心）：AppShell + Tab 栏 + 词典搜索页 + 路由嵌套
- **P1**（重要）：笔记页 + 笔记 Store 抽离 + 设置页
- **P2**（完善）：禅意图标 + Reader 滚动恢复 + 响应式优化

---

## 9. 风险与注意事项

### 9.1 潜在风险

| 风险 | 影响 | 应对 |
|------|------|------|
| Reader 内存占用 | 不使用 KeepAlive，DOM 重建可能闪烁 | `nextTick` 后恢复 `scrollTop`，视觉无感 |
| 阅读器经文切换 | `onMounted` 需正确加载经文 | 复用现有 `useSutraLoader` 逻辑 |
| 搜索性能 | 35781 词条 + 释义搜索可能卡顿 | 第 4 级仅无匹配时触发，限制 50 词条 |
| 响应式断点 | 平板横竖屏切换异常 | CSS `orientation` + `min-aspect-ratio` 双重检测 |
| 笔记 Store 迁移 | ReaderNotes 直接改 Store 可能破坏现有功能 | 先写测试，确保兼容性 |

### 9.2 兼容性

- **Vercel 部署**：不受影响，嵌套路由仍通过 SPA rewrite 处理
- **GitHub Pages**：hash 模式保持不变，嵌套路由路径为 `/#/notes`、`/#/dicts`
- **旧版 URL**：`/#/dicts` 路由指向 DictSearch.vue，DictManager 可通过设置页访问
- **旧书签**：用户收藏的 `/#/reader/xxx` 链接不受影响

### 9.3 回退策略

- 所有新页面为新增，不修改现有功能逻辑
- 嵌套路由通过条件渲染兼容旧路由
- 如出现问题，可快速回退到 v3.0

### 9.4 禅意图标资源

**现状**：项目中无 SVG 图标文件，v2.0 资源也未提供图标。

**解决方案**：
- 使用极简线条风格，自定义 4 个内联 SVG
- 图标设计原则：单色线条、圆角端点、统一笔画宽度
- 参考禅意元素：经卷（展开）、毛笔（书写）、莲花（智慧）、念珠（修行）

---

## 10. 测试策略

### 10.1 单元测试

| 测试项 | 说明 |
|--------|------|
| `dictSearchEngine.js` | 四级匹配策略正确性、性能边界 |
| `useDictSearch.js` | debounce、过滤、排序、结果限制 |
| `stores/notes.js` | CRUD 操作、搜索、按经书筛选 |
| `useReadingProgress.js` | 滚动位置保存/恢复 |

### 10.2 集成测试

| 场景 | 验证点 |
|------|--------|
| 路由嵌套 | AppShell 渲染、Tab 子页面切换、KeepAlive 缓存 |
| Tab 切换历史 | push 产生历史栈，按返回可回到上一个 Tab |
| Reader 返回逻辑 | `query.from` 正确判断返回目标 |
| Reader 滚动恢复 | 返回后读取 localStorage，恢复滚动位置 |
| 词典搜索 | 四级匹配、debounce、结果限制、低端设备降级 |
| 笔记页 | 按经书筛选、搜索、跳转定位（携带 from 参数） |
| 设置页 | 主题切换即时生效、词典启用状态同步 |
| 响应式 | 手机底部 Tab、PC 左侧 Tab、平板横竖屏切换 |
| KeepAlive | Tab 子页面状态保留（书架滚动位置、搜索框内容） |

---

## 11. 变更影响评估

### 11.1 破坏性变更

无。所有新页面为新增，现有功能保持不变。

### 11.2 API 变更

无外部 API 变更，仅内部状态管理扩展。

### 11.3 数据迁移

无需数据迁移，所有数据格式保持兼容。

### 11.4 存储键变更

| 存储键 | 说明 | 变更 |
|--------|------|------|
| `br-dicts-enabled` | 词典启用状态 | 不变 |
| `br-settings-*` | 用户设置 | 不变 |
| `br-notes-{sutraId}` | 笔记数据 | 不变（ReaderNotes 直接读写） |
| `br-scroll-{sutraId}` | 滚动位置 | **新增** |
| `br-reading-time-{sutraId}` | 阅读时长 | 不变 |

---

## 12. 后续展望

| 方向 | 说明 |
|------|------|
| 书签汇总页 | 与笔记页类似，集中管理书签 |
| 阅读统计可视化 | 阅读时长、进度、笔记数量等 |
| 词典收藏功能 | 收藏常用词条，快速访问 |
| 离线词典包 | 按需下载词典数据，减少初始加载 |
| 在线词典对接 | 预留 API 接口，对接在线佛教词典 |
| Tab 栏可扩展 | 设计为可配置数组，支持动态增删 Tab |
