# LRU 缓存策略调研 报告

> 任务编号：T-10
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 的词典释义采用按需加载策略：用户点击阅读页中的高亮词条时，才从 IndexedDB 查询释义数据。为加速重复查询、减少 IndexedDB 读取频率，需要在内存层引入 LRU 缓存。

本次调研目标：
1. 对比 Map 自定义实现与开源库（lru-cache、quick-lru）在前端场景的适用性
2. 评估 1000 条缓存上限的内存占用
3. 对比 LRU vs LFU vs TTL 淘汰策略
4. 设计缓存键格式与冲突处理
5. 分析缓存预热与缓存一致性方案

## 2. 实现方案对比

| 方案 | 包大小 (gzip) | 性能 (get/set) | 内存控制 | 浏览器兼容 | 维护成本 |
|------|--------------|----------------|----------|------------|----------|
| Map + 自定义 | 0B（零依赖） | O(1) ~0.001ms | 手动控制容量 | 全浏览器支持 | 极低（~15 行代码） |
| lru-cache v11 | ~10KB | O(1) 高度优化 | 支持 maxSize/TTL/sizeCalculation | 需 ESM 兼容，v11+ 纯 ESM | 中（功能丰富但体积大） |
| quick-lru | ~1.3KB | O(1) | 仅支持 max 条目数 | 现代浏览器 | 低（API 简洁） |

### 2.1 方案详细分析

#### Map + 自定义实现

```javascript
class SimpleLRU {
  constructor(max = 1000) {
    this.max = max
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
    if (this.cache.size > this.max) {
      const oldest = this.cache.keys().next().value
      this.cache.delete(oldest)
    }
  }
  delete(key) { this.cache.delete(key) }
  clear() { this.cache.clear() }
  get size() { return this.cache.size }
}
```

**优点**：
- 零依赖，无额外包体积
- 代码量极小（~15 行），完全可控
- Map 的 O(1) 增删查性能与双向链表方案相当
- V8 引擎对 Map 有深度优化（< 16 条目使用线性数组，16-500 使用开放寻址哈希表，> 500 使用动态扩容哈希表）

**缺点**：
- 无内置 TTL 过期机制（需自行实现）
- 无自定义 size 计算能力（如按字节数限制）
- 无缓存命中统计

#### lru-cache v11

**优点**：
- 功能最丰富：TTL、maxSize（按字节）、sizeCalculation、缓存命中统计、dispose 回调
- 性能高度优化（Node.js 生态中最快的 LRU 实现之一）
- 支持 `ttlAutopurge` 自动清理过期条目

**缺点**：
- v11+ 版本为纯 ESM 模块，浏览器适配需要构建工具处理
- gzip 后 ~10KB，对项目首屏加载有负面影响（v2.0 目标首屏 < 1s）
- 大量高级功能在浏览器释义缓存场景用不到（如 dispose 回调、sizeCalculation）

#### quick-lru

**优点**：
- 轻量级（gzip ~1.3KB），比 lru-cache 小 8 倍
- API 简洁：`new LRU({ maxSize })` + `set/get/has/delete`
- 由 Sindre Sorhus 维护，生态信任度高

**缺点**：
- 仅支持条目数限制，不支持 TTL 或字节数限制
- 无缓存命中统计
- 功能与 Map 自定义方案重叠度高

### 2.2 LRU vs LFU vs TTL

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **LRU** | 实现简单，O(1) 操作，时间局部性好 | 易受突发扫描影响（一次性遍历大量词条会污染缓存） | **本项目推荐**：用户阅读时集中查询特定术语，重复访问概率高 |
| **LFU** | 保留热点数据，不受突发扫描影响 | 实现复杂（需维护访问频率计数器），空间局部性差 | 热点数据长期稳定的场景（如热门 API 响应缓存） |
| **TTL** | 数据自动过期，保证数据新鲜度 | 不控制缓存大小，可能无限增长；需定时清理 | 数据变化频繁且需要时效保证的场景（如实时行情） |
| **LRU + TTL** | 兼顾容量控制与数据新鲜度 | 实现复杂度增加 | 需要平衡命中率和数据一致性的场景 |

**结论**：本项目释义数据来自 IndexedDB（本地数据，不变化），无需 TTL 保证新鲜度。用户阅读时集中查询同一批术语（如心经中的"般若"、"波罗蜜多"等），具有明显的时间局部性，LRU 是最佳选择。

## 3. 缓存设计

### 3.1 容量上限

目标上限 1000 条，基于以下分析：

#### 单条释义缓存的内存占用

| 组成部分 | 大小估算 | 说明 |
|----------|----------|------|
| 缓存键（`${dictId}::${term}`） | ~32B | 字符串，如 `"builtin::般若"` |
| 缓存值（DictEntry 对象） | ~500B-2KB | 含 term、pinyin、definition（Markdown）、category 等 |
| Map 内部开销 | ~64B/条目 | V8 引擎的哈希表节点开销 |
| **单条总计** | **~600B-2.1KB** | 取平均值 ~1KB |

#### 1000 条的内存占用

| 指标 | 计算 | 结果 |
|------|------|------|
| 最低占用 | 1000 × 600B | ~600KB |
| 平均占用 | 1000 × 1KB | ~1MB |
| 最高占用 | 1000 × 2.1KB | ~2.1MB |

**结论**：1000 条释义缓存的内存占用在 600KB-2.1MB 之间，远低于 v2.0 的 20MB 内存目标。即使将上限提升到 2000 条，也不会超过 5MB。

#### 推荐配置

```javascript
const CACHE_MAX_SIZE = 1000  // 最大缓存条目数
// 对于内置词典（50条），缓存全部也无压力
// 对于大型用户词典（1万+条），1000条缓存可覆盖阅读中的高频术语
```

### 3.2 缓存键设计

#### 键格式：`${dictId}::${term}`

```javascript
function createCacheKey(dictId, term) {
  return `${dictId}::${term}`
}
// 示例：
// "builtin::般若"
// "user-001::般若"
// "user-002::涅槃"
```

#### 冲突处理

| 场景 | 处理方案 | 说明 |
|------|----------|------|
| 同一词条在不同词典 | `${dictId}::${term}` 天然隔离 | "builtin::般若" 和 "user-001::般若" 是不同的缓存键 |
| 特殊字符词条 | 使用 `::` 分隔符，不与中文/梵文冲突 | 词典 ID 不含 `:` 即可 |
| 超长词条键 | 无实际限制，但 Map 键长度建议 < 1KB | 正常佛教术语不超过 10 字 |

#### 边界情况

```javascript
// 多词典查询时的并行缓存
async function lookupTerm(term, dictIds) {
  const results = []
  for (const dictId of dictIds) {
    const key = `${dictId}::${term}`
    let entry = cache.get(key)
    if (!entry) {
      entry = await db.get('dict_entries', key)
      if (entry) cache.set(key, entry)
    }
    if (entry) results.push(entry)
  }
  return results
}
```

### 3.3 淘汰策略

采用 Map 原生迭代顺序实现的 LRU：

```javascript
class DefinitionCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return undefined
    // 命中：删除后重新插入，使其成为最新
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    this.cache.set(key, value)
    // 超出容量：淘汰最久未使用的（Map 的第一个元素）
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }

  invalidate(key) {
    this.cache.delete(key)
  }

  invalidateByDict(dictId) {
    // 批量失效：删除指定词典的所有缓存
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${dictId}::`)) {
        this.cache.delete(key)
      }
    }
  }

  clear() {
    this.cache.clear()
  }

  get size() { return this.cache.size }
}
```

## 4. 缓存预热

### 4.1 高频词条预加载的可行性

#### 分析

| 方案 | 可行性 | 说明 |
|------|--------|------|
| **内置词典全量预热** | **可行** | 内置词典仅 50 条，可直接全量加载到缓存 |
| **用户词典 TOP-N 预热** | 不可行 | 用户词典条目数万，无法预知高频词条 |
| **基于阅读历史的预热** | 远期可行 | 需要收集用户查询统计，标记高频词条 |
| **首次查询时预热相邻词条** | 不可行 | 佛教术语无明显的相邻关系 |

#### 推荐方案：内置词典全量预热

```javascript
// 在应用初始化时，将内置词典全部加载到缓存
async function warmupBuiltinCache() {
  const builtinEntries = await db.getAll('dict_entries', {
    where: (key) => key.startsWith('builtin::')
  })
  for (const entry of builtinEntries) {
    cache.set(entry.key, entry)
  }
  // 50 条内置词条，预热后缓存占用 ~50KB，可忽略不计
}
```

**收益**：内置术语（如"般若"、"涅槃"、"菩提"等）是阅读中最常查询的词条，全量预热后首次点击即可从内存返回，无需查询 IndexedDB。

**成本**：仅需在应用初始化时额外执行一次 IndexedDB 全表扫描（50 条，< 1ms），后续查询全部命中缓存。

### 4.2 不推荐用户词典预热的原因

1. **无法预知高频词条**：不同用户词典的内容差异大，无通用的高频词列表
2. **内存成本**：若预热 1000 条用户词典条目，约占用 1MB，意义不大（用户可能在整部经文中只查询其中几条）
3. **延迟收益**：LRU 的特性是"按需加载、自动淘汰"，未查询的词条预热后反而可能占用缓存空间

## 5. 缓存一致性

### 5.1 缓存失效场景

| 场景 | 触发条件 | 缓存操作 |
|------|----------|----------|
| 词典开关切换 | 用户关闭某个词典 | `invalidateByDict(dictId)` 清除该词典的所有缓存 |
| 词典删除 | 用户删除词典 | `invalidateByDict(dictId)` 后从 DB 删除 |
| 词典更新 | 用户上传新版本词典 | `invalidateByDict(dictId)` 清除旧数据缓存 |
| 用户笔记修改 | 用户修改词条笔记 | `invalidate(key)` 清除单条缓存 |
| 页面刷新/关闭 | 页面生命周期结束 | 内存缓存自动销毁（无需处理） |

### 5.2 一致性方案

```javascript
// 在 dictService 中，修改词典时同步失效缓存
class DictService {
  async toggleDict(dictId, enabled) {
    await dictStore.update(dictId, { enabled })
    if (!enabled) {
      // 关闭词典：清除缓存中该词典的所有条目
      cache.invalidateByDict(dictId)
    }
    // 通知 Trie 重建
    trieManager.refresh()
  }

  async deleteDict(dictId) {
    // 删除词典：先清除缓存
    cache.invalidateByDict(dictId)
    // 再删除 DB 数据
    await dictStore.delete(dictId)
    trieManager.refresh()
  }

  async setUserNote(entryKey, note) {
    await noteStore.upsert(entryKey, note)
    // 笔记修改：清除对应词条的缓存（下次查询时合并最新笔记）
    cache.invalidate(entryKey)
  }
}
```

### 5.3 一致性保证策略

```
┌─────────────────────────────────────┐
│  缓存一致性策略                      │
├─────────────────────────────────────┤
│  L1: 写时失效（Write-through）      │
│     修改 DB 后同步清除对应缓存       │
│  L2: 读取兜底                         │
│     缓存未命中时查 DB 并回填         │
│  L3: 开关/删除时批量失效            │
│     invalidateByDict(dictId)         │
└─────────────────────────────────────┘
```

**关键原则**：
1. **读路径**：cache.get() → 未命中 → DB.get() → cache.set() → 返回
2. **写路径**：DB.write() → cache.invalidate() → 返回
3. 释义数据（dict_entries）是只读的（用户上传后不可修改），笔记层（user_notes）是可写的，笔记修改时清除对应缓存
4. 页面刷新后缓存自动重建（内存缓存不持久化），与 DB 天然一致

## 6. 性能测试

以下数据基于公开 benchmark、V8 引擎文档和行业实测数据：

| 操作 | 数据量 | 耗时 | 内存 | 备注 |
|------|--------|------|------|------|
| get（命中） | 1000 条 | <0.001ms | - | Map.get + delete + set，纯内存操作 |
| get（未命中） | - | - | - | 需查 IndexedDB（<5ms） |
| set（未触发淘汰） | 1000 条 | <0.001ms | +~1KB/条 | Map.delete + Map.set |
| set（触发淘汰） | 1000→1001 条 | <0.002ms | 先增后减 | 额外执行 keys().next().value + delete |
| delete | 任意 | <0.001ms | -~1KB | Map.delete |
| invalidateByDict | 1000 条中匹配 N 条 | ~N×0.001ms | -N×~1KB | 需遍历所有键（O(n)） |
| clear | 1000 条 | <0.01ms | 归零 | Map.clear |

**对比参考**（IndexedDB 查询）：

| 操作 | 耗时 | 说明 |
|------|------|------|
| IndexedDB 主键查询 | 1-5ms | dict_entries 表 key 索引 |
| 缓存命中查询 | <0.001ms | 纯内存 Map 操作 |
| **加速比** | **1000-5000x** | 缓存命中可省去 IndexedDB 异步开销 |

**V8 Map 性能数据参考**（Chrome 120+）：
- < 16 条目：使用线性数组（Small Ordered Hash Table），查找 O(n) 但常数极小
- 16-500 条目：开放寻址哈希表，查找 O(1)
- > 500 条目：动态扩容哈希表，查找 O(1)
- 1000 条目的 Map 在 V8 中处于"动态扩容哈希表"阶段，性能稳定
- 频繁增删场景下，Map 的性能优于 Object（Object 在动态属性变化时可能触发"字典模式"降级）

## 7. 结论与建议

### 7.1 推荐方案：Map + 自定义 LRU

**推荐理由**：
1. **零依赖**：无需引入第三方库，减少包体积和依赖维护成本
2. **代码极简**：仅 ~25 行代码，完全可控，易于审查和维护
3. **性能足够**：Map 的 O(1) 操作在 1000 条规模下与 lru-cache 无显著差异
4. **功能匹配**：释义缓存场景不需要 TTL、sizeCalculation、dispose 回调等高级功能
5. **与项目一致性**：v2.0 已选择 `idb`（轻量）而非 `Dexie.js`（功能丰富但体积大），LRU 也应遵循同样的"够用就好"原则

**不推荐 lru-cache 的原因**：
- ~10KB gzip 体积对项目首屏加载有负面影响（v2.0 目标 < 1s）
- v11+ 为纯 ESM，需确保构建工具正确处理
- 大量高级功能在浏览器释义缓存场景中用不到

**不推荐 quick-lru 的原因**：
- ~1.3KB 虽然很小，但功能与自定义 Map 方案完全重叠
- 引入第三方依赖增加了供应链风险和维护成本
- 自定义方案仅需 ~25 行代码，无额外收益

### 7.2 具体实施建议

```
src/engine/
├── definitionCache.js     # LRU 缓存实现（~25 行）
├── trie/                  # Trie 引擎
└── highlighter.js         # 高亮引擎
```

```javascript
// src/engine/definitionCache.js
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

// 单例导出
export const definitionCache = new DefinitionCache(1000)
```

## 8. 对 v2.1 方案的影响

基于本调研结果，对 v2.1 方案提出以下具体调整建议：

### 8.1 新增文件

- `src/engine/definitionCache.js`：LRU 缓存实现（~25 行）

### 8.2 Service 层修改

- `src/services/dictService.js`：在 `lookupTerm` 方法中集成缓存逻辑

```javascript
// dictService.js lookupTerm 方法
async lookupTerm(term, dictId) {
  const key = `${dictId}::${term}`

  // 1. 检查内存缓存
  let entry = definitionCache.get(key)
  if (entry) return entry

  // 2. 查询 IndexedDB
  entry = await db.get('dict_entries', key)
  if (!entry) return null

  // 3. 写入缓存
  definitionCache.set(key, entry)

  return entry
}
```

### 8.3 词典管理修改

- 词典开关/删除/更新时调用 `definitionCache.invalidateByDict(dictId)`
- 用户笔记修改时调用 `definitionCache.invalidate(entryKey)`

### 8.4 初始化预热

- 应用启动时执行内置词典全量预热（50 条，< 1ms）

### 8.5 性能目标验证

| 指标 | v2.0 目标 | 缓存加持后 | 是否可达 |
|------|-----------|------------|----------|
| 释义加载 < 200ms | 是 | 首次 < 5ms（DB），后续 < 0.001ms（缓存） | 远超目标 |
| 内存 < 20MB | 是 | 缓存额外占用 ~1MB | 可达 |
| 重复查询响应 < 50ms | 未明确 | < 1ms（纯内存） | 远超目标 |

## 9. 参考资料

### LRU 缓存实现

- [Map 实现 LRU 缓存（稀土掘金 2025-07）](https://juejin.cn/post/7521918334876172351) - JavaScript 手写 LRU 缓存攻略：Map 与双向链表实现对比
- [Map 实现 LRU 淘汰算法（php.cn 2026-03）](https://m.php.cn/faq/2245074.html) - Map 比 Object 更适合 LRU 的详细分析
- [quick-lru GitHub](https://github.com/sindresorhus/quick-lru) - Sindre Sorhus 维护的轻量 LRU 库
- [lru-cache GitHub](https://github.com/isaacs/node-lru-cache) - isaacs 维护的高性能 LRU 库（Node.js 生态）

### V8 Map 性能

- [V8 Map 内部机制（CSDN 2025-11）](https://ask.csdn.net/questions/8996146) - Map 和 Set 在 V8 中如何高效处理键值唯一性
- [JavaScript Map 性能对比（稀土掘金 2025-09）](https://juejin.cn/post/7521920528095035434) - Map 与 Object 在性能上的差异分析

### 前端缓存策略

- [前端最常用的 5 种本地存储（稀土掘金 2026-01）](https://juejin.cn/post/7595089504618922018) - localStorage/sessionStorage/IndexedDB/Cache API/内存缓存对比
- [JS 内存优化：缓存策略调整（CSDN 2025-10）](https://blog.csdn.net/weixin_42288219/article/details/153388082) - 前端 LRU/LFU 缓存容量控制策略

### 项目文档

- `docs/PROJECT_V2_PLAN.md` - v2.0 项目方案
- `docs/plans/research/T-04-indexeddb-storage.md` - IndexedDB 存储方案调研

---

*文档版本: v1.0.0*
*最后更新: 2026-05-02*
