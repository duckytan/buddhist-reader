# Tab 导航框架 + 词典搜索页设计方案

**日期**: 2026-05-20
**状态**: 已确认

---

## 1. 整体架构

### 布局模式

```
App.vue
├── <router-view> (独立路由)
│   └── Reader.vue (独立全屏，无 Tab 栏)
│
└── AppShell.vue (Tab 框架容器)
    ├── AppTabBar (响应式 Tab 栏)
    │   ├── 手机 (< 768px): 底部固定
    │   ├── 平板竖屏 (768-1024px portrait): 底部固定
    │   ├── 平板横屏 (768-1024px landscape): 左侧固定
    │   └── PC (>= 1024px): 左侧固定
    │
    └── <KeepAlive :max="10">
        └── <router-view> (Tab 子页面)
            ├── Bookshelf.vue (书架)
            ├── Notes.vue (笔记)
            ├── DictSearch.vue (词典搜索)
            └── Settings.vue (设置)
```

### 路由配置

```
/                  → AppShell → Bookshelf
/notes             → AppShell → Notes
/dicts             → AppShell → DictSearch
/settings          → AppShell → Settings
/reader/:id        → Reader (独立，无 Tab)
```

### 阅读器位置缓存

- 使用 `<KeepAlive>` 包裹 `AppShell` 的 `<router-view>`
- 阅读器通过 `<KeepAlive>` 在 `App.vue` 层级缓存
- 组件实例保留，DOM 状态（滚动位置、展开/收起状态等）自动保持
- 切换经文时通过 `onActivated` 中检测 `route.params.id` 变化决定重新加载

---

## 2. Tab 栏设计

### Tab 项

| Tab | 路由 | 图标 | 含义 |
|-----|------|------|------|
| 书架 | `/` | 经卷 | 展开的经书 |
| 笔记 | `/notes` | 毛笔 | 书写记录 |
| 词典 | `/dicts` | 莲花 | 智慧之花 |
| 设置 | `/settings` | 念珠 | 修行工具 |

### 视觉风格

- 内联 SVG，手绘线条风格
- 未选中态：`--color-ink-muted`
- 选中态：`--color-accent`（檀木色 #8b7355）
- 图标 + 书法体文字

### 响应式定位

核心思路：CSS 判断内容区宽高比，Tab 栏始终在窄边。

```css
/* 宽屏：左侧 */
@media (min-width: 768px) {
  .tab-bar { position: fixed; left: 0; top: 0; bottom: 0; ... }
}
/* 窄屏：底部 */
.tab-bar { position: fixed; bottom: 0; left: 0; right: 0; ... }
```

平板横屏判断：`@media (min-width: 768px) and (orientation: landscape)`

---

## 3. 词典搜索页 (DictSearch.vue)

### 布局

```
┌─────────────────────────────────────┐
│  搜索框 [ 请输入关键词搜索...  🔍]  │  ← 顶部固定
├─────────────────────────────────────┤
│  词典来源：☑ dict-1  ☑ dict-2 ...   │  ← 可折叠
├─────────────────────────────────────┤
│  搜索结果                            │
│                                     │
│  🔹 般若                            │
│  ─────────────────────────────      │
│  📖 中国当代佛教网辞典               │
│     梵语 prajñā 的音译...           │
│  📖 新编佛教辞典                     │
│     智慧之义...                     │
│  ─────────────────────────────      │
│  🔹 金刚                            │
│  ...                                │
└─────────────────────────────────────┘
```

### 搜索逻辑

- 数据源：`dictTerms` (35781 词条) + `dictDefinitions` (释义)
- 匹配策略：
  1. 完全匹配 `term === query` — 置顶
  2. 前缀匹配 `term.startsWith(query)` — 次之
  3. 包含匹配 `term.includes(query)` — 第三
  4. 释义包含 — 兜底
- debounce 300ms，结果限制 200 条
- 仅在已启用词典 (`enabledDicts`) 中搜索

### 交互

- 空状态：提示 "输入关键词搜索佛教词汇释义"
- 无结果：显示 "未找到匹配词条"
- PC/平板自动聚焦搜索框，手机不自动聚焦

---

## 4. 笔记页 (Notes.vue)

### 布局

```
┌─────────────────────────────────────┐
│  笔记汇总                           │
├─────────────────────────────────────┤
│  🔍 [ 搜索笔记...               ]  │
├─────────────────────────────────────┤
│  筛选：全部 | 《金刚经》 | 《心经》  │
├─────────────────────────────────────┤
│  📖 《金刚经》                       │
│     "应无所住，而生其心"            │
│     这句讲的是不执著于相...          │
│     2025-06-12 14:30        [→跳转] │
└─────────────────────────────────────┘
```

### 交互

- 按经书筛选笔记
- 点击 `[→跳转]` → 进入阅读器对应段落
- 点击笔记 → 展开编辑

---

## 5. 设置页 (Settings.vue)

### 布局

```
┌─────────────────────────────────────┐
│  设置                               │
├─────────────────────────────────────┤
│  主题外观                            │
│  ○ 宣纸 ○ 墨夜 ○ 护眼                │
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

### 说明

- 整合当前 ReaderSettings + DictManager 功能
- Reader.vue 中仍保留快速设置面板（阅读中快速调整）
- 完整设置统一收口到设置页

---

## 6. 技术方案

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/AppShell.vue` | Tab 框架容器 |
| `src/components/AppTabBar.vue` | 响应式 Tab 栏 |
| `src/pages/Notes.vue` | 笔记汇总页 |
| `src/pages/DictSearch.vue` | 词典搜索页 |
| `src/pages/Settings.vue` | 设置页 |
| `src/composables/useNoteSearch.js` | 笔记搜索逻辑 |
| `src/composables/useDictSearch.js` | 词典搜索逻辑 |
| `src/utils/dictSearchEngine.js` | 词典匹配引擎 |
| `src/assets/icons/tab-*.svg` | Tab 图标 (内联 SVG) |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/router/index.js` | 嵌套路由 + KeepAlive 配置 |
| `src/App.vue` | 增加 `<KeepAlive>` 包裹 |
| `src/pages/Bookshelf.vue` | 移除自建 header（由 AppShell 统一导航） |
| `src/pages/DictManager.vue` | 可删除，功能迁移到 Settings.vue |

### 状态管理

- 笔记数据：`useNotesStore` (新增) — 从 localStorage 读取/写入
- 词典数据：复用 `useDictStore`
- 设置数据：复用 `useSettingsStore` (从 ReaderSettings 抽离)
