# T07 阅读器外围（经内搜索/四主题/设置/词典开关/顶栏）· 架构合规审查

> 审查人：高见远（架构师）· 团队 software-buddhist-reader
> 日期：2026-09-29 ｜ 审查对象：**T07 `76091db`**（26 文件，+2060/−41）；**读取基准 `76091db`**（= 审查开始时 HEAD `dbd54d8` 的源码，二者字节一致，见 §1）
> 基准：`docs/plans/2026-09-29-v4.0-development-plan.md` §8.3 搜索定位链 / §6.8 状态边界 / §11 跨文件约定 / §5 M8 词典开关 / §6.3·§6.7 档位与主题 / §2.1 分层
> 性质：**只读审查，未修改任何仓库代码**（实测脚本在 OS 临时目录运行，见 §5）

---

## 0. 结论摘要

| 维度 | 结论 |
|------|------|
| **§8.3 经内搜索与定位链** | ✅ **主链正确**（单段 `indexOf` 不跨段 / 上限 50 / `paraOffset` 与 `data-off` 同口径 / 点击→关面板→`nextTick`→`scrollToAnchor`）；⚠️ **2 处实测偏离**：**F-2** 相邻命中仅首个精确定位、其余降级整段；**F-3** 上下文「必含关键词」在关键词 >20 字时失效 |
| **§6.8 store 边界** | ✅ **T07 零 store 改动**；5 个 store 未引入 UI 状态 / 大对象 / `loading` / `error`；`data-theme` 与 CSS 变量**声明式**绑定，store 零 DOM 副作用 |
| **§11 DOM 白名单** | ✅ **未破口**：`document.*`/`window.*`/`scrollIntoView`/`getBoundingClientRect`/`createTreeWalker`/`getSelection` 生产代码**仅 `utils/anchor.ts`**；`useSelection` 经 `anchor.ts#readSelectionAnchor`、搜索定位经 `scrollToAnchor` |
| **§5 M8 词典开关** | ✅ **即时生效**：`watch(enabledIds)` → 重算词表（按 `isEnabled` 过滤）→ 新数组引用 → Trie 重建；关闭后**不参与高亮与查询** |
| **档位口径** | ✅ **逐项一致**（字号 7 档·默认索引 3=18px；行距 5 档·默认索引 2=1.65；主题默认 `paper`）；「不设置即无视觉变化」**成立**（复现 `tokens.css` 的 `--text-body-lg`/`--leading-body`）；1 处**可维护**小瑕（N-5 双真源） |
| **§2.1 依赖方向** | ⚠️ **N-1（`views → services` 跳层）在 T07 未变更**——`ReaderView` 仍直连 `dictService`；§2.1「已知权宜（T08 待归位）」记录**仍然准确**（非新缺陷，仅确认） |

**偏离项计数：代码偏离 2 项**（F-2 中低 / F-3 低）＋ **口径/健壮性/可维护 3 项**（N-4/N-5/N-6）。
**无 P0/P1；无阻塞项。** T07 外围整体合规——DOM 白名单零破口、store 边界零污染、M8 与档位口径均落实。

---

## 1. 审查方法与覆盖

- **口径（可反向验证）**：一律 `git show <commit>:<path>` 读取**已提交**版本；**不读工作树**。
  - **基准 commit = `76091db`（T07 本体）**。审查开始时 HEAD 为 `dbd54d8`；`git diff --stat 76091db dbd54d8 -- src` **为空**（二者源码字节一致，`dbd54d8` = `76091db` + `.gitignore`），故当时 `git show HEAD:<path>` 的每个行号均等价于 `git show 76091db:<path>`。**下文所有行号一律以 `76091db` 为准**（引用可反向验证：`git show 76091db:<path>`）。
  - **HEAD 变动说明**：审查期间 HEAD 前进至 **`aff6f91`**（`fix(reader): F-1 signal 真透传 + N-3 注释纠偏 + 三方同源断言`，8 文件 +114/−36）——**即 team-lead 已派修的 F-1/N-3 已知项**。该提交**不在本报告范围**（本报告只审 T07 `76091db`），不影响本报告任何结论。
- **覆盖（逐行读过）**：`src/views/ReaderView.vue`；`src/components/reader/{ReaderContent,ParagraphBlock,SegmentText,ReaderHeader,ReaderToc,ReaderSearch,ReaderNotes,ReaderSettings,ReaderDictSelector}.vue`；`src/composables/{useSearch,useSelection,useReaderSettings,useHighlighter}.ts`；`src/services/{dictService,settingsService}.ts`；`src/stores/{dict,notes,settings}.ts`；`src/utils/anchor.ts`；`src/styles/tokens.css`、`src/styles/themes.css`；T07 的 7 个 `.spec.ts`。
- **独立实测**：§8.3 定位链用 jsdom + Node strip-types **运行真实 `anchor.ts`**（脚本在仓库外，见 §5），非仅阅读推断。
- **独立 grep**（不依赖 lint 通过）：见 §4。

---

## 2. 代码偏离项

### [中低] F-2 · §8.3 相邻命中：**仅首个精确定位，其余降级为整段滚动**（实测）

| 项 | 内容 |
|----|------|
| **现象** | 当关键词在段内**相邻/连续**出现（如「般若般若」搜「般若」），点击第 2 个结果**不会**定位到段内命中处，而是**滚到整段顶部** |
| **证据链** | ① `ReaderContent.vue:109-137` `applySearch` 把命中范围标 `search` 后**按连续同类型字符合并**（`:127-135`，`off` 取该段首字符偏移）；相邻命中 `[0,2)`+`[2,4)` 合并为**单段 `search@0`**，故第 2 个命中 `offset=2` **无** `[data-off="2"]` 元素。② `anchor.ts:84` `element.querySelector('[data-off="2"][data-hit]')` → **返回 null**。③ `anchor.ts:81-86` `hit` 为空 → `target` 保持段落元素 → `scrollIntoView` **滚整段**，**返回 `true`** |
| **实测输出**（真实 `scrollToAnchor` + jsdom） | 场景 B `text="般若般若" hits@[0,2]` → `merged: search@0:"般若般若"`；`hit@0: data-hit存在=true 返回=true 定位=命中元素@0`；`hit@2: data-hit存在=false 返回=true 定位=段落(降级)` |
| **定性** | **非静默失败、非崩溃**——是**优雅降级**（滚到命中段顶部，命中文字仍在可视区，仅丧失段内精确定位）。与 §8.3「点击结果**精确定位**」的字面承诺存在差距（对**相邻命中**而言） |
| **触发面** | 关键词在段内**紧邻重复**时（`useSearch` 以 `from=index+kw.length` 产生非重叠但**可相邻**的命中）。**非**「段被 `v-if` 卸载」——T07 段落**无虚拟化/无 `v-if`**（`ReaderContent.vue:7-25` 全量 `v-for` 渲染，§6.2 分块惰性已延后），目标段落**恒在 DOM** |
| **建议** | 三选一：**(a)** `applySearch` 对每个 hit 生成**独立 `search` 段**（不跨 hit 合并），使每命中 `off` 唯一；**(b)** `scrollToAnchor` 在精确 `[data-off]` 未命中时回退为「取 ≤offset 的最近 `[data-hit]`」；**(c)** 认可降级并**补单测锁定**该行为（当前无覆盖）。倾向 **(a)**（改动局部、语义最直） |

### [低] F-3 · §8.3 上下文不变量「≤20 字**且必含关键词**」在关键词 >20 字时失效（实测）

| 项 | 内容 |
|----|------|
| **证据** | `useSearch.ts:46-54` `makeContext`：窗口**固定 `SEARCH_CONTEXT_CHARS=20`**；`pad = max(0, 20 - keywordLength)`，当 `keywordLength > 20` 时 `pad=0` → 窗口仅 20 字，**无法容纳更长关键词** |
| **实测输出** | `kw.len=2 → 含完整关键词=true`；`kw.len=15 → 含完整关键词=true`；**`kw.len=21 → 含完整关键词=false`**（ctx 为 20 字切片） |
| **违反条款** | `useSearch.ts:7` 自述「上下文 20 字（窗口 ≤20 字，**含关键词**）」+ §8.3 同口径 |
| **影响** | 极低——用户罕搜 >20 字短语；上下文仍显示命中前缀切片，可辨认。但**文档不变量在边界不成立** |
| **建议** | 二选一：**(a)** 窗口取 `Math.max(SEARCH_CONTEXT_CHARS, keywordLength)`；**(b)** §8.3/`useSearch` 注释补「关键词 >20 字时窗口退化为 20 字前缀」的边界说明 |

---

## 3. 口径 / 健壮性 / 可维护项（**代码可判定为合规**）

### [低·健壮性] N-4 · `searchHits` 与 `searchKeyword` **无一致性守卫**

- **证据**：`ReaderContent.vue:140-157` `segmentMap` 用 `props.searchKeyword.length` 决定命中段长度；`props.searchHits` 决定命中偏移。二者**必须同源**（来自同一次 `useSearch.search()`）才成立。`ReaderView.vue:37-38,140` 确以**同一 `useSearch` 实例**的 `searchHits`/`searchKeyword` 传入，**当前一致**。
- **实测（反证）**：场景 D `hits@[3] 但 kw.len=0` → `merged: text@0:"观自在般若"`（**无 search 段**）→ `hit@3: data-hit存在=false 返回=true 定位=段落(降级)`。即**一旦二者失配，全部命中降级为整段**。
- **建议**：与 `ReaderHeader.spec.ts` 的「同源锁」思路一致，补一条单测锁定「`searchHits` 非空 ⇒ `searchKeyword.length ≥ SEARCH_MIN_KEYWORD`」，防未来重构把二者拆散。

### [低·可维护] N-5 · 档位数量**双真源**

- **证据**：档位数定义两处——`settingsService.ts:15-17`（`FONT_SIZE_STEPS=7` / `LINE_HEIGHT_STEPS=5`）与 `useReaderSettings.ts:21-23`（`FONT_SIZE_SCALE.length` / `LINE_HEIGHT_SCALE.length`，各 7/5）。**px/无单位刻度值仅存在于 composable**。
- **现状**：二者**当前一致**（7/5），默认索引一致（3/2），故 §0 判定「逐项一致」成立。
- **风险**：任一改动（如加一档）需**同时**改两处，否则静默漂移。
- **建议**：由一处派生（如 `FONT_SIZE_SCALE.length === FONT_SIZE_STEPS` 的编译期/单测断言），或把刻度值上提到 `settingsService`。

### [低·测试缺口] N-6 · 搜索定位链**仅覆盖单命中 happy path**

- **证据**：`ReaderView.spec.ts:113-138`（单命中「般若」→ `data-off=3` → 点击 → `scrollIntoView` 被调）、`ReaderContent.spec.ts:74-88`（单命中 search 段）、`anchor.spec.ts:34-52`（有 span → 命中元素；**无**「给 offset 但无匹配 span」的回退断言）。
- **缺口**：**未覆盖** F-2（相邻命中降级）、F-3（kw>20 上下文）、N-4（props 失配）。`anchor.spec.ts` 亦缺「`offset` 给定但段内无 `[data-off][data-hit]` → 回退段落且返回 `true`」这条分支（该分支正是 F-2 的落点）。
- **建议**：随 F-2/F-3 一并补测（3 条断言即可覆盖本轮全部实测分支）。

### [信息·确认] N-7 · §2.1 N-1（`views → services` 跳层）**在 T07 未变更**

- **证据**：`ReaderView.vue:121` `import { dictService } from '@/services/dictService'`；`:191` `dictService.getEnabledTerms()`；`:232` `dictService.prefetchForChapter(...)`——**仍在**（未引入 `useDictLookup`，那是 T08）。
- **结论**：§2.1「🔸 已知权宜（1 处 · T08 待归位，非『已合规』）」记录**仍然准确**，**无需修改**。本轮仅**确认**，不计为偏离。

### [信息·附注] `search` 段覆盖 `term` 段对 §4.4 预取的轻微影响

- **证据**：`applySearch` 中 `types[i]='search'` 后写，**覆盖**同位置的 `term` 类型（`ReaderContent.vue:123-126`）；而 `matchedTerms`（`:160-172`）**只收集 `type==='term'`**。
- **影响**：搜索进行时，与命中重叠的术语会**暂时**从 `matchedTerms` 移除 → 该章 `chapterTerms` 预取可能漏掉它们。**极低**（预取为优化，点击查词仍走网络兜底，结果正确）。仅登记，不建议改。

---

## 4. 逐条核对通过项（明确「未发现偏离」）

### 4.1 §8.3 经内搜索（主链）✅（偏离仅 F-2/F-3）

| 要求 | 实测 | 判定 |
|------|------|------|
| **单段 `indexOf`，不跨段** | `useSearch.ts:79` `paragraph.text.indexOf(kw, from)`（**逐段**内查找）；`useSearch.spec.ts:47-57` 断言跨段拼接「BC」→ 0 命中 | ✅ |
| **上限 50** | `useSearch.ts:19` `SEARCH_MAX_HITS=50`；`:78` `while(found.length < SEARCH_MAX_HITS)` + 双 `break`；`spec:71-77` 断言截断为 50 | ✅ |
| **`paraOffset` 与渲染期 `data-off` 同口径** | `useSearch.ts:83` `paraOffset: index`（段内字符偏移）＝ `applySearch` 的 `off`（`ReaderContent.vue:133`）＝ `SegmentText.vue:11` `data-off`；`ReaderContent.spec.ts:85` 断言 `data-off==='3'`（= `paraOffset`） | ✅ |
| **上下文 ≤20 字** | `useSearch.ts:48,53` `slice(start, start+20)`；`spec:59-69` 断言 `length ≤ 20` | ✅（**必含关键词**边界见 F-3） |
| **定位链**：点击→关面板→`nextTick`→`scrollToAnchor`→`getElementById`→`querySelector` | `ReaderSearch.vue:35` `emit('jump',hit)` → `ReaderView.vue:242-245` `onJumpHit`：`closePanel()` → `scrollToTarget`（`:210-213` `await nextTick(); scrollToAnchor`）；面板 `BaseSheet` 为 `position: fixed` 覆盖层（不重排）；`anchor.ts:78,84` `getElementById`+`querySelector` | ✅（精确性边界见 F-2） |
| **`data-hit` 仅在命中段** | `SegmentText.vue:12` `:data-hit="segment.type==='text' ? null : ''"`（仅 `term`/`search`） | ✅ |

### 4.2 §6.8 状态管理边界 ✅

| 要求 | 实测 | 判定 |
|------|------|------|
| **T07 不向 store 引入 UI 状态/大对象/`loading`/`error`** | `git diff --stat 76091db^..76091db -- src/stores` → **空**（T07 **零 store 改动**） | ✅ |
| **面板等 UI 状态不进 store** | `ReaderView.vue:130-131,152` `type PanelName` + `panel = ref<PanelName\|null>(null)`（**组件本地**） | ✅ |
| **`dict` store 不持大对象** | `dict.ts:24,30` `dicts=shallowRef`（元信息）+ `results=shallowRef`（`RESULT_CACHE_LIMIT=50` 小引用）；**无** `index.terms`/分片；`loading/error` 注释明确归 T08 `useDictLookup`（`dict.ts:9`） | ✅ |
| **`data-theme` / CSS 变量声明式绑定** | `ReaderView.vue:4` `:data-theme="theme"`、`:5` `:style="cssVars"`；`useReaderSettings.ts:57-64` `cssVars` 为纯 `computed`（**无** `document`/`style.setProperty`）；`settings` store 仅 `ref` + `settingsService` 持久化（`settings.ts:22,39,48,55`），**零 DOM 副作用** | ✅ |
| **主题切换实测** | `ReaderView.spec.ts:101-111` `data-theme` 由 `paper` → `night`（经 store）| ✅ |

### 4.3 §11 DOM 白名单 ✅（**未破口**）

| 检查 | 命令 | 结果 |
|------|------|------|
| `document.` / `window.` 生产代码 | `git grep -nE 'document\.\|window\.' 76091db -- 'src/**' ':!**/__tests__/**' ':!**/*.spec.ts'` | ✅ **实际代码仅 `anchor.ts:78`**（`getElementById`，白名单）；余 2 处为注释 |
| `scrollIntoView`/`getBoundingClientRect`/`createTreeWalker` | `git grep -nE 'scrollIntoView\|getBoundingClientRect\|createTreeWalker' 76091db -- ...` | ✅ **实际代码仅 `anchor.ts:87`**；`getBoundingClientRect`/`createTreeWalker` **0 处实际调用**（余为注释） |
| `getSelection`/`removeAllRanges` | `git grep -nE 'getSelection\|removeAllRanges' 76091db -- ...` | ✅ **仅 `anchor.ts:117,141`**（白名单） |
| T07 新增 `useSelection` 是否直连 DOM | `useSelection.ts:11,43,50` 只调 `readSelectionAnchor`/`clearSelectionAnchor`（`anchor.ts`） | ✅ **零直连** |
| T07 新增搜索定位是否直连 DOM | `ReaderView.vue:126,212` 只调 `scrollToAnchor`（`anchor.ts`） | ✅ **零直连** |
| 元素布局属性「读」（`offsetTop`/`scrollTop`/`scrollHeight`/`clientHeight`） | `git grep ... 76091db -- ...` → `ReaderContent.vue:181,187,192,196` | ✅ **符合 §11 N-2 边界**（模板 ref 读布局 ≠ `document.*`/`window.*` 全局访问；**写**侧仍走 `anchor.ts#setScrollTop`，`:203`） |
| `globalThis.*` 非 DOM 用法 | `git grep globalThis 76091db -- ...` → `storage.ts:39`(localStorage)、`async.ts:172`(fetch)、`id.ts:15`(crypto)、`anchor.ts:117,141`(getSelection) | ✅ 均非 `document/window`，不触 `no-restricted-globals` |
| 无 `console`（除 logger） | `git grep -nE '\bconsole\.' 76091db -- 'src/**' ':!**/__tests__/**' ':!**/*.spec.ts'` → 仅 `logger.ts:14,18` | ✅ |
| 无 `any` | T07 新增/改动文件 `: any`/`as any` = **0** | ✅ |

### 4.4 §5 M8 词典开关（即时生效）✅

| 要求 | 实测 | 判定 |
|------|------|------|
| **开关变化即时重算词表** | `ReaderView.vue:194-200` `watch(() => dictStore.enabledIds, () => { if(dictStore.indexLoaded) refreshTerms() })`；`refreshTerms`（`:190-192`）`terms.value = dictService.getEnabledTerms()` | ✅ |
| **重建 Trie** | `getEnabledTerms()`（`dictService.ts:160-168`）每次返回**新数组** → `ReaderContent.vue:91` `termsRef` computed 变 → `useHighlighter.ts:74-78` `trie` computed 重算（identity memo `:43` 因新引用而重建） | ✅ |
| **关闭后不参与高亮** | `getEnabledTerms` 按 `isRefEnabled`（`dictService.ts:165,170-174`，`isEnabled(meta.id)`）**过滤** → 关闭词典的词头**不在**词表 → Trie 无该词 | ✅ |
| **关闭后不参与查询** | `lookup`（`dictService.ts:204-216`）termCache 路径 `.filter(item => isEnabled(item.dictId))`；`resolveRef`（`:183`）`if (!meta \|\| !isEnabled(meta.id)) return null` | ✅ |
| **无重挂载** | 仅词表引用变化驱动 Trie 重建（`useHighlighter.ts:13` 注释「不再整页重挂载」），组件不 `key` 变化 | ✅ |

### 4.5 档位口径 ✅（**逐项一致**）

| 项 | 方案/§0 口径 | 实测 | 判定 |
|----|-------------|------|------|
| 字号档数 | 7 | `settingsService.ts:15` `FONT_SIZE_STEPS=7`；`useReaderSettings.ts:21` `FONT_SIZE_SCALE` 长度 7；`useReaderSettings.spec.ts:38` | ✅ |
| 字号默认 | 索引 3 = 18px | `settingsService.ts:23` `fontSizeIndex:3`；`FONT_SIZE_SCALE[3]=18`；`spec:29,32` `18px` | ✅ |
| 行距档数 | 5 | `settingsService.ts:17` `LINE_HEIGHT_STEPS=5`；`LINE_HEIGHT_SCALE` 长度 5；`spec:39` | ✅ |
| 行距默认 | 索引 2 = 1.65 | `settingsService.ts:24` `lineHeightIndex:2`；`LINE_HEIGHT_SCALE[2]=1.65`；`spec:30,33` `1.65` | ✅ |
| 主题默认 | `paper` | `settingsService.ts:19,25` `THEME_NAMES`/`theme:'paper'`；`spec:28` | ✅ |
| **「不设置即无视觉变化」** | 默认档复现 token | `tokens.css:39` `--text-body-lg:18px`、`:52` `--leading-body:1.65`；`ParagraphBlock.vue:53-54` `font-size: var(--reader-font-size, var(--text-body-lg))`、`line-height: var(--reader-line-height, var(--leading-body))` | ✅ |
| 主题色单一来源 | 4 主题无硬编码 | `themes.css:10,28,46,64` `[data-theme='paper'\|'night'\|'eye-care'\|'day']`（仅覆盖 token）；`ReaderSettings.vue:88` 注释 + `:122-127` 主题表与 `THEME_NAMES` 一致 | ✅ |

### 4.6 §2.1 依赖方向 ✅（除已登记 N-1/N-7）

| 项 | 实测 | 判定 |
|----|------|------|
| T07 新增组件/composable 的依赖方向 | `components → {composables,stores,utils}`、`composables → {stores,services,utils}`——**均向下** | ✅ |
| `ReaderDictSelector`/`ReaderSettings` 直连 store | `ReaderDictSelector.vue:53,64` `useDictStore`；`ReaderSettings.vue:92,117` `useReaderSettings`（→`useSettingsStore`） | ✅ 向下 |
| `views → services` 跳层 | `ReaderView.vue:121,191,232`（N-7） | ⚠️ 已登记为「已知权宜」，T08 归位 |

---

## 5. 附：复现命令

```bash
# 0. 口径自证：T07 源码 == 审查时 HEAD（dbd54d8）源码
git diff --stat 76091db dbd54d8 -- src scripts '*.json' '*.ts' '*.js' '*.mjs' '*.css' '*.html'   # 应为空

# 1. 只读 T07（76091db）取文件
git show 76091db:src/utils/anchor.ts | nl -ba
git show 76091db:src/composables/useSearch.ts | nl -ba
git show 76091db:src/components/reader/ReaderContent.vue | nl -ba
git show 76091db:src/views/ReaderView.vue | nl -ba

# 2. §11 DOM 白名单（应仅 anchor.ts + 测试）
git grep -nE 'document\.|window\.'            76091db -- 'src/**' ':!**/__tests__/**' ':!**/*.spec.ts'
git grep -nE 'scrollIntoView|getBoundingClientRect|createTreeWalker' 76091db -- 'src/**' ':!**/__tests__/**' ':!**/*.spec.ts'
git grep -nE 'getSelection|removeAllRanges'   76091db -- 'src/**' ':!**/__tests__/**' ':!**/*.spec.ts'

# 3. §6.8 T07 未动 store
git diff --stat 76091db^..76091db -- src/stores    # 应为空

# 4. §5 M8
git show 76091db:src/services/dictService.ts | grep -n 'getEnabledTerms\|isRefEnabled\|isEnabled' | head

# 5. §8.3 定位链实测（jsdom 运行真实 anchor.ts，仓库外）
#   见本报告 §2 F-2 实测输出；脚本复刻 applySearch + SegmentText 的 data-hit 规则，
#   以真实 scrollToAnchor 断言「命中元素 vs 段落降级」与返回值。
node --experimental-strip-types <tmp>/driver.mjs
```

**实测环境**：Node `v22.22.2`（`--experimental-strip-types`）＋ 仓库内 `jsdom`（经 `createRequire` 解析）；脚本位于 OS 临时目录，**未写入仓库、未改动任何源码**。

---

*本报告为只读审查产出，未修改任何代码。F-2（相邻命中降级）/F-3（上下文边界）建议随 T08 或补测一并处理；N-4/N-5/N-6 为健壮性/可维护/测试建议；N-7 为 §2.1 记录确认（无需改动）。均非阻塞。*
