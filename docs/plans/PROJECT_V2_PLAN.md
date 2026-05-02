# 般若佛经阅读器 v2.0 - 项目方案

> **版本**: v2.0.0-draft
> **创建日期**: 2026-05-02
> **状态**: 方案设计中
> **基于**: v1.0 实践复盘 + 词典性能优化讨论

---

## 一、项目概述

### 1.1 项目定位

**般若佛经阅读器**是一款专注佛教经文诵读的跨平台 Web 阅读工具，提供词典高亮、TTS 朗读、拼音标注、功德统计等核心功能。

**目标用户**: 佛教修行者、佛学爱好者、研究者

**核心理念**: 简单、专注、不打扰

### 1.2 v2.0 设计目标

| 目标 | v1.0 现状 | v2.0 目标 |
|------|-----------|-----------|
| 词典性能 | 全量加载，内存占用高 | 按需加载，首屏秒开 |
| 词典容量 | 硬编码 50+ 条 | 支持数万条、多词典并行 |
| 用户词典 | 简单 JSON 上传 | 支持 JSON/CSV/MDX，笔记层 |
| 词典管理 | 无 | 独立管理页面，开关、版本、体检 |
| 扩展性 | 前后端耦合 | 纯前端 + 预留后端 API 接口 |
| 数据持久化 | localStorage | IndexedDB 结构化存储 |
| 经书数据 | 硬编码在 JS 中 | 动态加载，按需取用 |

### 1.3 支持平台

| 平台 | 优先级 | 说明 |
|------|--------|------|
| **H5 Web** | P0 | PC/平板/手机响应式，首要平台 |
| 微信小程序 | P2 | 二期规划 |
| iOS/Android App | P3 | 三期规划 |

---

## 二、v1.0 复盘

### 2.1 v1.0 架构回顾

```
v1.0 架构（已归档至 archive/v1.0/）
├── src/
│   ├── data/
│   │   ├── sutras.js          # 5部佛经硬编码
│   │   ├── dictionary.js      # 50+ 术语硬编码
│   │   └── pronunciation-map.js
│   ├── utils/
│   │   ├── trie.js            # Trie 树（静态构建）
│   │   ├── tts.js             # Web Speech API 封装
│   │   └── storage.js         # localStorage 封装
│   ├── stores/                # Pinia 状态管理
│   ├── components/            # Vue 组件
│   └── pages/                 # 页面组件
```

### 2.2 v1.0 核心问题

#### 数据层问题
| 问题 | 严重度 | 说明 |
|------|--------|------|
| 词典全量加载 | 高 | 所有词条（含释义）一次性加载到内存，词典量增大后性能急剧下降 |
| 经书硬编码 | 高 | 新增佛经需要修改代码，无法动态扩展 |
| 存储碎片化 | 中 | localStorage + IndexedDB 混用，无统一数据管理 |

#### 架构问题
| 问题 | 严重度 | 说明 |
|------|--------|------|
| Trie 静态构建 | 高 | 不支持动态增删词条，词典开关切换无效 |
| 前后端耦合 | 中 | 数据硬编码在代码中，无法对接后端 API |
| 无数据版本管理 | 中 | 词典更新无法追溯，用户数据可能丢失 |

#### 功能缺失
| 功能 | 优先级 | 说明 |
|------|--------|------|
| 词典管理页面 | P0 | 无法管理已上传的词典 |
| 词典开关 | P0 | 无法单独启用/禁用词典 |
| MDX 词典支持 | P1 | 用户常用的词典格式 |
| 书签功能 | P2 | 阅读进度只有位置，无书签 |
| 笔记功能 | P2 | 无法对经文做笔记 |
| 搜索功能 | P1 | 无法搜索经文内容 |

### 2.3 v1.0 值得保留的设计

| 设计 | 说明 | v2.0 处理方式 |
|------|------|--------------|
| 禅意 UI 风格 | 极简、留白、温暖色调 | 保留并优化 |
| 多终端适配 | 手机/平板/PC 三种布局 | 保留 |
| Trie 匹配算法 | O(n) 时间复杂度 | 重构为动态版本 |
| TTS 引擎 | Web Speech API 封装 | 保留 |
| 拼音标注 | 佛教术语专属读音 | 保留 |
| Pinia 状态管理 | Vue 3 生态 | 保留 |

---

## 三、v2.0 整体架构

### 3.1 架构设计原则

1. **纯前端优先**：所有功能在前端完成，不依赖后端
2. **接口预留**：数据访问层抽象为接口，随时可切换为后端 API
3. **按需加载**：任何数据都只在使用时加载
4. **结构化存储**：统一使用 IndexedDB，告别 localStorage
5. **可插拔词典**：词典是独立插件，支持增删改查

### 3.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      UI 层 (Vue 3)                       │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ 书架页面  │ 阅读页面  │ 词典管理  │ 设置页面  │ 统计页面(新)  │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬───────┘
     │          │          │          │            │
┌────▼──────────▼──────────▼──────────▼────────────▼───────┐
│                   Service 层 (数据访问抽象)               │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ Sutras   │ Dictionaries│ TTS    │ Settings │ Statistics   │
│ Service  │ Service   │ Service │ Service  │ Service      │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬───────┘
     │          │          │          │            │
┌────▼──────────▼──────────▼──────────▼────────────▼───────┐
│                   Store 层 (Pinia)                       │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ sutra    │ dict     │ setting  │ progress │ stats        │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────────────┘
     │          │          │          │
┌────▼──────────▼──────────▼──────────▼───────────────────┐
│                   数据层 (Storage)                       │
├─────────────┬─────────────┬──────────────┬───────────────┤
│ IndexedDB   │ File Cache  │ In-Memory    │ Network(预留)  │
│ (结构化数据) │ (MDX 原文件) │ (Trie/缓存)  │ (后端 API)     │
└─────────────┴─────────────┴──────────────┴───────────────┘
```

### 3.3 目录结构

```
src/
├── main.js                          # 应用入口
├── App.vue                          # 根组件
├── router/
│   └── index.js                     # 路由配置
├── stores/                          # Pinia 状态管理
│   ├── sutra.js                     # 经书状态
│   ├── dict.js                      # 词典状态（含开关）
│   ├── reader.js                    # 阅读器状态
│   ├── setting.js                   # 全局设置
│   └── stats.js                     # 功德统计
├── services/                        # 数据访问服务层（核心抽象）
│   ├── sutraService.js              # 经书数据服务
│   ├── dictService.js               # 词典数据服务
│   ├── ttsService.js                # TTS 服务
│   ├── settingService.js            # 设置服务
│   └── statsService.js              # 统计服务
├── storage/                         # 底层存储实现
│   ├── db.js                        # IndexedDB 初始化
│   ├── sutraStore.js                # 经书表操作
│   ├── dictStore.js                 # 词典表操作
│   ├── progressStore.js             # 进度表操作
│   ├── settingStore.js              # 设置表操作
│   └── fileCache.js                 # 文件缓存（MDX 等）
├── engine/                          # 核心引擎
│   ├── trie/                        # Trie 树（动态版本）
│   │   ├── index.js
│   │   ├── node.js
│   │   └── merger.js               # 多 Trie 合并
│   ├── highlighter.js               # 高亮引擎
│   ├── pinyin.js                    # 拼音标注
│   └── mdxParser.js                 # MDX 解析器
├── components/                      # 可复用组件
│   ├── bookshelf/                   # 书架相关
│   ├── reader/                      # 阅读器相关
│   ├── dict/                        # 词典相关
│   └── common/                      # 通用组件
├── pages/                           # 页面组件
│   ├── Bookshelf.vue                # 书架页
│   ├── Reader.vue                   # 阅读页
│   ├── DictManager.vue              # 词典管理页（新）
│   ├── Settings.vue                 # 设置页
│   └── Stats.vue                    # 功德统计页（新）
├── utils/                           # 工具函数
│   ├── tts.js
│   ├── formatDefinition.js
│   └── ...
└── data/                            # 静态数据（仅内置数据）
    ├── builtinDictionary.js         # 内置词典（50+ 条）
    ├── sutraManifest.js             # 经书清单
    └── pronunciationMap.js          # 读音映射
```

---

## 四、核心模块详细设计

### 4.1 数据层设计（IndexedDB）

#### 4.1.1 数据库表结构

```
Database: buddhist-reader

Table: sutra_index (经书索引)
┌──────────────┬──────────┬─────────┬──────────┬─────────────┐
| id (PK)      | title    | author  | chapters | load_status |
├──────────────┼──────────┼─────────┼──────────┼─────────────┤
| xin-jing     | 心经     | 玄奘译  | 1        | ready       |
| jin-gang-jing| 金刚经   | 鸠摩罗什| 32       | partial     |
└──────────────┴──────────┴─────────┴──────────┴─────────────┘

Table: sutra_content (经文内容，分块存储)
┌─────────────────────┬────────────┬──────────┬──────────────┐
| id (PK)             | sutra_id   | chapter  | content      |
├─────────────────────┼────────────┼──────────┼──────────────┤
| xin-jing::ch0       | xin-jing   | 0        | 观自在菩萨...|
| jin-gang-jing::ch0  | jin-gang   | 0        | 如是我闻...  |
| jin-gang-jing::ch1  | jin-gang   | 1        | 善现起立...  |
└─────────────────────┴────────────┴──────────┴──────────────┘

Table: dict_index (词典索引 - 仅用于 Trie 匹配)
┌──────────────┬──────────┬──────────┬───────────┬───────────┐
| term         | dict_id  | pinyin   | category  | has_def   |
├──────────────┼──────────┼──────────┼───────────┼───────────┤
| 般若         | builtin  | bō rě   | 核心术语  | 1         |
| 般若         | user-001 | bō rě   |           | 1         |
| 涅槃         | builtin  | niè pán | 核心术语  | 1         |
└──────────────┴──────────┴──────────┴───────────┴───────────┘

Table: dict_entries (词典释义 - 按需加载)
┌────────────────────┬──────────┬──────────┬──────────────┬──────────┐
| key (PK)           | term     | pinyin   | definition   | category │
├────────────────────┼──────────┼──────────┼──────────────┼──────────┤
| builtin::般若      | 般若     | bō rě   | 梵语 prajñā..│ 核心术语  │
| user-001::般若     | 般若     | bō rě   | 个人补充笔记  │          │
└────────────────────┴──────────┴──────────┴──────────────┴──────────┘

Table: dict_config (词典配置)
┌──────────────┬──────────┬────────┬──────────┬──────────┬──────────┐
| dict_id (PK) | name     | type   | enabled  | entries  | version  │
├──────────────┼──────────┼────────┼──────────┼──────────┼──────────┤
| builtin      | 内置词典  | builtin| true     | 50       | 1.0.0    │
| user-001     | 我的词典  | user   | true     | 1200     | 1        │
└──────────────┴──────────┴────────┴──────────┴──────────┴──────────┘

Table: reading_progress (阅读进度)
┌──────────────────────┬────────────┬──────────┬──────────┬──────────┐
| id (PK)              | sutra_id   | chapter  | position │ read_time│
├──────────────────────┼────────────┼──────────┼──────────┼──────────┤
| progress::xin-jing   | xin-jing   | 0        | 120      | 300      │
└──────────────────────┴────────────┴──────────┴──────────┴──────────┘

Table: reading_stats (功德统计)
┌────────────────────┬────────────┬──────────┬──────────┬──────────┐
| id (PK)            | sutra_id   | date     | count    | duration │
├────────────────────┼────────────┼──────────┼──────────┼──────────┤
| stats::xin-jing::..| xin-jing   | 2026-05-02| 3      | 900      │
└────────────────────┴────────────┴──────────┴──────────┴──────────┘

Table: bookmarks (书签)
┌──────────────────────┬────────────┬──────────┬──────────┬──────────┐
| id (PK)              | sutra_id   | chapter  | position │ note     │
├──────────────────────┼────────────┼──────────┼──────────┼──────────┤
| bm::001              | xin-jing   | 0        | 50       | 重要段落  │
└──────────────────────┴────────────┴──────────┴──────────┴──────────┘

Table: user_notes (用户笔记层)
┌──────────────────────┬─────────────┬──────────┬──────────┬──────────┐
| id (PK)              | entry_key   | note     | created  │ updated  │
├──────────────────────┼─────────────┼──────────┼──────────┼──────────┤
| note::001            | builtin::般 | 我的理解..│ ...      │ ...      │
└──────────────────────┴─────────────┴──────────┴──────────┴──────────┘

Table: dict_versions (词典版本链)
┌────────────────────┬──────────┬──────────┬──────────┬──────────┐
| id (PK)            | dict_id  | version  | uploaded │ entries  │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
| ver::001           | user-001 | 1        | 2026-05-01│ 1000     │
| ver::002           | user-001 | 2        | 2026-05-02│ 1200     │
└────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

#### 4.1.2 Service 层接口设计

```javascript
// 所有 Service 实现统一接口，方便未来切换为后端 API

// ============ 词典服务 ============
class DictService {
  // 初始化：加载索引，构建 Trie
  async init()
  
  // 获取启用的词典列表
  async getEnabledDicts()
  
  // 获取所有词典列表（含开关状态）
  async getAllDicts()
  
  // 切换词典开关
  async toggleDict(dictId, enabled)
  
  // 查询词条释义（按需加载）
  async lookupTerm(term, dictIds)
  
  // 批量查询（多词典并行）
  async lookupBatch(term, options)
  
  // 导入词典（JSON/CSV/MDX）
  async importDict(file, options)
  
  // 删除词典
  async deleteDict(dictId)
  
  // 获取词典版本历史
  async getDictVersions(dictId)
  
  // 获取词典体检报告
  async getDictHealthReport(dictId)
  
  // 添加/更新用户笔记
  async setUserNote(entryKey, note)
  
  // 获取用户笔记
  async getUserNote(entryKey)
}

// ============ 经书服务 ============
class SutraService {
  // 获取经书列表
  async getSutraList()
  
  // 获取单部经书（按需加载章节）
  async getSutra(id)
  
  // 获取指定章节内容
  async getChapter(sutraId, chapterIndex)
  
  // 导入经书（txt 格式）
  async importSutra(file, metadata)
}

// ============ 阅读进度服务 ============
class ProgressService {
  // 保存阅读进度
  async saveProgress(sutraId, chapter, position)
  
  // 获取阅读进度
  async getProgress(sutraId)
  
  // 获取所有进度
  async getAllProgress()
}

// ============ 统计服务 ============
class StatsService {
  // 记录诵读
  async recordSession(sutraId, duration)
  
  // 获取统计数据
  async getStats(period)
  
  // 获取连续诵读天数
  async getStreak()
}
```

### 4.2 Trie 引擎设计

#### 4.2.1 分层 Trie 架构

```
┌─────────────────────────────────────────┐
│          TrieManager (管理器)            │
│  - 管理多个 Trie 实例                    │
│  - 按需构建/销毁 Trie                    │
│  - 合并多个 Trie 的搜索结果               │
└──────────────────┬──────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│ Trie     │  │ Trie     │  │ Trie     │
│ builtin  │  │ user-001 │  │ user-002 │
│ (常驻)   │  │ (懒加载) │  │ (懒加载) │
└─────────┘  └─────────┘  └─────────┘
```

#### 4.2.2 Trie 工作流程

```
1. 初始化阶段
   ├── 从 IndexedDB 读取 dict_index 表（仅 term + dict_id）
   ├── 为 builtin 词典构建 Trie（常驻内存）
   └── 用户词典只记录 term 列表，暂不构建 Trie

2. 用户启用词典时
   ├── 从 dict_index 读取该词典的所有 term
   ├── 构建该词典的 Trie
   └── 注册到 TrieManager

3. 阅读页高亮匹配
   ├── 遍历 TrieManager 中所有已启用词典的 Trie
   ├── 分别搜索，收集匹配结果
   ├── 按长词优先策略去重
   └── 返回匹配结果（含 term 位置和所属词典）

4. 用户关闭词典时
   ├── 从 enabledDictIds 移除
   ├── 可选：销毁该词典的 Trie 释放内存
   └── 下次搜索自动跳过
```

#### 4.2.3 Trie 代码结构

```javascript
// engine/trie/node.js - Trie 节点
class TrieNode {
  constructor() {
    this.children = new Map()  // char -> TrieNode
    this.isEnd = false
    this.dictIds = []          // 包含此词条的词典 ID 列表
  }
}

// engine/trie/index.js - Trie 树
class Trie {
  constructor(dictId) {
    this.dictId = dictId
    this.root = new TrieNode()
  }
  
  insert(term, dictId) { ... }
  search(text) { return matches }  // [{ term, start, end, dictId }]
  build(terms) { ... }
  destroy() { this.root = null }   // 释放内存
}

// engine/trie/merger.js - 多 Trie 合并
class TrieMerger {
  constructor() {
    this.tries = new Map()         // dictId -> Trie
    this.enabledDicts = new Set()  // 启用的词典 ID
  }
  
  register(dictId, trie) { ... }
  unregister(dictId) { ... }
  enable(dictId) { ... }
  disable(dictId) { ... }
  
  // 搜索所有已启用词典
  searchAll(text) {
    const results = []
    for (const [dictId, trie] of this.tries) {
      if (this.enabledDicts.has(dictId)) {
        results.push(...trie.search(text))
      }
    }
    return this.deduplicate(results)
  }
  
  // 长词优先去重
  deduplicate(matches) { ... }
}
```

### 4.3 词典延迟加载

#### 4.3.1 加载流程

```
用户点击高亮术语 "般若"
         │
         ▼
┌─────────────────────┐
│  1. 检查内存缓存     │  cache.get("builtin::般若")
│     命中？→ 直接返回  │
└──────────┬──────────┘
           │ 未命中
           ▼
┌─────────────────────┐
│  2. 查询 IndexedDB   │  db.get("dict_entries", key)
│     异步加载 definition │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. 写入缓存         │  cache.set("builtin::般若", entry)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. 合并用户笔记     │  如果有笔记层，追加到释义后
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. 渲染弹窗         │  展示释义
└─────────────────────┘
```

#### 4.3.2 多词典流式展示

```javascript
// 点击术语时，并行查询所有启用词典
async function showTermPopup(term, enabledDictIds) {
  // 先显示加载中的基础信息
  showLoading(term)
  
  const results = []
  
  // 为每个词典创建独立查询
  const queries = enabledDictIds.map(async (dictId) => {
    const entry = await dictService.lookupTerm(term, dictId)
    if (entry) {
      results.push({ dictId, ...entry })
      // 流式追加：每完成一个就更新 UI
      appendToPopup(dictId, entry)
    }
  })
  
  await Promise.allSettled(queries)
  
  // 全部完成后移除加载提示
  hideLoading()
}
```

### 4.4 MDX 词典支持

#### 4.4.1 处理方式

| 文件大小 | 处理方式 | 说明 |
|----------|----------|------|
| < 5MB | 预解析为 JSON 存入 IndexedDB | 查询快，接口统一 |
| >= 5MB | 保留原文件，用 mdict-js 实时查询 | 省空间 |

#### 4.4.2 MDX 解析流程

```
用户上传 .mdx 文件
         │
         ▼
┌─────────────────────┐
│  1. 读取文件大小     │
│     < 5MB → 预解析   │
│     >= 5MB → 原文件  │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌─────────┐  ┌──────────┐
│ 预解析   │  │ 原文件存储│
│ 提取词头  │  │ 存入缓存  │
│ 提取释义  │  │ 按需查询  │
│ 存入 DB  │  │ mdict-js │
└────┬────┘  └────┬─────┘
     │            │
     └──────┬─────┘
            ▼
┌─────────────────────┐
│  2. 生成体检报告     │
│     词条数、重复率    │
│     格式问题等        │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  3. 默认启用         │
│     加入 TrieManager │
└─────────────────────┘
```

### 4.5 用户笔记层

#### 4.5.1 数据模型

```
原始词典数据（不可变，存于 dict_entries）
    ↓
用户笔记层（追加/覆盖，存于 user_notes）
    ↓
渲染时合并展示
```

```javascript
// 查询时合并
async function lookupWithNote(term, dictId) {
  const entry = await db.get('dict_entries', `${dictId}::${term}`)
  const note = await db.get('user_notes', `${dictId}::${term}`)
  
  if (entry && note) {
    return {
      ...entry,
      userNote: note.content,
      definition: `${entry.definition}\n\n---\n📝 ${note.content}`
    }
  }
  return entry
}
```

#### 4.5.2 笔记交互

- 在词典弹窗中，每个释义卡片底部有"添加笔记"按钮
- 点击后弹出编辑框，用户可输入个人理解
- 笔记与原始释义分离存储，不破坏原数据
- 笔记支持编辑和删除

### 4.6 词典开关交互

#### 4.6.1 设置页面布局

```
┌──────────────────────────────────────┐
│  词典管理                            │
├──────────────────────────────────────┤
│                                      │
│  📖 内置词典                    [ON] │
│     50 条 · 官方                     │
│                                      │
│  📚 中华佛教百科全书            [ON] │
│     12,340 条 · 官方                 │
│     关闭后将少高亮 8,920 个词条       │
│                                      │
│  📚 佛学大辞典                  [OFF]│
│     5,670 条 · 官方                  │
│                                      │
│  📁 我的笔记词典                [ON] │
│     1,200 条 · 个人                  │
│     版本 2 · 2026-05-02              │
│                                      │
│  ───────────────────────────────     │
│  [全部启用]  [全部禁用]              │
│                                      │
│  ───────────────────────────────     │
│  [+ 导入词典]                        │
│                                      │
└──────────────────────────────────────┘
```

#### 4.6.2 开关行为

| 操作 | 行为 |
|------|------|
| 滑动开关 | 立即生效，保存到 IndexedDB |
| 关闭词典 | 显示受影响词条数："关闭后将少高亮 X 个词条" |
| 全部关闭 | 高亮功能也关闭（D8 决策） |
| 上传新词典 | 默认开启（D9 决策） |
| 切换后 | 阅读页高亮实时刷新 |

### 4.7 词典体检报告

上传词典后自动生成：

```
┌──────────────────────────────────────┐
│  词典体检报告                        │
├──────────────────────────────────────┤
│                                      │
│  词典名称：佛学大辞典                │
│  文件大小：3.2 MB                    │
│                                      │
│  ✅ 词条总数：5,670                  │
│  ⚠️ 与内置词典重复：23 条            │
│  ✅ 有释义词条：5,647                │
│  ⚠️ 缺少释义：23 条                  │
│  ✅ 格式正常                         │
│                                      │
│  [查看详情]  [确认导入]              │
│                                      │
└──────────────────────────────────────┘
```

---

## 五、技术选型

### 5.1 核心技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.4.0 | Composition API |
| 构建工具 | Vite | ^5.0.0 | |
| UI 组件 | Vant 4 | ^4.8.0 | 移动端优先 |
| 路由 | Vue Router | ^4.3.0 | |
| 状态管理 | Pinia | ^2.1.7 | |
| IndexedDB 封装 | idb | ^7.x | 轻量 Promise 封装 |
| MDX 解析 | mdict-js | ^10.x | 已有的依赖 |
| LZO 解压 | lzo-wasm | ^0.0.4 | MDX 依赖 |
| Markdown 渲染 | marked | ^12.x | 待决策 D15 |
| TTS | Web Speech API | 原生 | 浏览器内置 |

### 5.2 为什么选 idb 而不是 Dexie.js

| 对比 | idb | Dexie.js |
|------|-----|----------|
| 体积 | ~1KB (gzip) | ~7KB (gzip) |
| API 风格 | 原生 Promise，接近 IndexedDB | ORM 风格，学习曲线低 |
| 灵活性 | 高，直接操作 | 封装较深 |
| 适合场景 | 简单表结构，需要精细控制 | 复杂查询，关系映射 |

**决策**：v2.0 表结构简单，不需要复杂查询，选 `idb` 更轻量。

---

## 六、数据模型

### 6.1 统一数据格式

所有词典数据（无论来源）统一为以下格式：

```javascript
{
  term: '般若',              // 词条（必需）
  pinyin: 'bō rě',           // 拼音（可选）
  sanskrit: 'prajñā',        // 梵文（可选）
  definition: '梵语 prajñā...',  // 释义（必需，支持 Markdown）
  category: '核心术语',       // 分类（可选）
  
  // 系统字段（自动生成）
  _dictId: 'builtin',        // 词典 ID
  _dictName: '内置词典',     // 词典名称
  _sourceId: 'builtin',      // 来源 ID
  _version: 1,               // 词典版本
}
```

### 6.2 经书数据格式

```javascript
{
  id: 'xin-jing',
  title: '心经',
  fullName: '般若波罗蜜多心经',
  translator: '唐三藏法师玄奘译',
  cover: '📖',
  description: '...',
  chapters: [
    { index: 0, title: '全文', wordCount: 260 }
  ],
  totalWordCount: 260,
  loadStatus: 'ready',  // pending | loading | ready | error
}
```

### 6.3 词典配置格式

```javascript
{
  dictId: 'user-001',
  name: '我的词典',
  type: 'user',        // builtin | external | user
  enabled: true,
  entryCount: 1200,
  version: 2,
  uploadedAt: '2026-05-02T10:00:00Z',
  fileSize: 3200000,   // 字节
  sourceFile: 'my-dict.mdx',  // 原文件名（MDX 直接读时保留）
  mdxStrategy: 'direct',      // parsed | direct
}
```

---

## 七、开发阶段规划

### Phase 1: 基础架构（2 周）

| 任务 | 工时 | 优先级 | 产出 |
|------|------|--------|------|
| 项目初始化（Vue3+Vite+Vant） | 2h | P0 | 项目骨架 |
| IndexedDB 表结构设计与实现 | 4h | P0 | storage/ 模块 |
| Service 层接口定义 | 3h | P0 | services/ 模块 |
| Pinia Store 重构 | 4h | P0 | stores/ 模块 |
| Trie 引擎重构（动态版本） | 6h | P0 | engine/trie/ 模块 |
| 内置词典迁移 | 2h | P0 | 数据导入 |

**交付物**：可运行的基础框架，内置词典可用，高亮功能正常。

### Phase 2: 核心功能（3 周）

| 任务 | 工时 | 优先级 | 产出 |
|------|------|--------|------|
| 经书动态加载 | 4h | P0 | SutraService |
| 词典延迟加载 | 6h | P0 | DictService 按需查询 |
| 词典开关功能 | 4h | P0 | DictManager 页面 |
| 词典上传（JSON/CSV） | 6h | P0 | 导入功能 |
| 多词典流式展示 | 4h | P1 | DictionaryPopup 重构 |
| 词典管理页面 | 6h | P0 | 完整的词典管理 |

**交付物**：完整的词典管理系统，支持上传、开关、按需加载。

### Phase 3: 增强功能（2 周）

| 任务 | 工时 | 优先级 | 产出 |
|------|------|--------|------|
| MDX 词典支持 | 8h | P0 | mdxParser |
| 用户笔记层 | 4h | P1 | user_notes 表 |
| 词典体检报告 | 4h | P1 | 上传后报告 |
| 词典版本管理 | 4h | P2 | 版本链 |
| 书签功能 | 4h | P2 | 书签管理 |
| 搜索功能 | 4h | P1 | 经文搜索 |

**交付物**：MDX 支持、笔记、书签、搜索。

### Phase 4: 优化与上线（1 周）

| 任务 | 工时 | 优先级 | 产出 |
|------|------|--------|------|
| 性能优化 | 4h | P0 | 首屏 < 1s |
| 响应式完善 | 3h | P0 | 多终端适配 |
| 缓存策略 | 3h | P1 | 释义缓存 |
| 文档完善 | 4h | P0 | README + 使用指南 |
| 部署配置 | 2h | P0 | Vercel 部署 |

**交付物**：生产就绪的 v2.0 版本。

---

## 八、性能预期

| 指标 | v1.0 | v2.0 目标 |
|------|------|-----------|
| 首屏加载时间 | ~2s | < 1s |
| 内存占用（内置+1 用户词典） | ~50MB | < 20MB |
| 词典初始化时间 | 全量加载 | < 100ms（仅索引） |
| 高亮响应时间 | 即时 | < 50ms |
| 释义加载时间 | N/A | < 200ms（IndexedDB 查询） |
| 最大词典数量 | 硬编码 | 无限制 |
| 单词典最大条目 | 50 | 100,000+ |

---

## 九、迁移策略

### 9.1 v1.0 数据迁移

v1.0 使用 localStorage 存储的数据需要在首次启动 v2.0 时自动迁移：

```javascript
// 迁移脚本
async function migrateFromV1() {
  const hasMigrated = await db.get('settings', 'migrated')
  if (hasMigrated) return
  
  // 迁移阅读进度
  const v1Progress = localStorage.getItem('buddhist-reader-progress')
  if (v1Progress) {
    await progressStore.save(JSON.parse(v1Progress))
  }
  
  // 迁移用户设置
  const v1Settings = localStorage.getItem('buddhist-reader-settings')
  if (v1Settings) {
    await settingStore.save(JSON.parse(v1Settings))
  }
  
  // 迁移用户词典
  // ...
  
  await db.put('settings', 'migrated', true)
}
```

### 9.2 向后兼容

- v2.0 保留 v1.0 的所有功能
- v1.0 的经书数据自动导入
- 用户自定义词典自动迁移
- 阅读进度无缝衔接

---

## 十、风险与应对

### 10.1 技术风险

| 风险 | 概率 | 影响 | 应对方案 |
|------|------|------|---------|
| IndexedDB 兼容性问题 | 低 | 中 | 降级方案：localStorage + 分块 |
| Trie 内存占用过大 | 中 | 中 | 限制同时启用的词典数量，超大词典用懒加载 |
| MDX 解析兼容性 | 中 | 中 | 只支持主流 MDX 格式，不支持的提示转换 |
| 移动端存储限制 | 高 | 高 | 上传前检查，大文件自动切换 direct 模式 |

### 10.2 进度风险

| 风险 | 概率 | 影响 | 应对方案 |
|------|------|------|---------|
| MDX 支持耗时超预期 | 高 | 中 | 先做 JSON/CSV，MDX 放 Phase 3 |
| 需求范围蔓延 | 中 | 高 | 严格按 Phase 执行，P2 功能可延后 |
| 测试不充分 | 中 | 高 | 每个 Phase 交付前自测 |

---

## 十一、决策汇总

完整决策记录见：`DICTIONARY_OPTIMIZATION_DISCUSSION.md`

### 核心决策速查

| 编号 | 决策点 | 结果 |
|------|--------|------|
| D1 | 数据库技术 | IndexedDB 纯前端，预留 API |
| D2 | 数据拆分 | 分块懒加载 |
| D3 | MDX 支持 | 第一期支持 |
| D4 | Trie 更新 | 懒标记（查询时检查开关） |
| D5 | 多词典展示 | 默认最高优先级 + 展开 |
| D6 | 词典开关 | 滑动开关 + 本地持久化 |
| D7 | 生效时机 | 立即生效 |
| D8 | 全部关闭 | 高亮功能也关闭 |
| D9 | 新词典默认 | 默认开启 |
| D10 | 用户编辑 | 笔记层（不破坏原数据） |
| D11 | 体检报告 | 需要 |
| D12 | 开关提示 | 显示受影响词条数 |
| D13 | 版本更新 | 智能合并（待讨论） |
| D14 | 重复上传 | 版本链 |
| D15 | 释义格式 | 统一 Markdown（待讨论） |
| D16 | 进度高亮 | 解耦，只存位置 |

---

## 十二、未解决 / 待决策问题

以下是需要在开发前确定的问题，详见 `DICTIONARY_OPTIMIZATION_DISCUSSION.md` 第六章：

### 12.1 需要立即决策

| 问题 | 选项 | 建议 |
|------|------|------|
| **Trie 索引数据结构** | A. 最小索引（仅 dictId）B. 轻量索引（含 pinyin, category） | B |
| **MDX 处理方式** | A. 预解析 B. 直接读 | 小文件预解析，大文件直接读 |
| **多词典展示策略** | A. 并行等待 B. 流式加载 | B |
| **Trie 构建时机** | A. 持久化 B. 每次重建 | B |
| **分层 vs 单一 Trie** | A. 分层 Trie B. 单一 Trie + 懒标记 | 分层 Trie + 懒标记（结合 D4） |

### 12.2 需要详细讨论

| 问题 | 编号 | 说明 |
|------|------|------|
| **内置词典版本智能合并** | D13 | 内置更新与用户笔记的冲突处理 |
| **释义格式统一 Markdown** | D15 | HTML → Markdown 转换、渲染层、特殊格式保留 |
| **单文件 10MB + 切割** | D18 | 切割方案可行性 |

### 12.3 暂不决策（远期）

| 问题 | 编号 | 说明 |
|------|------|------|
| **知识卡片泛化** | D21 | 数据模型预留扩展字段 |
| **词典分享/市场** | D22 | 明确列入"不做清单" |
| **离线远程词典缓存** | 未编号 | 未来有远程词典时的缓存策略 |
| **体检报告具体指标** | D11 | 需要详细定义指标列表 |

---

*文档版本: v2.0.0-draft*
*最后更新: 2026-05-02*
