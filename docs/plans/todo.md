# v2.1 方案深度分析 — 任务清单

> 基于 v2.0 方案 + 2026-05-02 决策会议结果 + `2026-05-02-v2-dictionary-architecture-design.md`
> 目标：质量优先，用时间换质量
> 版本：v3（补全遗漏版，34→49 个任务）

---

## 第一阶段：技术功能调研（13 个任务）

### T-01 | Vue 3 架构 + Pinia 状态管理（合并原 T-01 + T-04）
**任务**：调研 Vue 3 + Composition API + Pinia 在阅读器类项目中的最佳实践
- 调研同类 Web 阅读器/电子书平台的 Vue 3 架构模式
- Composition API vs Options API 选择依据
- 组件拆分粒度：大组件 vs 微组件
- provide/inject 在深层组件通信中的使用边界
- Pinia 单 store vs 多 store 的划分原则
- state 数据量控制：哪些放 store 哪些放局部 state
- 跨页面数据同步：阅读进度、词典开关状态的持久化
- store 的懒加载：按需注册
- 对比：微信读书 Web 版、Kindle Cloud Reader 等项目的技术架构
- **产出**：`docs/plans/research/vue3-pinia-architecture.md`

### T-02 | Vite 5 构建配置优化
**任务**：深度调研 Vite 5 构建优化策略
- code splitting 策略：按路由 vs 按功能 vs 按大小
- 预加载/预取策略（modulepreload）
- mdict-js + lzo-wasm 的 ESM 兼容性处理
- 资源压缩：terser vs esbuild 对比
- 大型二进制依赖（MDX 解析）的懒加载策略
- 构建产物分析工具：rollup-plugin-visualizer
- **产出**：`docs/plans/research/vite-build-optimization.md`

### T-03 | Vant 4 UI 组件库深度评估
**任务**：评估 Vant 4 是否满足所有 UI 需求
- 禅意风格与 Vant 默认样式的冲突和定制方案
- 移动端优先 vs 响应式适配的最佳实践
- 组件按需引入 vs 全量引入的 bundle 影响
- 主题定制：warm tone 配色方案的实现路径
- 对比其他 UI 库：NutUI（京东）、Element Plus、Naive UI
- **产出**：`docs/plans/research/vant4-evaluation.md`

### T-04 | IndexedDB 存储方案（细化原 T-05）
**任务**：对比 idb、Dexie.js、localForage、原生 IndexedDB，确定最优方案
- 性能对比：大数据量（10万+词条）的读写速度
- 事务处理能力与回滚机制
- 版本迁移机制：13 张表的结构设计验证
- 内存占用分析：10万+词条索引 vs 全量数据的内存模型
- 浏览器兼容性：iOS Safari、Android WebView 的差异
- 错误恢复和降级策略：IndexedDB 不可用时 fallback 到 localStorage
- 边界情况：存储空间满、并发读写冲突、数据损坏恢复
- 是否需要引入离线优先框架（如 RxDB）
- **产出**：`docs/plans/research/indexeddb-solution-comparison.md`

### T-05 | 高亮引擎完整方案（合并原 T-06 + T-10）
**任务**：研究 Trie 树 + 高亮渲染在经文阅读场景的最优实现
- 前端 Trie 实现对比：自定义实现 vs 开源库（trie-search、fast-levenshtein 等）
- 中文分词与 Trie 匹配的结合
- 长词优先策略的算法优化
- Trie 内存占用评估：10万词条 × 轻量索引（含 dictId/pinyin/category）的内存模型
- 对比 AC 自动机（Aho-Corasick）：多模式匹配的算法选择
- Web Worker 中运行 Trie 的可行性
- 虚拟滚动中的高亮性能优化
- 高亮颜色方案：多词典区分（4色映射）
- 点击高亮词条的事件处理与定位
- 高亮与文本选择（selection）的冲突处理
- 大段落经文（千字+）的高亮渲染性能
- **产出**：`docs/plans/research/highlight-engine-design.md`

### T-06 | MDX 词典解析方案（细化原 T-07）
**任务**：研究 MDX 词典格式的解析方案，覆盖兼容性和性能
- mdict-js 的解析能力边界和已知问题
- lzo-wasm 的解压性能和兼容性
- MDX 格式规范研究：header 结构、词条索引、释义 HTML
- 对比其他 MDX 解析方案：python-mdict、readmdict
- 预解析性能测试：10万词条的解析时间和结果大小
- MDX 转 Markdown 的准确性和格式保留
- 兼容性陷阱：特殊编码、嵌套标签、内嵌资源的处理
- 大文件（>5MB / >10MB）解析的内存峰值控制
- **产出**：`docs/plans/research/mdx-parsing-research.md`

### T-07 | Markdown 格式方案（合并原 T-08 + T-28）
**任务**：对比 Markdown 渲染引擎并验证统一 Markdown 方案的可行性
- 渲染引擎对比：markdown-it、marked、remark、micromark
- 渲染性能对比（移动端）
- HTML 直通支持质量
- 插件生态（梵文/藏文特殊标注支持）
- XSS 防护能力
- SSR 兼容性（为未来预留）
- HTML → Markdown 转换的准确性测试（针对佛教词典的复杂 HTML）
- 梵文/藏文特殊格式保留测试
- 对比：直接存 HTML 的方案
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/research/markdown-format-solution.md`

### T-08 | Web Speech API TTS 引擎优化
**任务**：研究 Web Speech API 在中文/梵文诵读中的最佳实践
- 中文语音质量评估（各浏览器差异）
- 梵文/巴利文诵读支持
- 语速、音调、音量控制
- 断句和停顿优化（经文特殊需求）
- 对比商业 TTS API（Azure、Google Cloud、讯飞）
- 离线 TTS 方案（浏览器内置 vs 需要网络）
- **产出**：`docs/plans/research/tts-engine-optimization.md`

### T-09 | turndown 库调研（新增）
**任务**：调研 turndown 作为 HTML→Markdown 转换工具的可行性
- turndown 的核心功能和 API 设计
- 复杂 HTML 结构转换准确性：嵌套列表、表格、引用块
- 特殊格式保留：`<span class="sanskrit">` 等梵文标签的透传处理
- 性能测试：1万+条 HTML 释义批量转换的耗时
- 对比其他转换工具：html-to-md、heaven、showdown reverse
- 自定义规则扩展：如何处理佛教词典特有的 HTML 结构
- 边界情况：空标签、内联样式、base64 图片的处理
- **产出**：`docs/plans/research/turndown-evaluation.md`

### T-10 | LRU 缓存策略调研（新增）
**任务**：研究前端 LRU 缓存策略在释义加载场景的最佳实践
- 前端 LRU 缓存实现方案：Map + 自定义 vs 开源库（lru-cache 的浏览器适配）
- 缓存容量上限设计：目标上限 1000 条，内存占用评估
- 缓存淘汰策略：LRU vs LFU vs TTL 的选择
- 缓存键设计：`${dictId}::${term}` 的冲突处理
- 缓存预热策略：高频词条预加载的可行性
- 缓存与 IndexedDB 的一致性：DB 更新时缓存失效
- **产出**：`docs/plans/research/lru-cache-strategy.md`

### T-11 | Web Worker 技术方案（新增）
**任务**：调研 Web Worker 在词典解析和 Trie 计算中的应用
- Web Worker 的创建和通信模式：postMessage vs MessageChannel vs Transferable
- 大文件（10MB+ MDX）解析的 Worker 方案
- Trie 构建（10万词条）放入 Worker 的可行性
- Worker 中的模块加载：ESM import vs importScripts
- 进度反馈机制：Worker → 主线程的进度更新
- 移动端兼容性：iOS Safari、Android WebView 对 Worker 的支持度
- SharedArrayBuffer 的可行性（需 COOP/COEP 头）
- **产出**：`docs/plans/research/web-worker-strategy.md`

### T-12 | v1.0 代码与数据逆向分析（新增）
**任务**：分析 v1.0 存档代码，提取可迁移的数据和逻辑
- 从 `archive/v1.0/src/data/dictionary.js` 提取 50+ 内置词典数据
- 从 `archive/v1.0/src/data/sutras.js` 提取 5 部经书元数据和章节内容
- 从 `archive/v1.0/src/data/pronunciation-map.js` 提取读音映射
- 从 `archive/v1.0/src/utils/trie.js` 分析 Trie 实现逻辑
- 从 `archive/v1.0/src/utils/storage.js` 分析 localStorage 数据结构
- 从 `archive/v1.0/src/utils/tts.js` 分析 TTS 封装逻辑
- 提取禅意 UI 配色方案、CSS 变量、字体栈
- 对比 v1.0 与 v2.0 的差异，列出需要重构的代码块
- **产出**：`docs/plans/research/v1-code-analysis.md`

### T-13 | EventBus 跨组件通信方案（新增）
**任务**：研究词典开关→高亮实时刷新的事件通信机制
- Vue 3 推荐的事件模式：mitt、emittery vs provide/inject vs Pinia
- 词典开关切换触发高亮刷新的事件时序
- 阅读页在后台运行时的事件订阅和清理
- 事件防抖和节流：频繁开关切换时的处理
- 对比：Vuex 事件总线模式 vs Pinia 事件模式
- **产出**：`docs/plans/research/eventbus-patterns.md`

---

## 第二阶段：功能需求分析（13 个任务）

### T-14 | 书架页面设计
**任务**：调研电子书书架的业界最佳实践
- 网格布局 vs 列表布局
- 封面设计：自动生成 vs 用户上传
- 排序和筛选：最近阅读、字母、分类
- 书架分组功能
- 对比：微信读书、Kindle、Apple Books 的书架设计
- **产出**：`docs/plans/analysis/bookshelf-design.md`

### T-15 | 阅读页面设计
**任务**：研究经文阅读页面的最佳交互设计
- 字体选择和字号调节
- 行间距、段落间距、页边距
- 夜间模式 / 护眼模式
- 翻页 vs 滚动
- 目录导航
- 阅读进度显示
- 对比：微信读书、得到、掌阅的阅读页设计
- **产出**：`docs/plans/analysis/reader-page-design.md`

### T-16 | 词典管理系统（合并原 T-13 + T-14 + T-15）
**任务**：设计词典管理页面的完整交互，涵盖管理、导入、开关全流程
- 词典列表展示方式（名称、类型、词条数、开关状态）
- 开关交互细节（Vant Switch 滑动动画、确认提示）
- 关闭时受影响词条数的计算和显示："关闭后将少高亮 X 个词条"（D12）
- 全部启用 / 全部禁用按钮
- 开关切换 → Trie 更新 → 高亮刷新的时序（D7 立即生效）
- 切换时的 UI 过渡动画
- 文件导入支持格式：JSON / CSV / MDX 的处理流程
- 文件类型检测和验证
- 大文件上传进度显示
- 导入前的预处理和校验
- 导入失败的回滚机制
- 对比其他词典软件的导入流程（GoldenDict、欧路词典）
- 版本历史展示（D14）
- 删除确认和二次验证
- **产出**：`docs/plans/analysis/dict-management-system.md`

### T-17 | 词条高亮匹配
**任务**：设计高亮匹配的完整流程
- 匹配规则：精确匹配 vs 模糊匹配
- 嵌套词条处理（"般若"和"般若波罗蜜多"重叠）
- 标点符号前后的匹配边界
- 高亮样式：颜色、下划线、背景色
- 多词典同词条的高亮区分
- **产出**：`docs/plans/analysis/term-highlighting-design.md`

### T-18 | 释义展示层（合并原 T-17 + T-18）
**任务**：设计释义弹窗与用户笔记层的完整交互
- 弹窗位置和定位策略（跟随高亮词条）
- 流式加载的 UI 反馈（先返回的先渲染）
- 3 种展示模式的交互细节（全部折叠 / 展开第一个 / 全部展开）
- 弹窗内 Markdown 渲染质量
- 移动端弹窗的适配（底部抽屉样式）
- 对比：欧路词典、有道词典的弹窗设计
- 用户笔记与原始释义的分离和合并展示
- Markdown 编辑器选型（轻量级）
- 笔记的搜索和导出
- 笔记的版本历史
- 对比：Notion、Obsidian 的笔记理念
- **产出**：`docs/plans/analysis/definition-popup-notes.md`

### T-19 | 书签功能
**任务**：设计书签的完整功能
- 书签添加方式（手动 / 自动）
- 书签分类和标签
- 书签列表的展示和检索
- 书签导出和导入
- 对比：主流阅读器的书签设计
- **产出**：`docs/plans/analysis/bookmark-design.md`

### T-20 | 经文搜索功能
**任务**：研究经文内容搜索的实现
- 全文搜索 vs 关键词搜索
- 搜索结果的展示方式
- 高亮搜索结果
- 搜索历史
- 对比：电子书搜索方案
- **产出**：`docs/plans/analysis/sutra-search-design.md`

### T-21 | 功德统计页面
**任务**：设计功德统计的展示和算法
- 统计维度：按天/周/月/年
- 可视化图表选型（Chart.js / ECharts / 其他）
- 连续诵读天数计算
- 功德排行榜（可选）
- 数据导出
- **产出**：`docs/plans/analysis/stats-design.md`

### T-22 | 设置页面
**任务**：设计设置页面的功能组织
- 功能分类：阅读设置 / 词典设置 / 显示设置 / 数据管理
- 设置项的持久化和同步
- 设置导入导出
- 数据清理和重置
- **产出**：`docs/plans/analysis/settings-design.md`

### T-23 | 经书导入功能（新增）
**任务**：设计经书上传和导入的完整流程
- 支持格式：txt（按章节标记分割）
- 章节分割策略：正则匹配章节标题 vs 手动配置
- 元数据提取：经名、译者、卷数
- 重复经书检测：同经名、不同译者的处理
- 大文件（万字+经文）的解析性能
- 导入失败回滚
- 对比：其他阅读器（微信读书、掌阅）的导入体验
- **产出**：`docs/plans/analysis/sutra-import-design.md`

### T-24 | 词典版本管理（新增）
**任务**：设计词典版本链的展示和回滚机制
- `dict_versions` 表的交互设计：版本列表、上传时间、词条数对比
- 版本回滚功能：恢复到历史版本的数据操作
- 版本差异对比：新旧版本词条变化可视化
- 保留历史版本 vs 清理旧版本的空间管理策略
- 用户笔记在版本回滚时的处理（是否保留）
- **产出**：`docs/plans/analysis/dict-version-management.md`

### T-25 | 目录导航侧栏（新增）
**任务**：设计阅读页的目录导航交互
- 经文章节列表的展示（单章节 vs 多章节）
- 快速跳转：点击章节直接定位到对应内容
- 当前章节高亮标记
- 侧栏的展开/收起动画（移动端适配）
- 长经书（如金刚经 32 品）的目录折叠策略
- 对比：微信读书、Kindle 的目录交互
- **产出**：`docs/plans/analysis/toc-navigation-design.md`

### T-26 | D13 版本智能合并分析（新增）
**任务**：研究内置词典版本更新时与用户笔记层的冲突处理策略
- 场景 1：内置词条 definition 变更，但用户写过笔记 — 如何合并
- 场景 2：内置词条被删除，但用户有笔记 — 笔记是否保留
- 场景 3：内置新增词条，用户没有笔记 — 自动添加
- 场景 4：用户修改过的词条，在新版本中内容部分重叠 — 差异对比
- 使用 `original_checksum` 字段判断词条是否变更的可行性
- 通知机制：提示用户"词典已更新，您的笔记可能与新内容不匹配"
- 对比：Obsidian、Notion 的版本冲突处理
- **产出**：`docs/plans/analysis/version-merge-strategy.md`

---

## 第三阶段：已确认决策验证（8 个任务）

### T-27 | 验证：Trie 轻量索引决策
**任务**：验证"含 dictId + pinyin + category"的轻量索引方案
- 内存占用精算：10万词条 × 3字段的大小
- 对比最小索引方案的实际差异
- 调研其他词典 App 的索引策略
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/trie-index-verification.md`

### T-28 | 验证：MDX 全部预解析 + 切割决策
**任务**：验证"统一预解析 + 2MB 切割"方案
- 预解析 10万词条的性能测试
- 切割后查询路径的性能影响
- term → chunk 路由表的构建和维护成本
- 对比 GoldenDict、欧路词典的 MDX 处理方案
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/mdx-parsing-verification.md`

### T-29 | 验证：流式加载 + 3 种展示模式
**任务**：验证流式加载和展示模式设计
- 调研其他词典应用的释义展示方式
- 3 种模式的实际用户场景分析
- 设置项的存储位置（IndexedDB vs localStorage）
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/streaming-display-verification.md`

### T-30 | 验证：Trie 每次启动重建
**任务**：验证"每次启动重建 Trie"方案
- 10万词条重建的实际耗时测试
- 对比持久化方案的版本同步复杂度
- 调研其他前端词典的重建策略
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/trie-rebuild-verification.md`

### T-31 | 验证：单一 Trie + 运行时过滤
**任务**：验证单一 Trie + 运行时过滤方案的可扩展性
- 10万词条的 Trie 搜索性能
- 运行时过滤的开销
- 切换到分层 Trie 的接口设计预演
- 调研 AC 自动机是否更适合多词典场景
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/single-trie-verification.md`

### T-32 | 验证：D18 切割方案可行性（新增）
**任务**：验证单文件 10MB 限制 + 2MB 自动切割方案
- 10MB MDX 文件解析后的实际数据量膨胀系数
- 2MB 切割边界的精确控制：按条累加 vs 按大小切分
- 超大单条释义（>2MB）的单独存储方案
- `dict_term_lookup` 路由表的大小评估
- 切割后两步查询（lookup → entry）的总耗时是否 < 2ms
- 对比：是否需要引入 5MB 分界点（小文件预解析，大文件保留原文件）
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/chunking-strategy-verification.md`

### T-33 | 验证：移动端存储限制（新增）
**任务**：验证移动端 IndexedDB 配额限制对方案的影响
- iOS Safari IndexedDB 配额上限（约 1GB）和清理策略
- Android WebView 的存储限制差异
- 多词典累计存储量的估算：10万词条 × Markdown 释义
- 上传前检查可用空间的实现方案
- 存储空间不足时的自动清理策略（LRU 清理旧词典 vs 提示用户手动管理）
- 对比：其他移动端 Web App 的存储管理
- 结论：维持原方案 or 调整
- **产出**：`docs/plans/verification/mobile-storage-verification.md`

### T-34 | 验证：MDX 解析兼容性（新增）
**任务**：验证 mdict-js 对主流 MDX 格式的兼容边界
- 收集 5-10 个真实佛教/国学 MDX 词典样本
- 测试不同编码：UTF-8、GBK、Big5 的解析成功率
- 测试特殊结构：嵌套 HTML、内嵌 CSS、图片引用、音频引用
- 测试 lzo-wasm 解压的稳定性：损坏文件的容错
- 不兼容格式的处理：提示用户转换 vs 自动跳过
- 对比：GoldenDict 对相同 MDX 文件的兼容性
- 结论：维持原方案 or 增加兼容层
- **产出**：`docs/plans/verification/mdx-compatibility-verification.md`

---

## 第四阶段：深度分析（13 个任务）

### T-35 | 性能优化全面分析
**任务**：系统性分析性能瓶颈和优化策略
- 首屏加载性能（FCP / LCP / TTI）：目标 < 1s
- 运行时性能：帧率、内存、长任务
- 高亮响应时间：目标 < 50ms
- 释义加载时间：目标 < 200ms
- 图片/字体资源优化
- Web Worker 的使用场景（Trie 匹配、MDX 解析）
- 浏览器缓存策略
- CDN 加速
- Lighthouse 评分目标
- 具体测试方法：Lighthouse CI、WebPageTest、Chrome DevTools Performance 面板
- **产出**：`docs/plans/deep-dive/performance-optimization.md`

### T-36 | 移动端适配全面分析
**任务**：深入研究移动端用户体验
- 响应式断点设计（手机/平板/PC）
- 触摸手势：滑动翻页、捏合缩放
- 移动端键盘适配（搜索、笔记编辑）
- 底部导航栏设计
- 移动端存储限制（IndexedDB 配额）
- iOS Safari 的特殊问题（PWA、存储、TTS）
- **产出**：`docs/plans/deep-dive/mobile-adaptation.md`

### T-37 | PWA 离线能力分析
**任务**：评估 PWA 离线支持的可行性
- Service Worker 策略：缓存优先 vs 网络优先
- 离线词典：已导入的词典完全离线可用
- 离线经书：已加载的经书完全离线可用
- PWA 安装提示
- 离线时的功能降级
- 对比：其他离线阅读 App 的实现
- **产出**：`docs/plans/deep-dive/pwa-offline-capability.md`

### T-38 | 数据安全与备份
**任务**：设计用户数据的备份和恢复机制
- 数据导出格式设计（JSON / CSV）
- 数据导入恢复流程
- 云同步预留接口
- 数据加密存储（敏感笔记）
- IndexedDB 数据损坏的恢复
- **产出**：`docs/plans/deep-dive/data-security-backup.md`

### T-39 | 可访问性（a11y）分析
**任务**：评估和提升可访问性
- WCAG 2.1 AA 标准对照
- 键盘导航支持
- 屏幕阅读器兼容
- 色盲友好的高亮配色
- 字体大小调节范围
- **产出**：`docs/plans/deep-dive/accessibility-analysis.md`

### T-40 | 禅意 UI/UX 设计语言
**任务**：定义项目的视觉设计语言
- 禅意设计原则提炼（极简、留白、温暖）
- 色彩系统：主色、辅助色、语义色
- 字体系统：中文字体、梵文字体
- 动画和过渡效果（克制、优雅）
- 图标风格
- 对比：同类佛教 App 的设计风格
- **产出**：`docs/plans/deep-dive/zen-ui-design-language.md`

### T-41 | 错误处理与异常恢复
**任务**：设计全局错误处理策略
- 全局错误边界（Vue errorCaptured）
- 数据加载失败的重试机制
- 用户友好的错误提示
- 日志记录和上报（可选）
- 降级策略：IndexedDB 不可用时的 fallback
- **产出**：`docs/plans/deep-dive/error-handling-design.md`

### T-42 | 测试策略
**任务**：设计项目的测试方案
- 单元测试框架选型（Vitest）
- 组件测试（Vue Test Utils）
- E2E 测试（Playwright / Cypress）
- 测试覆盖率目标
- 核心模块的测试重点
- **产出**：`docs/plans/deep-dive/testing-strategy.md`

### T-43 | 部署与 CI/CD
**任务**：优化部署流程和 CI/CD
- Vercel 部署配置优化
- 预览部署流程
- 环境变量管理
- 构建产物大小监控
- 自动化检查（lint、typecheck）
- **产出**：`docs/plans/deep-dive/deployment-cicd.md`

### T-44 | 未来扩展性分析
**任务**：为未来功能预留扩展点
- 微信小程序迁移的技术路径
- 后端 API 接入的接口设计
- 多语言国际化（i18n）预留
- 用户账户系统预留
- 词典分享功能预留（D22 不做清单的边界）
- **产出**：`docs/plans/deep-dive/future-extensibility.md`

### T-45 | 缓存策略全面分析（新增）
**任务**：系统性设计前端缓存策略
- LRU 缓存的实现和容量管理（上限 1000 条）
- 缓存命中率评估：高频词条 vs 低频词条
- 缓存清理时机：页面切换、内存压力、用户主动清理
- IndexedDB 作为二级缓存的可行性
- 缓存预热策略：用户进入阅读页时预加载高频词条
- 多词典场景下的缓存共享和隔离
- **产出**：`docs/plans/deep-dive/cache-strategy.md`

### T-46 | Service 层接口抽象设计（新增）
**任务**：设计 Service 层的抽象接口，预留后端 API 切换能力
- 统一接口定义：DictService、SutraService、ProgressService、StatsService、TTSService
- 接口与实现分离：Service 接口 vs IndexedDB 实现 vs 未来 REST API 实现
- 数据格式标准化：所有 Service 返回统一的数据结构
- 错误处理统一化：Service 层的异常分类和错误码
- 接口版本管理：预留 v1、v2 的接口演进
- 对比：Clean Architecture 的 Repository 模式
- **产出**：`docs/plans/deep-dive/service-layer-abstraction.md`

### T-47 | 禅意设计原则落地方案（新增）
**任务**：将禅意设计原则转化为具体的 UI/UX 实现方案
- v1.0 禅意 UI 的提取和保留：配色、字体、间距、圆角
- 设计 token 系统：CSS 变量定义禅意设计语言
- 暗色模式的禅意风格适配（非纯黑，保持温暖感）
- 护眼模式（暖色调）的色温和亮度参数
- 动画和过渡效果的"克制"标准：时长、曲线、触发条件
- Vant 组件的禅意风格覆盖方案
- 对比：其他禅意/极简风格 App（冥想 App、禅宗工具）
- **产出**：`docs/plans/deep-dive/zen-implementation-guide.md`

---

## 第五阶段：综合输出（2 个任务）

### T-48 | v2.1 方案整合设计
**任务**：综合以上所有调研和分析，输出全新的 v2.1 方案
- 整合所有调研结果，对比 v2.0 的差异
- 明确架构变更
- 更新数据模型
- 更新开发阶段规划
- 更新性能目标
- 更新风险清单
- **产出**：`docs/PROJECT_V2.1_PLAN.md`

### T-49 | v2.0 → v2.1 变更说明
**任务**：撰写从 v2.0 到 v2.1 的变更说明文档
- 逐条列出变更点
- 每条变更的原因和依据
- 对开发计划的影响
- **产出**：`docs/plans/v2.0-to-v2.1-changelog.md`

---

## 任务执行顺序建议

```
第一轮（技术调研，可并行）:
  T-01 ~ T-13  （13 个任务，可独立并行执行）

第二轮（功能分析，可并行）:
  T-14 ~ T-26  （13 个任务，可独立并行执行）

第三轮（决策验证，依赖第一轮结果）:
  T-27 ~ T-34  （8 个任务，需要技术调研结果作为支撑）

第四轮（深度分析，可并行）:
  T-35 ~ T-47  （13 个任务，可独立并行执行）

第五轮（综合输出，依赖前面所有轮次）:
  T-48 ~ T-49  （2 个任务，需要前面所有调研和分析完成）
```

---

## 总计

- **技术功能调研**：13 个任务（T-01 ~ T-13）
- **功能需求分析**：13 个任务（T-14 ~ T-26）
- **决策验证**：8 个任务（T-27 ~ T-34）
- **深度分析**：13 个任务（T-35 ~ T-47）
- **综合输出**：2 个任务（T-48 ~ T-49）

**合计：49 个可执行任务**（v1: 40 → v2: 34 → v3: 49）

---

## 版本变更说明

| 版本 | 任务数 | 变更 |
|------|--------|------|
| v1 | 40 | 初始版本 |
| v2 | 34 | 合并 6 个关联任务，细化 3 个任务 |
| v3 | 49 | 补全 15 个遗漏项（见下方详细清单） |

### v3 新增的 15 个遗漏项

| 阶段 | 任务 | 来源 | 遗漏原因 |
|------|------|------|----------|
| 技术调研 | T-09 turndown 库调研 | 架构设计 2.4 | D15 明确使用但未单独调研 |
| 技术调研 | T-10 LRU 缓存策略 | v2.0 §4.3.1 | 释义缓存是核心性能优化 |
| 技术调研 | T-11 Web Worker 技术方案 | v2.0 Phase 2 | MDX 解析需 Worker 不阻塞主线程 |
| 技术调研 | T-12 v1.0 代码逆向分析 | v2.0 §九 | 需要从 v1.0 提取数据迁移 |
| 技术调研 | T-13 EventBus 跨组件通信 | v2.0 §4.6.2 | 词典开关→高亮刷新需事件机制 |
| 功能分析 | T-23 经书导入功能 | v2.0 SutraService | 支持用户上传 txt 经书 |
| 功能分析 | T-24 词典版本管理 | v2.0 dict_versions | 版本链展示、回滚、对比 |
| 功能分析 | T-25 目录导航侧栏 | v2.0 阅读页 | 经文章节导航和快速跳转 |
| 功能分析 | T-26 D13 版本智能合并 | 架构设计延期决策 | 内置更新与用户笔记冲突处理 |
| 决策验证 | T-32 D18 切割方案可行性 | v2.0 §4.4 | 10MB+2MB 切割未验证 |
| 决策验证 | T-33 移动端存储限制 | v2.0 §十 高风险 | iOS IndexedDB 配额限制 |
| 决策验证 | T-34 MDX 解析兼容性 | v2.0 §十 中风险 | 特殊编码和格式边界 |
| 深度分析 | T-45 缓存策略全面分析 | v2.0 Phase 4 | 仅提及但缺少专门分析 |
| 深度分析 | T-46 Service 层接口抽象 | v2.0 §4.1.2 | 预留后端 API 切换的核心设计 |
| 深度分析 | T-47 禅意设计原则落地 | v2.0 §2.3 | 需要保留的核心设计语言 |
