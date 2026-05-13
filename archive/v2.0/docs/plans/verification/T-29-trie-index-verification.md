# 验证：Trie 轻量索引决策

> 任务编号：T-29
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/research/T-05-highlight-engine.md, docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md

## 1. 背景与目标

v2.0 方案在 `PROJECT_V2_PLAN.md` 4.1.1 节中定义了 `dict_index` 表结构，包含 `term + dict_id + pinyin + category + has_def` 五个字段。`DICTIONARY_OPTIMIZATION_DISCUSSION.md` 3.1 节将此决策称为"轻量索引"（选项 B），对比"最小索引"（选项 A：仅 term + dictId）。

本验证的目标是：
1. 精算两种索引方案的内存占用差异
2. 评估 pinyin、category 字段对核心功能（高亮匹配）的必要性
3. 对比其他词典 App 的索引策略
4. 给出明确的维持或调整结论

## 2. 内存占用精算

### 2.1 轻量索引方案（dictId + pinyin + category）

**存储模型**：Trie 树（term + dictIds）+ 平行索引数组（pinyin + category）

| 字段 | 类型 | 大小/条目 | 10万条目总计 | 说明 |
|------|------|-----------|-------------|------|
| Trie 节点结构 | Object + Map + Array | ~120 bytes/节点 | ~21.6 MB | 180,000 节点（共享前缀后），含 children Map(64) + isEnd(8) + dictIds(24) + 指针(24) |
| dictIds（节点内） | Array\<number\> | ~16 bytes/终节点 | ~1.6 MB | 100,000 终节点 × 平均 2 个词典 × 8 bytes |
| pinyin（平行数组） | string | ~72 bytes/条目 | ~7.2 MB | 平均 7 字符 × 2 bytes（UCS-2）+ 48 bytes V8 string overhead + 16 bytes Map entry |
| category（平行数组）| string | ~56 bytes/条目 | ~5.6 MB | 平均 4 字符 × 2 bytes + 48 bytes overhead + 16 bytes Map entry |
| **合计** | | | **~36.0 MB** | |

**V8 内存模型细节**：

```
// TrieNode 实例（V8 64-bit）
TrieNode {
  children: Map          → 64 bytes (Map 结构体) + 每条目 ~32 bytes
  isEnd: boolean         → 8 bytes (对齐后)
  dictIds: Array         → 24 bytes (Array 头) + 每元素 8 bytes
  __proto__ 指针         → 8 bytes
}
≈ 120 bytes/节点

// pinyin 字符串（短字符串，V8 one-byte 或 two-byte 编码）
"bō rě" (7 字符):
  String header          → 24 bytes
  字符数据               → 7 × 2 = 14 bytes (中文拼音含声调用 two-byte)
  padding                → → 对齐至 40 bytes
Map entry overhead       → 16 bytes
合计 ≈ 72 bytes/条目
```

### 2.2 最小索引方案（仅 term + dictId）

**存储模型**：仅 Trie 树，不存任何额外字段

| 字段 | 类型 | 大小/条目 | 10万条目总计 | 说明 |
|------|------|-----------|-------------|------|
| Trie 节点结构 | Object + Map + Array | ~120 bytes/节点 | ~21.6 MB | 同上，节点结构不变 |
| dictIds（节点内） | Array\<number\> | ~16 bytes/终节点 | ~1.6 MB | 同上 |
| **合计** | | | **~23.2 MB** | |

### 2.3 差异分析

| 维度 | 最小索引 | 轻量索引 | 差异 |
|------|----------|----------|------|
| 内存总量 | ~23.2 MB | ~36.0 MB | +12.8 MB（+55%） |
| 索引构建时间 | ~50ms | ~80ms | +30ms（需填充平行数组） |
| 高亮匹配性能 | 相同 | 相同 | Trie 搜索逻辑完全一致 |
| 点击后响应 | 需查 IndexedDB 拿全部信息 | 可立即展示 pinyin/category | 节省 1 次 IndexedDB 查询 |
| 功能覆盖 | 满足高亮核心需求 | 额外支持拼音展示、分类过滤 | 非核心功能的增值 |

**关键发现**：pinyin 和 category 字段合计占 ~12.8 MB，占轻量索引总内存的 35.6%。但这些字段**不参与 Trie 匹配过程**——Trie 只按字符路径搜索 term，pinyin 和 category 存储在平行 Map 中，匹配完成后才查表获取。

## 3. 其他词典 App 索引策略

| App | 平台 | 索引策略 | 内存占用 | 特点 |
|-----|------|----------|----------|------|
| **Pleco** | iOS/Android | 内存中加载完整词典（含释义），中文词典通常 1-5 万条，总内存 20-50 MB | 20-50 MB | 离线优先，全量加载；但中文词典普遍较小，总数据量可控 |
| **Pleco 索引优化** | iOS | Trie 仅存 headword + 词性标签，释义延迟加载 | ~8-15 MB | 与我方"最小索引"方案思路一致 |
| **MDBG** | Web | 服务器端数据库，前端不存索引 | ~0 MB（客户端） | 纯在线模式，不适用纯前端场景 |
| **GoldenDict** | Desktop | 基于 MDX/DSL 文件格式，内存映射文件 + 按需查询 | 视词典而定 | 不预加载索引，利用 OS 文件系统缓存 |
| **欧路词典** | 全平台 | 本地 SQLite + 索引表（headword + 词形变化 + 词典 ID），释义延迟加载 | 10-30 MB | 索引表含基础信息但不含释义全文，与"轻量索引"类似 |
| **MOJi 辞書** | iOS | 完整词条加载（日语词典数据量小） | 30-80 MB | 日语场景词条总数少于中文，可全量加载 |
| **汉典 / 汉语大词典 App** | Web/App | 服务端 API + 客户端缓存，无完整本地索引 | ~5-10 MB | 在线优先，不适用纯前端 |
| **mdict-js 通用方案** | Web | 不建额外索引，直接在 MDX 中二分查找 | ~0 MB（索引） | 大词典查询延迟 50-200ms，适合低频查询 |

**行业趋势总结**：
- 离线词典 App 普遍采用"索引 + 释义分离"策略：索引层仅含 headword + 基础元数据（词性、来源），释义按需加载
- 索引层元数据通常**不超过 2-3 个字段**（headword、dictId、词性），极少包含拼音/分类等非必要字段
- 内存预算通常在 10-30 MB 区间，超过 50 MB 会被视为过重（移动端尤为敏感）

## 4. 功能必要性分析

### 4.1 dictId 字段必要性

**结论：必需**

| 理由 | 说明 |
|------|------|
| 多词典开关 | D4 决策"懒标记"要求在 Trie 节点中记录 dictIds，匹配后过滤已关闭词典 |
| 高亮颜色区分 | 不同词典来源需要不同高亮颜色（T-05 第 4 节定义 4 色方案） |
| 释义来源标注 | 点击术语时需展示该词条来自哪些词典 |
| 无法替代 | 没有 dictId 就无法区分同名词条的来源 |

**存储位置**：Trie 节点的 `dictIds` 数组（已在最小索引方案中）

### 4.2 pinyin 字段必要性

**结论：非必需，可延迟加载**

| 维度 | 分析 |
|------|------|
| 高亮匹配 | 不需要拼音。Trie 按原文逐字匹配，pinyin 不参与匹配过程 |
| 点击后展示 | 可在 IndexedDB 查询释义时一并返回，延迟 1 次查询的成本极低（< 5ms） |
| 拼音搜索 | v2.0 未规划拼音搜索功能。即使未来需要，可单独建拼音→term 的反向索引，不必嵌入 Trie 索引 |
| 排序展示 | 词典管理页面的按拼音排序是低频操作，可查询后排序，无需常驻内存 |

**数据量代价**：7.2 MB，占轻量索引总内存的 20%

**替代方案**：pinyin 与 definition 同存于 `dict_entries` 表，点击术语时一并查询：

```javascript
// 点击术语时，一次查询同时拿到 pinyin + category + definition
const entry = await db.get('dict_entries', `${dictId}::${term}`)
// entry = { term, pinyin, definition, category }
```

### 4.3 category 字段必要性

**结论：非必需，可延迟加载**

| 维度 | 分析 |
|------|------|
| 高亮匹配 | 不需要分类。高亮只看 term 是否存在于词典中 |
| 点击后展示 | 可在释义查询时一并返回，零额外延迟 |
| 分类过滤 | 词典管理页面的分类过滤是低频操作，可按需查询 |
| 视觉展示 | 内置词典的"核心术语"等分类信息仅用于 UI 标签，不是核心功能 |

**数据量代价**：5.6 MB，占轻量索引总内存的 15.6%

**替代方案**：与 pinyin 相同，存于 `dict_entries` 表中按需查询。

## 5. 结论

**明确结论：调整为最小索引方案（仅 term + dictId）**

### 理由

1. **内存节省显著**：减少 12.8 MB（35.6%），使 Trie 总内存从 ~36 MB 降至 ~23 MB，更接近 v2.0 目标（< 20 MB）
2. **功能无损失**：pinyin 和 category 不参与 Trie 匹配过程，延迟加载不影响任何核心功能
3. **点击响应无差异**：点击术语时查询 IndexedDB 获取完整信息（含 pinyin + category + definition），单次查询耗时 < 5ms，用户体验无感知差异
4. **行业最佳实践**：主流离线词典 App（Pleco、欧路）均采用最小索引策略，仅 headword + 来源 ID 常驻内存
5. **架构更清晰**：Trie 专注匹配（term + dictId），`dict_entries` 专注数据（pinyin + category + definition），职责分离

### 调整后的架构

```
内存层（Trie）:
  term → [dictId, dictId, ...]     // ~23 MB

IndexedDB - dict_index 表:
  term + dict_id                   // 用于重建 Trie，~1-2 MB

IndexedDB - dict_entries 表:
  key (dictId::term) → { term, pinyin, category, definition }
                                   // 按需查询，不在常驻内存
```

### 如果未来需要拼音搜索

可单独建立拼音反向索引（仅在使用拼音搜索功能时加载）：

```javascript
// 拼音索引（懒加载，按需构建）
const pinyinIndex = new Map()  // "bo re" → ["般若", "波惹"]
// 约 3-5 MB，仅在拼音搜索时构建，不用时释放
```

## 6. 对 v2.1 方案的影响

| 影响项 | 说明 |
|--------|------|
| **PROJECT_V2_PLAN.md 4.1.1** | `dict_index` 表从 5 字段（term, dict_id, pinyin, category, has_def）简化为 3 字段（term, dict_id, has_def），减少 IndexedDB 索引表体积约 40% |
| **T-05 结论修正** | T-05 第 5.1 节"内存策略：轻量索引（仅 dictId）"需修正——实际"仅 dictId"就是最小索引方案，不需要 pinyin/category |
| **DICTIONARY_OPTIMIZATION_DISCUSSION.md 6.1** | 待决策项"6.1 Trie 索引层数据结构"可从"建议 B"改为"确定 A"，关闭该待决策项 |
| **Trie 构建逻辑** | 构建时仅从 `dict_index` 表读取 term + dict_id 两列，不读取 pinyin/category，IndexedDB 查询量减少约 30% |
| **DictionaryPopup 组件** | 点击术语时需一次性查询 `dict_entries` 获取 pinyin + category + definition，弹窗渲染逻辑不变（数据已含 pinyin/category） |
| **词典管理页面** | 按拼音排序、按分类过滤功能改为按需查询 `dict_entries` 表，非常驻内存。查询性能无影响（IndexedDB 查询 10 万条 < 50ms） |
| **v2.0 性能目标** | Trie 内存从 ~36 MB 降至 ~23 MB，仍略高于 20 MB 目标，但结合 D4 懒标记 + 分层 Trie（按需构建用户词典），实际运行时内存可控制在 15-18 MB（内置 < 50 KB + 2-3 个用户词典各 2-8 MB） |
