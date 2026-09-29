# T06 阅读器核心（语义锚点）· 架构合规审查

> 审查人：高见远（架构师）· 团队 software-buddhist-reader
> 日期：2026-09-29 ｜ 审查对象：**HEAD `d0146a9`**（T06，18 文件）
> 基准：`docs/plans/2026-09-29-v4.0-development-plan.md` §6.1 三层语义锚点 / §11 跨文件约定 / §8.1 加载流程 / §6.3 进度节流 / §2.1 分层
> 性质：**只读审查，未修改任何代码**

---

## 0. 结论摘要

| 维度 | 结论 |
|------|------|
| **§6.1 三层语义锚点** | ✅ **三层全部落实**；**硬性 grep 零残留**（无 `createTreeWalker`/`getBoundingClientRect` 实际调用、无 `-40`/`-20` 魔法偏移） |
| **§11 DOM 白名单** | ✅ **生产代码 DOM 访问仅 `utils/anchor.ts`**（组件/composable 零直连 `document`/`window`/`scrollIntoView`）；1 处**口径澄清**（元素布局属性「读」未封装） |
| **§8.1 加载流程顺序** | ✅ 顺序正确（loadSutra→三态→restore→nextTick 定位→loadIndex→Trie→prefetch→abort）；1 处**实效性偏离**（abort 未接入请求） |
| **§6.3 进度双层节流** | ✅ **确实生效**（composable 200ms leading+trailing + service 300ms）；**无逐帧写盘路径** |
| **两处跨领地改动** | ✅ eslint 测试豁免**范围最小**；`/* global */` **确为局部**（仅 1 处、未扩散） |
| **§2.1 分层** | ✅ 方向向下；1 处**跳层**待明确（`ReaderView`→`dictService`） |

**偏离项计数：代码偏离 1 项**（低）＋ **口径/注释项 3 项**（信息）。
**无 P0/P1；无阻塞项。** T06 的核心（§6.1 语义锚点）**质量高**——旧版 61 行 TreeWalker 病灶被彻底替换且无残留。

---

## 1. 审查方法与覆盖

- **口径**：一律 `git show HEAD:<path>`（HEAD = `d0146a9`），**只读 HEAD**。工作树当前 clean（仅 `.workbuddy-ai/` 未跟踪），**未见 T07 在途文件**。
- **覆盖**（逐行读过）：`src/views/ReaderView.vue`、`src/components/reader/{ReaderContent,ParagraphBlock,SegmentText,ReaderProgress}.vue`、`src/composables/{useSutraLoader,useReadingProgress}.ts`、`src/utils/anchor.ts`、`src/styles/tokens.css`、`eslint.config.js`（T06 改动）。
- **独立 grep**（不依赖 lint 通过）：见 §4。

---

## 2. 代码偏离项

### [低] F-1 · `useSutraLoader` 的 `AbortController` **未透传 signal**——`abort()` 无法取消进行中的请求

| 项 | 内容 |
|----|------|
| **证据** | `src/composables/useSutraLoader.ts:52-53` 创建 `controller`+`signal`；`:59` **`await sutraService.loadSutra(sutraId)` 未传 signal**；`:60,64` 仅用 `signal.aborted` **阻止 setState**。签名链均无 signal 形参：`sutraService.loadSutra(sutraId: string)`（`sutraService.ts:25,69`）、`sutraRepository.fetchSutra(filename)`（`sutraRepository.ts:20,39`） |
| **佐证（能力已具备但未用）** | `utils/async.ts` 的 `fetchJson` **完整支持 signal**（`:126` `signal?`、`:151` `fetchImpl(url, { signal: controller.signal })`、`:174,177` 透传）——即底层可取消，**是上层没把 signal 接下去** |
| **违反条款** | §8.1「卸载 `AbortController.abort()`」/ §11「卸载时 `AbortController.abort()`」——**字面执行了 `abort()`，但对网络请求无效**（请求继续跑完，仅丢弃结果、不写状态） |
| **影响** | 快速切经/卸载时，**旧请求仍在后台占用带宽与连接**（弱网下更明显）；「取消」是**形式**而非**实效** |
| **建议** | 把 signal 透传：`sutraService.loadSutra(id, signal?)` → `repository.fetchSutra(filename, signal?)` → `fetchJson(url, { signal })`；`useSutraLoader` 调用时传入 `signal`。属**跨 T05 签名**改动，可并入 T07/T09 一并做。**注**：`useSutraLoader` 的「取消后不写状态」已正确实现（`:60,64`），本条只针对「请求未被真正取消」 |

---

## 3. 口径待明确 / 注释项（**代码可判定为合规**）

### [信息] N-1 · `ReaderView`（L1）直接调用 `dictService`（L4），跳过 composables/stores

- **证据**：`src/views/ReaderView.vue:58` `import { dictService } from '@/services/dictService'`；`:99-100` `dictService.loadIndex()` / `getEnabledTerms()`；`:115` `dictService.prefetchForChapter(...)`。
- **与 §2.1 关系**：§2.1 mermaid 仅有 `V --> H & SL & DL & SE & PR & SEL`（views→composables）与 `ST --> DS & SS & ...`（stores→services），**未画 `views → services` 直连边**。方向为 `L1→L4`（向下，**不违反**「只能向下」），但属**跳层**（跳过 L2/L3）。
- **两面**：一方面 §2.1 散文「`views/` 只编排」可解读为「view 可直连 service 做编排」；另一方面 §8.1 把「`loadIndex()` 懒加载一次」列入阅读器流程，而 T06 尚无 `useDictLookup`（T08 才建）→ 现状是**无 composable 可用的权宜**。
- **建议**：二选一——**(a)** 认可「view 可直连 service」，则在 §2.1 补一条 `V -.-> services` 虚线并说明；**(b)** T08 引入 `useDictLookup` 后，改为经该 composable（对齐 `useSutraLoader`/`useReadingProgress` 的既有模式）。倾向 **(b)**（与本轮其余 store 走 service 的对称性一致）。

### [信息] N-2 · 组件内直接读取**元素布局属性**（DOM「读」未封装，写已封装）

- **证据**：`src/components/reader/ReaderContent.vue:123` `container.scrollTop`、`:128` `el.offsetTop`、`:132` `container.scrollHeight` / `clientHeight`；对照**写**侧 `setScrollTop` 已封装进 `utils/anchor.ts:95`。
- **§11 字面**：§11 只禁「组件/composable 内直接 `document.*`/`window.*`」（+ §6.1 禁 `getBoundingClientRect`）；**元素属性读不在此列 → 不违规**。
- **精神偏差**：但「DOM 访问集中在 `anchor.ts`」的取向被**读写不对称**削弱（读散在组件、写在工具）。
- **建议**：二选一——**(a)** 在 `anchor.ts` 增 `readScrollMetrics(el)` 之类封装读；**(b)** 在 §11 明确「元素布局属性读不属『DOM 访问』」，消除歧义。

### [信息] N-3 · `ACTIVE_CHAPTER_OFFSET = 96` 为魔法数（**非**被禁的滚动补偿偏移）

- **证据**：`src/components/reader/ReaderContent.vue:77` `const ACTIVE_CHAPTER_OFFSET = 96`。
- **澄清（回应「魔法偏移」核查）**：**不是**旧版被禁的 `-40`/`-20` 滚动定位补偿（已 grep 确认 **0 处**，见 §4）；它是「活动章节」**判定阈值**（`el.offsetTop <= top + 96`），用途不同、不参与滚动定位。
- **风险**：其语义近似顶栏高度（`--reader-header-height: 56px`，`tokens.css:77`），二者若不同步调整会**语义漂移**。
- **建议**：注释二者关系，或从 token 派生（若将来顶栏高度变化）。

---

## 4. 逐条核对通过项（明确「未发现偏离」）

### 4.1 §6.1 三层语义锚点 ✅

| 层 | 要求 | 实测 | 判定 |
|----|------|------|------|
| **① globalId 全局唯一** | `${sutraId}:${chapterIdx}:${paraIdx}` 且**跨章唯一** | `anchor.ts:13-15` `makeGlobalId`；`sutraService.toChapters` 逐章传 `chapterIdx`（含章号，故跨章不重复）；`ParagraphBlock.vue:44` `elementId=toElementId(globalId)` | ✅ |
| **② data-off / data-hit** | `data-off` 写**数据模型字符偏移**；`data-hit` 标记命中段 | `SegmentText.vue:11` `:data-off="segment.off"`（`off` 来自 `useHighlighter` 的模型偏移）；`:12` `:data-hit="segment.type==='text' ? null : ''"`（term/search 才有） | ✅ |
| **③ CSS 锚点定位** | `scroll-margin-top: var(--reader-header-height)` + `scrollIntoView({block:'start'})` | `ParagraphBlock.vue:56` `scroll-margin-top: var(--reader-header-height)`；`anchor.ts:87` `target.scrollIntoView({ block: 'start' })`；token 定义 `tokens.css:77` `--reader-header-height: 56px` | ✅ |

**硬性核查（独立 grep，不信 lint）**：

| 检查 | 命令 | 结果 |
|------|------|------|
| `createTreeWalker` 实际调用 | `git grep -nE "createTreeWalker\|getBoundingClientRect" HEAD -- 'src/**'` | ✅ **仅 2 处注释**（`ParagraphBlock.vue:23`、`anchor.ts:73` 均为「不使用」的说明文字），**无实际调用** |
| `-40`/`-20` 魔法偏移 | `git grep -nE "\-\s*40\|\-\s*20" HEAD -- 'src/components/reader/**' 'src/views/ReaderView.vue' ...` | ✅ **0 处** |

### 4.2 §11 跨文件约定 ✅（除 N-2 口径）

| 约定 | 核验（`git grep HEAD`） | 结果 |
|------|--------------------------|------|
| **DOM 仅 `anchor.ts`** | `document.`/`window.`/`scrollIntoView` 全 `src` 命中：`anchor.ts:78`（`getElementById`，白名单）+ `:87`（`scrollIntoView`，白名单）+ **测试文件**（新豁免）；**组件/composable 零命中** | ✅ |
| 无 `any` | T06 范围 `: any`/`as any`/`<any>` = **0** | ✅ |
| 无 `console`（除 logger） | T06 范围 `console.` = **0** | ✅ |
| fetch 走 `utils/async.ts` | T06 范围裸 `fetch(` = **0**（经 `sutraService`→仓库→`fetchJson`） | ✅ |
| 命名 | 组件 PascalCase、composable `useXxx`、常量 UPPER_SNAKE（`ACTIVE_CHAPTER_OFFSET`/`PARA_ID_PREFIX`/`PROGRESS_THROTTLE_MS`） | ✅ |
| 类型来自 `types/` | `Segment`/`ReadingProgress`/`Sutra` 等均 `import type` 自 `@/types/*` | ✅ |

### 4.3 §8.1 加载流程顺序 ✅（除 F-1 实效性）

| 步骤 | 实测 | 判定 |
|------|------|------|
| `loadSutra`（8s 超时 + 1 重试） | `ReaderView.vue:84` `await load(id)` → `useSutraLoader` → `sutraService` → `fetchJson`（`async.ts` 默认 `timeoutMs=8000`/`retries=1`） | ✅ |
| 三态 | `ReaderView.vue:3-15` loading/error/empty（`LoadingState`/`ErrorState`/`EmptyState`） | ✅ |
| `restore` | `ReaderView.vue:88` `restore(id)`（`useReadingProgress`→`progressService.restore`） | ✅ |
| **`nextTick` 后定位** | `ReaderContent.vue:152-153` `await nextTick(); scrollToProgress(...)`（`watch` + `immediate`） | ✅ |
| `loadIndex()` 懒加载一次 | `ReaderView.vue:99` `await dictService.loadIndex()`（`dictService` 幂等：并发共享同一 Promise） | ✅ |
| 构建 Trie | `ReaderContent.vue:85` `useHighlighter(termsRef)`（词表就绪即建 Trie） | ✅ |
| 章节变化 `prefetchForChapter` | `ReaderContent.vue:146` `watch(matchedTerms, → emit('chapterTerms'))` → `ReaderView.vue:113-116` `dictService.prefetchForChapter` | ✅ |
| 卸载 abort | `useSutraLoader.ts:80` `onScopeDispose(cancel)` → `:75-78` `abort()` | ⚠️ **形式到位、实效不足**（F-1） |
| 取消后不写状态 | `useSutraLoader.ts:60,64` `if (signal.aborted) return` | ✅ |

### 4.4 §6.3 进度双层节流 ✅

| 层 | 实现 | 判定 |
|----|------|------|
| **渲染节流 200ms** | `useReadingProgress.ts:23` `PROGRESS_THROTTLE_MS=200`；`:66-80` `record()`：`elapsed>=200` 立即 commit（leading），否则 `pending`+`setTimeout(200-elapsed)`（trailing） | ✅ |
| **写盘节流 300ms** | `commit()`（`:63`）→ `progressService.save()`（T05，300ms 尾触发） | ✅ |
| **无逐帧写盘路径** | `onScroll`（`ReaderContent.vue:120`）每滚动事件 `emit('progress')`，但 `onProgress`→`record` **被 200ms 门控**，`save` 再被 300ms 门控 → **磁盘写入频率 ≤ 1/300ms** | ✅ |
| 卸载 flush | `useReadingProgress.ts:100` `onScopeDispose(flush)`（`:89-98` 立即 commit 挂起值 + `progressService.flush()`） | ✅ |

### 4.5 两处跨领地改动 ✅

| 改动 | 核验 | 判定 |
|------|------|------|
| **eslint 测试文件豁免**（关 `no-restricted-globals`，留 `no-restricted-syntax`） | `eslint.config.js`（T06 diff）：`files: ['**/__tests__/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}']` + `rules: {'no-restricted-globals': 'off'}`——**仅测试文件**，且 `no-restricted-syntax`（TreeWalker/getBoundingClientRect）**保留生效** | ✅ **范围最小** |
| **`ReaderContent.vue` `/* global HTMLElement, Element */`** | `git grep "global HTMLElement\|/\* global" HEAD -- 'src/**'` → **仅 `ReaderContent.vue:30` 一处**，未扩散 | ✅ **确为局部**（技术债，理想解是对 `.vue` 关 `no-undef`，已由 team-lead 记录） |

---

## 5. 附：复现命令

```bash
# 0. 只读 HEAD 取文件
git show HEAD:src/utils/anchor.ts | nl -ba
git show HEAD:src/composables/useSutraLoader.ts | nl -ba

# 1. §6.1 硬性核查（应仅注释命中）
git grep -nE "createTreeWalker|getBoundingClientRect" HEAD -- 'src/**'
git grep -nE "\-\s*40|\-\s*20" HEAD -- 'src/components/reader/**' 'src/views/ReaderView.vue'

# 2. §11 DOM 白名单（应仅 anchor.ts + 测试）
git grep -nE "\b(document|window)\." HEAD -- 'src/**'
git grep -n "scrollIntoView" HEAD -- 'src/**'

# 3. F-1：signal 未透传
git show HEAD:src/services/sutraService.ts   | grep -n "loadSutra\|signal"
git show HEAD:src/data/repositories/sutraRepository.ts | grep -n "fetchSutra\|signal"
git show HEAD:src/utils/async.ts | grep -n "signal"      # fetchJson 支持 signal

# 4. 魔法数 / 局部 global
git show HEAD:src/components/reader/ReaderContent.vue | grep -n "ACTIVE_CHAPTER_OFFSET\|/\* global"
```

---

*本报告为只读审查产出，未修改任何代码。F-1（signal 透传）建议并入 T07/T09；N-1/N-2/N-3 属口径/注释明确，均非阻塞。*
