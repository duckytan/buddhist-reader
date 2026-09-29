# T10 独立验收审计（隐性知识验收 + T10b 补丁）

> 审计对象：**`0509d38`**（HEAD，已推送远端；T10 `400ca71` + T10b 补丁批 `0509d38`）
> 审计人：架构师（独立于实现者）
> 审计日期：2026-09-29
> 方法：**故意破坏实现 → 确认测试转红 → 还原**（不读测试名判断覆盖）+ 映射表**逐行点数**（不采信合计行）+ mock 边界分析 + 假绿排查
> **口径**：本报告所有行号/内容均以 **`git show 0509d38:<path>`** 为准（**未读工作树**）；变异测试在**工作树**上进行（改动均已还原，`git status` 为空）。二者在文中分别标注。

---

## 一、判定

# ✅ **有条件通过**

- **核心结论**：**关键路径上的 6 项自选行为变异全部转红**（锚点/搜索分段/高亮/跳转分派/清洗正则/M9），证明 T10 新增测试具备**真实的反向可验证性**，**未发现恒真断言（假绿）**。
- **但**：验收**交付物**（映射表）存在 **1 处同类算术笔误复发**（§13 合计「有 27」，逐行实为 **26**）+ **1 处陈旧计数**（282 vs 实际 292）+ **2 处交叉引用错位**，且 **1 条 P1 分支（storage 写失败）无覆盖**（存活变异体实证）。
- **放行条件**：完成 §七「建议修复清单」中 **F1–F3（文档，必做）**；**F4（补测，建议）** 可作为 M4 收口后跟进。均为文档/测试侧，**不涉及业务代码缺陷**。

> **改判条件（一个无条件通过的审计报告不可信）**：若出现以下任一，本审计改判 **不通过** ——
> ① 任一 **P0 / 关键路径**规则上出现**存活变异体**（本次 6/6 全红，未发生）；
> ② §13 **逐行标签**（非合计行）与测试实际不符，即某行标「有」却无对应可复现用例（本次逐行核验一致，未发生）；
> ③ 「部分」项被当「有」上报（**高报**）——本次未发现高报，反而发现 §13 合计行高报 1；
> ④ 存在断言恒真/断言 mock 自身的「假绿」用例（本次未发现）。

---

## 二、审计范围与方法

| 维度 | 方法 | 不采用的方法（说明） |
|------|------|------|
| 覆盖真实性 | **变异测试**：破坏实现看测试是否转红 | ❌ 读测试名/断言数量判断覆盖 |
| 映射表 | **逐行点数** + 验证 `有+部分+无 = 行数` | ❌ 采信「合计」行 |
| E2E | **逐处 mock 判定是否越过被测边界** | ❌ 只看「测试全绿」 |
| 假绿 | 全文搜恒真/下界/mock 自身断言 | ❌ 只看覆盖率数字 |

**基线**（工作树，`0509d38` 干净）：`npm test` → **Test Files 53 passed / Tests 292 passed**（全绿，耗时 ~17s）。
> ⚠️ 映射表头（`t10-mapping.md:5`）写「**282** 用例」——**陈旧**，比 HEAD 少 10（T10b 新增用例后未更新）。见 F2。

---

## 三、独立核实：映射表逐行点数（不采信合计行）

### 3.1 M1–M17 表（`t10-mapping.md:13–29`，共 17 行）

| 覆盖 | 计数 | 明细 |
|------|:--:|------|
| 有 | **13** | M2,M3,M4,M5,M6,M8,M9,M10,M11,M12,M13,M14,M17 |
| 部分 | **4** | M1, M7, M15, M16 |
| 无 | **0** | — |
| **合计** | **17** | 13+4+0 = 17 ✔️ |

**与合计行（`:31`「有 13、部分 4、无 0」）一致 → M1–M17 表合计行正确** ✅

### 3.2 §13 28 条覆盖表（`t10-mapping.md:39–66`，共 28 行）

| 覆盖 | 计数 | 明细 |
|------|:--:|------|
| 有 | **26** | 除 §1.2、§6.④ 外全部（含 T10b 后 §4.⑤ 由「无」升「有」） |
| 约束 | **2** | §1.2、§6.④ |
| 无 | **0** | — |
| **合计** | **28** | 26+2+0 = 28 ✔️ |

**与合计行（`:68`「有 **27**、约束 2、无 0」）不一致 → ❌ 合计行高报 1（27+2+0 = 29 ≠ 28）**

> **同类笔误复发**：T10（`400ca71`）时该行写「有 **26**」，实为 25（26+2+1=29≠28，架构师 v2.9 已勘误）；T10b 修 §4.⑤ 后应写 **26**，却写成 **27**——**又一次 `合计 ≠ Σ(逐行)`**，且方向仍是**高报**。
> **证据**（可复验）：
> ```bash
> git show 0509d38:docs/plans/2026-09-29-t10-mapping.md > /tmp/m.md
> # 逐行取「覆盖」列（只取单元格开头标记，避免「无时间断言」误匹配）
> awk -F'|' 'NR>=39&&NR<=66&&/^\| §/{c=$(NF-1);gsub(/^ +| +$/,"",c);gsub(/\*/,"",c);sub(/[（(].*/,"",c);n++;cnt[c]++}END{print "行数="n;for(k in cnt)print k": "cnt[k]}' /tmp/m.md
> # → 行数=28 / 有: 26 / 约束: 2
> ```

### 3.3 四行「部分覆盖」是否应算「部分」——独立判断

> 结论：**4 项「部分」全部成立，未发现低报**。team-lead 假设「M16 或应按已裁决口径算『有』」——**经核实不成立**。

| 项 | 映射表判定 | 独立核验 | 判断 |
|----|:--:|------|:--:|
| **M1** 书架（卡片+**三态**） | 部分 | `BookshelfView.spec.ts:83` 仅测「错误态（**三态之一**）」；无 loading / 空态用例（scope 要求三态） | ✅ **部分**成立 |
| **M7** 词典搜索 | 部分 | scope §5 要「完全/前缀/包含/**释义** 四级」；实现为**词头三级**（§6.4 有意收窄，team-lead 裁决）。相对 scope 为部分 | ✅ **部分**成立（属「scope 收窄」，非测试缺口） |
| **M15** Tab 导航 | 部分 | `AppShell.spec.ts` 有「4 Tab 对齐」「KeepAlive」；**无**「窄屏底部/宽屏侧边」响应式用例 | ✅ **部分**成立 |
| **M16** 存储层 | 部分 | `storage.spec.ts` 覆盖：往返/缺失 fallback/损坏 fallback/removeKey/`br-`前缀/**可用=true**；**无**「不可用分支」与「写失败→false」用例（**变异 V7a 存活实证**，见 §四） | ✅ **部分**成立（**非低报**） |

> **M16 专项说明**：team-lead 裁决「行为等价、接受现实现」针对的是 **代码**（不改 `storage.ts`）；但映射表的「部分/有」针对的是 **测试覆盖**。二者不同层：**接受代码 ≠ 该分支已被测试**。V7a 证明「写失败→false」分支**无任何用例守护**，故「部分」是**诚实**的，**不应升为「有」**。

### 3.4 引用用例真实性抽验（映射表「如实」核验）

抽验映射表点名的用例是否**真实存在**（防「引用不存在的测试」）：**全部命中** ✅

| 映射表声明 | 实际存在 |
|------|------|
| §1.5 `ReaderView.spec`「§1.5 跳转优先」 | `ReaderView.spec.ts:237` ✔️ |
| §2.⑥ `useHighlighter.memo.spec`（惰性/memo） | `useHighlighter.memo.spec.ts:24,29` ✔️ |
| §6.② `router.spec`「§6.② 中文文件名+hash」 | `router.spec.ts:31` ✔️ |
| §6.⑤ `sutra.spec`「shallowRef」 | `sutra.spec.ts:81` ✔️ |
| §6.① `dictService.spec`「⑩ loadIndex 不拉分片」 | `dictService.spec.ts:185` ✔️ |
| M9 `ReaderToc.spec`「单章段落列表」 | `ReaderToc.spec.ts:25` ✔️ |
| M15 `AppShell.spec`「4 Tab / KeepAlive」 | `AppShell.spec.ts:44,63` ✔️ |

---

## 四、变异测试记录（8 组 · 7 层 · 全部自选，**不复用工程师 13 组**）

> 方法：**故意破坏实现 → 跑目标 spec → 确认转红/存活 → 还原 → 复跑门禁**。
> **操作纪律**：所有还原采用「**先备份副本 → 改 → 测 → 拷回**」（`/tmp/t10audit/*.bak`），**未对含未提交改动的文件用 `git checkout`**（工程师 T10b 曾因此丢失自身改动）。审计结束 `git status` **为空**。

| # | 层 | 文件:行（`0509d38`） | 施加的破坏 | 预期 | 结果 |
|:--:|------|------|------|:--:|:--:|
| **V1** | 语义锚点（DOM 白名单） | `src/utils/anchor.ts:92` | `querySelector('[data-off=…][data-search]')` → 去掉 `[data-search]` | 红 | ✅ **红**：`anchor.spec`「给定 offset 但段内无 data-search → paragraph」`expected 'exact' to be 'paragraph'` |
| **V2** | 搜索分段叠加 | `src/components/reader/ReaderContent.vue:147` | 合并循环去掉 `!boundaries.has(j)`（F-2 强制断点） | 红 | ✅ **红**：`ReaderContent.spec`「F-2 相邻命中各自成段」`expected 2, received 1` |
| **V3** | 高亮（Trie/过滤） | `src/composables/useHighlighter.ts:90` | 去掉 `!isNumeralPhrase(...)` 守卫 | 红 | ✅ **红**：`useHighlighter.spec`「数字短语过滤：不在三十七尊中命中十七尊」 |
| **V4** | 跳转分派 | `src/views/ReaderView.vue:283` | `applyJump` 像素分支（`scrollToProgress`）置空 | 红 | ✅ **红 ×2**：`ReaderView.spec`「书签回看像素路径」「§1.5 跳转优先」 |
| **V5** | 清洗正则 | `src/utils/text.ts:55` | 禁用规则 ⑩-a `〔参考资料〕` | 红 | ✅ **红**：`text.golden.spec`「规则⑩-a」 |
| **V6** | M9 数据源 | `src/views/ReaderView.vue:199-203` | `paragraphLabels` computed 恒返回 `[]` | 红 | ✅ **红**：`ReaderView.spec`「§5 M9 单章段落列表」 |
| **V7a** | 存储（写失败） | `src/data/storage.ts:85` | `writeJson` catch 由 `return false` → `return true`（谎报成功） | **红**（应） | ❌ **存活**：`storage.spec` **7/7 全绿** → **该分支无覆盖** |
| **V7b** | 存储（读失败） | `src/data/storage.ts:72` | `readJson` catch 由 `return fallback` → 返回哨兵值 | 红 | ✅ **红**：`storage.spec`「损坏 JSON 返回 fallback」（**对照**：读失败**已**覆盖） |

**还原确认**：每组破坏后立即 `cp *.bak` 拷回，最终 `npm test` → **53 文件 / 292 用例全绿**；`git status --short` **空**。

**关键结论**：
- **V7a 存活 = 真实缺口**：`writeJson` 的「配额耗尽 / 序列化失败 → `false`」契约（`storage.ts:76-86`）**无任何用例**；`isStorageAvailable()` 的 `false` 分支（`:58`）同样无用例（`storage.spec.ts:49` 只断言 `true`）。→ 支撑 §3.3 的 **M16=「部分」** 判断。
- **V7b 转红**：`readJson` 失败分支**已**被「损坏 JSON」用例覆盖——形成**精确对照**，说明缺口仅在「写/不可用」侧。

---

## 五、假绿排查（恒真断言 / 断言 mock 自身）

**结论：未发现恒真断言（假绿）。** 全仓 `*.spec.ts` 全文搜索 `toBeDefined()` / `toBeTruthy()` / `toBeFalsy()` / 裸 `toHaveBeenCalled()` / `toBeGreaterThan(0)` / `toHaveLength(0)` 后逐条研判：

| 位置 | 断言 | 研判 |
|------|------|:--:|
| `useSearch.spec.ts:66,80` | `expect(hit).toBeDefined()` | **弱但有效**：`hit = search(...)[0]`，未命中即 `undefined` → 会红；且紧随 `hit?.context…` 具体断言 |
| `ReaderBookmarks.spec.ts:59` | `.attributes('disabled')).toBeDefined()` | **弱但有效**：`canAdd=false` 时 `''`（defined）、否则 `undefined`（红）。建议改 `.toBe('')` 或断言 `.element.disabled === true`（非缺陷） |
| `ReaderView.spec.ts:97,146,226` | 裸 `expect(scrollIntoView).toHaveBeenCalled()` | **弱但有效**：证明「发生了一次定位」；精确性由 `anchor.spec` / M9 用例承担。非恒真 |
| `dictService.spec.ts:195`、`ReaderSearch.spec.ts:26` | `toBeGreaterThan(0)` | 下界断言，非恒真（去掉功能即红） |
| `useHighlighter.memo.spec.ts:34,80` | `expect(mocks.buildTrie).not.toHaveBeenCalled()` | **强**：`buildTrie` 是 spy 但**委托真实实现**（`mockImplementation(actual.buildTrie)`），断言语义为「未构建」——非「断言 mock 自身」 |
| `dictService.spec.ts:86,87,109,…` | `expect(repo.fetchChunk).not.toHaveBeenCalled()` | **强**：断言「未拉分片」（M17 语义） |

**唯一「标题-断言不匹配」**（非假绿，属**弱断言**）：
`ReaderView.spec.ts:88` 标题「加载后渲染经文，并**按已存进度**用语义锚点定位」，但种入 `position: 0` 且仅断言裸 `scrollIntoView`。经查 `ReaderContent.scrollToProgress`（`:214-218`）= `scrollToAnchor`（章节起点，**真实**触发 `scrollIntoView`）+ `position>0 时 setScrollTop`；故该用例**验证了锚点定位、未验证像素还原**（`position:0`）。建议：种入 `position>0` 并断言 `container.scrollTop`（低优先）。

---

## 六、关键路径 E2E（`src/__tests__/key-path.spec.ts`）mock 边界分析

**它真的串起来了吗？——是**（非「多个独立 mount 拼一文件」）：单一 `mount(App)` + **真实** router（`createMemoryHistory`）/ 真实 views（Bookshelf/Reader/Notes）/ 真实 Pinia stores / 真实 `ReaderContent` / 真实 `DictPopup`，且断言**跨步骤状态**（非各自独立）：

| 步骤 | 断言 | 是否真实 |
|------|------|:--:|
| 找经 M1 | `.sutra-card` 长度 2、含「心经」 | ✅ 真实渲染 |
| 加载 M3 | `.reader` 存在、含「观自在般若/菩提萨埵」 | ⚠️ **见下** |
| 连续滚动 M4 | `scrollTop=250` → `readerStore().position===250` | ✅ 真实 scroll 处理器 |
| 点词查义 M6 | `.seg--term` 点击 → 文本含「甲·般若」 | ⚠️ **见下** |
| 批注 M13 | 保存 → `localStorage['br-notes']` 长度 1 | ✅ 真实持久化 |
| 回看 | `router.push` 参数 `id='心经.json'`、`query.jump='note'` | ✅ 真实跳转 wiring |

**逐处 mock 是否越过被测边界**：

| mock | 范围 | 判定 |
|------|------|:--:|
| `@/services/sutraService` | **整个服务**被替换（`loadManifest`/`loadSutra`/`getMeta`/`clear` 全为 stub，`:22-30`） | ⚠️ **越过 M3 领域边界**：`loadSutra` 的**加载逻辑**（fetch/缓存/`globalId` 派生）**未被执行**，E2E 只验证「视图消费 stub 结果并渲染」。因 stub 数据**自带** `globalId`（`:79-80`），连派生也未覆盖 |
| `@/services/dictService` | **整个服务**被替换（`:32-42`） | ⚠️ **越过 M6 领域边界**：`lookup` 的**查词/合并/Trie**逻辑未执行，E2E 只验证「弹窗渲染 stub 命中」 |
| `@/utils/anchor` | **仅** `readSelectionAnchor`/`clearSelectionAnchor` 替换，其余 `...actual`（`:45-52`） | ✅ **未越界**：`scrollToAnchor` 为**真实**实现——定位链被真实执行 |

**判定**：该文件是**「接线/集成测试」**，**不是全链路 E2E**。文件头（`:97-106`）**已声明** mock 边界（「仅 mock 掉网络边界（sutraService/dictService）」）——但严格说 mock 的是**整个服务**而非**网络 fetch**，故措辞**略宽**。**M3/M6 的领域逻辑由各自专属 spec 覆盖**（`useSutraLoader.spec`/`sutraService.spec`/`dictService.spec`/`useDictLookup.spec`），故整体不构成空洞测试，但**注释宜精确为「mock 整个领域服务（非仅网络）」**（见 F3）。

---

## 七、未通过项 / 建议修复清单（按严重度）

| # | 严重度 | 项 | 位置（`0509d38`） | 建议 |
|:--:|:--:|------|------|------|
| **F1** | 🟠 **高（必做·文档）** | **§13 合计行算术笔误复发**：写「有 **27**」，逐行实为 **26**（27+2+0=29≠28） | `docs/plans/2026-09-29-t10-mapping.md:68` | 改「有 **26**」；并加自检「合计 = Σ逐行」。**这是同类笔误第 2 次**，建议后续合计行一律附逐行点数命令 |
| **F2** | 🟡 中（必做·文档） | **用例计数陈旧**：头写「282」，HEAD 实为 **292** | `t10-mapping.md:5` | 改「53 文件 / **292** 用例」 |
| **F3** | 🟡 中（必做·文档） | **交叉引用错位**：M7 行指「实测发现**②**」（②实为 §3.2，M7 在 **③**）；M12 行指「实测发现**③**」（M12 在 **④**） | `t10-mapping.md:19`（M7）、`:24`（M12） | M7→③、M12→④ |
| **F4** | 🟢 低（建议·测试） | **storage 写失败/不可用分支无覆盖**（V7a 存活实证）：`writeJson` 失败→`false`、`isStorageAvailable()`→`false` 均无用例 | `src/data/__tests__/storage.spec.ts`（补）；对应 `storage.ts:58,85` | 补 2 用例（mock `localStorage.setItem` 抛错 → 断言 `writeJson===false`、`isStorageAvailable()===false`）；或至少在映射表 M16 行显式标注「不可用分支**已知未覆盖**」 |
| **F5** | 🟢 低（建议·测试） | 弱断言：`ReaderView.spec.ts:88` 标题称「按已存进度定位」但种 `position:0`、仅断言裸 `scrollIntoView` | `src/views/__tests__/ReaderView.spec.ts:88` | 种入 `position>0` 并断言 `container.scrollTop` |
| **F6** | 🟢 低（建议·注释） | E2E 头注「仅 mock 网络边界」措辞略宽（实为 mock **整个服务**） | `src/__tests__/key-path.spec.ts:97-106` | 改为「mock **整个领域服务**（sutraService/dictService）——其领域逻辑由专属 spec 覆盖」 |

> **无 P0 项**：未发现业务代码缺陷、未发现关键路径覆盖空洞、未发现假绿。

---

## 八、附录 · 可复验命令

```bash
# 0. 基线（应 53/292 全绿）
npm test

# 1. §13 逐行点数（应 行数=28 / 有:26 / 约束:2）
git show 0509d38:docs/plans/2026-09-29-t10-mapping.md > /tmp/m.md
awk -F'|' 'NR>=39&&NR<=66&&/^\| §/{c=$(NF-1);gsub(/^ +| +$/,"",c);gsub(/\*/,"",c);sub(/[（(].*/,"",c);n++;cnt[c]++}END{print "行数="n;for(k in cnt)print k": "cnt[k]}' /tmp/m.md

# 2. 变异 V1（anchor 层）——备份→破坏→测→还原
cp src/utils/anchor.ts /tmp/a.bak
#   将 :92 `[data-off="${offset}"][data-search]` 改为 `[data-off="${offset}"]`
npx vitest run src/utils/__tests__/anchor.spec.ts   # 应红
cp /tmp/a.bak src/utils/anchor.ts                    # 还原
npm test                                             # 应回全绿

# 3. 关键路径 E2E mock 边界
sed -n '22,52p' src/__tests__/key-path.spec.ts       # sutraService/dictService 整服务 mock；anchor 仅部分 mock
```

**审计操作留痕**：所有破坏均在 `/tmp/t10audit/*.bak` 留备份并逐一拷回；审计结束 `git status --short` 为**空**（工作树干净，无污染）。
