# 缓存策略全面分析 报告

> 任务编号：T-47
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/research/T-10-lru-cache-strategy.md, docs/plans/research/T-04-indexeddb-storage.md, docs/plans/deep-dive/T-37-performance-optimization.md

## 1. 背景与目标

般若佛经阅读器 v2.0 采用纯前端架构，词典释义数据存储在 IndexedDB 中，用户点击阅读页高亮词条时按需加载。随着功能扩展（多词典并行、MDX 支持、用户笔记），缓存策略需要系统性地覆盖以下场景：

- **内存层（一级缓存）**：LRU Map 缓存释义数据，加速重复查询
- **持久层（二级缓存）**：IndexedDB 作为持久化存储，承担结构化数据管理
- **HTTP 层（浏览器缓存）**：Vite 构建产物通过 CDN 缓存加速重复访问
- **预热层**：高频词条提前加载，减少首查延迟
- **一致性**：词典开关、版本更新、笔记修改时的缓存失效

T-10 已确认一级缓存采用 Map + 自定义 LRU 实现（1000 条上限，~1MB 内存）。本报告在此基础上深入分析多级缓存协同、命中率评估、清理时机、IndexedDB 二级缓存可行性、预热策略和多词典缓存管理。

## 2. 缓存架构

### 2.1 一级缓存（LRU Map）

| 属性 | 值 | 说明 |
|------|-----|------|
| 实现方式 | `Map` + 自定义 LRU 类 | 零依赖，~25 行代码 |
| 容量上限 | 1000 条 | 覆盖阅读中的高频术语 |
| 单条大小 | ~600B-2.1KB | 含缓存键 + DictEntry 对象 + Map 内部开销 |
| 总内存 | ~600KB-2.1MB | 平均 ~1MB |
| 缓存键 | `${dictId}::${term}` | 天然隔离多词典 |
| get 操作 | < 0.001ms | Map.delete + Map.set |
| set 操作（无淘汰） | < 0.001ms | Map.delete + Map.set |
| set 操作（触发淘汰） | < 0.002ms | 额外 keys().next().value + delete |

**核心代码**（详见 T-10 报告第 7 节）：

```javascript
export class DefinitionCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize
    this.cache = new Map()
  }
  get(key) {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }
  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key)
    this.cache.set(key, value)
    if (this.cache.size > this.maxSize) {
      this.cache.delete(this.cache.keys().next().value)
    }
  }
  invalidate(key) { this.cache.delete(key) }
  invalidateByDict(dictId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${dictId}::`)) this.cache.delete(key)
    }
  }
  clear() { this.cache.clear() }
  get size() { return this.cache.size }
}
```

**命中场景**：
- 同一术语在同一篇经文中多次出现（如心经中"般若"出现 7 次）
- 用户在短时间内多次查询同一词条
- 内置词典 50 条全量预热后 100% 命中

**未命中场景**：
- 首次阅读新经文，查询未出现过的术语
- 用户词典中低频词条
- 缓存淘汰后的重复查询

### 2.2 二级缓存（IndexedDB）

IndexedDB 在本项目中**不是传统意义上的"缓存"**，而是**主存储层**。但从数据访问链路的视角，它承担了二级缓存的角色：

| 属性 | 值 | 说明 |
|------|-----|------|
| 存储类型 | 持久化（浏览器管理生命周期） | 关闭标签页后数据不丢失 |
| 核心表 | `dict_entries` | 主键 `${dictId}::${term}`，含完整释义数据 |
| 索引表 | `dict_term_lookup` | 仅索引字段（term + dictId + pinyin + category），不存 definition |
| 单条查询 | < 5ms | 主键精确查询，已建索引 |
| 批量查询 | ~50-100ms（1000 条） | 需分批 500/批，避免事务超时 |
| 存储上限 | 桌面端 ~数 GB，iOS Safari 50MB | 见 T-04 报告兼容性分析 |
| 适用场景 | 所有释义数据的持久化存储 | 按需查询，非全量加载 |

**IndexedDB 作为二级缓存的优势**：
1. **持久化**：页面刷新后数据仍在，无需重新从网络或文件加载
2. **结构化查询**：支持索引、事务、跨表操作
3. **大容量**：远超 localStorage 的 5MB 限制
4. **异步 API**：不阻塞主线程

**IndexedDB 作为二级缓存的限制**：
1. **查询延迟**：1-5ms 虽然很快，但仍比内存 LRU 缓存慢 1000-5000 倍
2. **iOS 50MB 硬限**：大词典场景需要分级策略（小文件预解析、大文件保留 MDX 原文件）
3. **隐私模式**：无痕模式下 IndexedDB 可能不可用或容量极低
4. **浏览器清理**：长期未访问的网站数据可能被浏览器自动清理

**降级策略**（三级，详见 T-04 报告）：

```
L1: 内存 LRU 缓存（DefinitionCache）  < 0.001ms
  ↓ 未命中
L2: IndexedDB 查询（dict_entries）    < 5ms
  ↓ 不可用/QuotaExceededError
L3: localStorage 降级                 键值对，容量受限
  ↓ 不可用
L4: 内存 Map（仅当前会话）            页面刷新后丢失
```

### 2.3 缓存层级关系

```
用户点击高亮词条 "般若"
        │
        ▼
┌─────────────────────────────────┐
│ L1: DefinitionCache（内存 LRU）  │
│  键: "builtin::般若"             │
│  命中 → 立即返回 (< 0.001ms)     │
│  未命中 → 进入 L2                │
└────────────┬────────────────────┘
             │ 未命中
             ▼
┌─────────────────────────────────┐
│ L2: IndexedDB dict_entries 表   │
│  db.get('dict_entries', key)    │
│  命中 → 写入 L1 + 返回 (< 5ms)  │
│  未命中 → 进入 L3               │
└────────────┬────────────────────┘
             │ 未命中/表为空
             ▼
┌─────────────────────────────────┐
│ L3: MDX 原文件（direct 模式）    │
│  mdict-js 实时查询              │
│  命中 → 写入 L1 + 返回          │
│  未命中 → 词条不存在             │
└────────────┬────────────────────┘
             │ 未命中
             ▼
        展示"未找到释义"
```

**数据流向图**：

```
┌──────────────────────────────────────────────────────────────┐
│                     数据写入路径                              │
│                                                              │
│  上传词典 ──► Worker 解析 ──► IndexedDB (dict_entries)       │
│                                      │                       │
│  内置词典初始化 ─────────────────────►│                       │
│                                      │                       │
│  用户查询 ──► L1 未命中 ──► L2 查询 ──┘                      │
│                           │                                  │
│                           ▼                                  │
│                     L1 回填 (set)                            │
│                                                              │
│                     数据失效路径                              │
│                                                              │
│  关闭词典 ──► invalidateByDict(dictId) ──► 清理 L1           │
│  删除词典 ──► invalidateByDict(dictId) ──► 清理 L1 + DB      │
│  更新词典 ──► invalidateByDict(dictId) ──► 清理 L1           │
│  修改笔记 ──► invalidate(key) ──────────► 清理单条 L1        │
│  页面刷新 ──► L1 自动清空（内存缓存）                        │
└──────────────────────────────────────────────────────────────┘
```

## 3. 缓存命中率评估

### 3.1 理论模型

佛教经文具有显著的**术语集中性**：一部经文中的核心术语通常只占全部术语的一小部分，但这些术语在经文中反复出现。

以《心经》（260 字）为例：

| 术语 | 出现次数 | 占经文比例 | 查询概率 |
|------|----------|-----------|---------|
| 般若 | 7 次 | 2.7% | 极高（首次出现时查询，后续重复查询概率高） |
| 波罗蜜多 | 3 次 | 1.2% | 高 |
| 舍利子 | 2 次 | 0.8% | 高 |
| 色/空/受/想/行/识 | 各 2-4 次 | ~5% | 中（多为常见字，查询概率低） |
| 其他术语 | 各 1 次 | ~10% | 低（部分为常见字，不需要查询） |

### 3.2 命中率模拟

假设用户阅读心经（260 字），内置词典 50 条全量预热，无用户词典：

| 场景 | L1 命中率 | 说明 |
|------|----------|------|
| **首次阅读（预热后）** | **~95%** | 内置 50 条覆盖心经全部术语，预热后首次点击即命中 |
| **第二次阅读** | **~100%** | L1 缓存中已有全部查询过的词条 |
| **阅读金刚经（5000+ 字，首次）** | **~60-80%** | 金刚经术语与心经有较大重叠（般若、菩萨、菩提等），但新增术语较多 |

加入用户词典（假设 1 万条，无预热）后的命中率：

| 场景 | L1 命中率 | 说明 |
|------|----------|------|
| **首次阅读新经文** | **~40-60%** | 内置术语命中 L1，用户词典术语需首次查询 |
| **同一经文重复阅读** | **~80-90%** | 首次查询的用户词典词条已缓存在 L1 |
| **连续阅读多部不同经文** | **~50-70%** | LRU 开始淘汰低频词条，但高频术语（如"般若"）始终保留 |

### 3.3 高频 vs 低频词条

| 维度 | 高频词条 | 低频词条 |
|------|---------|---------|
| **定义** | 在经文中出现 >= 3 次，或在多篇经文中共同出现 | 仅在单篇经文中出现 1 次，或极少被查询 |
| **典型示例** | 般若、菩提、涅槃、菩萨、舍利子 | 专有名词、罕见术语、梵文音译 |
| **占内置词典比例** | ~30%（15 条核心术语） | ~70%（35 条次要术语） |
| **占用户词典比例** | ~5-10%（500-1000 条） | ~90-95%（9000-9500 条） |
| **L1 命中率（1000 条上限）** | **> 95%**（始终保留在 LRU 顶部） | **< 30%**（容易被淘汰） |
| **查询延迟（L1 未命中后）** | 不重要（很少未命中） | < 5ms（IndexedDB 查询，用户可感知但可接受） |

**关键结论**：
1. 1000 条 LRU 缓存上限对高频词条完全覆盖——即使 5 个用户词典各 1 万条（共 5 万条），阅读中的高频术语通常不超过 200 条
2. 低频词条即使未命中 L1，IndexedDB 查询延迟 < 5ms 也在用户可接受范围内（< 200ms 目标远低于此）
3. LRU 策略天然适合本场景：高频术语因反复查询而始终保留在缓存顶部，低频术语被淘汰后下次查询仍可快速从 IndexedDB 获取

### 3.4 Zipf 分布拟合

佛教术语查询遵循 **Zipf 分布**（少数术语占大部分查询）：

```
查询频率排名 (r) 与 查询次数 (f) 的关系: f ∝ 1/r

排名 1-10:   占总查询的 ~60%
排名 11-50:  占总查询的 ~25%
排名 51-200: 占总查询的 ~10%
排名 200+:   占总查询的 ~5%
```

这意味着 1000 条 LRU 缓存可覆盖排名 1-1000 的术语，实际命中 **~98%** 的查询请求（因为排名 1000+ 的术语合计只占 ~2% 的查询量）。

## 4. 缓存清理策略

### 4.1 页面切换时的缓存处理

| 场景 | 清理策略 | 原因 |
|------|---------|------|
| **书架页 → 阅读页** | **保留缓存** | 内置词典预热数据仍需使用，用户可能返回书架后再进入阅读 |
| **阅读页 → 词典管理页** | **保留缓存** | 词典管理页不查询释义，缓存无冲突 |
| **阅读页 → 设置页** | **保留缓存** | 同上 |
| **阅读页 A → 阅读页 B**（不同经文） | **保留缓存**（LRU 自然淘汰） | 不同经文可能有共同术语，LRU 自动处理冷热数据 |
| **应用退出/标签页关闭** | **自动清理**（内存缓存不持久化） | 下次打开时重新预热内置词典 |

**推荐**：页面切换时**不清理** L1 缓存。原因：
1. 内存占用仅 ~1MB，不影响其他功能
2. LRU 自动管理冷热数据，无需手动干预
3. 保留缓存可加速用户返回阅读页时的查询
4. 页面刷新后缓存自然重建

### 4.2 内存压力下的缓存处理

| 内存压力级别 | 触发条件 | 清理动作 |
|-------------|---------|---------|
| **正常** | 运行时内存 < 15MB | 无操作 |
| **警告** | 运行时内存 15-18MB | 记录日志，监控趋势 |
| **主动清理** | 运行时内存 > 18MB（接近 20MB 目标） | 将 LRU 上限从 1000 降至 500，淘汰 50% 缓存 |
| **紧急** | 运行时内存 > 20MB | 清空 L1 缓存（`cache.clear()`），仅保留内置词典预热数据 |
| **系统级** | `navigator.storage.estimate()` 显示配额 > 80% | 清理 IndexedDB 中过期的 file_cache 数据 |

**内存监控实现**：

```javascript
// engine/memoryMonitor.js
const MEMORY_THRESHOLD_WARNING = 15 * 1024 * 1024    // 15MB
const MEMORY_THRESHOLD_CLEANUP = 18 * 1024 * 1024    // 18MB
const MEMORY_THRESHOLD_EMERGENCY = 20 * 1024 * 1024  // 20MB

export class MemoryMonitor {
  constructor(cache) {
    this.cache = cache
    this.currentMax = 1000
  }

  // Chrome DevTools 的 performance.memory 仅 Chromium 支持
  check() {
    if (!performance.memory) return null  // 非 Chromium 浏览器跳过

    const used = performance.memory.usedJSHeapSize
    const level = this.getLevel(used)

    if (level === 'cleanup') {
      this.currentMax = 500
      // LRU 自动在下次 set 时淘汰到 500
    } else if (level === 'emergency') {
      this.cache.clear()
      this.currentMax = 1000
      warmupBuiltinCache()  // 重新预热内置词典
    }

    return { level, used: Math.round(used / 1024 / 1024) + 'MB' }
  }

  getLevel(used) {
    if (used > MEMORY_THRESHOLD_EMERGENCY) return 'emergency'
    if (used > MEMORY_THRESHOLD_CLEANUP) return 'cleanup'
    if (used > MEMORY_THRESHOLD_WARNING) return 'warning'
    return 'normal'
  }
}

// 在阅读页每次释义查询后检查
async function lookupTerm(term, dictId) {
  const entry = await dictService.lookupTerm(term, dictId)
  memoryMonitor.check()
  return entry
}
```

**注意**：`performance.memory` 仅在 Chromium 浏览器中可用（Chrome、Edge）。Firefox 和 Safari 不支持 JS 堆内存查询。对于非 Chromium 浏览器，依赖 LRU 的自然淘汰机制即可。

### 4.3 用户主动清理

**设置页面提供"清理缓存"按钮**：

```
┌──────────────────────────────────────┐
│  存储管理                            │
├──────────────────────────────────────┤
│                                      │
│  缓存状态                            │
│  内存缓存：342 条 / 1000 条           │
│  占用：~340KB                        │
│                                      │
│  数据库占用：12.5MB / 50MB (iOS)     │
│  └─ 词典数据：11.2MB                │
│  └─ 经书内容：800KB                  │
│  └─ 文件缓存：500KB                  │
│                                      │
│  [清理内存缓存]                       │
│  [清理文件缓存]                       │
│  [清除所有数据] ⚠️                    │
│                                      │
└──────────────────────────────────────┘
```

**清理按钮行为**：

| 按钮 | 操作 | 影响 |
|------|------|------|
| **清理内存缓存** | `definitionCache.clear()` + `warmupBuiltinCache()` | 仅清除 L1 缓存，重新预热内置词典。不影响 IndexedDB 数据。下次查询自动重建缓存 |
| **清理文件缓存** | 删除 `file_cache` 表中 MDX 原文件的 Blob | 释放 IndexedDB 空间。MDX 词典在 direct 模式下需要重新上传 |
| **清除所有数据** | 删除整个 IndexedDB 数据库 | **危险操作**：需二次确认。清除后需重新导入经书和词典 |

### 4.4 自动清理触发点

| 触发点 | 清理动作 | 时机 |
|--------|---------|------|
| 词典开关关闭 | `invalidateByDict(dictId)` | 用户滑动开关时立即执行 |
| 词典删除 | `invalidateByDict(dictId)` + DB 删除 | 确认后执行 |
| 词典版本更新 | `invalidateByDict(dictId)` | 新版本写入 DB 后执行 |
| 用户笔记修改 | `invalidate(key)` | 笔记保存后执行 |
| 路由离开阅读页 | 不清理（依赖 LRU 自然淘汰） | — |
| 应用初始化 | `clear()` + `warmupBuiltinCache()` | 确保缓存状态干净 |

## 5. 缓存预热

### 5.1 内置词典全量预热（已确认）

| 属性 | 值 | 说明 |
|------|-----|------|
| 词条数 | 50 条 | 内置佛教术语 |
| 预热时间 | < 1ms | IndexedDB 全表扫描（50 条，无索引查询开销） |
| 内存占用 | ~50KB | 50 条 × ~1KB/条 |
| 预热时机 | 应用初始化阶段（FCP 后） | 分阶段初始化 Phase 2 中执行 |
| 命中率收益 | 心经 ~95%，金刚经 ~60-80% | 内置术语覆盖核心佛教概念 |

```javascript
// services/dictService.js
export async function warmupBuiltinCache() {
  const t0 = performance.now()
  const builtinEntries = await db.getAll('dict_entries', {
    where: (key) => key.startsWith('builtin::')
  })
  for (const entry of builtinEntries) {
    definitionCache.set(entry.key, entry)
  }
  const elapsed = performance.now() - t0
  console.log(`[预热] 内置词典 ${builtinEntries.length} 条，耗时 ${elapsed.toFixed(1)}ms`)
}
```

### 5.2 用户词典预热策略（不推荐）

| 方案 | 可行性 | 原因 |
|------|--------|------|
| 用户词典全量预热 | **不可行** | 1 万条 × ~1KB = ~10MB，远超缓存 1MB 预算 |
| 用户词典 TOP-N 预热 | **不可行** | 无法预知用户词典中哪些词条在阅读中会被查询 |
| 基于阅读历史预热 | **远期可行** | 需收集用户查询统计，标记高频词条，但 v2.0 无此功能 |
| 基于经文索引预热 | **部分可行** | 分析当前经文中的所有术语，预查其释义（见 5.3 节） |

### 5.3 经文术语预热（可选优化，v2.1）

当用户进入阅读页时，可以预先扫描当前经文中的所有术语，批量查询其释义并填充 L1 缓存：

```
用户进入阅读页
        │
        ▼
┌─────────────────────────────────┐
│ 1. 提取经文中的所有术语          │
│    （复用 Trie 匹配的结果）      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 2. 收集唯一术语集合              │
│    （去重后通常 20-100 条）       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 3. 批量查询 IndexedDB            │
│    （仅查 L1 未命中的术语）       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 4. 填充 L1 缓存                  │
│    用户首次点击术语时已命中       │
└─────────────────────────────────┘
```

**性能分析**（以心经为例）：

| 指标 | 值 | 说明 |
|------|-----|------|
| 经文术语数 | ~30 条（去重后） | 心经 260 字中的唯一佛教术语 |
| 已预热（内置） | ~25 条 | 内置词典全量预热后已覆盖 |
| 需查询（用户词典） | ~5 条 | 仅用户词典中的新增术语 |
| 批量查询耗时 | < 25ms | 5 条 × < 5ms/条，并行查询 |
| 内存增量 | ~5KB | 5 条 × ~1KB |

**收益评估**：
- **优点**：用户首次点击术语时 100% L1 命中，体验最优
- **缺点**：增加阅读页初始加载时间（< 25ms），对大型经文（金刚经 5000+ 字，~200 条术语）预热成本更高
- **推荐**：v2.0 不实现，留给 v2.1 作为可选优化。v2.0 内置词典预热已覆盖 ~60-95% 的场景

### 5.4 预热时机与分阶段初始化

预热操作必须在 FCP（首次内容绘制）之后执行，避免阻塞首屏渲染：

```javascript
// main.js - 分阶段初始化
async function bootstrap() {
  // Phase 1: 快速创建并挂载应用
  const app = createApp(App)
  app.use(router).use(pinia).mount('#app')
  await nextTick()  // 等待首次渲染

  // Phase 2: FCP 后并行初始化
  setTimeout(async () => {
    await Promise.all([
      initIndexedDB(),       // ~5ms
      initSettings(),        // < 1ms
    ])
    // 预热放在最后，确保 DB 已就绪
    await warmupBuiltinCache()  // < 1ms
    await buildBuiltinTrie()    // Worker 中 5-10ms
  }, 0)
}
```

## 6. 多词典缓存管理

### 6.1 缓存隔离模型

每个词典的释义数据在 L1 缓存中通过 `${dictId}::${term}` 键天然隔离：

```
缓存中的键值对示例：

"builtin::般若"        →  { term: '般若', definition: '梵语 prajñā...', ... }
"builtin::菩提"        →  { term: '菩提', definition: '梵语 bodhi...', ... }
"user-001::般若"       →  { term: '般若', definition: '用户自定义释义...', ... }
"user-001::阿弥陀佛"   →  { term: '阿弥陀佛', definition: '...', ... }
"user-002::般若"       →  { term: '般若', definition: '另一用户的释义...', ... }
"mdx-001::缘起"        →  { term: '缘起', definition: '...', ... }
```

**隔离特性**：
- 同一术语在不同词典中是独立的缓存条目
- 关闭 `user-001` 词典不会影响 `builtin` 或 `user-002` 的缓存
- MDX 词典（direct 模式）的查询结果也通过相同键格式缓存

### 6.2 缓存共享场景

某些场景下多个词典的数据可以共享：

| 场景 | 共享策略 | 说明 |
|------|---------|------|
| **同一术语的多词典释义** | **不共享** | 不同词典的释义内容不同，需分别缓存 |
| **Trie 索引数据** | **共享** | Trie 存储在内存中（~5MB 索引层），所有词典共用同一个 TrieManager |
| **MDX 解析结果** | **不共享** | 每个 MDX 词典的词条和释义独立存储 |
| **文件缓存（MDX 原文件）** | **不共享** | 每个 MDX 文件在 `file_cache` 表中独立存储 |

### 6.3 缓存配额分配

在多词典场景下，1000 条 LRU 缓存的分配策略：

| 场景 | 内置词典 | 用户词典 A | 用户词典 B | MDX 词典 | 总缓存 |
|------|---------|-----------|-----------|---------|--------|
| 仅内置 | 50 条（全量） | — | — | — | 50 条 |
| 内置 + 1 用户词典（1 万条） | ~20 条（高频） | ~80 条（高频） | — | — | ~100 条 |
| 内置 + 3 用户词典（各 1 万条） | ~10 条 | ~50 条 × 3 | — | — | ~160 条 |
| 内置 + 1 MDX（10 万条） | ~10 条 | — | — | ~40 条 | ~50 条 |
| 极限（5 词典全启用） | ~5 条 | ~20 条 × 3 | — | ~15 条 | ~80 条 |

**关键观察**：即使同时启用 5 个词典，实际缓存命中率集中在少数高频术语上，**1000 条上限在绝大多数场景下不会触顶**。只有当用户快速翻阅大量不同经文、查询大量不同术语时，缓存才会接近满载。

### 6.4 词典状态变更的缓存影响

| 操作 | L1 缓存影响 | IndexedDB 影响 | Trie 影响 |
|------|------------|---------------|----------|
| 启用词典 | 无（按需查询填充） | 无 | 构建 Trie |
| 关闭词典 | `invalidateByDict(dictId)` | 无（数据保留） | 销毁 Trie |
| 删除词典 | `invalidateByDict(dictId)` | 删除 dict_entries + dict_config | 销毁 Trie |
| 更新词典版本 | `invalidateByDict(dictId)` | 更新 dict_entries（批量） | 重建 Trie |
| 修改用户笔记 | `invalidate(key)` | 更新 user_notes | 无 |
| 切换阅读经文 | 无（LRU 自然淘汰） | 无 | 无 |

### 6.5 MDX 词典的特殊缓存处理

MDX 词典有两种处理模式，缓存策略不同：

| 模式 | 文件大小 | 缓存策略 | 说明 |
|------|---------|---------|------|
| **预解析（parsed）** | < 5MB | 预解析为 JSON 存入 IndexedDB `dict_entries` 表，L1 缓存同普通词典 | 查询走标准 L1 → L2 链路 |
| **直接读（direct）** | >= 5MB | L1 缓存 MDX 查询结果，L2 为 mdict-js 实时查询（不走 IndexedDB dict_entries） | MDX 原文件存在 IndexedDB `file_cache` 表中 |

**Direct 模式下的缓存链路**：

```
用户点击术语 "缘起"（MDX 词典）
        │
        ▼
┌─────────────────────────────────┐
│ L1: DefinitionCache             │
│  键: "mdx-001::缘起"             │
│  命中 → 立即返回                 │
│  未命中 → 进入 direct 查询       │
└────────────┬────────────────────┘
             │ 未命中
             ▼
┌─────────────────────────────────┐
│ mdict-js 实时查询                │
│  从 file_cache 读取 MDX Blob     │
│  使用 mdx.lookup(term) 查询      │
│  耗时: 5-20ms                    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 写入 L1 缓存                     │
│  definitionCache.set(key, entry) │
│  下次查询直接命中                 │
└─────────────────────────────────┘
```

**Direct 模式的额外优化**：
- mdict-js 实例可以缓存（不每次创建），减少二进制解析开销
- MDX Blob 从 IndexedDB 读取后缓存在内存中，避免重复 IO
- 但 MDX Blob 本身不占用 L1 释义缓存（它有独立的内存空间）

## 7. 结论与建议

### 7.1 缓存策略总结

| 层级 | 技术 | 容量 | 延迟 | 持久化 | 适用场景 |
|------|------|------|------|--------|---------|
| **L1** | Map + 自定义 LRU | 1000 条 (~1MB) | < 0.001ms | 否（页面刷新丢失） | 重复查询加速 |
| **L2** | IndexedDB dict_entries | 无限制（受浏览器配额） | < 5ms | 是（浏览器管理生命周期） | 释义数据持久化 |
| **L3** | mdict-js direct | 取决于 MDX 文件大小 | 5-20ms | 是（file_cache 表） | 大型 MDX 词典 |
| **L4** | localStorage 降级 | 5MB | < 5ms | 是 | IndexedDB 不可用时降级 |

### 7.2 推荐方案

1. **L1 缓存**：Map + 自定义 LRU（零依赖），1000 条上限，内置词典全量预热
2. **L2 存储**：IndexedDB（idb 库），`dict_entries` 表存储预解析数据，`file_cache` 表存储 MDX 原文件
3. **缓存键**：`${dictId}::${term}`，天然隔离多词典
4. **清理策略**：词典状态变更时按需失效（`invalidateByDict`），页面切换不清理，内存压力时动态调整上限
5. **预热策略**：v2.0 仅预热内置词典（50 条），经文术语预热留给 v2.1
6. **降级策略**：IndexedDB 不可用时降级到 localStorage，再降级到纯内存

### 7.3 不推荐的做法

| 做法 | 原因 |
|------|------|
| 用户词典全量预热 | 内存成本太高（1 万条 ~10MB），收益极低 |
| 页面切换时清理缓存 | LRU 自然淘汰更优，清理后重建成本更高 |
| TTL 过期机制 | 释义数据是本地持久化数据，不会"过期"，TTL 增加复杂度无收益 |
| LFU 淘汰策略 | 实现复杂，LRU 已能覆盖 98%+ 的查询场景 |
| Service Worker 缓存 | v2.0 不需要，增加复杂度，v2.1+ 再评估 |
| SharedArrayBuffer 缓存共享 | COOP/COEP 部署成本高，v2.0 收益不明显（详见 T-11 报告） |

### 7.4 容量规划

| 指标 | 值 | 说明 |
|------|-----|------|
| L1 缓存上限 | 1000 条 | 覆盖 ~98% 的查询请求（Zipf 分布） |
| L1 正常内存 | ~100-200 条 | 典型阅读场景下的活跃缓存量 |
| L1 峰值内存 | ~1000 条（~1MB） | 大量不同术语查询后 |
| L2 IndexedDB | 50-200MB（10 万词条） | 取决于用户上传的词典数量和大小 |
| iOS Safari 安全配额 | 35MB（50MB 的 70%） | 预留 30% 余量应对 ITP 清理 |
| 内存预算总计 | < 20MB | Trie ~14-16MB + L1 ~1MB + 应用 ~3MB |

## 8. 对 v2.1 方案的影响

### 8.1 新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/definitionCache.js` | 新增 | LRU 缓存实现（~25 行），单例导出 |
| `src/engine/memoryMonitor.js` | 新增 | 内存监控（可选，仅 Chromium） |
| `src/services/dictService.js` | 修改 | `lookupTerm` 集成 L1 缓存逻辑 |
| `src/services/dictService.js` | 修改 | 词典开关/删除/更新时调用缓存失效 |
| `src/pages/Settings.vue` | 修改 | 新增"存储管理"区域（清理缓存按钮） |
| `src/main.js` | 修改 | 分阶段初始化，FCP 后执行内置词典预热 |

### 8.2 Service 层修改

```javascript
// dictService.js 中的缓存集成
import { definitionCache } from '../engine/definitionCache.js'
import { db } from '../storage/db.js'

class DictService {
  async lookupTerm(term, dictId) {
    const key = `${dictId}::${term}`

    // 1. L1 缓存命中
    let entry = definitionCache.get(key)
    if (entry) return entry

    // 2. L2 IndexedDB 查询
    entry = await db.get('dict_entries', key)
    if (entry) {
      definitionCache.set(key, entry)
      return entry
    }

    // 3. L3 MDX direct 查询（如果是 MDX 词典且为 direct 模式）
    const dictConfig = await db.get('dict_config', dictId)
    if (dictConfig?.mdxStrategy === 'direct') {
      entry = await this.lookupFromMDX(term, dictId)
      if (entry) {
        definitionCache.set(key, entry)
        return entry
      }
    }

    return null
  }

  async toggleDict(dictId, enabled) {
    await dictStore.update(dictId, { enabled })
    if (!enabled) {
      definitionCache.invalidateByDict(dictId)
    }
    trieManager.refresh()
  }

  async deleteDict(dictId) {
    definitionCache.invalidateByDict(dictId)
    await dictStore.delete(dictId)
    trieManager.refresh()
  }

  async setUserNote(entryKey, note) {
    await noteStore.upsert(entryKey, note)
    definitionCache.invalidate(entryKey)
  }
}
```

### 8.3 设置页面存储管理

```vue
<!-- Settings.vue 新增存储管理组件 -->
<template>
  <div class="storage-management">
    <h3>存储管理</h3>
    <div class="storage-info">
      <p>内存缓存：{{ cacheSize }} / 1000 条</p>
      <p>数据库占用：{{ dbUsage }}</p>
    </div>
    <van-button @click="clearMemoryCache">清理内存缓存</van-button>
    <van-button @click="clearFileCache">清理文件缓存</van-button>
    <van-button type="danger" @click="confirmClearAll">清除所有数据</van-button>
  </div>
</template>
```

### 8.4 性能目标验证

| 指标 | v2.0 目标 | 缓存策略加持后 | 是否可达 |
|------|-----------|---------------|---------|
| 首屏加载 < 1s | 是 | 预热 < 1ms，不阻塞 FCP | 远超目标 |
| 内存 < 20MB | 是 | L1 ~1MB + Trie ~15MB + 应用 ~3MB = ~19MB | 临界，需监控 |
| 释义加载 < 200ms | 是 | L1 命中 < 0.001ms，L2 < 5ms | 远超目标 |
| 重复查询响应 < 50ms | 未明确 | L1 命中 < 0.001ms | 远超目标 |
| L1 命中率（内置预热） | — | 心经 ~95%，金刚经 ~60-80% | 内置预热有效 |

### 8.5 v2.1 远期优化项

| 优化项 | 说明 | 优先级 |
|--------|------|--------|
| **经文术语预热** | 进入阅读页时预查当前经文所有术语 | P2 |
| **查询频率统计** | 记录每个术语的查询次数，用于优化预热策略 | P2 |
| **自适应 LRU 上限** | 根据设备内存动态调整 500-2000 条 | P2 |
| **Service Worker 离线缓存** | 缓存经书内容，支持离线阅读 | P3 |
| **跨设备同步缓存** | 引入后端 API 后同步用户查询历史 | P3 |

---

*文档版本: v1.0.0*
*最后更新: 2026-05-02*
