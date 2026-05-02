# 般若佛经阅读器 v2.1 — 实施计划

> 基于：`docs/PROJECT_V2_PLAN.md`、`docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md`、`docs/plans/2026-05-02-v2-dictionary-architecture-design.md`
> 决策记录：Trie 轻量索引（6.1）、MDX 全部预解析+切割（6.2）、流式加载+3 展示模式（6.3）、每次启动重建 Trie（6.4）、单一 Trie+运行时过滤（6.5）、Markdown+markdown-it（D15）
> 已有决策：D1-D14、D16-D22 见 `DICTIONARY_OPTIMIZATION_DISCUSSION.md` 第五章

---

- [ ] 1. 初始化 v2.1 项目骨架与构建配置
   - 从零创建 Vue 3 + Vite 5 项目结构（`npm create vite@latest`，选 Vue + JavaScript）
   - 配置 `vite.config.js`：路径别名 `@` → `src/`、`allowedHosts: ['.monkeycode-ai.online']`、`define: { global: 'globalThis' }`、`optimizeDeps.include: ['mdict-ts']`、`commonjsOptions.transformMixedEsModules: true`
   - 安装核心依赖：`vue@^3.4.0`、`vue-router@^4.3.0`、`pinia@^2.1.7`、`vant@^4.8.0`、`idb@^7.x`
   - 安装词典/解析依赖：`mdict-js@^10.x`、`lzo-wasm@^0.0.4`、`markdown-it`、`turndown`
   - 安装工具依赖：`@vueuse/core@^10.7.0`、`sass@^1.69.0`
   - 配置 ESLint（`.eslintrc.cjs`）：`--ext .vue,.js,.ts --fix`
   - 创建 `src/router/index.js`：路由 `/`（书架）、`/reader/:id`（阅读页）、`/dict-manager`（词典管理）、`/settings`（设置）、`/stats`（统计）
   - 创建 `src/main.js`（应用入口）、`src/App.vue`（根组件）、`index.html`（HTML 入口）
   - 创建 `vercel.json`：buildCommand、outputDirectory `dist`、SPA 重写 `/(.*) → /index.html`
   - 验证：`npm run dev` 启动成功，`npm run build` 构建成功

- [ ] 2. 实现 IndexedDB 存储层
   - [ ] 2.1 创建 `src/storage/db.js` — 数据库初始化
     - 使用 `idb` 的 `openDB()` 创建数据库 `buddhist-reader`，版本 1
     - 定义 13 张表：`sutra_index`、`sutra_content`、`dict_index`、`dict_entries`、`dict_chunks`、`dict_term_lookup`、`dict_config`、`reading_progress`、`reading_stats`、`bookmarks`、`user_notes`、`dict_versions`、`settings`
     - `dict_index`：复合索引 `[term, dict_id]`
     - `dict_entries`：主键 `key`（格式 `{dictId}::{term}`）
     - `dict_term_lookup`：复合索引 `[term, dict_id]`
     - `dict_config`：主键 `dict_id`
     - `reading_progress`：主键 `progress::{sutraId}`
     - `bookmarks`：主键 `bm::{autoId}`，索引 `sutra_id`
     - `user_notes`：主键 `note::{autoId}`，索引 `entry_key`，预留 `original_checksum` 字段（D13 备用）
     - `settings`：主键 `key`（key-value 表）

   - [ ] 2.2 创建 `src/storage/sutraStore.js` — 经书表操作
     - `getSutraList()`、`getSutra(id)`、`getChapter(sutraId, chapterIndex)`
     - `saveSutra(sutra, chapters)`：事务写入 `sutra_index` + `sutra_content`
     - `deleteSutra(id)`：级联删除

   - [ ] 2.3 创建 `src/storage/dictStore.js` — 词典表操作
     - `getDictIndex()`、`getDictIndexByDictId(dictId)`
     - `getDictEntry(key)`、`getDictEntryByChunk(term, dictId)`（通过 lookup 表路由）
     - `bulkPutDictEntries(entries)`、`getDictConfig()`、`saveDictConfig(config)`
     - `deleteDict(dictId)`：清理 index + entries + chunks + lookup + config
     - `saveChunkManifest(chunk)`、`saveTermLookup(lookups)`

   - [ ] 2.4 创建 `src/storage/progressStore.js` — 阅读进度
     - `saveProgress(sutraId, chapter, position, readTime)`
     - `getProgress(sutraId)`、`getAllProgress()`

   - [ ] 2.5 创建 `src/storage/settingStore.js` — 设置
     - `saveSetting(key, value)`、`getSetting(key)`、`getAllSettings()`

   - [ ] 2.6 创建 `src/storage/statsStore.js` — 功德统计
     - `recordSession(sutraId, duration)`
     - `getStats(period)`：按天/周/月聚合
     - `getStreak()`：连续诵读天数

   - [ ] 2.7 创建 `src/storage/bookmarkStore.js` — 书签
     - `addBookmark(sutraId, chapter, position, note)`
     - `getBookmarks(sutraId)`、`deleteBookmark(id)`、`updateBookmark(id, updates)`

   - [ ] 2.8 创建 `src/storage/noteStore.js` — 用户笔记
     - `saveNote(entryKey, note, originalChecksum)`
     - `getNote(entryKey)`、`deleteNote(entryKey)`

   - [ ] 2.9 创建 `src/storage/fileCache.js` — 文件缓存
     - `cacheFile(fileId, blob)`、`getFile(fileId)`、`deleteFile(fileId)`

   - [ ]* 2.10 为存储层编写单元测试
     - 每个 store 的 CRUD 测试
     - 事务回滚测试
     - 10万条 dict_entries 批量写入性能测试

- [ ] 3. 检查点 — 确保存储层所有测试通过，如有疑问请询问用户

- [ ] 4. 实现 Service 层（数据访问抽象）
   - [ ] 4.1 创建 `src/services/dictService.js` — 词典服务
     - 接口（预留后端 API 切换）：`init()`、`getEnabledDicts()`、`getAllDicts()`、`toggleDict(dictId, enabled)`、`lookupTerm(term, dictIds)`、`lookupBatch(term, options)`、`importDict(file, options)`、`deleteDict(dictId)`、`getDictVersions(dictId)`、`getDictHealthReport(dictId)`、`setUserNote(entryKey, note)`、`getUserNote(entryKey)`
     - `init()`：读 `dict_index` → 构建 Trie → 读 `dict_config` → 初始化 `enabledDictIds`
     - `lookupTerm(term, dictId)`：内存缓存 → `dict_entries` 查询 → 写缓存 → 合并 `user_notes`（D10）
     - `lookupBatch(term, options)`：并行查询，支持 3 种展示模式（6.3）
     - `toggleDict(dictId, enabled)`：更新 `dict_config` → 更新 `enabledDictIds` → 触发高亮刷新事件（D7 立即生效）
     - `getDictHealthReport(dictId)`：最简版 — 词条总数 + 与内置词典重复数（D11 首版）

   - [ ] 4.2 创建 `src/services/sutraService.js` — 经书服务
     - `getSutraList()`、`getSutra(id)`、`getChapter(sutraId, chapterIndex)`
     - `importSutra(file, metadata)`：解析文本 → 按章节分割 → 写入 DB

   - [ ] 4.3 创建 `src/services/progressService.js` — 进度服务
     - 包装 `progressStore`，添加自动保存防抖（30s）

   - [ ] 4.4 创建 `src/services/statsService.js` — 统计服务
     - 包装 `statsStore`，实现连续天数计算

   - [ ] 4.5 创建 `src/services/ttsService.js` — TTS 服务
     - 封装 Web Speech API：`init()`、`speak(text, options)`、`pause()`、`resume()`、`stop()`
     - 语速/音调/音量控制，中文语音选择，断句处理（按标点分段）

- [ ] 5. 检查点 — 确保 Service 层接口可通过测试调用，如有疑问请询问用户

- [ ] 6. 实现 Trie 引擎（动态版本）
   - [ ] 6.1 创建 `src/engine/trie/node.js` — Trie 节点
     - `class TrieNode`：`children`（Map<char, TrieNode>）、`isEnd`（boolean）、`dictIds`（array）、`pinyin`（string, 可选）、`category`（string, 可选）
     - 对应决策 6.1（轻量索引）

   - [ ] 6.2 创建 `src/engine/trie/index.js` — Trie 树
     - `class Trie`：`build(terms)` 从 `[{term, dictId, pinyin, category}]` 批量构建
     - `search(text)` 返回 `[{term, start, end, dictIds, pinyin, category}]`
     - `destroy()` 清空释放内存
     - 接口设计预留未来切换分层 Trie（通过 `ITrieEngine` 抽象，决策 6.5）

   - [ ] 6.3 创建 `src/engine/trie/merger.js` — Trie 管理器
     - `class TrieManager`：管理 Trie 生命周期
     - `rebuild(dictIndexEntries)`：从 `dict_index` 数据重建（每次启动调用，决策 6.4）
     - `searchAll(text, enabledDictIds)`：搜索后按 `enabledDictIds` 运行时过滤（决策 6.5）
     - `deduplicate(matches)`：长词优先去重
     - `getEnabledTermCount(enabledDictIds)`：计算启用词条数（用于开关提示，D12）

   - [ ] 6.4 创建 `src/engine/highlighter.js` — 高亮引擎
     - `highlight(text, matches)`：文本 + 匹配结果 → 带 `<mark>` 标签的 HTML
     - 多词典颜色区分（颜色映射表）
     - 嵌套/重叠词条处理（长词优先）
     - 标点符号边界处理
     - 高亮与文本选择（selection）冲突处理

   - [ ] 6.5 创建 `src/engine/pinyin.js` — 拼音标注引擎
     - 加载 `src/data/pronunciationMap.js`
     - `annotate(text)`：为术语添加拼音标注

   - [ ]* 6.6 为 Trie 引擎编写单元测试
     - Trie 构建和搜索正确性
     - 长词优先去重
     - 运行时过滤逻辑
     - 10万词条构建时间和内存占用

- [ ] 7. 检查点 — 确保 Trie 引擎测试通过，如有疑问请询问用户

- [ ] 8. 实现 MDX 词典解析与导入
   - [ ] 8.1 创建 `src/engine/mdxParser.js` — MDX 解析器
     - 使用 `mdict-js` + `lzo-wasm` 解析 .mdx
     - `parseMdx(file)` → `[{term, definition}]`
     - `getMdxHeadwords(file)` → 词头列表（用于索引）
     - 对应决策 6.2（全部预解析）

   - [ ] 8.2 创建 `src/services/dictImporter.js` — 词典导入服务
     - `importJSON(file)`：解析 → 标准化 → 写入 DB
     - `importCSV(file)`：解析 → 标准化 → 写入 DB
     - `importMDX(file)`：预解析 → 切割 → 写入 DB

   - [ ] 8.3 实现词典切割逻辑
     - 单文件上限 10MB 检查（D18）
     - 解析后数据按 2MB/块切割（逐条累加，接近上限切块）
     - 单条释义超 2MB 则单独成块
     - 生成 `dict_chunks` 元数据 + `dict_term_lookup` 路由表
     - 所有释义通过 `turndown` 从 HTML 转 Markdown（D15）

   - [ ] 8.4 实现词典导入流程
     - 文件类型检测（扩展名 + 内容检测）
     - 大文件上传进度显示（Web Worker 中解析）
     - 导入前校验（格式、重复词典名）
     - 导入后生成体检报告（词条总数 + 与内置词典重复数，D11 首版）
     - 导入失败回滚（事务）
     - 默认启用新词典（D9）
     - 重复上传创建新版本（D14）

   - [ ]* 8.5 为 MDX 解析编写单元测试
     - MDX 文件解析正确性
     - HTML→Markdown 转换准确性
     - 切割逻辑边界条件

- [ ] 9. 实现 Pinia 状态管理
   - [ ] 9.1 创建 `src/stores/dict.js` — 词典状态
     - state：`dicts`、`enabledDictIds`（Set）、`trieReady`、`displayMode`（'all-collapsed' | 'first-expanded' | 'all-expanded'）
     - actions：`initDicts()`、`toggleDict(dictId, enabled)`、`setDictionaryDisplayMode(mode)`、`refreshHighlight()`
     - 持久化：`enabledDictIds` 和 `displayMode` 同步到 `settings` store

   - [ ] 9.2 创建 `src/stores/sutra.js` — 经书状态
     - state：`sutraList`、`currentSutra`、`currentChapter`、`loadStatus`
     - actions：`loadSutraList()`、`selectSutra(id)`、`loadChapter(index)`

   - [ ] 9.3 创建 `src/stores/reader.js` — 阅读器状态
     - state：`content`、`highlightedContent`、`position`、`fontSize`、`lineHeight`、`theme`（light/dark/warm）
     - actions：`setContent(html)`、`applyHighlight()`、`savePosition()`、`setFontSettings(settings)`

   - [ ] 9.4 创建 `src/stores/setting.js` — 全局设置
     - state：`settings`（key-value）
     - actions：`save(key, value)`、`get(key)`、`loadAll()`
     - 与 IndexedDB `settings` 表同步

   - [ ] 9.5 创建 `src/stores/stats.js` — 功德统计
     - state：`stats`、`streak`
     - actions：`recordSession()`、`loadStats(period)`

- [ ] 10. 检查点 — 确保 Pinia store 状态流转正确，如有疑问请询问用户

- [ ] 11. 实现页面组件
   - [ ] 11.1 创建 `src/pages/Bookshelf.vue` — 书架页
     - 网格布局：手机单列、平板双列、PC 三列
     - 每本书：封面、标题、作者、阅读进度
     - 排序：最近阅读、字母顺序
     - 点击跳转阅读页（`/reader/:id`）

   - [ ] 11.2 创建 `src/pages/Reader.vue` — 阅读页
     - 经文内容展示 + 高亮渲染（调用 `highlighter.highlight()`）
     - 点击高亮词条 → 弹出 `DictionaryPopup`
     - 字体大小、行间距、主题切换
     - 目录导航侧栏
     - 阅读进度自动保存（防抖 30s，D16 高亮与进度解耦）
     - TTS 播放控制栏

   - [ ] 11.3 创建 `src/pages/DictManager.vue` — 词典管理页
     - 词典列表：名称、类型（官方/个人，D19）、词条数、开关
     - Vant Switch 滑动开关，立即生效（D7）
     - 关闭时显示受影响词条数："关闭后将少高亮 X 个词条"（D12）
     - 全部启用 / 全部禁用按钮
     - 导入词典入口（JSON/CSV/MDX）
     - 删除词典（二次确认）
     - 版本历史展示（D14）
     - 上传后体检报告弹窗（D11）

   - [ ] 11.4 创建 `src/pages/Settings.vue` — 设置页
     - 阅读设置：字体大小、行间距、主题
     - 词典设置：展示模式下拉框（全部折叠 / 展开第一个 / 全部展开，对应 6.3）
     - 显示设置：夜间模式、护眼模式
     - 数据管理：导出/导入数据、清理缓存、重置
     - 设置持久化到 `settings` store（D6 本地持久化）

   - [ ] 11.5 创建 `src/pages/Stats.vue` — 功德统计页
     - 统计维度切换：天/周/月/年
     - 可视化图表（Chart.js 或 ECharts）
     - 连续诵读天数
     - 数据导出

- [ ] 12. 实现核心交互组件
   - [ ] 12.1 创建 `src/components/reader/DictionaryPopup.vue` — 释义弹窗
     - 跟随高亮词条定位（浮动卡片）
     - 流式加载：先返回的先渲染（6.3）
     - 3 种展示模式（设置可选）：
       - 全部折叠：列词典名，点击展开
       - 展开第一个（默认）：第一个直接渲染，其余折叠为"另有 N 个释义"
       - 全部展开：逐个追加展开
     - Markdown 渲染（markdown-it，`html: true`，D15）
     - 用户笔记入口（底部"添加笔记"按钮，D10）
     - 移动端适配：底部抽屉样式

   - [ ] 12.2 创建 `src/components/reader/NoteEditor.vue` — 笔记编辑器
     - 轻量 Markdown 编辑框 + 预览模式
     - 保存到 `user_notes` 表
     - 与原始释义分离存储（D10 笔记层不破坏原数据）

   - [ ] 12.3 创建 `src/components/reader/TTSControl.vue` — TTS 控制栏
     - 播放/暂停/停止、语速滑块、当前诵读段落高亮

   - [ ] 12.4 创建 `src/components/common/Toast.vue` — 全局提示
     - 成功/失败/加载中，自动消失

   - [ ] 12.5 创建 `src/components/common/Loading.vue` — 加载指示器
     - 骨架屏 + 加载动画

- [ ] 13. 检查点 — 确保页面可运行、交互流畅，如有疑问请询问用户

- [ ] 14. 实现 v1.0 数据迁移
   - [ ] 14.1 创建 `src/services/migration.js` — 迁移服务
     - `migrateFromV1()`：检测 `settings.migrated` 标记
     - 迁移阅读进度：`localStorage` → `reading_progress`
     - 迁移用户设置：`localStorage` → `settings` 表
     - 迁移用户词典：`userDictStorage` → `dict_entries` + `dict_index` + `dict_config`
     - 完成后标记 `settings.migrated = true`

   - [ ] 14.2 创建 `src/data/builtinDictionary.js` — 内置词典数据
     - 从 v1.0 `dictionary.js` 迁移 50+ 条术语
     - 格式：`{term, pinyin, definition, category}`
     - 首次启动写入 `dict_entries` + `dict_index`

   - [ ] 14.3 创建 `src/data/sutraManifest.js` — 经书清单
     - 从 v1.0 `sutras.js` 迁移元数据
     - 格式：`{id, title, fullName, translator, chapters}`

   - [ ] 14.4 创建 `src/data/pronunciationMap.js` — 读音映射
     - 从 v1.0 迁移佛教术语专属读音

- [ ] 15. 实现禅意 UI 主题系统
   - [ ] 15.1 定义 CSS 变量（设计 tokens）
     - 色彩：主色（温暖棕）、辅助色、语义色
     - 字体：中文字体栈、梵文字体
     - 间距：4px 基准，圆角、阴影

   - [ ] 15.2 实现主题切换
     - 亮色（默认）、暗色、护眼模式（暖色调）

   - [ ] 15.3 Vant 主题覆盖
     - 覆盖 Vant 默认配色为禅意风格
     - 按需引入 Vant 组件（减少 bundle）

- [ ] 16. 检查点 — 确保主题切换正常、禅意风格一致，如有疑问请询问用户

- [ ] 17. 实现错误处理与降级
   - [ ] 17.1 全局错误边界
     - Vue `errorCaptured` 钩子 + `window.onerror`

   - [ ] 17.2 数据加载失败重试
     - IndexedDB 查询失败 → 重试 2 次 → 降级提示

   - [ ] 17.3 IndexedDB 不可用降级
     - 检测可用性 → 降级到 `localStorage`（仅基础功能）

   - [ ] 17.4 用户友好的错误提示
     - 网络错误、存储空间不足、文件格式错误

- [ ] 18. 性能优化
   - [ ] 18.1 路由级代码分割
     - `import()` 懒加载各页面

   - [ ] 18.2 词典导入 Web Worker
     - MDX 解析 + 切割逻辑放入 Worker，不阻塞主线程

   - [ ] 18.3 释义缓存策略
     - LRU 缓存，上限 1000 条

   - [ ] 18.4 构建优化
     - `rollup-plugin-visualizer` 分析产物
     - 确保首屏 bundle < 200KB（gzip）

- [ ] 19. 检查点 — 确保性能达标（首屏 < 1s，高亮 < 50ms），如有疑问请询问用户

- [ ] 20. 配置部署与 CI/CD
   - [ ] 20.1 优化 `vercel.json`
     - buildCommand、outputDirectory、SPA 重写

   - [ ] 20.2 构建产物大小监控
     - 添加 `npm run build:analyze` 脚本

   - [ ] 20.3 预提交检查
     - `npm run lint` 自动执行

- [ ] 21. 最终检查点 — 确保全部功能完整、测试通过、构建成功，如有疑问请询问用户
