# v3.0 实现任务清单

> 基于设计文档：docs/plans/2026-05-03-v3.0-architecture-design.md

## Phase 1: 项目搭建

- [ ] **1.1** 创建 package.json（Vue 3 + Vite + Pinia + Vue Router）
- [ ] **1.2** 创建 vite.config.js（host/allowedHosts/globalThis 等配置）
- [ ] **1.3** 创建 index.html（HTML 入口）
- [ ] **1.4** 创建 src/main.js（Vue 实例、路由、Pinia 注册）
- [ ] **1.5** 创建 src/App.vue（根组件）
- [ ] **1.6** 创建 src/router/index.js（路由配置：/ 和 /reader/:id）
- [ ] **1.7** 安装依赖并验证开发服务器运行

## Phase 2: 书架页面

- [ ] **2.1** 创建 src/stores/sutra.js（经书数据 Store）
- [ ] **2.2** 创建 src/components/bookshelf/SutraCard.vue（经书卡片组件）
- [ ] **2.3** 创建 src/pages/Bookshelf.vue（书架页面）
- [ ] **2.4** 实现经书列表加载（fetch manifest.json）
- [ ] **2.5** 实现分类筛选（全部/般若/禅宗/密咒/通论/传记）
- [ ] **2.6** 点击经书跳转到阅读页面

## Phase 3: 阅读页面基础

- [ ] **3.1** 创建 src/stores/reader.js（阅读状态 Store）
- [ ] **3.2** 创建 src/composables/useSutraLoader.js（经书加载逻辑）
- [ ] **3.3** 创建 src/components/reader/ReaderHeader.vue（顶部标题栏）
- [ ] **3.4** 创建 src/components/reader/ReaderContent.vue（经文内容）
- [ ] **3.5** 创建 src/components/reader/ReaderProgress.vue（进度条）
- [ ] **3.6** 创建 src/components/reader/ReaderTOC.vue（目录面板）
- [ ] **3.7** 创建 src/pages/Reader.vue（阅读页面组合）
- [ ] **3.8** 实现连续滚动阅读
- [ ] **3.9** 实现进度条显示
- [ ] **3.10** 实现目录跳转
- [ ] **3.11** 实现阅读进度保存（localStorage）

## Phase 4: 词典系统（核心）

- [ ] **4.1** 创建 src/stores/dict.js（词典数据 Store）
- [ ] **4.2** 创建 src/composables/useDictLoader.js（词典加载逻辑）
- [ ] **4.3** 创建 src/composables/useHighlighter.js（文本高亮逻辑）
- [ ] **4.4** 实现词典索引生成（构建时扫描 public/dicts/*.json）
- [ ] **4.5** 实现经文术语自动高亮
- [ ] **4.6** 创建 src/components/dict/DictPopup.vue（释义弹窗）
- [ ] **4.7** 实现点击高亮词查释义
- [ ] **4.8** 实现长按选词查释义
- [ ] **4.9** 实现多词典并行查询
- [ ] **4.10** 实现词典启用/禁用管理

## Phase 5: 阅读增强

- [ ] **5.1** 创建 src/stores/setting.js（设置 Store）
- [ ] **5.2** 创建 src/composables/useTheme.js（主题管理）
- [ ] **5.3** 创建 src/styles/tokens.css（设计 tokens）
- [ ] **5.4** 创建 src/styles/themes.css（主题变量）
- [ ] **5.5** 创建 src/components/reader/ReaderSettings.vue（阅读设置面板）
- [ ] **5.6** 实现字体大小调整
- [ ] **5.7** 实现行间距调整
- [ ] **5.8** 实现背景色/主题切换（日间/夜间/护眼/宣纸）
- [ ] **5.9** 实现搜索全文
- [ ] **5.10** 实现书签功能

## Phase 6: 笔记与统计

- [ ] **6.1** 创建 src/components/reader/ReaderNotes.vue（笔记面板）
- [ ] **6.2** 实现笔记/批注功能
- [ ] **6.3** 实现阅读时长统计

## Phase 7: 联调优化

- [ ] **7.1** 移动端适配
- [ ] **7.2** 性能优化（滚动节流、懒加载）
- [ ] **7.3** 错误处理（加载失败、网络断开）
- [ ] **7.4** 代码规范检查（ESLint）
- [ ] **7.5** 构建验证
