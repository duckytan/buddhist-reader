# M1（T01–T04）已落地代码 · 架构合规审查

> 审查人：高见远（架构师）· 团队 software-buddhist-reader
> 日期：2026-09-29 ｜ 审查对象：HEAD `cdbb0f1`（**只含 M1 已落地代码，不含 T05 在途改动**）
> 基准：`docs/plans/2026-09-29-v4.0-development-plan.md` §2.1 分层 / §11 跨文件约定 / §4.9 离线缓存 / §6.2 useHighlighter 解耦
> 性质：**只读审查，未修改任何代码**（偏离项仅报告，不顺手修）

---

## 0. 结论摘要

| 维度 | 结论 |
|------|------|
| **分层（§2.1）** | ✅ **未发现偏离**——全图依赖**单向向下**，无反向依赖、无跨层直连 |
| **§11 跨文件约定** | ✅ **10 项中 9 项零偏离**；1 项（样式：禁硬编码色值）**1 处偏离**（低） |
| **§4.9 离线缓存四要素** | ✅ **介质/容量/淘汰/节流 逐条一致**；1 处**文档同步项**（值对象多 `name` 字段） |
| **§6.2 useHighlighter 解耦** | ✅ **已与 store 解耦**；1 处**文档同步项**（`分块惰性` 未做、已注释说明） |

**偏离项计数：代码偏离 2 项**（均「低」）＋ **文档同步项 3 项**（代码无缺陷、方案文本待更新）。
**无 P0/P1 级偏离；无阻塞项。** M1 地基的分层与边界是干净的，可在其上继续构建 M2。

---

## 1. 审查方法与覆盖

- **取样口径**：一律以 `git grep <pattern> HEAD` 检索 **HEAD 已跟踪文件**（避免把工程师 T05 在途未跟踪文件 `src/services/**`、`src/stores/**`、`src/utils/anchor.ts` 误算入 M1）。磁盘工作树含 T05 WIP，已剔除。
- **覆盖文件**（全部逐行读过）：`vite.config.ts`、`tsconfig.json`、`eslint.config.js`、`src/main.ts`、`src/App.vue`、`src/app/AppShell.vue`、`src/app/router/index.ts`(+spec)、`src/components/common/{AppTabBar,BaseSheet,EmptyState,ErrorState,LoadingState}.vue`、`src/views/*.vue`(5)、`src/types/{dict,highlight,sutra}.ts`、`src/utils/{async,logger,text,trie}.ts`、`src/composables/useHighlighter.ts`、`src/data/storage.ts`、`src/data/cache/{lruCache,termCache}.ts`、`src/data/repositories/{baseUrl,dictRepository,sutraRepository}.ts`、`src/styles/*.css`、`scripts/build-dict-chunks.cjs`、`scripts/guard-forbidden.mjs`、`scripts/check-bundle-budget.mjs`、`.github/workflows/ci.yml`、`package.json`。

---

## 2. 代码偏离项（有证据，建议修）

### [低] D-1 · `BaseSheet` 遮罩硬编码色值，未走 token

| 项 | 内容 |
|----|------|
| **证据** | `src/components/common/BaseSheet.vue:65` → `background-color: rgb(0 0 0 / 35%);`（该行是本文件唯一未用 `var(--*)` 的颜色；同文件另 10 处均用 token） |
| **违反条款** | §11 样式：**「只用 token 变量；禁止硬编码色值；新增变量先加 `tokens.css`」** |
| **佐证** | `tokens.css` 现有 94 个变量，**无** `--color-mask` / `--color-overlay` / `--color-scrim`（已 `git grep` 确认） |
| **影响** | 4 主题（宣纸/墨夜/护眼/日间）下遮罩色不可调；与「新增变量先加 tokens.css」的约定相反（此处是「先硬编码」） |
| **建议** | 在 `tokens.css` 增 `--color-mask: rgb(0 0 0 / 35%)`（可按主题覆写），`BaseSheet.vue` 改用 `var(--color-mask)` |

### [低] D-2 · `rollup-plugin-visualizer` 为**死依赖**；§12.1 描述的预算载体与实现不符

| 项 | 内容 |
|----|------|
| **证据** | ① `package.json:34` 声明 `"rollup-plugin-visualizer": "^5.14.0"`；② 但 **v4.0 全树无任何引用**——`git grep visualizer HEAD` 在 `scripts/**`、`vite.config.ts`、`*.config.*` 中**零命中**（仅命中 `archive/v2.0/**`、`docs/**`、`package-lock.json`）；③ 实际预算载体是独立脚本 `scripts/check-bundle-budget.mjs`（由 `package.json` 的 `"budget"` 脚本调用） |
| **违反条款** | §12.1 表格：「构建期 bundle 预算 … **自研 Vite 插件 + `rollup-plugin-visualizer`**」；§10 依赖表亦列该包（`"rollup-plugin-visualizer": "^5.x" // 体积分析`） |
| **性质** | **方案文本内部不一致**：§12.1/§10 说「Vite 插件 + visualizer」，而 §5 文件树与 §9-T11 说「**脚本** `check-bundle-budget.mjs`」。代码**遵循了 §5/§9-T11**（脚本），故 §12.1/§10 的表述滞后 |
| **影响** | ① 死依赖污染 `node_modules`/审计面（正是「做减法」要避免的）；② 未来审查者按 §12.1 找「Vite 插件」会找不到 |
| **建议** | 二选一：**(a) 删依赖**（`npm rm rollup-plugin-visualizer`）并改 §12.1/§10 为「独立脚本 `check-bundle-budget.mjs`」；或 **(b) 按 §12.1 接线**（加 `visualizer()` 插件）。倾向 **(a)**（与「减法」一致，且脚本已满足 §12.1 的四条阈值断言） |

---

## 3. 文档同步项（**代码合规、无缺陷**，方案文本待更新）

> 以下三项**不是代码问题**，而是「方案文本未跟上已落地的实现决策」。据「不更新即矛盾」原则列出，供后续文档修订。

### [信息] S-1 · §6.2 承诺的「分块惰性」未做（代码已注释说明并延后）

- **证据**：`src/composables/useHighlighter.ts:15-16` 明确写「未采纳『分块惰性构建』：24k 词表的 Trie 构建为一次性 O(总字符数)，实测非瓶颈……故延后」；实际只落地了 **identity memo**（`useHighlighter.ts:43-52` `WeakMap`）。
- **与方案差异**：§6.2（`plan:L522`）写「Trie 构建加 **memo + 分块惰性**」。
- **判定**：**代码合规**（有实测理由、且延后属「做减法」正确取向）；建议 §6.2 改为「memo（已做）+ 分块惰性（延后，附理由）」，避免下次审查再次对不上。

### [信息] S-2 · §4.9② 值对象结构少记 `name` 字段

- **证据**：`src/data/cache/termCache.ts:18-24` 的 `CachedEntry = { definition, pinyin, **name**, ts }`，注释标明「**T05 增补**：离线命中时无需索引即可展示来源词典名」。
- **与方案差异**：§4.9②（`plan:L406`）字面结构为 `{[dictId+term]:{definition,pinyin,ts}}`——**未列 `name`**。
- **判定**：**代码合规且合理**（离线展示确需词典名，属加法）；建议 §4.9② 补记 `name` 字段，保持文档与实现一一对应。

### [信息] S-3 · `eslint.config.js:73` 注释举例引用了已删除文件

- **证据**：`eslint.config.js:73` 注释「CommonJS 配置/脚本文件（如 **`.eslintrc.cjs`**）」，而 `.eslintrc.cjs` 已于 `cdbb0f1` 删除。
- **判定**：**代码合规**，仅注释举例陈旧（trivial）。建议改举例为现存 CJS 文件（如 `scripts/build-dict-chunks.cjs`）。

---

## 4. 逐条核对通过项（明确「未发现偏离」）

### 4.1 §2.1 分层：单向向下 ✅

以 `git grep -E "from '@/"` 提取 HEAD 全量 import，人工核对依赖方向：

| 依赖边 | 方向 | 判定 |
|--------|------|------|
| `app/AppShell.vue → components/common/AppTabBar.vue` | L1 → L1 | ✅ |
| `composables/useHighlighter → utils/{trie,text}` + `types/highlight` | L2 → 工具/类型 | ✅ |
| `data/cache/termCache → data/storage` | L5 → L5 | ✅ |
| `data/repositories/{dict,sutra}Repository → utils/async` + `types/*` | L5 → 工具/类型 | ✅ |

- **无**任何 `views/components → data`、`data → services/stores`、`data → components` 等**反向/跨层直连**。
- `stores/`、`services/` 在 HEAD **尚不存在**（T05 未落地），故无「stores→services→data」链可违反。
- 注：§2.1 图中 `REPO --> CACHE`（仓库→缓存）在 M1 **尚未接线**（`lruCache` 无消费者）——属 T05/T06 待办，**非偏离**。

### 4.2 §11 跨文件约定 ✅（除 D-1）

| 约定 | 核验命令/证据 | 结果 |
|------|----------------|------|
| 命名：组件 PascalCase / composable `useXxx` / 类型 PascalCase / 常量 UPPER_SNAKE | 逐文件读 | ✅ 全符合（`useHighlighter`、`STORAGE_KEYS`、`TERM_CACHE_LIMITS`、`NUMERAL_CHARS`、`BUDGET`…） |
| **错误处理**：所有 `fetch` 走 `utils/async.ts` | `git grep "fetch(" HEAD -- src`（排除 `async.ts`）= **0 命中** | ✅ 无裸 `fetch` |
| **错误处理**：禁静默 catch | `git grep catch HEAD -- src`（非测试）= `storage.ts`(5) + `async.ts`(2) | ✅ `async.ts` 均 rethrow；`storage.ts` 5 处**显式降级为返回值**且注释说明（`storage.ts:4-9` 定义「非静默吞错」）——**不构成静默** |
| **日志**：禁 `console.*`（除 `logger.ts`） | `git grep "console\." HEAD -- src`（排除 `logger.ts`）= **0 命中** | ✅ `console` 唯一出口 `utils/logger.ts`（`eslint.config.js:127-132` 对该文件豁免 `no-console`） |
| **存储**：统一 `data/storage.ts`，key 前缀 `br-` | `git grep localStorage HEAD -- src`（排除 `storage.ts` 与测试）= 仅 `termCache.ts` 的**注释** | ✅ 生产代码仅 `storage.ts` 触碰 `localStorage`；`STORAGE_KEYS` 集中登记、全部 `br-` 前缀 |
| **DOM 访问**：`document.*`/`window.*` 仅 `utils/anchor.ts` | `git grep -E "\b(document\|window)\." HEAD -- src` = **0 命中** | ✅ 组件/composable 层零 DOM 直连（`anchor.ts` 属 T06，尚未创建） |
| **类型**：禁 `any` | `git grep -E ": *any\|as any\|<any>\|any\[\]" HEAD -- src` = **0 命中** | ✅ |
| **类型**：跨层数据来自 `types/` | 仓库层只 import `@/types/dict`、`@/types/sutra` | ✅ |
| **样式**：只用 token、禁硬编码色值 | `git grep -E "#[0-9a-fA-F]{3,8}\|rgba?\(\|hsla?\(" HEAD -- src/**/*.vue src/styles/base.css` | ⚠️ **1 处**：`BaseSheet.vue:65`（见 D-1） |
| **异步**：`async/await` + `AbortController.abort()` | `async.ts` 全 `async/await`、`fetchJsonOnce` 内置 `AbortController`+外部 signal 级联 | ✅ |
| **可访问性**：图标按钮 `aria-label`、触控区 ≥44px | `AppTabBar`(nav aria-label)、`BaseSheet`(关闭 aria-label + `--touch-target`)、三态组件含 `role` | ✅ |

### 4.3 §4.9 离线缓存四要素 ✅

`src/data/cache/termCache.ts` 与 §4.9② 逐条比对：

| 要素 | §4.9② 规定 | 代码实测 | 判定 |
|------|-------------|----------|------|
| **介质** | `localStorage`，封装进 `termCache.ts`，**不引入 IndexedDB** | `termCache.ts:15` 仅依赖 `@/data/storage`；全树无 `idb`/`indexedDB` | ✅ |
| **容量** | 条数 ≤500 / 总字节 ≤512KB / 单条 ≤16KB | `TERM_CACHE_LIMITS`（`termCache.ts:42-47`）= `500 / 512*1024 / 16*1024` | ✅ **逐值一致** |
| **淘汰** | LRU，写满逐出最久未用至满足双上限 | `enforceLimits()`（`:193-202`）+ `order` 数组（尾=最近用，`:164-168` `touch`） | ✅ |
| **结构** | 单 key `br-dictcache`，`{entries, order}`，写入节流 | `STORAGE_KEYS.dictCache='br-dictcache'`（`storage.ts:26`）；`scheduleFlush` 默认 300ms（`flushDelayMs:300`） | ✅（值对象多 `name` → S-2） |
| 单条超限 | 超限词条不入缓存 | `set()`（`:117`）`entryBytes > maxEntryBytes` 即 `return` | ✅ |

### 4.4 §6.2 useHighlighter 解耦 ✅

- `useHighlighter.ts` 的 import 仅：`vue`、`@/utils/trie`、`@/utils/text`、`@/types/highlight`——**不 import 任何 store**（旧版耦合的 `dict store` 已彻底移除）✅
- 词表经 **入参注入**（`TermsInput` 兼容 `Ref`/`ComputedRef`/普通数组/`null`），由调用方（未来 `useDictLookup`/组件）绑定 store 派生词表——**依赖倒置正确** ✅
- `null` 语义、数字短语过滤、正向最长匹配均保留（§6.2 语义等价）✅

### 4.5 工程化护栏（§12.1 / §12.3）✅

| 项 | 实测 | 判定 |
|----|------|------|
| `check-bundle-budget.mjs` 四阈值 | `BUDGET` = js 2MB/600KB gzip、index 2MB、chunk 256KB、total 50MB | ✅ 与 §12.1①②③④ **逐值一致** |
| 单词条分片豁免 | `checkChunks()` 对 `entryCount<=1` 的超限片**告警豁免**、`>1` 才 FAIL（`:191-203`） | ✅ 与 §12.3① 一致 |
| `guard-forbidden.mjs` 断言数 | A 类 7 + B 类 5 = **12**（含 `assertNotTracked('public/dicts/')` 目录前缀匹配） | ✅ 与 §12.3 一致 |
| `assertNoMatch` 剥离注释 | `stripComments()`（`:84-146`）后匹配可执行内容 | ✅ 与 §12.3② 一致（A 类有效） |
| C 类基线治理 | 基线缺失 → 判失败（`loadBaseline` `:315-329`）；CI 无 `\|\| true`/`continue-on-error` | ✅ 与 §12.3 C 一致 |
| CI 顺序 | `ci.yml` = lint → typecheck → test → build → guard → budget | ✅ 与 §12.3「进 CI」一致 |
| 依赖版本 | `@vue/devtools-api ^8.1.5`、`vite ^8.3.1`、`vitest ^5.0.2`、`eslint ^10.11.0`… | ✅ 与 §3/§10 修正后版本一致 |

---

## 5. 附：复现命令（可核对本报告每一条）

```bash
# 口径：只查 HEAD 已跟踪文件（剔除 T05 在途未跟踪文件）
git ls-tree -r --name-only HEAD -- src scripts .github

# D-1 硬编码色值
git grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" HEAD -- 'src/**/*.vue' 'src/styles/base.css'

# D-2 死依赖
git grep -n "visualizer" HEAD -- 'scripts/**' 'vite.config.ts' '*.config.*'   # 应无命中
sed -n '34p' package.json

# §11 各项
git grep -n "fetch(" HEAD -- 'src/**/*.ts' | grep -v src/utils/async.ts      # 0
git grep -n "console\." HEAD -- 'src/**/*.ts' | grep -v src/utils/logger.ts  # 0
git grep -nE "\b(document|window)\." HEAD -- 'src/**/*.ts' 'src/**/*.vue'    # 0
git grep -nE ": *any\b|as any\b|<any>" HEAD -- 'src/**/*.ts' 'src/**/*.vue'  # 0
git grep -n "localStorage" HEAD -- 'src/**/*.ts' | grep -v src/data/storage.ts

# §2.1 依赖方向
git grep -nE "from '@/" HEAD -- 'src/**/*.ts' 'src/**/*.vue'

# §4.9 四要素
sed -n '42,47p;117p;193,202p' src/data/cache/termCache.ts
```

---

*本报告为只读审查产出，未修改任何代码。偏离项 D-1/D-2 建议由工程师在 M2 启动前顺手处理（各 ≤5 分钟）；S-1~S-3 属方案文本同步，建议随下次方案修订一并更新。*
