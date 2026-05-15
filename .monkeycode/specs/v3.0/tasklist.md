# 需求实施计划

> 基于设计文档：docs/plans/2026-05-03-v3.0-architecture-design.md

- [x] 1. 项目搭建与基础配置
  - 创建 `package.json`，声明 Vue 3 + Vite + Pinia + Vue Router 依赖（参考 §3.1 技术栈）
  - 创建 `vite.config.js`，配置 `host: true`、`allowedHosts: ['.monkeycode-ai.online']`、路由懒加载代码分割（参考 §8.1、AGENTS.md Vite Gotchas）
  - 创建 `index.html`，引入 `src/main.js`，设置 viewport meta（参考 §10.1）
  - 创建 `src/main.js`，创建 Vue 实例、注册 Pinia + Router、配置 `app.config.errorHandler`（参考 §9.3）
  - 创建 `src/App.vue`，根组件仅包含 `<router-view>`（参考 §3.2）
  - 创建 `src/router/index.js`，配置 `/`（书架）和 `/reader/:id`（阅读）路由，阅读页使用懒加载（参考 §3.2、§8.1）
  - 安装依赖并验证 `npm run dev` 正常启动

- [x] 2. 样式系统与主题基础
  - 创建 `src/styles/tokens.css`，从 `archive/v2.0/src/styles/tokens.css` 复用颜色、间距、排版、圆角 tokens（参考 §6.1、Reusable Assets）
  - 创建 `src/styles/base.css`，定义基础 HTML 样式、链接、列表、零阴影禅意风格（参考 §3.2）
  - 创建 `src/styles/themes.css`，定义 `[data-theme="night"]`、`[data-theme="eye-care"]`、`[data-theme="paper"]` 主题变量（参考 §6.1、§6.2）
  - 在 `src/main.js` 中 import tokens.css → base.css → themes.css（参考 §3.2）

- [x] 3. 检查点 - 确保项目能启动且样式基础生效
  - 确保 `npm run dev` 正常运行
  - 确保 CSS 变量在浏览器中正确渲染
  - 如有疑问请询问用户

- [x] 4. 书架页面
  - 创建 `src/stores/sutra.js`，定义 sutraStore：经书列表、当前经书、章节数据，fetch manifest.json 和经书 JSON（参考 §3.3 Store 边界、§4.1 数据流）
  - 创建 `src/components/bookshelf/SutraCard.vue`，卡片式展示标题、作者、分类标签（粉彩）、字数（参考 §2.1、§7.2）
  - 创建 `src/pages/Bookshelf.vue`，组合 SutraCard 列表 + 分类筛选栏（全部/般若/唯识/禅宗/密咒/通论/传记）（参考 §2.1）
  - 实现分类筛选逻辑，sutraStore 按 category 过滤经书列表（参考 §2.1）
  - 实现点击经书卡片跳转到 `/reader/:id`（参考 §4.1）
  - 实现加载骨架屏：经书列表加载时显示 skeleton 占位（参考 §9.2）
  - 实现加载失败状态：显示错误信息 + 重试按钮（参考 §9.1、§9.2）

- [x] 5. 阅读页面基础
  - 创建 `src/stores/reader.js`，定义 readerStore：滚动位置、书签列表、阅读时长、当前章节，换经书时重置（参考 §3.3 Store 边界）
  - 创建 `src/stores/settings.js`，定义 settingsStore：字体大小、行间距、主题偏好，持久化到 localStorage（参考 §3.3、§4.3）
  - 创建 `src/composables/useSutraLoader.js`，封装 fetch 经书 manifest + 内容的异步逻辑（参考 §4.1）
  - 创建 `src/composables/useReadingProgress.js`，封装阅读进度保存/恢复逻辑，滚动节流 500ms，localStorage 存储（参考 §4.3、§8.2）
  - 创建 `src/utils/storage.js`，封装 localStorage 读写，含满时降级处理（参考 §9.1 localStorage 满、§3.2）
  - 创建 `src/components/reader/ReaderHeader.vue`，显示经书标题 + 返回按钮 + 目录/设置入口（参考 §7.1）
  - 创建 `src/components/reader/ReaderContent.vue`，渲染经文内容，支持连续滚动（参考 §2.2、§7.1）
  - 创建 `src/components/reader/ReaderProgress.vue`，底部进度条显示当前阅读位置百分比（参考 §2.2、§7.1）
  - 创建 `src/components/reader/ReaderTOC.vue`，侧边目录面板，点击章节跳转到对应位置（参考 §2.2）
  - 创建 `src/pages/Reader.vue`，组合所有 reader 组件（参考 §7.1）
  - 实现打开经书时自动恢复上次阅读位置（参考 §4.3）
  - 实现阅读失败重试：fetch 失败最多重试 2 次，失败后显示错误状态（参考 §9.4）

- [x] 6. 检查点 - 确保书架和阅读基础功能完整
  - 确保书架页面能显示 30 部经书、分类筛选正常
  - 确保阅读页面能连续滚动、进度条工作、目录跳转正常
  - 确保阅读进度保存/恢复正常
  - 如有疑问请询问用户

- [x] 7. 词典系统（核心功能）
  - 创建 `scripts/build-dict-index.cjs`，构建时扫描 `public/dicts/*.json` 提取所有 term + dictId，生成 `src/data/dictIndex.js`（参考 §4.2、§5.1）
  - 在 `vite.config.js` 中配置 build 前执行 dictIndex 构建脚本（参考 §5.1）
  - 创建 `src/stores/dict.js`，定义 dictStore：dictIndex 索引、释义缓存、词典启用/禁用状态（参考 §3.3、§4.2）
  - 创建 `src/composables/useDictLoader.js`，封装词典按需 fetch 逻辑，含缓存策略（5 分钟过期）和并行查询（参考 §4.2、§5.3、§8.2）
  - 创建 `src/composables/useHighlighter.js`，实现文本高亮：遍历 dictIndex 长词优先匹配，输出 `<span class="dict-highlight">` 包裹的 HTML（参考 §5.2）
  - 修改 `ReaderContent.vue`，集成 useHighlighter 对经文进行术语高亮渲染（参考 §4.1、§5.2）
  - 创建 `src/components/dict/DictPopup.vue`，底部释义弹窗：显示词条 + 多词典释义，先返回先显示（参考 §2.3、§7.1）
  - 实现点击高亮词查释义：点击 `.dict-highlight` 触发 dictStore 查询，弹出 DictPopup（参考 §2.3、§4.2）
  - 实现长按选词查释义：浏览器原生选中文本后显示"查释义"浮动按钮（参考 §2.3、§4.2）
  - 实现多词典并行查询结果合并显示（参考 §2.3）
  - 实现词典管理：启用/禁用某部词典，禁用后不参与高亮和查询（参考 §2.3）
  - 实现词典查询失败处理：禁用该词典 + Toast 提示，自动从缓存加载（参考 §9.1）

- [x] 8. 检查点 - 确保词典系统核心功能完整
  - 确保 dictIndex 构建脚本正常运行
  - 确保经文术语自动高亮
  - 确保点击/长按查释义正常
  - 确保多词典并行查询工作
  - 如有疑问请询问用户

- [x] 9. 阅读增强功能
  - 创建 `src/composables/useTheme.js`，实现主题切换：设置 `data-theme` 属性 + localStorage 持久化（参考 §6.2）
  - 创建 `src/components/reader/ReaderSettings.vue`，阅读设置面板：字体大小、行间距、主题切换控件（参考 §2.2、§7.1）
  - 创建 `src/components/common/ThemeToggle.vue`，主题切换按钮组件（参考 §3.2）
  - 实现字体大小调整：4 级（小/中/大/特大），修改 CSS 变量 `--text-body`（参考 §2.2）
  - 实现行间距调整：3 级（紧凑/舒适/宽松），修改 CSS 变量 `--leading-body`（参考 §2.2）
  - 实现背景色/主题切换：日间/夜间/护眼/宣纸 4 种主题（参考 §6.1、§2.2）
  - 创建 `src/components/reader/ReaderSearch.vue`，全文搜索面板：输入关键词、定位结果、高亮搜索词（参考 §2.2）
  - 实现全文搜索逻辑：当前经书内搜索，结果列表可点击定位（参考 §2.2）
  - 实现书签功能：添加/删除书签，书签列表侧边面板（参考 §2.2）

- [x] 10. 笔记与统计
  - 创建 `src/components/reader/ReaderNotes.vue`，笔记面板：选中文字添加批注（参考 §2.2、§7.1）
  - 实现笔记/批注功能：选中文字后弹出笔记输入框，保存到 localStorage（参考 §2.2）
  - 实现阅读时长统计：进入阅读页开始计时，离开时累计保存（参考 §2.2）

- [x] 11. 词典管理页面
  - 创建 `src/pages/DictManager.vue`，词典管理页面：显示 3 部词典、启用/禁用开关、词典信息（参考 §2.3）
  - 在 `src/router/index.js` 中添加 `/dicts` 路由（参考 §3.2）
  - 实现词典启用/禁用持久化到 localStorage（参考 §3.3 dictStore）

- [ ] 12. 检查点 - 确保所有功能完整可用
  - 确保字体/行间距/主题调整正常
  - 确保全文搜索和书签功能正常
  - 确保笔记和阅读时长统计正常
  - 确保词典管理页面正常
  - 如有疑问请询问用户

- [ ] 13. 测试与优化
  - 配置 Vitest + @vue/test-utils，添加 `npm run test` 脚本（参考 §7 Phase 7）
  - 编写 dictIndex 构建脚本单元测试：验证索引格式正确、长词优先、中文编码处理（参考 §5.1）
  - 编写 useHighlighter 单元测试：验证高亮输出 HTML 格式、长词优先匹配、无匹配时不修改原文（参考 §5.2）
  - 编写 useReadingProgress 单元测试：验证进度保存/恢复、滚动节流、localStorage 满时降级（参考 §4.3、§9.1）
  - 实现滚动节流优化：滚动事件 throttle 100ms（参考 §8.2）
  - 实现路由懒加载代码分割：阅读页和书架页分开打包（参考 §8.1）
  - 实现移动端适配：CSS 响应式布局，触摸目标 44px 最小（参考 §7 Phase 7、tokens.css §7）
  - 实现网络断开检测：显示离线横幅，允许阅读已加载内容（参考 §9.1）
  - 运行 `npm run lint` 修复所有 ESLint 问题（参考 AGENTS.md ESLint）
  - 运行 `npm run build` 验证构建成功（参考 §10.1）

- [ ] 14. 检查点 - 最终验证
  - 确保 `npm run lint` 无错误
  - 确保 `npm run build` 成功
  - 确保 `npm run test` 所有测试通过
  - 确保移动端显示正常
  - 如有疑问请询问用户