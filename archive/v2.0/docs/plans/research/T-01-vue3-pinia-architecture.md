# Vue 3 架构 + Pinia 状态管理 调研报告

> 任务编号：T-01
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md

## 1. 背景与目标

般若佛经阅读器 v2.0 采用 Vue 3 + Composition API + Pinia + Vant 4 + Vite 5 + IndexedDB 技术栈。本调研旨在确定阅读器类项目中 Vue 3 架构的最佳实践，包括 Composition API 与 Options API 的选择、组件拆分粒度、深层组件通信策略、Pinia Store 划分原则、数据量控制、跨页面数据同步、Store 懒加载方案等关键决策点，为 v2.0（及后续 v2.1）的实施提供明确的技术指导。

## 2. 调研内容

### 2.1 同类项目架构对比

| 项目 | 框架 | 状态管理 | 组件拆分 | 特点 |
|------|------|----------|----------|------|
| **微信读书（Web/小程序版）** | Vue.js（小程序） | 全局状态 + 本地存储 | 按页面拆分（书架/阅读/发现/个人），阅读页内按区域（顶部工具栏、正文区、底部工具栏、侧边目录） | 阅读进度、书签、笔记通过后端 API 同步；正文渲染采用 WebView 隔离；按需加载章节内容 |
| **Readium-js-viewer**（开源 EPUB 阅读器） | 原生 JS + RequireJS | 无统一状态管理，模块内部自行维护 | 高度模块化：渲染引擎（readium-shared-js）、UI 层（viewer）、插件系统分离；通过事件总线通信 | 遵循 EPUB 标准，插件系统可扩展高亮/注释；内容解析与 UI 渲染完全解耦；不支持现代构建工具 |
| **Thorium Reader**（开源桌面 EPUB 阅读器） | React + TypeScript | Redux + Redux-Saga | MVC 架构清晰分离：数据层（Redux store）、视图层（React 组件）、业务逻辑层（Redux-Saga） | 基于 Readium Desktop toolkit；支持 25 种语言 i18n；OPDS 协议集成；LCP 加密支持 |
| **epub.js Reader**（开源 Web EPUB 阅读器） | 原生 JS（可集成 Vue/React） | 无，由宿主应用管理 | epub.js 本身是纯渲染引擎，UI 层由外部框架决定；典型集成方式为 Reader 组件 + 工具栏组件 + 目录组件 | 核心优势：ZIP 解压 + XML 解析 + HTML5 渲染全在浏览器完成；支持离线阅读、自定义主题、分页/滚动模式 |
| **本项目 v1.0** | Vue 3 + Composition API | Pinia（初步使用） | 页面级组件（Bookshelf/Reader/Settings）+ 通用组件；字典/经文数据硬编码 | 禅意 UI 风格、Trie 高亮匹配、Web Speech TTS、多终端适配 |

**关键发现**：
1. 主流阅读器均采用**分层架构**：渲染引擎与 UI 层分离（Readium/epub.js），状态管理交由上层框架
2. 微信读书的**按需加载**策略与本项目 v2.0 目标一致：章节分块、释义延迟加载
3. Thorium Reader 的 MVC 分层（数据/视图/逻辑）可借鉴为 v2.0 的 Service-Store-Component 三层架构

### 2.2 Composition API vs Options API

| 维度 | Composition API (`<script setup>`) | Options API |
|------|-----------------------------------|-------------|
| 逻辑组织 | 按功能点聚合（如阅读进度逻辑、高亮逻辑各自集中） | 按选项类型分散（data、methods、computed 分开） |
| 类型推导 | 天然支持 TS，无需额外声明 | 需借助 `vue-tsc` 或手动声明 |
| 逻辑复用 | Composables（`useReaderProgress()`、`useHighlighter()`） | Mixins（存在命名冲突、来源不清问题） |
| 树摇优化 | 仅打包使用的 API | 全量引入 Vue 选项系统 |
| 学习曲线 | 较高（需理解响应式原理） | 较低（Vue 2 开发者熟悉） |
| 生态趋势 | Vue 3 官方推荐，新库优先支持 | Vue 2 遗产，维护模式 |

**结论：v2.0 全面采用 Composition API + `<script setup>` 语法**。理由：
- 阅读器场景存在大量可复用逻辑（阅读进度管理、高亮匹配、TTS 控制、词典弹窗），Composables 模式天然适配
- Vant 4 全面支持 `<script setup>`，组件类型推导更准确
- 项目无 Vue 2 历史包袱，不存在迁移成本

### 2.3 组件拆分粒度

| 拆分策略 | 优点 | 缺点 | 适用场景 |
|----------|------|------|----------|
| **大组件**（一个页面一个组件） | 文件少、上下文集中 | 单文件代码量大、难以复用、难以测试 | 一次性页面（如设置页） |
| **微组件**（每个 UI 元素独立组件） | 高度复用、职责单一、易于测试 | 组件数量爆炸、props 传递链过长、维护成本高 | 通用 UI 元素（按钮、卡片） |
| **中粒度**（按功能区域拆分） | 平衡复用与上下文、props 链短 | 需要判断"多大算大" | 业务页面 |

**结论：v2.0 采用"中粒度 + 按需微组件"策略**。具体规则：
- **页面级**：`Bookshelf.vue`、`Reader.vue`、`DictManager.vue`、`Settings.vue`、`Stats.vue`
- **区域级**：阅读页拆分为 `ReaderHeader`（顶部工具栏）、`ReaderContent`（正文区）、`ReaderFooter`（底部进度条）、`DictPopup`（词典弹窗）、`TocDrawer`（目录抽屉）
- **微组件**：仅当满足以下条件才拆分：
  - 在 3 个以上页面复用（如 `SutraCard` 书架卡片）
  - 内部逻辑超过 100 行或模板超过 80 行
  - 需要独立的生命周期管理（如 TTS 播放控件）
- **不拆分**：仅在单页面使用且逻辑简单的 UI 块保持在页面组件内

### 2.4 provide/inject 使用边界

| 通信方式 | 适用距离 | 适用数据量 | DevTools 支持 | 调试难度 |
|----------|----------|-----------|---------------|----------|
| props/emit | 父子（1 层） | 任意 | 完全支持 | 低 |
| provide/inject | 跨多级（任意层） | 小~中 | 部分支持（Vue DevTools 3.2+） | 中 |
| Pinia Store | 全局（任意组件） | 任意 | 完全支持（时间旅行、快照） | 低 |
| Composable + ref | 同模块组件 | 小 | 不支持 | 中 |

**结论：v2.0 严格限定 provide/inject 的使用范围**：

**使用场景（允许）**：
- **阅读器上下文**：`Reader.vue` 提供当前经书 ID、章节索引、字体设置等，供 `ReaderContent`、`ReaderHeader`、`ReaderFooter` 深层子组件读取
- **主题配置**：根组件提供禅意主题色、夜间模式开关，供全局组件消费
- **词典弹窗上下文**：`DictPopup` 提供当前高亮术语信息，供内部释义卡片组件使用

**不使用场景（禁止）**：
- **跨页面状态共享**（如阅读进度、词典开关、统计数据）：必须使用 Pinia Store
- **大型数据集**（如经文章节内容、词典词条列表）：必须通过 Service 层按需加载，不能通过 provide/inject 传递
- **双向数据流**：provide/inject 应视为**只读传递**，修改操作必须通过 pinia action 或 emit 回传

**最佳实践**：
```javascript
// Reader.vue - 提供阅读器上下文
const readerContext = {
  sutraId: computed(() => sutraStore.currentSutraId),
  chapterIndex: ref(0),
  fontSize: settingStore.fontSize,
  theme: settingStore.theme,
}
provide('readerContext', readerContext)

// ReaderFooter.vue - 注入上下文
const ctx = inject('readerContext')
// 只读使用 ctx.fontSize.value，不直接修改
```

### 2.5 Pinia Store 划分原则

| 方案 | 优点 | 缺点 |
|------|------|------|
| **单 Store**（全部状态放一个 Store） | 状态集中、跨模块通信简单 | 文件膨胀、Tree-shaking 失效、循环依赖风险 |
| **多 Store（按业务域）** | 职责清晰、独立打包、易于测试和维护 | 跨 Store 通信需要显式导入 |
| **多 Store（按技术层）** | 技术分层清晰 | 业务逻辑分散、不符合 DDD 原则 |

**结论：v2.0 采用"按业务域拆分多 Store"方案**，划分原则如下：

| Store | 职责范围 | 数据量预估 | 懒加载 |
|-------|---------|-----------|--------|
| `sutraStore` | 经书列表、当前经书、章节内容 | 大（章节内容按需加载） | 是（进入阅读页时加载） |
| `dictStore` | 词典列表、开关状态、Trie 索引、缓存释义 | 中~大（取决于用户词典数量） | 是（初始化时加载基础索引） |
| `readerStore` | 阅读页 UI 状态（弹窗开关、目录展开、高亮选中） | 小（纯 UI 状态） | 否（轻量） |
| `settingStore` | 全局设置（字体、主题、TTS 语速、词典默认开关） | 小 | 否（启动即需） |
| `statsStore` | 功德统计（诵读次数、时长、连续天数） | 小~中 | 是（进入统计页时加载） |

**跨 Store 通信规则**：
- Store A 的 action 中可以导入并使用 Store B（如 `dictStore.toggleDict()` 中调用 `readerStore.refreshHighlight()`）
- 禁止在 getter 中引用其他 Store（避免循环依赖）
- 跨 Store 引用使用函数调用方式（在 action 内部 `useOtherStore()`），不在 defineStore 顶层调用

### 2.6 State 数据量控制

**核心原则：Store 中只放"跨组件共享的元数据和状态"，不放"大型数据集"**。

| 数据类型 | 存放位置 | 原因 |
|----------|---------|------|
| 经书列表（元数据） | `sutraStore.state` | 跨页面共享（书架/阅读器），数据量小 |
| 当前章节内容 | **局部 state**（ReaderContent 组件） | 仅阅读页使用，数据量大（可能数万字），切换章节时需替换 |
| 词典开关状态 | `dictStore.state` | 跨页面共享（设置页/阅读器），数据量小 |
| 词典释义全文 | **IndexedDB + 内存缓存**（Service 层） | 按需加载，不放入 store 避免膨胀 |
| Trie 索引（term 列表） | **引擎层**（TrieManager 实例） | 属于核心引擎数据，不属于应用状态 |
| 阅读进度（sutraId/chapter/position） | `sutraStore.state` | 小数据，跨页面同步 |
| 释义缓存（最近查询的 N 条） | **Service 层 LRU 缓存** | 不属于持久状态，内存管理由 Service 控制 |
| 用户设置（字体/主题/语速） | `settingStore.state` | 小数据，全局共享 |
| 功德统计（按日聚合） | `statsStore.state` | 按需加载，数据量可控 |

**Store 内存上限建议**：
- 每个 Store 的 state 序列化后不超过 **500KB**
- 大型数据（章节内容、释义全文）通过 Service 层按需加载，加载后仅保留在组件局部 state 或引擎缓存中
- 使用 `shallowRef` 存储大型对象（如章节 DOM 引用），避免 Vue 深度代理开销

### 2.7 跨页面数据同步

**场景 1：阅读进度同步**

```
书架页 ←→ readerStore.currentSutraId
              ↓
         IndexedDB (progressStore)
              ↓
         阅读页恢复进度
```

- **写入时机**：用户离开阅读页（`beforeRouteLeave`）、章节切换时
- **读取时机**：点击书架卡片进入阅读页时
- **持久化方案**：`sutraStore.$subscribe()` 监听进度变化，自动写入 IndexedDB
- **冲突处理**：以最新写入为准（单机场景无多端冲突）

**场景 2：词典开关状态同步**

```
设置页 ←→ dictStore.enabledDictIds
              ↓
         IndexedDB (dict_config)
              ↓
         TrieManager 重建 → 阅读页高亮刷新
```

- **写入时机**：用户切换开关时立即写入
- **读取时机**：应用启动时从 IndexedDB 加载
- **通知机制**：`dictStore` 通过 `$subscribe` 触发 `TrieManager` 重建

**场景 3：功德统计**

- 阅读页 TTS 结束或手动标记完成后，调用 `statsStore.recordSession()`
- 统计数据页面进入时懒加载
- 每日首次诵读时从 IndexedDB 聚合计算

**推荐方案**：使用 Pinia 的 `$subscribe` + IndexedDB 持久化，不依赖第三方插件（保持包体积最小）。

### 2.8 Store 懒加载

**方案对比**：

| 方案 | 实现方式 | 优点 | 缺点 |
|------|---------|------|------|
| **动态 import** | `await import('@/stores/statsStore')` | 真正的按需加载，支持代码分割 | 需要异步处理，首次调用有延迟 |
| **延迟调用** | 不在 setup 顶层调用 `useStore()` | 简单，Pinia 自动处理 | Store 模块仍在初始 bundle 中 |
| **路由守卫预加载** | `router.beforeEach` 中加载对应 Store | 用户体验好（无感知） | 需要维护路由-Store 映射 |

**结论：v2.0 采用"动态 import + 路由预加载"组合策略**：

```javascript
// 路由配置：进入页面前预加载对应 Store
const routes = [
  {
    path: '/reader/:sutraId',
    component: () => import('@/pages/Reader.vue'),
    beforeEnter: async () => {
      // 预加载阅读相关 Store（不阻塞导航）
      import('@/stores/sutraStore')
      import('@/stores/readerStore')
    },
  },
  {
    path: '/stats',
    component: () => import('@/pages/Stats.vue'),
    beforeEnter: async () => {
      // 懒加载统计 Store（仅在进入统计页时加载）
      await import('@/stores/statsStore')
    },
  },
]
```

**各 Store 加载时机**：

| Store | 加载时机 | 方式 |
|-------|---------|------|
| `settingStore` | 应用启动时 | 同步 import（必需） |
| `dictStore` | 应用启动时 | 同步 import（构建 Trie 索引需要） |
| `sutraStore` | 进入书架/阅读页时 | 路由预加载 |
| `readerStore` | 进入阅读页时 | 路由预加载 |
| `statsStore` | 进入统计页时 | 动态 import（懒加载） |

## 3. 结论与建议

### 推荐的项目架构方案

```
┌─────────────────────────────────────────────────┐
│                    UI 层                          │
│  <script setup lang="js"> + Composition API      │
│  中粒度组件拆分（页面级 → 区域级 → 按需微组件）     │
│  provide/inject 仅限阅读器上下文 + 主题配置         │
├─────────────────────────────────────────────────┤
│                  Pinia Store 层                   │
│  按业务域拆分 5 个 Store                          │
│  sutraStore | dictStore | readerStore             │
│  settingStore | statsStore                       │
│  跨 Store 通信：在 action 中显式导入               │
│  懒加载：动态 import + 路由预加载                  │
├─────────────────────────────────────────────────┤
│                  Service 层                       │
│  SutraService | DictService | TTSService          │
│  SettingService | StatsService                   │
│  大型数据（章节内容、释义全文）在此层按需加载         │
│  内存缓存（LRU）管理释义查询结果                    │
├─────────────────────────────────────────────────┤
│                  Storage 层                       │
│  IndexedDB (idb 封装)                             │
│  File Cache (MDX 原文件)                          │
│  In-Memory Cache (Trie + LRU)                    │
└─────────────────────────────────────────────────┘
```

### 关键决策汇总

| 决策点 | 选择 | 理由 |
|--------|------|------|
| API 风格 | Composition API + `<script setup>` | 逻辑复用、TS 支持、官方推荐 |
| 组件拆分 | 中粒度 + 按需微组件 | 平衡复用与上下文，避免 props drilling |
| 跨层通信 | provide/inject 仅限阅读器上下文 | 轻量、避免状态管理混乱 |
| Store 划分 | 按业务域 5 个 Store | 职责清晰、独立打包、易于维护 |
| 大型数据 | 不放入 Store，由 Service 层管理 | 控制 Store 内存，按需加载 |
| 跨页面同步 | `$subscribe` + IndexedDB 持久化 | 自动同步、离线可用、无第三方依赖 |
| Store 懒加载 | 动态 import + 路由预加载 | 减少初始包体积，用户体验无感知 |

## 4. 对 v2.1 方案的影响

1. **v2.0 项目方案（PROJECT_V2_PLAN.md）中的 Store 划分完全正确**：`sutra`、`dict`、`reader`、`setting`、`stats` 五个 Store 按业务域划分，符合本次调研结论
2. **需补充的内容**：
   - 在 v2.0 方案中增加 "Store 懒加载策略" 章节，明确各 Store 的加载时机
   - 在 Service 层设计中明确 "大型数据不进入 Store" 的原则，章节内容应直接返回给组件局部 state
   - 在组件拆分规则中增加 provide/inject 的使用边界说明
   - 增加 `$subscribe` + IndexedDB 持久化的数据同步机制说明
3. **Trie 引擎与 Store 的关系**：TrieManager 实例不属于任何 Store，应由 DictService 持有，Store 仅保存 `enabledDictIds` 等元数据
4. **缓存策略细化**：释义缓存应由 DictService 内部管理（LRU），不放入 `dictStore.state`，避免 Store 膨胀和序列化开销

## 5. 参考资料

1. Vue 3 官方文档 - Composition API: https://vuejs.org/guide/extras/composition-api-faq.html
2. Pinia 官方文档 - 状态管理最佳实践: https://pinia.vuejs.org/
3. Vue 3 + Pinia 大型项目状态管理与组件复用实践 (CSDN, 2025-10)
4. Pinia 状态管理模式全面指南：替代 Vuex 的 5 大优势 + 7 个生产环境落地实践 (2025-11)
5. Vue3 组件通信方式全解析 (51CTO, 2026-03)
6. Vue3 中的 Provide/Inject 跨层级通信详解 (2025-08)
7. Readium-js-viewer 开源 EPUB 阅读器项目分析 (2025-06)
8. Thorium Reader 技术架构 - React + Redux + Electron (2026-02)
9. epub.js 库完整使用指南 - EPUB 解析与 Web 渲染 (2025-11)
10. 微信读书小程序 Vue 技术实战解析 (2026-03)
11. Pinia Store 懒加载实现方案 - 动态 import 与路由预加载 (2025-10)
12. Vue3 PDF 预览组件设计与实现分析 - Composition API + 分层架构 (2025-12)

---

*文档版本: v1.0*
*最后更新: 2026-05-02*
