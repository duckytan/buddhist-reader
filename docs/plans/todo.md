# 般若佛经阅读器 v2.1 — 实施计划

> 基于：`docs/PROJECT_V2_PLAN.md`、`docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md`、`docs/plans/2026-05-02-v2-dictionary-architecture-design.md`
> 决策记录：Trie 轻量索引（6.1）、MDX 全部预解析+切割（6.2）、流式加载+3 展示模式（6.3）、每次启动重建 Trie（6.4）、单一 Trie+运行时过滤（6.5）、Markdown+markdown-it（D15）

---

- [ ] 1. 初始化 v2.1 项目骨架与构建配置
   - 从零创建 Vue 3 + Vite 5 项目结构（`npm create vite@latest`，选 Vue + JavaScript）
   - 配置 `vite.config.js`：路径别名 `@` → `src/`、`allowedHosts: ['.monkeycode-ai.online']`、`define: { global: 'globalThis' }`、`optimizeDeps.include: ['mdict-ts']`、`commonjsOptions.transformMixedEsModules: true`
   - 安装依赖：`vue@^3.4.0`、`vue-router@^4.3.0`、`pinia@^2.1.7`、`vant@^4.8.0`、`idb@^7.x`、`mdict-js@^10.x`、`lzo-wasm@^0.0.4`、`@vueuse/core@^10.7.0`、`sass@^1.69.0`
   - 安装渲染/转换依赖：`markdown-it`（`html: true`）、`turndown`（HTML→Markdown）
   - 配置 ESLint（`.eslintrc.cjs`）：`--ext .vue,.js,.ts --fix`
   - 创建基础路由：`/`（书架）、`/reader/:id`（阅读页）、`/dict-manager`（词典管理）、`/settings`（设置）、`/stats`（统计）
   - 创建 `index.html` 入口、`main.js` 应用初始化、`App.vue` 根组件
   - 配置 Vercel 部署：`vercel.json` SPA 重写规则 `/(.*) → /index.html`

- [ ] 2. 实现 IndexedDB 存储层
   - [ ] 2.1 创建 `storage/db.js` — 数据库初始化
     - 使用 `idb` 的 `openDB()` 创建数据库 `buddhist-reader`，版本 1
     - 定义所有表结构（object stores）：`sutra_index`、`sutra_content`、`dict_index`、`dict_entries`、`dict_chunks`、`dict_term_lookup`、`dict_config`、`reading_progress`、`reading_stats`、`bookmarks`、`user_notes`、`dict_versions`、`settings`
     - 为 `dict_index` 创建复合索引 `[term + dict_id]`
     - 为 `dict_entries` 创建主键 `key`（格式：`{dictId}::{term}`）
     - 为 `dict_term_lookup` 创建复合索引 `[term + dict_id]`
     - 为 `dict_config` 创建主键 `dict_id`
     - 为 `reading_progress` 创建主键 `progress::{sutraId}`
     - 为 `bookmarks` 创建主键 `bm::{autoId}`，索引 `sutra_id`
     - 为 `user_notes` 创建主键 `note::{autoId}`，索引 `entry_key`，预留 `original_checksum` 字段
     - 为 `settings` 创建主键 `key`（简单 key-value 表）

   - [ ] 2.2 创建 `storage/sutraStore.js` — 经书表操作
     - `getSutraList()`：读取 `sutra_index` 全部记录
     - `getSutra(id)`：读取单部经书索引
     - `getChapter(sutraId, chapterIndex)`：从 `sutra_content` 按 `sutra_id::ch{index}` 读取
     - `saveSutra(sutra, chapters)`：写入 `sutra_index` + 批量写入 `sutra_content`
     - `deleteSutra(id)`：删除 `sutra_index` 记录和关联 `sutra_content`

   - [ ] 2.3 创建 `storage/dictStore.js` — 词典表操作
     - `getDictIndex()`：读取 `dict_index` 全部记录（用于 Trie 重建）
     - `getDictIndexByDictId(dictId)`：按词典 ID 读取索引
     - `getDictEntry(key)`：按主键查询 `dict_entries`
     - `getDictEntryByChunk(term, dictId)`：通过 `dict_term_lookup` 找 `chunk_id`，再查 `dict_entries`
     - `bulkPutDictEntries(entries)`：批量写入释义数据
     - `getDictConfig()`：读取 `dict_config` 全部记录
     - `saveDictConfig(config)`：写入/更新词典配置
     - `deleteDict(dictId)`：删除词典关联的所有数据（index、entries、chunks、lookup、config）
     - `saveChunkManifest(chunk)`：写入 `dict_chunks`
     - `saveTermLookup(lookups)`：批量写入 `dict_term_lookup`

   - [ ] 2.4 创建 `storage/progressStore.js` — 阅读进度操作
     - `saveProgress(sutraId, chapter, position, readTime)`
     - `getProgress(sutraId)`
     - `getAllProgress()`

   - [ ] 2.5 创建 `storage/settingStore.js` — 设置操作
     - `saveSetting(key, value)`
     - `getSetting(key)`
     - `getAllSettings()`

   - [ ] 2.6 创建 `storage/statsStore.js` — 统计操作
     - `recordSession(sutraId, duration)`
     - `getStats(period)`：按天/周/月聚合
     - `getStreak()`：计算连续诵读天数

   - [ ] 2.7 创建 `storage/bookmarkStore.js` — 书签操作
     - `addBookmark(sutraId, chapter, position, note)`
     - `getBookmarks(sutraId)`
     - `deleteBookmark(id)`
     - `updateBookmark(id, updates)`

   - [ ] 2.8 创建 `storage/noteStore.js` — 用户笔记操作
     - `saveNote(entryKey, note, originalChecksum)`
     - `getNote(entryKey)`
     - `deleteNote(entryKey)`

   - [ ] 2.9 创建 `storage/fileCache.js` — 文件缓存（MDX 原文件）
     - `cacheFile(fileId, blob)`：存储 MDX 原始文件（大文件 direct 模式备用）
     - `getFile(fileId)`：读取缓存文件
     - `deleteFile(fileId)`

   - [ ]* 2.10 为存储层编写单元测试
     - 为每个 store 模块的 CRUD 操作编写测试
     - 测试事务回滚和错误处理
     - 测试大批量数据写入性能（10万条 dict_entries）

- [ ] 3. 检查点 — 确保存储层测试通过，如有疑问请询问用户

- [ ] 4. 实现 Service 层（数据访问抽象）
   - [ ] 4.1 创建 `services/dictService.js` — 词典服务
     - 实现统一接口（预留后端 API 切换）：`init()`、`getEnabledDicts()`、`getAllDicts()`、`toggleDict(dictId, enabled)`、`lookupTerm(term, dictIds)`、`lookupBatch(term, options)`、`importDict(file, options)`、`deleteDict(dictId)`、`getDictVersions(dictId)`、`getDictHealthReport(dictId)`、`setUserNote(entryKey, note)`、`getUserNote(entryKey)`
     - `init()`：读取 `dict_index` → 构建 Trie → 读取 `dict_config` → 初始化 `enabledDictIds`
     - `lookupTerm(term, dictId)`：先查内存缓存 → 再查 `dict_entries` → 写入缓存 → 合并 `user_notes`
     - `lookupBatch(term, options)`：并行查询所有启用词典，支持 3 种展示模式
     - `toggleDict(dictId, enabled)`：更新 `dict_config` → 更新 `enabledDictIds` → 触发高亮刷新事件
     - `getDictHealthReport(dictId)`：最简版 — 词条总数 + 与内置词典重复数

   - [ ] 4.2 创建 `services/sutraService.js` — 经书服务
     - `getSutraList()` → 调用 `sutraStore.getSutraList()`
     - `getSutra(id)` → 调用 `sutraStore.getSutra(id)`
     - `getChapter(sutraId, chapterIndex)` → 调用 `sutraStore.getChapter()`
     - `importSutra(file, metadata)`：解析文本文件 → 按章节分割 → 写入 `sutra_index` + `sutra_content`

   - [ ] 4.3 创建 `services/progressService.js` — 进度服务
     - 包装 `progressStore` 方法，添加自动保存防抖（30s）

   - [ ] 4.4 创建 `services/statsService.js` — 统计服务
     - 包装 `statsStore` 方法，实现连续天数计算逻辑

   - [ ] 4.5 创建 `services/ttsService.js` — TTS 服务
     - 封装 Web Speech API：`init()`、`speak(text, options)`、`pause()`、`resume()`、`stop()`
     - 支持语速、音调、音量控制
     - 中文语音选择优化
     - 断句处理（按标点符号分段）

- [ ] 5. 检查点 — 确保 Service 层接口可通过测试调用，如有疑问请询问用户

- [ ] 6. 实现 Trie 引擎（动态版本）
   - [ ] 6.1 创建 `engine/trie/node.js` — Trie 节点
     - `class TrieNode`：`children`（Map<char, TrieNode>）、`isEnd`（boolean）、`dictIds`（array）、`pinyin`（string, 可选）、`category`（string, 可选）

   - [ ] 6.2 创建 `engine/trie/index.js` — Trie 树
     - `class Trie`：`build(terms)` — 从 `[{term, dictId, pinyin, category}]` 批量构建
     - `search(text)` — 返回 `[{term, start, end, dictIds, pinyin, category}]`
     - `destroy()` — 清空树释放内存
     - 接口设计预留未来切换为分层 Trie（通过 `ITrieEngine` 抽象）

   - [ ] 6.3 创建 `engine/trie/merger.js` — Trie 管理器
     - `class TrieManager`：管理 Trie 实例生命周期
     - `rebuild(dictIndexEntries)` — 从 `dict_index` 数据重建 Trie（每次启动调用）
     - `searchAll(text, enabledDictIds)` — 搜索后按 `enabledDictIds` 运行时过滤
     - `deduplicate(matches)` — 长词优先去重算法
     - `getEnabledTermCount(enabledDictIds)` — 计算启用的词条数（用于开关提示）

   - [ ] 6.4 创建 `engine/highlighter.js` — 高亮引擎
     - `highlight(text, matches)` — 将文本和匹配结果转为带 `<mark>` 标签的 HTML
     - 支持多词典颜色区分（颜色映射表）
     - 处理嵌套/重叠词条（长词优先）
     - 处理标点符号边界
     - 高亮与文本选择（selection）冲突处理

   - [ ] 6.5 创建 `engine/pinyin.js` — 拼音标注引擎
     - 加载 `data/pronunciationMap.js`（佛教术语专属读音）
     - `annotate(text)` — 为文本中的术语添加拼音标注
     - 与高亮引擎协同工作

   - [ ]* 6.6 为 Trie 引擎编写单元测试
     - 测试 Trie 构建和搜索正确性
     - 测试长词优先去重
     - 测试运行时过滤逻辑
     - 测试 10万词条的构建时间和内存占用

- [ ] 7. 检查点 — 确保 Trie 引擎测试通过，如有疑问请询问用户

- [ ] 8. 实现 MDX 词典解析与导入
   - [ ] 8.1 创建 `engine/mdxParser.js` — MDX 解析器
     - 使用 `mdict-js` + `lzo-wasm` 解析 .mdx 文件
     - `parseMdx(file)` → 提取所有词条：`[{term, definition}]`
     - `getMdxHeadwords(file)` → 仅提取词头列表（用于索引）

   - [ ] 8.2 创建 `services/dictImporter.js` — 词典导入服务
     - `importJSON(file)`：解析 JSON → 标准化格式 → 写入 DB
     - `importCSV(file)`：解析 CSV → 标准化格式 → 写入 DB
     - `importMDX(file)`：预解析 → 切割 → 写入 DB

   - [ ] 8.3 实现词典切割逻辑
     - 单文件上限 10MB 检查
     - 解析后数据按 2MB/块切割（逐条累加，接近上限切块）
     - 单条释义超 2MB 则单独成块
     - 生成 `dict_chunks` 元数据
     - 生成 `dict_term_lookup` 路由表
     - 所有释义通过 `turndown` 从 HTML 转 Markdown

   - [ ] 8.4 实现词典导入流程
     - 文件类型检测（扩展名 + 内容检测）
     - 大文件上传进度显示（Web Worker 中解析）
     - 导入前校验（格式、重复词典名）
     - 导入后生成体检报告（词条总数 + 与内置词典重复数）
     - 导入失败回滚（事务）
     - 默认启用新词典（D9）
     - 重复上传创建新版本（D14）

   - [ ]* 8.5 为 MDX 解析编写单元测试
     - 测试 MDX 文件解析正确性
     - 测试 HTML→Markdown 转换准确性
     - 测试切割逻辑（边界条件）

- [ ] 9. 实现 Pinia 状态管理
   - [ ] 9.1 创建 `stores/dict.js` — 词典状态
     - state：`dicts`（词典列表）、`enabledDictIds`（Set）、`trieReady`（boolean）、`displayMode`（'all-collapsed' | 'first-expanded' | 'all-expanded'）
     - actions：`initDicts()`、`toggleDict(dictId, enabled)`、`setDictionaryDisplayMode(mode)`、`refreshHighlight()`
     - 持久化：`enabledDictIds` 和 `displayMode` 自动同步到 `settings` store

   - [ ] 9.2 创建 `stores/sutra.js` — 经书状态
     - state：`sutraList`、`currentSutra`、`currentChapter`、`loadStatus`
     - actions：`loadSutraList()`、`selectSutra(id)`、`loadChapter(index)`

   - [ ] 9.3 创建 `stores/reader.js` — 阅读器状态
     - state：`content`（当前章节内容）、`highlightedContent`（高亮后 HTML）、`position`（滚动位置）、`fontSize`、`lineHeight`、`theme`（light/dark/warm）
     - actions：`setContent(html)`、`applyHighlight()`、`savePosition()`、`setFontSettings(settings)`

   - [ ] 9.4 创建 `stores/setting.js` — 全局设置
     - state：`settings`（key-value）
     - actions：`save(key, value)`、`get(key)`、`loadAll()`
     - 与 IndexedDB `settings` 表同步

   - [ ] 9.5 创建 `stores/stats.js` — 功德统计
     - state：`stats`（统计数据）、`streak`（连续天数）
     - actions：`recordSession()`、`loadStats(period)`

- [ ] 10. 检查点 — 确保 Pinia store 状态流转正确，如有疑问请询问用户

- [ ] 11. 实现页面组件
   - [ ] 11.1 创建 `pages/Bookshelf.vue` — 书架页
     - 网格布局展示经书列表（从 `sutra` store 读取）
     - 每本书显示：封面（emoji/自动生成）、标题、作者、阅读进度
     - 排序：最近阅读、字母顺序
     - 点击跳转阅读页
     - 响应式：手机单列、平板双列、PC 三列

   - [ ] 11.2 创建 `pages/Reader.vue` — 阅读页
     - 经文内容展示（从 `reader` store 读取）
     - 高亮渲染（调用 `highlighter.highlight()`）
     - 点击高亮词条 → 弹出释义弹窗
     - 字体大小调节、行间距调节、主题切换
     - 目录导航侧栏
     - 阅读进度自动保存（防抖 30s）
     - TTS 播放控制栏

   - [ ] 11.3 创建 `pages/DictManager.vue` — 词典管理页
     - 词典列表：名称、类型（官方/个人）、词条数、开关
     - 滑动开关切换（Vant Switch），立即生效
     - 关闭时显示受影响词条数："关闭后将少高亮 X 个词条"
     - 全部启用 / 全部禁用按钮
     - 导入词典入口（JSON/CSV/MDX）
     - 删除词典（二次确认）
     - 版本历史展示（D14）
     - 上传后体检报告弹窗

   - [ ] 11.4 创建 `pages/Settings.vue` — 设置页
     - 阅读设置：字体大小、行间距、主题
     - 词典设置：展示模式下拉框（全部折叠 / 展开第一个 / 全部展开）
     - 显示设置：夜间模式、护眼模式
     - 数据管理：导出/导入数据、清理缓存、重置
     - 设置持久化到 `settings` store

   - [ ] 11.5 创建 `pages/Stats.vue` — 功德统计页
     - 统计维度切换：天/周/月/年
     - 可视化图表：诵读次数、时长（Chart.js 或 ECharts）
     - 连续诵读天数展示
     - 数据导出

- [ ] 12. 实现核心交互组件
   - [ ] 12.1 创建 `components/reader/DictionaryPopup.vue` — 释义弹窗
     - 跟随高亮词条定位（浮动卡片）
     - 流式加载：先返回的词典先渲染
     - 3 种展示模式渲染逻辑：
       - 全部折叠：列出词典名，点击展开
       - 展开第一个（默认）：第一个直接渲染，其余折叠为"另有 N 个释义"
       - 全部展开：逐个追加展开
     - Markdown 渲染（markdown-it，`html: true`）
     - 用户笔记编辑入口（底部"添加笔记"按钮）
     - 移动端适配：底部抽屉样式

   - [ ] 12.2 创建 `components/reader/NoteEditor.vue` — 笔记编辑器
     - 轻量 Markdown 编辑框
     - 预览模式
     - 保存到 `user_notes` 表
     - 与原始释义分离存储

   - [ ] 12.3 创建 `components/reader/TTSControl.vue` — TTS 控制栏
     - 播放/暂停/停止按钮
     - 语速滑块
     - 当前诵读段落高亮

   - [ ] 12.4 创建 `components/common/Toast.vue` — 全局提示
     - 成功/失败/加载中提示
     - 自动消失

   - [ ] 12.5 创建 `components/common/Loading.vue` — 加载指示器
     - 骨架屏
     - 加载动画

- [ ] 13. 检查点 — 确保页面可运行、交互流畅，如有疑问请询问用户

- [ ] 14. 实现 v1.0 数据迁移
   - [ ] 14.1 创建 `services/migration.js` — 迁移服务
     - `migrateFromV1()`：检测是否已迁移
     - 迁移阅读进度：`localStorage` → `reading_progress` 表
     - 迁移用户设置：`localStorage` → `settings` 表
     - 迁移用户词典：`userDictStorage` → `dict_entries` + `dict_index` + `dict_config`
     - 迁移完成后标记 `settings.migrated = true`

   - [ ] 14.2 创建 `data/builtinDictionary.js` — 内置词典数据
     - 从 v1.0 `dictionary.js` 迁移 50+ 条内置术语
     - 格式标准化：`{term, pinyin, definition, category}`
     - 首次启动时写入 `dict_entries` + `dict_index`

   - [ ] 14.3 创建 `data/sutraManifest.js` — 经书清单
     - 从 v1.0 `sutras.js` 迁移经书元数据
     - 格式：`{id, title, fullName, translator, chapters}`

   - [ ] 14.4 创建 `data/pronunciationMap.js` — 读音映射
     - 从 v1.0 迁移佛教术语专属读音

- [ ] 15. 实现禅意 UI 主题系统
   - [ ] 15.1 定义 CSS 变量（设计 tokens）
     - 色彩系统：主色（温暖棕）、辅助色、语义色（成功/警告/错误）
     - 字体：中文字体栈、梵文字体
     - 间距系统：4px 基准
     - 圆角、阴影
   - [ ] 15.2 实现主题切换
     - 亮色模式（默认）
     - 暗色模式
     - 护眼模式（暖色调）
   - [ ] 15.3 Vant 主题覆盖
     - 覆盖 Vant 默认配色为禅意风格
     - 按需引入 Vant 组件（减少 bundle）

- [ ] 16. 检查点 — 确保主题切换正常、禅意风格一致，如有疑问请询问用户

- [ ] 17. 实现错误处理与降级
   - [ ] 17.1 全局错误边界
     - Vue `errorCaptured` 钩子
     - 全局 `window.onerror` 捕获
   - [ ] 17.2 数据加载失败重试
     - IndexedDB 查询失败 → 重试 2 次 → 降级提示
   - [ ] 17.3 IndexedDB 不可用降级
     - 检测 IndexedDB 可用性
     - 降级到 `localStorage`（仅基础功能）
   - [ ] 17.4 用户友好的错误提示
     - 网络错误、存储空间不足、文件格式错误等

- [ ] 18. 性能优化
   - [ ] 18.1 路由级代码分割
     - `import()` 懒加载各页面组件
   - [ ] 18.2 词典导入 Web Worker
     - 将 MDX 解析、切割逻辑放入 Web Worker
     - 避免阻塞主线程
   - [ ] 18.3 Trie 匹配 Web Worker（可选）
     - 大文本高亮匹配放入 Worker
     - 通过 `postMessage` 传递结果
   - [ ] 18.4 释义缓存策略
     - LRU 缓存，上限 1000 条
     - 页面关闭时保留（IndexedDB）
   - [ ] 18.5 构建优化
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
