# 般若佛经阅读器 v2.0 开发任务清单

> **生成日期**: 2026-05-03
> **状态**: 进行中
> **预计总工时**: 80-120 小时
> **优先级**: 按阶段顺序执行，不可跳过
> **当前阶段**: Phase 6-7 已完成，Phase 8 待开始

---

## Phase 3: 核心引擎（预计 20 小时）

| ID | 任务 | 优先级 | 预估 | 状态 | 依赖 |
|----|------|--------|------|------|------|
| P3-01 | 创建 `src/engine/trie/TrieNode.js` Trie 节点类 | P0 | 2h | ✅ 完成 | - |
| P3-02 | 创建 `src/engine/trie/TrieBuilder.js` Trie 构建器 | P0 | 4h | ✅ 完成 | P3-01 |
| P3-03 | 创建 `src/engine/trie/TrieMatcher.js` Trie 匹配器 | P0 | 3h | ✅ 完成 | P3-01 |
| P3-04 | 创建 `src/engine/highlighter.js` 高亮渲染引擎 | P0 | 4h | ✅ 完成 | P3-03 |
| P3-05 | 创建 `src/engine/mdxParser.js` MDX 解析器（对接 mdict-js） | P0 | 5h | ✅ 完成 | - |
| P3-06 | 创建 `src/engine/markdownRenderer.js` Markdown 渲染器（markdown-it） | P0 | 3h | ✅ 完成 | - |
| P3-07 | 创建 `src/engine/pinyin.js` 拼音处理工具 | P1 | 2h | ✅ 完成 | P2-10 |
| P3-08 | 创建 `src/engine/formatter.js` 释义格式化工具 | P1 | 2h | ✅ 完成 | P3-06 |

**验收标准**: Trie 引擎可构建和匹配 1000+ 词条，高亮渲染正确，MDX 解析正常。

---

## Phase 4: Service 层（预计 16 小时）

| ID | 任务 | 优先级 | 预估 | 状态 | 依赖 |
|----|------|--------|------|------|------|
| P4-01 | 创建 `src/services/interfaces/ISutraService.ts` 经书服务接口 | P0 | 1h | 待开始 | - |
| P4-02 | 创建 `src/services/interfaces/IDictService.ts` 词典服务接口 | P0 | 1h | 待开始 | - |
| P4-03 | 创建 `src/services/interfaces/IProgressService.ts` 进度服务接口 | P1 | 1h | 待开始 | - |
| P4-04 | 创建 `src/services/interfaces/IStatsService.ts` 统计服务接口 | P1 | 1h | 待开始 | - |
| P4-05 | 创建 `src/services/interfaces/ITTSService.ts` TTS 服务接口 | P1 | 1h | 待开始 | - |
| P4-06 | 创建 `src/services/interfaces/ISettingService.ts` 设置服务接口 | P1 | 1h | 待开始 | - |
| P4-07 | 创建 `src/services/impl/SutraServiceLocal.js` 经书服务实现 | P0 | 3h | 待开始 | P2-02, P4-01 |
| P4-08 | 创建 `src/services/impl/DictServiceLocal.js` 词典服务实现 | P0 | 4h | 待开始 | P2-03, P3-05, P4-02 |
| P4-09 | 创建 `src/services/impl/ProgressServiceLocal.js` 进度服务实现 | P1 | 2h | 待开始 | P2-04, P4-03 |
| P4-10 | 创建 `src/services/impl/StatsServiceLocal.js` 统计服务实现 | P1 | 2h | 待开始 | P2-07, P4-04 |
| P4-11 | 创建 `src/services/impl/TTSServiceLocal.js` TTS 服务实现 | P2 | 2h | 待开始 | P4-05 |
| P4-12 | 创建 `src/services/impl/SettingServiceLocal.js` 设置服务实现 | P1 | 2h | 待开始 | P2-08, P4-06 |
| P4-13 | 创建 `src/services/factory.ts` Service 工厂函数 | P0 | 1h | 待开始 | P4-01~P4-06 |

**验收标准**: 各 Service 可正常调用，返回数据格式符合接口定义。

---

## Phase 5: Pinia 状态管理（预计 10 小时）

| ID | 任务 | 优先级 | 预估 | 状态 | 依赖 |
|----|------|--------|------|------|------|
| P5-01 | 创建 `src/stores/sutra.js` 经书状态管理 | P0 | 2h | 待开始 | P4-07 |
| P5-02 | 创建 `src/stores/dict.js` 词典状态管理 | P0 | 2h | 待开始 | P4-08 |
| P5-03 | 创建 `src/stores/reader.js` 阅读器状态管理 | P0 | 2h | 待开始 | P4-07, P4-09 |
| P5-04 | 创建 `src/stores/setting.js` 设置状态管理 | P1 | 2h | 待开始 | P4-12 |
| P5-05 | 创建 `src/stores/stats.js` 功德统计状态管理 | P2 | 2h | 待开始 | P4-10 |

**验收标准**: 各 Store 可正常 dispatch actions，状态变化触发 UI 更新。

---

## Phase 6: 页面组件（预计 24 小时）

| ID | 任务 | 优先级 | 预估 | 状态 | 依赖 |
|----|------|--------|------|------|------|
| P6-01 | 创建 `src/pages/Bookshelf.vue` 书架页 | P0 | 4h | ✅ 完成 | P5-01 |
| P6-02 | 创建 `src/components/bookshelf/SutraCard.vue` 经书卡片 | P0 | 2h | ✅ 完成 | P6-01 |
| P6-03 | 创建 `src/pages/Reader.vue` 阅读器页框架 | P0 | 2h | ✅ 完成 | P5-03 |
| P6-04 | 创建 `src/components/reader/ReaderHeader.vue` 阅读器头部 | P0 | 2h | ✅ 完成 | P6-03 |
| P6-05 | 创建 `src/components/reader/ReaderContent.vue` 阅读器内容区 | P0 | 4h | ✅ 完成 | P3-04, P6-03 |
| P6-06 | 创建 `src/components/reader/ReaderTOC.vue` 目录导航 | P1 | 3h | ✅ 完成 | P6-03 |
| P6-07 | 创建 `src/components/reader/ReaderProgress.vue` 进度指示 | P1 | 2h | ✅ 完成 | P6-03 |
| P6-08 | 创建 `src/pages/DictManager.vue` 词典管理页 | P0 | 4h | ✅ 完成 | P5-02 |
| P6-09 | 创建 `src/components/dict/DictPopup.vue` 词典弹出框 | P0 | 4h | ✅ 完成 | P3-06, P3-08 |
| P6-10 | 创建 `src/pages/Settings.vue` 设置页 | P1 | 3h | ✅ 完成 | P5-04 |
| P6-11 | 创建 `src/pages/Stats.vue` 功德统计页 | P2 | 3h | ✅ 完成 | P5-05 |
| P6-12 | 创建 `src/components/common/MarkdownRenderer.vue` Markdown 渲染组件 | P0 | 3h | ✅ 完成 | P3-06 |
| P6-13 | 创建 `src/components/common/NoteEditor.vue` 笔记编辑器 | P1 | 3h | ✅ 完成 | P5-03 |
| P6-14 | 创建 `src/components/common/SearchBar.vue` 搜索栏 | P1 | 2h | ✅ 完成 | - |
| P6-15 | 创建 `src/components/common/ThemeSwitcher.vue` 主题切换器 | P1 | 2h | ✅ 完成 | P1-06 |
| P6-16 | 创建 `src/components/common/LoadingSpinner.vue` 加载动画 | P1 | 1h | ✅ 完成 | P1-04 |

**验收标准**: 5 个页面可正常访问，核心交互流程完整。

---

## Phase 7: 工具层 + 安全（预计 8 小时）

| ID | 任务 | 优先级 | 预估 | 状态 | 依赖 |
|----|------|--------|------|------|------|
| P7-01 | 创建 `src/utils/validateFile.js` 文件验证工具 | P0 | 2h | ✅ 完成 | - |
| P7-02 | 创建 `src/utils/mdxScanner.js` MDX 恶意内容扫描 | P0 | 2h | ✅ 完成 | - |
| P7-03 | 创建 `src/utils/logger.js` 轻量日志模块 | P1 | 1h | ✅ 完成 | - |
| P7-04 | 创建 `src/utils/errorHandler.js` 错误分类处理 | P1 | 2h | ✅ 完成 | - |
| P7-05 | 创建 `src/utils/idbErrorHandler.js` IndexedDB 错误处理 | P1 | 1h | ✅ 完成 | P2-01 |

**验收标准**: 文件导入验证正常，错误捕获和提示友好。

---

## Phase 8: 联调 + 优化（预计 12 小时）

| ID | 任务 | 优先级 | 预估 | 状态 | 依赖 |
|----|------|--------|------|------|------|
| P8-01 | 端到端联调：书架→阅读器→词典查询完整流程 | P0 | 3h | 待开始 | Phase 6 |
| P8-02 | 性能优化：Trie 构建性能、词典查询延迟 | P0 | 3h | 待开始 | P8-01 |
| P8-03 | 响应式适配：手机/平板/PC 多端测试 | P0 | 2h | 待开始 | P8-01 |
| P8-04 | 暗色模式 + 护眼模式测试 | P1 | 2h | 待开始 | P6-15 |
| P8-05 | 构建产物分析 + 体积优化 | P1 | 2h | 待开始 | P8-02 |
| P8-06 | Vercel 部署验证 | P0 | 1h | 待开始 | P8-05 |

**验收标准**: 完整流程无 bug，首屏加载 < 2s，构建产物 < 500KB。

---

## 执行顺序

```
Phase 1 (基础设施) → Phase 2 (存储层) → Phase 3 (核心引擎) → Phase 4 (Service层)
                                        ↓
Phase 8 (联调优化) ← Phase 7 (工具层) ← Phase 6 (页面组件) ← Phase 5 (Pinia状态)
```

## 里程碑

| 里程碑 | 状态 |
|--------|------|
| **M1: 骨架搭建** | ✅ 完成 |
| **M2: 引擎就绪** | ✅ 完成 |
| **M3: 页面可用** | ✅ 完成 |
| **M4: 产品发布** | Phase 8 进行中 |
