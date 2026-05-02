# 词典版本管理 分析报告

> 任务编号：T-26
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

本项目 v2.0 方案中，决策 D14 规定"同名词典重复上传创建新版本（版本链），保留历史版本"。`dict_versions` 表已在数据模型中定义，但版本链的展示、回滚、差异对比、空间管理等交互细节尚未深入设计。

本分析的目标是：
- 设计 `dict_versions` 表的交互方案：版本列表展示、上传时间、词条数对比
- 设计安全的版本回滚机制：数据操作流程、用户体验保障
- 设计版本差异对比方案：新旧版本词条变化的可视化
- 制定历史版本的空间管理策略：保留 vs 清理的权衡
- 明确版本回滚时用户笔记的处理策略

**核心前提**（来自既有决策和已完成的分析）：
- D10：用户笔记层与原始词典数据物理隔离，原始数据不可变
- D14：同名词典重复上传不覆盖，自动创建版本链
- T-18 分析：版本列表 UI 已有初步设计，回滚采用快照机制（不删除历史）
- T-28 分析：checksum 机制已确认可行，笔记兼容性标记已设计

## 2. 版本列表设计

### 2.1 数据结构

```
Table: dict_versions
┌────────────────────┬──────────┬──────────┬──────────────────┬──────────┬──────────┬───────────┐
│ id (PK)            │ dict_id  │ version  │ uploaded_at      │ entries  │ file_size│ checksum  │
├────────────────────┼──────────┼──────────┼──────────────────┼──────────┼──────────┼───────────┤
│ ver::user001::001  │ user-001 │ 1        │ 2026-04-28 09:00 │ 1,000    │ 256KB    │ abc123..  │
│ ver::user001::002  │ user-001 │ 2        │ 2026-05-01 15:00 │ 1,200    │ 312KB    │ def456..  │
│ ver::user001::003  │ user-001 │ 3        │ 2026-05-02 10:30 │ 1,500    │ 390KB    │ ghi789..  │
└────────────────────┴──────────┴──────────┴──────────────────┴──────────┴──────────┴───────────┘

Table: dict_config（当前活跃版本引用）
┌──────────────┬──────────┬────────┬───────────┬──────────────┬──────────┐
│ dict_id (PK) │ name     │ type   │ enabled   │ cur_version  │ …        │
├──────────────┼──────────┼────────┼───────────┼──────────────┼──────────┤
│ user-001     │ 我的词典  │ user   │ true      │ 3            │ …        │
└──────────────┴──────────┴────────┴───────────┴──────────────┴──────────┘
```

**关键字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String (PK) | 格式 `ver::{dict_id}::{seq}`，全局唯一 |
| `dict_id` | String (indexed) | 所属词典 ID，用于查询某词典的所有版本 |
| `version` | Integer | 版本号，单调递增 |
| `uploaded_at` | DateTime | 上传/创建时间 |
| `entries` | Integer | 该版本的词条总数 |
| `file_size` | Integer | 该版本的原始文件大小（字节） |
| `checksum` | String | 该版本所有词条的 aggregate checksum（用于快速比对） |

### 2.2 版本列表 UI

**入口路径**：词典管理页 → 词典卡片右侧操作菜单 → "版本历史"

```
┌──────────────────────────────────────┐
│ <  版本历史                          │
├──────────────────────────────────────┤
│                                      │
│ 词典：我的笔记词典                    │
│ 类型：个人 · 当前版本：3              │
│                                      │
│ ── 版本时间线 ─────────────────────   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ● 版本 3              [当前]   │  │
│  │   1,500 条 · 390 KB            │  │
│  │   2026-05-02 10:30             │  │
│  │   [+300 条, ~50 条] vs v2      │  │
│  │                                │  │
│  │        [差异对比]              │  │
│  └────────────────────────────────┘  │
│            │                         │
│  ┌────────────────────────────────┐  │
│  │ ○ 版本 2             [回滚到此] │  │
│  │   1,200 条 · 312 KB            │  │
│  │   2026-05-01 15:00             │  │
│  │   [+200 条] vs v1              │  │
│  │                                │  │
│  │        [差异对比]  [删除此版本] │  │
│  └────────────────────────────────┘  │
│            │                         │
│  ┌────────────────────────────────┐  │
│  │ ○ 版本 1             [回滚到此] │  │
│  │   1,000 条 · 256 KB            │  │
│  │   2026-04-28 09:00             │  │
│  │   初始导入                      │  │
│  │                                │  │
│  │        [差异对比]  [删除此版本] │  │
│  └────────────────────────────────┘  │
│                                      │
│ ── 存储空间 ───────────────────────   │
│                                      │
│  版本数据占用：958 KB / 50 MB        │
│  [清理旧版本]                        │
│                                      │
└──────────────────────────────────────┘
```

### 2.3 词条数对比逻辑

版本之间的词条数变化采用**相邻版本对比**：

```javascript
// 计算版本 N 相对于版本 N-1 的变化
async function calcVersionDiff(dictId, versionN) {
  const current = await getVersion(dictId, versionN)
  const previous = await getVersion(dictId, versionN - 1)

  if (!previous) {
    return { added: current.entries, modified: 0, removed: 0, label: '初始导入' }
  }

  const currentTerms = new Set(await getTermsByVersion(dictId, versionN))
  const previousTerms = new Set(await getTermsByVersion(dictId, versionN - 1))

  const added = currentTerms.difference(previousTerms).size
  const removed = previousTerms.difference(currentTerms).size

  // 修改 = 两个版本都存在的词条，但 checksum 不同
  const commonTerms = currentTerms.intersection(previousTerms)
  let modified = 0
  for (const term of commonTerms) {
    const curChecksum = await getEntryChecksum(dictId, versionN, term)
    const prevChecksum = await getEntryChecksum(dictId, versionN - 1, term)
    if (curChecksum !== prevChecksum) modified++
  }

  return { added, modified, removed }
}
```

**性能优化**：
- 词条数变化在版本创建时预计算并缓存到 `dict_versions` 表的 `change_summary` JSON 字段中
- 仅在展示版本列表时读取缓存，不实时计算
- `checksum` 字段（T-28 分析中已设计）用于快速判断词条是否修改

### 2.4 版本状态标识

| 状态 | 标识 | 说明 |
|------|------|------|
| 当前版本 | `● [当前]` | `dict_config.cur_version` 指向的版本 |
| 历史版本 | `○` | 非当前版本，可回滚 |
| 已回滚过 | `↺` | 曾被回滚后再次被覆盖的版本（可选标记） |

## 3. 版本回滚

### 3.1 回滚策略：快照复制

**核心原则**：回滚不删除任何历史版本，而是创建一个新的版本快照，指向目标版本的数据。

```
回滚前：
  v1 (1000条) → v2 (1200条) → v3 (1500条, 当前)

用户回滚到 v2：
  v1 (1000条) → v2 (1200条) → v3 (1500条) → v4 (1200条, 当前, v2 的快照)

回滚后版本列表：
  v1 · 初始导入
  v2 · +200条
  v3 · +300条, ~50条
  v4 · 回滚自 v2 [当前]
```

**优势**：
- 回滚操作完全可逆，用户可以再次回滚到 v3
- 历史版本链完整保留，无数据丢失风险
- 符合 T-18 分析中的设计决策

### 3.2 回滚操作流程

```
用户点击 [回滚到此]（目标：版本 2）
    │
    ▼
1. Vant Dialog 确认
   标题："确认回滚到版本 2？"
   内容：
     "回滚后词典将恢复为 1,200 条词条。"
     "当前版本 3 将保留为历史版本。"
     "您的笔记不受影响。"
   按钮：[取消] [确认回滚]
    │
    ▼
2. 创建新版本快照（版本 4）
   - 从 dict_index 复制版本 2 的所有 term 到新版本
   - 从 dict_entries 复制版本 2 的所有释义到新版本
   - 写入 dict_versions 新记录：
       version = 4
       entries = 1200
       uploaded_at = 当前时间
       rollback_from = 2
    │
    ▼
3. 更新 dict_config
   - cur_version = 4
   - entries = 1200
    │
    ▼
4. 重建 Trie 索引
   - 销毁旧 Trie
   - 用新版本的 term 列表重建
    │
    ▼
5. 笔记兼容性检查
   - 遍历 user_notes，检查每个 entry_key 在新版本中是否存在
   - 对已删除的词条，标记 compatibility = "orphaned"
   - 对定义变更的词条，标记 compatibility = "needs_review"
    │
    ▼
6. 完成反馈
   - Toast："已回滚到版本 4（基于版本 2）"
   - 刷新版本列表
   - 阅读页高亮自动更新
```

### 3.3 回滚安全机制

| 安全机制 | 说明 |
|----------|------|
| **二次确认** | Dialog 弹窗 + 显示回滚后的词条数变化 |
| **原子操作** | IndexedDB 事务包裹整个回滚过程 |
| **不可逆提示** | 明确告知用户当前版本不会被删除 |
| **笔记保护** | 回滚绝不修改或删除 `user_notes` 表数据 |
| **失败回滚** | 如果回滚过程中途失败，事务自动回滚，不影响当前版本 |
| **进度显示** | 大词典回滚时显示进度条（复制词条 + 重建 Trie） |

### 3.4 回滚数据操作实现

```javascript
async function rollbackToVersion(dictId, targetVersion) {
  const db = await openDB()

  // 获取目标版本信息
  const target = await db.get('dict_versions', `ver::${dictId}::${targetVersion}`)
  if (!target) throw new Error(`版本 ${targetVersion} 不存在`)

  // 获取新版本号
  const allVersions = await db.getAllFromIndex('dict_versions', 'dict_id', dictId)
  const newVersion = Math.max(...allVersions.map(v => v.version)) + 1

  // 在事务中执行回滚
  const tx = db.transaction(['dict_index', 'dict_entries', 'dict_versions', 'dict_config'], 'readwrite')

  try {
    // 1. 复制 dict_index 条目
    const targetIndexEntries = await db.getAllFromIndex('dict_index', 'dict_id', dictId)
      .filter(e => e._version === targetVersion)

    for (const entry of targetIndexEntries) {
      await tx.objectStore('dict_index').put({
        ...entry,
        _version: newVersion
      })
    }

    // 2. 复制 dict_entries 条目
    const targetDictEntries = await db.getAllFromIndex('dict_entries', 'dict_id', dictId)
      .filter(e => e._version === targetVersion)

    for (const entry of targetDictEntries) {
      await tx.objectStore('dict_entries').put({
        ...entry,
        _version: newVersion
      })
    }

    // 3. 创建版本记录
    await tx.objectStore('dict_versions').put({
      id: `ver::${dictId}::${newVersion}`,
      dict_id: dictId,
      version: newVersion,
      uploaded_at: new Date().toISOString(),
      entries: target.entries,
      file_size: target.file_size,
      checksum: target.checksum,
      rollback_from: targetVersion,
      change_summary: { added: 0, modified: 0, removed: 0, label: `回滚自版本 ${targetVersion}` }
    })

    // 4. 更新配置
    const config = await tx.objectStore('dict_config').get(dictId)
    config.cur_version = newVersion
    config.entries = target.entries
    await tx.objectStore('dict_config').put(config)

    await tx.done

    // 5. 事务外：重建 Trie + 笔记检查
    await rebuildTrie(dictId, newVersion)
    await checkNoteCompatibility(dictId, newVersion)

    return { success: true, newVersion }
  } catch (error) {
    // 事务自动回滚
    throw error
  }
}
```

## 4. 版本差异对比

### 4.1 差异对比概览

用户点击任意版本的 `[差异对比]` 按钮，进入差异对比页面：

```
┌──────────────────────────────────────┐
│ <  版本差异对比                      │
├──────────────────────────────────────┤
│                                      │
│ 对比：版本 2 → 版本 3                │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │  📊 变更概览                     │ │
│ │                                  │ │
│ │  + 新增  300 条   ████████████   │ │
│ │  ~ 修改   50 条   ██             │ │
│ │  - 删除    0 条                  │ │
│ │                                  │ │
│ │  词条总数：1,200 → 1,500         │ │
│ │  文件大小：312 KB → 390 KB       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── 新增词条 (300 条) ───────────     │
│                                      │
│ [阿赖耶识] [波罗蜜多] [禅定] ...     │
│                                      │
│ ── 修改词条 (50 条) ────────────     │
│                                      │
│ [般若] [涅槃] [菩提] ...             │
│                                      │
│ ── 删除词条 (0 条) ─────────────     │
│                                      │
│ （无）                               │
│                                      │
└──────────────────────────────────────┘
```

### 4.2 词条级别差异

点击具体修改词条（如"般若"），查看释义差异：

```
┌──────────────────────────────────────┐
│ <  词条对比：般若                    │
├──────────────────────────────────────┤
│                                      │
│ 版本 2                    版本 3     │
│ ──────────────────────────────────── │
│                                      │
│ 梵语 prajñā 的音译，    梵语 prajñā   │
│ 意为"智慧"。在佛教中    的音译，意为   │
│ 指超越世俗的洞察力。    "智慧"。       │
│                       +              │
│                       在佛教中指超越  │
│                       世俗的洞察力，  │
│                       即"究竟智慧"或  │
│                       "实相智慧"。    │
│                       +              │
│                       与"方便"(upaya) │
│                       并列为菩萨修行  │
│                       的两大核心要素。 │
│                                      │
│ ──────────────────────────────────── │
│  🟢 新增   🔴 删除   ⚪ 未变         │
│                                      │
└──────────────────────────────────────┘
```

### 4.3 差异计算算法

```javascript
// 基于 Set 差集 + checksum 的高效差异计算
async function computeVersionDiff(dictId, fromVersion, toVersion) {
  // 1. 获取两个版本的词条集合
  const fromTerms = new Set(
    (await getTermsByVersion(dictId, fromVersion)).map(t => t.term)
  )
  const toTerms = new Set(
    (await getTermsByVersion(dictId, toVersion)).map(t => t.term)
  )

  // 2. Set 差集运算
  const added = [...toTerms.difference(fromTerms)]
  const removed = [...fromTerms.difference(toTerms)]
  const common = [...fromTerms.intersection(toTerms)]

  // 3. 共同词条中，checksum 不同的为修改
  const modified = []
  for (const term of common) {
    const fromChecksum = await getEntryChecksum(dictId, fromVersion, term)
    const toChecksum = await getEntryChecksum(dictId, toVersion, term)
    if (fromChecksum !== toChecksum) {
      modified.push({
        term,
        fromChecksum,
        toChecksum,
        fromDefinition: await getEntryDefinition(dictId, fromVersion, term),
        toDefinition: await getEntryDefinition(dictId, toVersion, term)
      })
    }
  }

  return {
    added: added.map(term => ({ term })),
    modified,
    removed: removed.map(term => ({ term })),
    summary: {
      addedCount: added.length,
      modifiedCount: modified.length,
      removedCount: removed.length,
      totalCount: toTerms.size
    }
  }
}
```

**性能考虑**：
- 小词典（<5000 条）：直接逐条比较 checksum，毫秒级完成
- 大词典（>=5000 条）：采用 aggregate checksum 先判断整体是否变化，再按需展开
- 前端使用 Web Worker 执行差异计算，避免阻塞 UI

### 4.4 差异对比组件

使用 Markdown diff 语法渲染释义变化：

```javascript
// 使用 jsdiff 库生成文本差异
import { diffWords } from 'diff'

function generateDiffMarkdown(oldDef, newDef) {
  const diff = diffWords(oldDef, newDef)
  return diff.map(part => {
    if (part.added) return `+ ${part.value}`
    if (part.removed) return `- ${part.value}`
    return part.value
  }).join('\n')
}
```

渲染时绿色标记 `+` 行为新增，红色标记 `-` 行为删除。

## 5. 空间管理

### 5.1 空间消耗分析

每个版本的数据存储量：

| 词典规模 | 单版本占用 | 10 个版本 | 说明 |
|----------|-----------|-----------|------|
| 小词典（1,000 条） | ~256 KB | ~2.5 MB | JSON 预解析存入 IndexedDB |
| 中词典（10,000 条） | ~2.5 MB | ~25 MB | JSON 预解析存入 IndexedDB |
| 大词典（50,000 条） | ~12 MB | ~120 MB | MDX 原文件缓存 |

**存储空间限制**：
- iOS Safari：约 50MB-1GB（取决于设备，可能被系统清理）
- Android Chrome：约 6% 可用磁盘空间
- PC 浏览器：通常无硬性限制

### 5.2 保留策略

**方案 A：全保留（默认）**

- 所有历史版本永久保留
- 优点：回滚选择最多，数据最安全
- 缺点：大词典多版本时占用空间大
- 适用：词典数量少、体积小的场景

**方案 B：保留最近 N 个 + 当前（推荐）**

- 保留最近 5 个历史版本 + 当前版本（共 6 个）
- 超出时自动清理最旧版本
- 优点：平衡安全性与空间占用
- 缺点：无法回滚到很早期的版本
- 适用：大多数用户场景

**方案 C：智能保留**

- 始终保留：当前版本 + 初始版本
- 保留最近 3 个版本
- 保留"里程碑"版本（用户手动标记的重要版本）
- 自动清理中间版本
- 优点：兼顾关键版本的可回滚性
- 缺点：实现复杂度高

### 5.3 推荐策略：方案 B + 手动保护

```
清理规则：
1. 当前版本 → 永不自动清理
2. 初始版本（v1） → 永久保留
3. 最近 3 个历史版本 → 保留
4. 用户手动标记"保留"的版本 → 永久保留
5. 其余旧版本 → 可清理

清理时机：
- 用户上传新版本时，检查版本总数
- 超过阈值时触发清理
- 清理前弹窗确认（显示将被删除的版本列表）
- 用户确认后执行清理（删除 dict_index + dict_entries + dict_versions）
```

```
┌──────────────────────────────────────┐
│  清理旧版本                          │
├──────────────────────────────────────┤
│                                      │
│ 当前版本数据占用：38.5 MB             │
│ 清理后可释放：12.2 MB                 │
│                                      │
│ 将删除以下版本：                      │
│                                      │
│  ☐ 版本 1 · 2026-04-15 · 1,000 条   │
│     [保留此版本]                      │
│                                      │
│  ☐ 版本 2 · 2026-04-20 · 1,100 条   │
│     [保留此版本]                      │
│                                      │
│  ☐ 版本 3 · 2026-04-25 · 1,150 条   │
│     [保留此版本]                      │
│                                      │
│  ───────────────────────────────     │
│                                      │
│  [取消]  [确认清理]                   │
│                                      │
└──────────────────────────────────────┘
```

### 5.4 存储空间监控

在词典管理页底部显示空间使用情况：

```
┌──────────────────────────────────────┐
│  存储空间                             │
│                                      │
│  ████████░░░░░░░░░░░░  38.5 MB / 50 MB│
│                                      │
│  · 内置词典：128 KB                   │
│  · 我的词典（3 个版本）：38.4 MB      │
│                                      │
│  [清理旧版本]  [导出备份]             │
│                                      │
└──────────────────────────────────────┘
```

使用 `navigator.storage.estimate()` API 获取可用配额，在导入/上传新版本前检查空间是否足够。

## 6. 用户笔记处理

### 6.1 核心原则

**用户笔记永久独立于词典版本**。笔记存储在 `user_notes` 表中，通过 `entry_key` 关联词条，但不设置外键约束。词典版本回滚、删除均不修改笔记数据。

### 6.2 回滚时笔记处理策略

回滚操作执行后，触发笔记兼容性检查：

```
回滚完成（新版本数据就绪）
    │
    ▼
遍历 user_notes 表中关联该 dict_id 的所有笔记
    │
    ▼
对每条笔记：
    │
    ├── 词条在新版本中存在
    │   │
    │   ├── definition checksum 相同
    │   │   → compatibility 保持 "ok"
    │   │
    │   └── definition checksum 不同
    │       → 标记 compatibility = "needs_review"
    │       → 渲染时显示兼容性提示条
    │
    └── 词条在新版本中不存在
        → 标记 compatibility = "orphaned"
        → 笔记保留但不再与高亮关联
        → 用户可在"我的笔记"入口查看
```

### 6.3 笔记兼容性状态

| 状态 | 含义 | 展示效果 |
|------|------|----------|
| `ok` | 词条存在且定义未变 | 正常展示，无提示 |
| `needs_review` | 词条存在但定义已变 | 笔记上方显示："词典版本变更，此词条定义有变化，建议检查笔记是否仍适用。[查看变化]" |
| `confirmed` | 用户已确认适配新版本 | 正常展示，无提示 |
| `orphaned` | 词条在新版本中已不存在 | 笔记上方显示："此词条在当前版本中已移除，您的笔记已保留。" |

### 6.4 笔记展示示例（回滚后）

```
┌──────────────────────────────────────┐
│  般若 (bō rě)                        │
├──────────────────────────────────────┤
│                                      │
│ 梵语 prajñā 的音译，意为"智慧"...    │
│ （回滚后的版本 4 定义，基于 v2）       │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ ⚠️ 此笔记基于版本 3 内容编写   │  │
│ │ 当前版本的定义与笔记创建时不同。 │  │
│ │ [查看变化] [重新编辑] [忽略]   │  │
│ └────────────────────────────────┘  │
│                                      │
│ 📝 您的笔记：                        │
│ 我对般若的理解...                    │
│                                      │
└──────────────────────────────────────┘
```

### 6.5 "我的笔记"独立入口

在词典管理页或设置页新增"我的笔记"入口，允许用户：
- 查看所有笔记（包括 orphaned 孤立笔记）
- 按兼容性状态筛选（需检查 / 已确认 / 已孤立）
- 批量操作（标记已确认、删除）
- 导出笔记为独立文件

```
┌──────────────────────────────────────┐
│ <  我的笔记                          │
├──────────────────────────────────────┤
│                                      │
│ 筛选：[全部] [需检查(3)] [已孤立(1)] │
│                                      │
│ ── 般若 · 内置词典 · 需检查 ─────    │
│   我对般若的理解...                  │
│   [编辑] [删除] [标记已确认]         │
│                                      │
│ ── 某某术语 · 我的词典 · 已孤立 ──   │
│   这个词的特殊含义...                │
│   此词条在当前词典版本中已移除        │
│   [导出此笔记] [删除]                │
│                                      │
└──────────────────────────────────────┘
```

## 7. 结论与建议

### 7.1 版本管理方案

| 维度 | 决策 | 理由 |
|------|------|------|
| **版本创建** | 同名词典重复上传自动创建新版本，版本号单调递增 | D14 决策，实现简单 |
| **版本展示** | 时间线列表，显示词条数、上传时间、与相邻版本的变化摘要 | 信息密度适中，移动端友好 |
| **回滚机制** | 快照复制（创建新版本指向旧数据），不删除历史 | 完全可逆，数据最安全 |
| **差异对比** | Set 差集 + checksum 比较，按新增/修改/删除分组展示 | 高效计算，清晰展示 |
| **空间管理** | 保留最近 5 个历史版本 + 当前版本，超出时清理最旧 | 平衡安全与空间 |
| **笔记处理** | 笔记与版本完全独立，回滚时仅更新兼容性标记 | 保护用户数据 |

### 7.2 数据库设计扩展

在 v2.0 数据模型基础上，对 `dict_versions` 表做以下扩展：

```javascript
// dict_versions 表（扩展后）
{
  id: 'ver::user001::001',
  dict_id: 'user-001',
  version: 1,
  uploaded_at: '2026-04-28T09:00:00Z',
  entries: 1000,
  file_size: 262144,
  checksum: 'sha256-abc123...',      // aggregate checksum
  change_summary: {                   // 相对上一版本的变化
    added: 1000,
    modified: 0,
    removed: 0,
    label: '初始导入'
  },
  rollback_from: null,                // 如果是回滚创建，记录来源版本
  is_pinned: false,                   // 用户手动标记保留
}

// dict_config 表扩展字段
{
  dictId: 'user-001',
  // ... 原有字段
  cur_version: 3,                     // 当前活跃版本号
  total_versions: 3,                  // 版本总数
}
```

### 7.3 实现优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| **P0** | 版本列表展示 | 基础展示，版本链可视 |
| **P0** | 版本创建逻辑 | 上传新版本时自动创建版本记录 |
| **P0** | 回滚操作（快照复制） | 核心安全机制 |
| **P1** | 相邻版本词条数对比 | 预计算并缓存 change_summary |
| **P1** | 笔记兼容性检查 | 回滚后自动标记笔记状态 |
| **P2** | 版本差异对比页面 | 高级功能，低频使用 |
| **P2** | 空间管理与自动清理 | 大词典场景才需要 |
| **P2** | "我的笔记"独立入口 | 笔记管理增强 |

## 8. 对 v2.1 方案的影响

本分析结果对 v2.1 方案的具体影响如下：

1. **`dict_versions` 表字段扩展**：需新增 `checksum`（aggregate checksum）、`change_summary`（JSON，预计算的变更摘要）、`rollback_from`（回滚来源版本）、`is_pinned`（手动保留标记）四个字段。这些字段在 Phase 3 实现版本管理时需一并加入。

2. **版本创建流程增强**：在 `DictService.importDict()` 中，当检测到同名词典已存在时：
   - 计算新版本的 aggregate checksum
   - 与当前版本做 Set 差集运算，生成 `change_summary`
   - 写入 `dict_versions` 新记录
   - 更新 `dict_config.cur_version`

3. **回滚操作实现**：新增 `DictService.rollbackToVersion(dictId, targetVersion)` 方法，采用快照复制策略（不删除旧版本）。需要在 IndexedDB 中实现跨版本的数据复制事务。

4. **差异对比组件**：新增独立的版本差异对比页面/弹窗组件，使用 Set 差集 + checksum 高效计算。大词典场景建议在 Web Worker 中执行。

5. **笔记兼容性检查器**：新增 `checkNoteCompatibility(dictId, newVersion)` 方法，在词典版本变更（导入新版本或回滚）后自动执行，更新受影响笔记的 `compatibility` 状态。该方法与 T-28 分析中设计的 checksum 变更检测复用同一逻辑。

6. **空间管理组件**：在词典管理页底部新增存储空间使用情况的展示和清理入口。使用 `navigator.storage.estimate()` API 监控存储配额。清理逻辑需要用户确认后执行。

7. **"我的笔记"入口**：在词典管理页或设置页新增笔记管理入口，支持按兼容性状态筛选笔记、查看孤立笔记、批量操作和导出。

8. **aggregate checksum 计算**：为实现版本级别的快速比对，需要计算每个版本所有词条的 aggregate checksum。可采用对各词条 checksum 排序后拼接再做一次 SHA-256 的方案，确保词条顺序不影响结果。
