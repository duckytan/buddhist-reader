# v3.1 实施任务列表

## Phase 1: 框架搭建

- [x] 1.1 创建 AppShell 组件（Tab 框架容器，嵌套路由父组件）
- [x] 1.2 创建 AppTabBar 组件（响应式 Tab 栏，4 个禅意图标）
- [x] 1.3 调整路由配置（嵌套路由，AppShell 作为父组件）
- [x] 1.4 Bookshelf 适配 AppShell（移除自建 header）
- [x] 1.5 Reader 返回逻辑优化（query.from 智能返回）
- [x] 1.6 Reader 滚动位置保存/恢复（localStorage，替代 KeepAlive）

## Phase 2: 词典搜索页

- [ ] 2.1 创建 dictSearchEngine.js（四级匹配引擎）
- [ ] 2.2 创建 useDictSearch.js（搜索 composable）
- [ ] 2.3 创建 DictSearch.vue 页面
- [ ] 2.4 低端设备性能优化（debounce、释义搜索限制）

## Phase 3: 笔记页

- [ ] 3.1 创建 stores/notes.js（从 ReaderNotes 抽离笔记 Store）
- [ ] 3.2 创建 Notes.vue 页面
- [ ] 3.3 实现笔记搜索与筛选
- [ ] 3.4 跳转阅读器定位功能（携带 from 参数）
- [ ] 3.5 笔记编辑/删除交互

## Phase 4: 设置页

- [ ] 4.1 创建 Settings.vue 页面（整合主题、阅读、词典管理）
- [ ] 4.2 精简 ReaderSettings（3 项 + 更多设置跳转）
- [ ] 4.3 导出笔记功能（JSON 格式）

## Phase 5: 测试与优化

- [ ] 5.1 单元测试（搜索引擎、笔记 Store）
- [ ] 5.2 响应式适配测试
- [ ] 5.3 ESLint + 手动测试
