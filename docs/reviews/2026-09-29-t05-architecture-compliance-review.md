# T05 领域服务 + stores · 架构合规审查

> 审查人：高见远（架构师）· 团队 software-buddhist-reader
> 日期：2026-09-29 ｜ 审查对象：T05（`a662409`）· 实际读取版本：**HEAD `1209401`**
> 基准：`docs/plans/2026-09-29-v4.0-development-plan.md` §2.1 分层 / **§6.8 状态管理边界（本轮重点）** / §11 跨文件约定 / §4.9 离线缓存
> 性质：**只读审查，未修改任何代码**

---

## 0. 结论摘要

| 维度 | 结论 |
|------|------|
| **§6.8 状态边界** | ✅ **5 个 store 全部守住各自边界**（含 `dict` 未持有 `index.terms`/分片大对象）；2 处**边界加固建议**（低） |
| **§2.1 分层** | ✅ **单向向下、零反向依赖**；1 处**跳层**（`reader` store 直连 `data/storage`）待商榷（低） |
| **§11 跨文件约定** | ✅ **逐项零偏离**（裸 fetch 0 / console 0 / 直接 localStorage 0 / document·window 0 / any 0 / 框架无关）；2 处代码内注释/清单同步项 |
| **§4.9 离线缓存** | ✅ **四要素仍守住**；`name` 字段向后兼容**确实有效**（`normalize()` 处理存量条目） |
| **工程师自述核实** | 「所有 store 均不持有 `loading`/`error`」——**属实**（详见 §5.1，含 1 处 nuance） |

**偏离项计数：代码偏离 2 项**（均「低」，1 项已被 team-lead 预先批准）＋ **文档/注释同步项 2 项**（代码无缺陷）。
**无 P0/P1；无阻塞项。** T05 的 store 边界与分层是干净的，M3/T08 可在此之上构建。

---

## 1. 审查方法与覆盖

- **口径**：一律 `git show HEAD:<path>` 读取，**只读 HEAD**，不读工作树。工作树当前 clean（仅 `.workbuddy-ai/` 未跟踪），且**已核实 T05 范围文件与 `a662409` 逐字节一致**：
  ```bash
  git diff --stat a662409 1209401 -- src/services src/stores src/types/{note,reader,sutra}.ts src/utils/{anchor,id}.ts src/data/cache/termCache.ts
  # → 空（HEAD 1209401 是 infra 修复提交，未触碰 T05 文件）
  ```
- **覆盖**（逐行读过）：`src/services/{sutra,dict,note,progress,settings}Service.ts`、`src/stores/{sutra,reader,dict,notes,settings}.ts`、`src/types/{note,reader,sutra}.ts`、`src/utils/{anchor,id}.ts`、`src/data/cache/termCache.ts`。
- **T06 在途改动**：本次工作树未见 `src/views/ReaderView.vue`、`src/components/reader/**`、`src/composables/use{SutraLoader,ReadingProgress}.ts`（未纳入，符合口径）。

---

## 2. §6.8 状态管理边界（本轮重点 · 逐 store 核）

| Store | §6.8 应只有 | 实测持有 | 禁止项核查 | 判定 |
|-------|-------------|----------|------------|------|
| `sutra` | 经书列表、当前经书、分类筛选 | `manifest` / `current`(shallowRef) / `category` | 无 UI 状态 ✅；无词典数据 ✅ | ✅ 合规 |
| `reader` | 滚动位置、书签、当前章节 | `sutraId` / `chapterIdx` / `position` / `bookmarks` | 无面板开关 ✅；无阅读时长 ✅ | ✅ 合规（见 D-1 跳层） |
| `dict` | 索引、启用词典、查词结果**缓存引用** | `dicts`(DictMeta[]·shallowRef) / `enabledIds` / `results`(≤50) | 无阅读进度 ✅；**未持有 `index.terms`/分片** ✅ | ✅ 合规（见 D-2 加固） |
| `notes` | 笔记 CRUD | `notes` / `countBySutra`(派生) | 无 sutra 标题解析 ✅ | ✅ 合规 |
| `settings` | 字号/行距/主题偏好 | `settings`(ReaderSettings) | 无 DOM 副作用 ✅（无 `document`/`window`） | ✅ 合规 |

**关键核实——`dict` store 确实未持有大对象**：`index`（含 `terms` 35314 词头）与分片 `DictChunk` 均驻留 **`dictService` 闭包变量**（`dictService.ts:103`）与 **`lruCache`**（`dictService.ts:94-100`）；store 仅经 `dictService.getDicts()` 取**轻量 `DictMeta[]`**（`dict.ts:40`）、经 `dictService.getEnabledDictIds()` 取 id 列表。**与 §6.8「大对象在 service/仓库层」一致** ✅。

---

## 3. 代码偏离项（有证据）

### [低] D-1 · `reader` store 直连 `data/storage` 落盘书签（跳层 + 与其余 4 store 不对称）

| 项 | 内容 |
|----|------|
| **证据** | `src/stores/reader.ts:17` → `import { STORAGE_KEYS, readJson, writeJson } from '@/data/storage'`；`:61-70` `loadBookmarks()`/`persistBookmarks()` 直接读写 storage；`:73-101` `addBookmark`/`removeBookmark`/`clearBookmarks` 内含「持久化 + 懒载入去重」业务逻辑 |
| **不对称（最强证据）** | 其余 4 个 store **全部经 service 层**：`notes→noteService`、`settings→settingsService`、`sutra→sutraService`、`dict→dictService`；**唯 `reader` 的书签持久化绕过 service**（无 `bookmarkService`） |
| **违反条款** | §2.1 依赖图（设计路径 `stores → services → data`；`NS/PS/STS → STORE`）；§11「业务逻辑进 `composables/`/`services/`」。**注**：方向上是 `L3→L5` **向下**（不违反「只能向下依赖」），但**跳层**且把持久化业务逻辑放进 store，与 §6.8「store 只存状态」精神有张力 |
| **team-lead 已批准** | 已批准，理由「store→data 属向下跨层」。**独立判断**：方向确不违规，**非阻塞**；但建议**抽 `bookmarkService`**（或将书签持久化并入同层 `progressService`），以恢复「store→service→storage」的一致性——正如 notes/progress/settings 的做法 |
| **建议** | 二选一：**(a)** 抽 `data` 侧 `bookmarkRepository`/`services/bookmarkService`，store 只调 service；**(b)** 若认可「书签是 store 的私有持久化」，则在 §2.1 图中**显式补一条 `reader → STORE` 边**并在 §6.8 注明例外，使文档与实现一致。倾向 **(a)**（对称性 > 局部省事） |

### [低] D-2 · `dict` store 的 `results` 缓存**仅按条数封顶、未按字节封顶**（§6.8「不得直接持有大对象」的边界）

| 项 | 内容 |
|----|------|
| **证据** | `src/stores/dict.ts:20` `RESULT_CACHE_LIMIT = 50`；`:73-80` `remember()` 仅按 `Object.keys(next).length` 逐出，**无字节维度**。而 `DictHit.definition` 是**完整释义**（`dictService.ts:201` `definition: entry.definition`，不截断） |
| **风险量化** | 已知单词条最长 **314,999 B**（§12.3①「佛書書名索引」，单条原子词条豁免切分）。若用户查询该词，store 可驻留 **~315KB 的 `DictHit`**（理论上 ×50 条，无字节上限） |
| **违反条款** | §6.8 `dict` 行「❌ **直接持有大对象**」（store 侧仅条数封顶，未按字节封顶） |
| **判定** | **边界加固建议，非明确违规**——store 主体（索引/分片）确在 service 层，此条是**唯一残留的大对象入口**，且与 team-lead 本轮点名「dict store 不得直接持有大对象」直接相关 |
| **建议** | 给 `results` 增字节上限（如 `RESULT_CACHE_BYTES`），或复用 `termCache` 的「单条 ≤16KB」思路对 `DictHit.definition` 做入缓存前的长度门限 |

---

## 4. 文档/注释同步项（**代码合规**）

### [信息] N-1 · `termCache.ts` 头部注释未同步 `name` 字段

- **证据**：`src/data/cache/termCache.ts:11` 注释仍写 `{ entries: {[key]: {definition,pinyin,ts}}, order: string[] }`，而 `CachedEntry`（`:18-24`）已含 `name`。
- **判定**：**代码合规**（接口正确），仅**文件内注释**滞后一行。建议随下次改动补齐。

### [信息] N-2 · §5 文件清单缺 `src/utils/id.ts`

- **证据**：`src/utils/id.ts` 为 T05 新增共用工具（`noteService` / `reader` store 共用 `createId`），文件自身注释已声明「**不在方案 §5 的文件清单中**」（`id.ts:4`）。
- **判定**：**代码合规**（避免两处重复实现是正确取向），仅 §5 清单待补。建议 §5 `utils/` 行补 `id`。

---

## 5. 逐条核对通过项（明确「未发现偏离」）

### 5.1 §6.8 工程师自述核实

- **「所有 store 均不持有 `loading`/`error`」——属实** ✅。逐 store 核对：`sutra`/`reader`/`settings` 均无异步态字段；`notes.loaded`、`dict.indexLoaded` 是**「是否已就绪」的布尔**，**非** transient `loading`/`error` 态。
- **nuance（供参考，非偏离）**：`dict.indexLoaded`（`dict.ts:26`）与 `notes.loaded`（`notes.ts:19`）是**就绪标志**。若后续 T08/T09 需要「加载中/失败」的 UI 态，应落在 composable（如 `useDictLookup`），**勿回填 store**——与工程师自述口径一致。

### 5.2 §2.1 分层 ✅（除 D-1）

以 `git grep "from '@/" HEAD` 提取全量 import，人工核对方向：

| 依赖边 | 方向 | 判定 |
|--------|------|------|
| `stores/* → services/*`（sutra/dict/notes/settings） | L3 → L4 | ✅ |
| `stores/reader → data/storage` | L3 → L5（**跳层**） | ⚠️ D-1 |
| `services/* → data/repositories`、`data/cache`、`data/storage` | L4 → L5 | ✅ |
| `services/* → utils/*`、`types/*` | L4 → 工具/类型 | ✅ |
| **反向**：`services`/`data`/`utils` 是否 import `@/stores` | — | ✅ **0 命中** |
| **反向**：`stores`/`services` 是否 import `@/views`/`@/components` | — | ✅ **0 命中** |

### 5.3 §11 跨文件约定 ✅

| 约定 | 核验（`git grep HEAD -- <T05 范围>`） | 结果 |
|------|----------------------------------------|------|
| 错误处理：裸 `fetch` 0 | 服务层经 `repositories`，无裸 fetch | ✅ **0** |
| 日志：`console` 漏网 0 | 唯一日志出口 `logger`（`dictService.ts:25` 用 `logger.warn/debug`） | ✅ **0** |
| 存储：直接 `localStorage` 0（仅 `storage.ts`） | 生产代码命中处均为**注释**（`termCache.ts`/`noteService.ts`/`reader.ts`）；测试用 jsdom localStorage 属正常 | ✅ |
| DOM：`document`·`window` 0 | `anchor.ts` 当前仅纯函数（DOM 函数留 T06） | ✅ **0** |
| 类型：`any` 0 | — | ✅ **0** |
| 类型：跨层数据来自 `types/` | 全部 `import type` 自 `@/types/*` | ✅ |
| 命名：composable `useXxx`/常量 UPPER_SNAKE/类型 PascalCase | `use*Store`、`THEME_NAMES`/`FONT_SIZE_STEPS`、`ReaderSettings`… | ✅ |
| 框架无关：`services` 不 import `vue`/`pinia` | `git grep "from 'vue'\|from 'pinia'" HEAD -- src/services` = **0** | ✅（`sutraService`/`dictService` 注释亦自述框架无关，可在 Node 单测） |

> **边界说明（`§11 禁静默 catch`）**：`dictService.ts:267-270` `prefetchForChapter` 的分片预取失败仅 `logger.debug` 后吞掉——**注释已说明「预取静默失败：不阻塞阅读（§4.4）」**。生产构建下 `logger.debug` 为 no-op，故**事实静默**；判定为**优化路径的可接受降级**（数据随后按需拉取），**非违规**。若需可观测，建议此处改 `logger.warn`。

### 5.4 §4.9 离线缓存（`termCache` 变更后）✅

| 检查 | 证据 | 判定 |
|------|------|------|
| 介质仍 `localStorage`、无 IndexedDB | `termCache.ts:15` 仅依赖 `@/data/storage` | ✅ |
| 容量四要素未变 | `TERM_CACHE_LIMITS`（`:42-47`）= `500 / 512KB / 16KB / 300ms` | ✅ |
| 淘汰 LRU 未变 | `enforceLimits()`（`:193-202`） | ✅ |
| 节流 300ms 未变 | `scheduleFlush()`（`:155-162`） | ✅ |
| 新增 `name` 参与字节核算 | `entryBytes()`（`:170-172`）含 `byteLen(entry.name)` | ✅ |
| **向后兼容：无 `name` 的存量条目** | `normalize()`（`:175-182`）`name: entry.name ?? ''`，在 `get()`/`getByTerm()` 读路径均调用 | ✅ **确实有效** |
| `getByTerm` 跨词典检索（离线入口） | `:91-106` 扫 `order`（≤500）快照遍历，命中即返回 | ✅ |

---

## 6. 附：复现命令（可核对本报告每一条）

```bash
# 0. 确认 T05 文件与 a662409 逐字节一致（HEAD 已推进到 1209401）
git diff --stat a662409 1209401 -- src/services src/stores src/types/{note,reader,sutra}.ts src/utils/{anchor,id}.ts src/data/cache/termCache.ts

# 1. 只读 HEAD 取文件
git show HEAD:src/stores/reader.ts | nl -ba
git show HEAD:src/stores/dict.ts   | nl -ba

# 2. §11 各项
git grep -n "fetch(" HEAD -- src/services src/stores | grep -v __tests__      # 0
git grep -n "console\." HEAD -- src/services src/stores                      # 0
git grep -nE "\b(document|window)\." HEAD -- src/services src/stores src/utils/anchor.ts   # 0
git grep -nE ": *any\b|as any\b|<any>" HEAD -- src/services src/stores       # 0
git grep -nE "from 'vue'|from 'pinia'" HEAD -- src/services                  # 0（框架无关）

# 3. §2.1 反向依赖
git grep -n "from '@/stores" HEAD -- src/services src/data src/utils         # 0
git grep -nE "from '@/(views|components)" HEAD -- src/stores src/services    # 0

# 4. §6.8 dict 未持大对象：index 在 service 闭包
git show HEAD:src/services/dictService.ts | grep -n "let index"
```

---

*本报告为只读审查产出，未修改任何代码。D-1（跳层不对称）建议按 (a) 抽 `bookmarkService` 或 (b) 补 §2.1/§6.8 文档边；D-2（`results` 字节上限）属边界加固；N-1/N-2 属注释/清单同步。均可在 T08/T09 启动前择机处理，非阻塞。*
