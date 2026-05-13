# 经文搜索功能 分析报告

> 任务编号：T-22
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

v2.0 项目方案中将搜索功能列为 P1 优先级，安排在 Phase 3 开发（预估 4h 工时）。当前 v1.0 无任何搜索能力，用户无法快速定位经文中的特定内容。

**目标**：为般若佛经阅读器设计一套轻量、高效的经文内容搜索方案，满足用户在单部经书内搜索关键词、查看搜索结果上下文、跳转到搜索结果位置的需求。设计需符合"简单、专注、不打扰"的核心理念，同时兼顾性能——搜索响应时间应 < 200ms，不阻塞阅读体验。

**核心使用场景**：
1. 用户在阅读页搜索某个术语或段落（如"般若"、"色不异空"）
2. 搜索结果列表展示匹配位置和上下文摘要
3. 点击搜索结果跳转到对应位置并高亮匹配文字
4. 搜索历史记录方便快速重新搜索

## 2. 搜索方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **正则全文搜索** | 实现最简单，零依赖，无需构建索引；适合小文本（< 10万字） | 每次搜索都要遍历全文，文本量大时性能差；不支持分词 | 心经（260字）、金刚经（5000字）等短经书 |
| **FlexSearch 倒排索引** | 目前 Web 端最快的全文搜索库，WASM 优化，毫秒级响应；支持中文分词；支持模糊搜索 | 需要构建索引，增加约 50KB gzip 体积；索引构建有初始开销 | 多经书搜索、大藏经等超长文本（> 10万字） |
| **Lunr.js 倒排索引** | 轻量（~20KB gzip），API 简单，支持多字段搜索 | 中文分词需额外配置；速度不如 FlexSearch | 中等规模文本，需要多字段搜索 |
| **Trie 树复用** | 已有 Trie 引擎可复用，零额外依赖 | Trie 仅支持前缀匹配，不支持任意关键词搜索；不适合全文搜索 | 不适用——Trie 为词典高亮设计，非搜索场景 |
| **IndexedDB 全文索引** | 数据持久化，支持跨经书搜索 | IndexedDB 本身不支持全文搜索，需要额外建索引表 | 远期多经书跨库搜索 |

**方案选择分析**：

1. **正则方案**对于本项目的主力经书（心经 260 字、金刚经约 5200 字、法华经约 7 万字）来说，心经和金刚经完全没有性能问题。但法华经等长经文，正则搜索在移动端可能需要 100-300ms，仍可接受。

2. **FlexSearch 方案**性能最优，中文搜索体验好，且官方文档明确推荐"数据变更时重建索引"策略（与 Trie 重建策略一致），实现简单。

3. **Trie 复用不可行**——Trie 树的逐字扫描算法（从每个位置出发匹配词典前缀）与全文搜索（在文本中查找任意关键词）的算法目标完全不同。

**决策：采用分层策略——当前用正则全文搜索，预留 FlexSearch 升级路径。**

理由：
- v2.0 内置经书总字数有限，正则搜索性能完全够用
- 经文内容以 `sutra_content` 表分块存储（按章节），正则搜索只遍历当前经书的章节内容，数据量可控
- 不增加依赖体积，保持首屏加载性能
- 当用户上传自定义长经文（> 10 万字）时，可切换到 FlexSearch 方案

## 3. 搜索结果展示

### 3.1 搜索入口

**阅读页内搜索**（核心场景）：
- 阅读页工具栏提供搜索图标
- 点击后顶部展开搜索面板，不离开阅读页
- 搜索面板包含：搜索框 + 结果列表

```
┌──────────────────────────────────────┐
│  ← 搜索经文                          │ ← 顶部搜索栏
├──────────────────────────────────────┤
│ 🔍 [输入关键词...             ] [搜索]│
├──────────────────────────────────────┤
│                                      │
│ 📖 第3品 · 大乘正宗分               │
│ ──────────────────────────────────── │
│ ...所有一切众生之类，若卵生、若胎生  │
│     ^^匹配关键词^^                    │
│                                      │
│ 📖 第3品 · 大乘正宗分               │
│ ──────────────────────────────────── │
│ ...若有色、若无色，若有想、若无想... │
│         ^^匹配关键词^^                │
│                                      │
├──────────────────────────────────────┤
│ 共找到 12 处匹配                      │
└──────────────────────────────────────┘
```

**跨经书搜索**（v2.1 规划）：
- 书架页提供全局搜索入口
- 同时搜索所有已加载经书
- 结果按经书分组展示

### 3.2 结果展示规则

| 维度 | 规则 |
|------|------|
| **排序** | 按经文中的出现顺序排列（从头到尾），用户阅读时可顺序查看 |
| **上下文** | 每个匹配展示关键词前后各 30 字的上下文摘要 |
| **高亮** | 关键词在上下文中用 `<mark>` 标签高亮 |
| **章节标注** | 每个结果标注所属章节（品）名称 |
| **数量** | 底部显示"共找到 N 处匹配" |
| **无结果** | 展示"未找到匹配结果"提示，并建议缩短关键词 |

### 3.3 上下文摘要算法

```javascript
function getContext(text, matchIndex, contextLen = 30) {
  const start = Math.max(0, matchIndex - contextLen)
  const end = Math.min(text.length, matchIndex + matchText.length + contextLen)
  let context = text.slice(start, end)

  // 添加省略标记
  if (start > 0) context = '...' + context
  if (end < text.length) context = context + '...'

  return context
}
```

### 3.4 不做

- **搜索结果分页**：经文搜索结果通常不多（< 50 条），不需要分页，使用滚动即可
- **搜索结果排序选项**：佛经搜索结果按出现顺序排列最自然，不需要按相关性排序
- **多关键词布尔搜索**（AND/OR/NOT）：v2.0 不做，保持简单

## 4. 搜索高亮

### 4.1 阅读页内高亮方案

**方案选择：TreeWalker + `<mark>` 标签**

当用户点击搜索结果跳转到匹配位置时，在阅读页正文中高亮匹配文字：

```javascript
function highlightInDocument(keyword, container) {
  // 1. 清除旧高亮
  clearHighlights(container)

  // 2. 转义正则特殊字符
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')

  // 3. 遍历文本节点（不破坏 HTML 结构）
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )

  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)

  // 4. 对每个文本节点做匹配和替换
  textNodes.forEach(node => {
    if (regex.test(node.textContent)) {
      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      node.textContent.replace(regex, (match, p1, offset) => {
        // 添加匹配前的普通文本
        fragment.appendChild(
          document.createTextNode(node.textContent.slice(lastIndex, offset))
        )
        // 添加高亮标记
        const mark = document.createElement('mark')
        mark.className = 'sutra-search-highlight'
        mark.textContent = match
        fragment.appendChild(mark)
        lastIndex = offset + match.length
        return match
      })

      // 添加剩余文本
      fragment.appendChild(
        document.createTextNode(node.textContent.slice(lastIndex))
      )

      node.parentNode.replaceChild(fragment, node)
    }
  })

  // 5. 滚动到第一个高亮
  const firstMark = container.querySelector('.sutra-search-highlight')
  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function clearHighlights(container) {
  const marks = container.querySelectorAll('mark.sutra-search-highlight')
  marks.forEach(mark => {
    const parent = mark.parentNode
    parent.replaceChild(document.createTextNode(mark.textContent), mark)
    parent.normalize() // 合并相邻文本节点
  })
}
```

### 4.2 高亮样式

```css
/* 禅意风格——柔和的暖色调，不同于词典高亮 */
.sutra-search-highlight {
  background-color: rgba(255, 183, 77, 0.35); /* 琥珀色半透明 */
  color: inherit;
  padding: 1px 2px;
  border-radius: 2px;
  border-bottom: 1px solid rgba(255, 152, 0, 0.5);
}
```

### 4.3 高亮清理

- 搜索面板关闭时自动清除所有搜索高亮
- 切换章节时自动清除当前高亮
- 用户可手动点击"清除高亮"按钮

### 4.4 多关键词高亮

v2.0 仅支持单关键词搜索和高亮。多关键词同时高亮留到 v2.1。

## 5. 搜索历史

### 5.1 存储方案

**IndexedDB 存储**（与项目整体数据策略一致）

```
Table: search_history
┌─────────────────────┬──────────────┬──────────────┬──────────────┐
| id (PK)             | sutra_id     | keyword      | created_at   |
├─────────────────────┼──────────────┼──────────────┼──────────────┤
| sh::001             | xin-jing     | 般若         | 2026-05-02   |
| sh::002             | xin-jing     | 舍利子       | 2026-05-01   |
| sh::003             | jin-gang-jing| 无我相       | 2026-04-30   |
└─────────────────────┴──────────────┴──────────────┴──────────────┘

索引：
- idx_sutra_keyword: (sutra_id, created_at DESC)  — 按经书查历史
- idx_recent: (created_at DESC)                    — 按时间排序
```

### 5.2 历史记录管理

| 维度 | 规则 |
|------|------|
| **记录时机** | 用户执行一次有效搜索（关键词非空且有结果）后自动保存 |
| **去重** | 相同经书 + 相同关键词不重复记录，更新 `created_at` |
| **上限** | 每部经书最多保留 20 条历史记录（LRU 淘汰） |
| **总量** | 全局最多保留 100 条（防止 IndexedDB 膨胀） |
| **展示** | 搜索框聚焦时，在结果列表上方展示"最近搜索"列表 |
| **删除** | 单条可点击删除；支持"清除全部" |

### 5.3 搜索建议

**v2.0 不做输入联想/自动补全**。理由：
1. 佛经文言文不同于日常语言，自动补全的准确率很低
2. 经文总字数有限，用户通常知道自己要搜什么
3. 增加交互复杂度，违背"简单、不打扰"理念

**v2.1 可考虑**：
- 基于搜索历史的输入联想（用户之前搜过的词）
- 基于词典术语的输入联想（搜索框输入时提示匹配的词典术语）

### 5.4 Service 接口

```javascript
class SearchService {
  // 搜索经文内容
  async searchSutra(sutraId, keyword)

  // 获取搜索历史
  async getSearchHistory(sutraId, limit = 20)

  // 保存搜索记录
  async saveSearchHistory(sutraId, keyword)

  // 删除单条搜索历史
  async deleteSearchHistory(id)

  // 清除某经书的全部搜索历史
  async clearSearchHistory(sutraId)

  // 清除全部搜索历史
  async clearAllSearchHistory()
}
```

## 6. 结论与建议

### 6.1 经文搜索方案

| 维度 | 决策 | 理由 |
|------|------|------|
| **搜索引擎** | 正则全文搜索（当前）+ FlexSearch 预留（远期） | 经文字数可控，正则性能足够；FlexSearch 体积 ~50KB gzip，可在需要时引入 |
| **搜索范围** | 当前阅读的经书 | v2.0 专注单经书内搜索，跨经书搜索留给 v2.1 |
| **结果展示** | 搜索面板内列表，上下文摘要 + 章节标注 | 不离开阅读页，保持沉浸式阅读体验 |
| **结果排序** | 按经文出现顺序 | 最自然的佛经阅读顺序 |
| **跳转高亮** | TreeWalker + `<mark>` 标签，琥珀色柔和样式 | 安全操作 DOM，不破坏经文结构；样式与词典高亮区分 |
| **搜索历史** | IndexedDB 存储，每经书 20 条上限 | 与项目整体存储策略一致；有上限防止膨胀 |
| **搜索建议** | v2.0 不做 | 保持简单，佛经场景自动补全价值有限 |

### 6.2 性能预估

| 场景 | 预估耗时 | 说明 |
|------|----------|------|
| 心经（260字）搜索 | < 5ms | 正则匹配几乎瞬时 |
| 金刚经（5000字）搜索 | < 10ms | 正则匹配极快 |
| 法华经（7万字）搜索 | 50-150ms | 正则全文扫描，移动端可接受 |
| 10万字+ 自定义经文 | 150-300ms | 接近阈值，建议升级 FlexSearch |
| DOM 高亮渲染 | 20-50ms | TreeWalker 遍历 + 替换 |
| 搜索结果面板渲染 | < 50ms | 最多 50 条结果，列表渲染快 |

### 6.3 数据模型

在 v2.0 方案基础上，新增 `search_history` 表（见第 5.1 节）。经文内容搜索不需要新建索引表——直接查询 `sutra_content` 表的 `content` 字段。

### 6.4 SutraService 扩展

在 v2.0 方案 `SutraService` 接口基础上增加：

```javascript
class SutraService {
  // ... 已有接口 ...

  // 搜索经文内容（返回匹配列表）
  async searchSutra(sutraId, keyword)
  // 返回: [{ chapterIndex, matchIndex, context, matchText }]
}
```

## 7. 对 v2.1 方案的影响

1. **FlexSearch 升级路径**：当前正则方案已封装为 `SutraService.searchSutra()` 方法。v2.1 若需引入 FlexSearch，只需替换该方法内部实现，对外接口不变，不影响调用方。

2. **跨经书搜索基础**：v2.0 的搜索历史表设计为 `(sutra_id, keyword)` 结构，天然支持跨经书聚合查询。v2.1 实现全局搜索时可直接复用此表。

3. **搜索高亮与词典高亮的冲突处理**：当前方案中搜索高亮使用 `<mark class="sutra-search-highlight">`，词典高亮使用独立的 class 和颜色。两者可能重叠（用户搜索的词恰好也是词典术语）。v2.1 需要设计层叠规则：搜索高亮在视觉上应更突出（前景），词典高亮作为背景。

4. **搜索索引预构建**：如果 v2.1 引入 FlexSearch，可以考虑在首次加载经书时异步构建搜索索引并存入 IndexedDB，避免每次搜索都重新构建。这与 v2.0 的"按需加载"原则一致——索引在首次搜索时构建，后续复用。

5. **与笔记功能的联动**：搜索功能的结果展示模式（上下文摘要 + 跳转定位）可复用于笔记列表。用户在笔记列表中点击某条笔记时，同样需要跳转到对应位置并高亮标注范围。

6. **Phase 3 工作量评估**：搜索功能预估 4h 工时合理，具体拆解为：
   - `SutraService.searchSutra()` 实现：0.5h
   - `searchStore` IndexedDB 表 + SearchService 历史管理：1h
   - 搜索面板 UI（搜索框 + 结果列表）：1h
   - DOM 高亮引擎 + 跳转定位：1h
   - 测试和调试：0.5h
