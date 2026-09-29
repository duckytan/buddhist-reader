# 般若佛经阅读器 · 隐性知识继承清单（重写行为规格）

> 提炼人：寇豆码（Kou）· 软件工程师　｜　日期：2026-09-29　｜　版本：v3.1.0
> 用途：**重写者的行为规格 + 验收基准**。无论最终选"分块重写"还是"全量重写"，本清单都是必需的。
> 提炼来源：逐文件精读 + **git 全量历史取证（30+ 次 fix/debug commit）** + `docs/plans/analysis/` 设计文档（T-19/T-20/T-22/T-27）与代码实现的实际偏差比对。
> 约束：未修改任何业务代码，本文件为唯一产出物。

---

## 0. 核心论点（给决策者）

> **重写的成本大头不是"写代码"，而是"重新发现规则"。**
> 这份代码表面上"乱"，但里面埋着大量**用 30+ 次试错换来的隐性规则**——它们从不出现在需求文档里，只存在于代码的魔法值、偏移量、边界判断和 commit message 中。
> **忽略本清单 → 这些坑会一个不落地重来。** 下方「重现成本」列，就是对"重新踩一遍"的量化。

**总重现成本估算：约 30–40 轮调试 + 25–40 小时试错。**（依据：git 历史中可见的 30+ 次针对同一批问题的 fix/debug commit，其中搜索高亮/滚动定位一项就占了 17 次）

---

## 1. 经内搜索高亮 + 滚动定位规则（最重要，用户为此改了 22 次）

### 1.1 滚动偏移量 `-40` / `-20` 之谜

| 项 | 内容 |
|----|------|
| **规则** | 跳转到段落用 `scrollTop = getScrollTop(el) - 40`；跳转到章节用 `- 20`。偏移量的作用是**让目标元素不要贴死在容器顶边**，而是留出视觉缓冲，避免被 sticky 的 `ReaderHeader`（`position:sticky; top:0`）遮挡。 |
| **位置** | `ReaderContent.vue:182`（章节 `-20`）、`ReaderContent.vue:244`（段落 `-40`） |
| **原因** | 容器有 `padding: var(--reading-padding)`（40px），header 是 sticky 的。若直接 `scrollTop = el.offsetTop`，目标会顶到 header 下面被挡住。`-40` ≈ 视觉舒适位。 |
| **历史演变** | git 铁证：`b9e4ade`（改成 `-120`）→ `f7a429d`（又改回 `-40`）→ `d969d3f`（引入 paraOffset）。更早还有 `OFFSET = headerHeight + paddingTop + 8`（动态）→ `OFFSET = 80`（硬编码）→ 最终落到 `-40/-20`。**这是"拧螺丝式试错"的活化石。** |
| **忽略后果** | 重写者会重新经历 `-20 → -80 → -120 → -40` 的整轮试错；更糟的是会有人试图"动态计算 header 高度"，结果在动画/响应式下更不稳（见 1.2）。 |
| **重现成本** | **约 4–6 轮试错 / 3–5 小时**（偏移量本身不贵，贵在理解"为什么不能用 getBoundingClientRect 动态算"） |

### 1.2 为什么不能靠 `getBoundingClientRect` 动态计算（血泪教训）

| 项 | 内容 |
|----|------|
| **规则** | 搜索面板关闭时有一条 **300ms 的 slide-up 退场动画**（`.slide-up-leave-active { transition: opacity .3s, transform .3s }`）。在动画进行中，容器高度/坐标是**不稳定**的，此时 `getBoundingClientRect()` 拿到的是错误值。因此定位必须**等动画结束（或用一个足够大的固定偏移）**，不能实时量算。 |
| **位置** | 时序根因：`Reader.vue:221-225 onSearchJump` 先 `showSearch.value = false` 再**立刻** `scrollToPara(...)`；动画在 `ReaderSearch.vue:161-163`。 |
| **原因** | commit `99859db` message 原文：*"remove getBoundingClientRect (coordinates are inaccurate during transition)"*、*"avoids coordinate errors caused by search panel closing animation"*。作者最终用 `scrollIntoView + 固定延迟(350ms)` 绕过。 |
| **忽略后果** | 用"精确量算"思路重写 → 在动画期间读到错误坐标 → 定位飘忽 → 又回到试错循环。 |
| **重现成本** | **约 5–8 轮 / 4–6 小时**（这是搜索定位反复失败的根本原因，最难自行发现） |

### 1.3 TreeWalker 手工数字符的定位逻辑与边界条件

| 项 | 内容 |
|----|------|
| **规则** | 搜索命中只给出 `paraOffset`（关键词在**整段纯文本**中的字符下标）。但渲染后段落被拆成了多个 `<span>`（词典高亮 `term` 段 + 搜索高亮 `search` 段 + 普通文本段）。**要定位第 offset 个字符落在哪个 DOM 文本节点里，必须遍历文本节点累加 `textContent.length`**，找到 `charCount >= paraOffset` 的那个高亮节点。 |
| **位置** | `ReaderContent.vue:201-232`（`document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT)` + `charCount += node.textContent.length`） |
| **边界条件** | ① **段首命中**（offset=0）：`charCount>=0` 立即命中第一个节点；② **段尾命中**：`lastIdx < text.length` 分支保证尾部普通文本不丢；③ **跨段落命中**：**不支持也不该支持**——`ReaderSearch.onSearch` 是在**单个 para.text 内**用 `indexOf` 找的，命中天然不跨段；④ **多个命中**：`highlightIndex` 计数对齐 `allHighlights` 数组。 |
| **降级策略** | 若 offset 对不上（数据漂移），fallback 到 `allHighlights[0]`（段内第一个高亮）。见 `ReaderContent.vue:228-231`。 |
| **忽略后果** | 重写者会天真地以为"有 offset 就能直接 scroll"，忽略"offset 是纯文本坐标、DOM 是分段坐标"的坐标系统不一致，导致定位偏几十个字。 |
| **重现成本** | **约 4–6 轮 / 3–4 小时** |

### 1.4 高亮与词典术语高亮如何共存、会不会互相覆盖

| 项 | 内容 |
|----|------|
| **规则** | **两阶段串联**：先做词典术语高亮（`highlight()` → `term`/`text` 段），再在结果上做搜索高亮（`insertSearchHighlights`）。搜索高亮**会切进 `term` 段内部**（把 `term` 段再切成 `term + search + term`）——所以同一个词既可能是词典术语又含搜索命中，此时**渲染为 `search` 段（搜索色优先）**。 |
| **位置** | `ReaderContent.vue:68-85 getSegments`（先 `highlight` 后 `insertSearchHighlights`）；`ReaderContent.vue:94-114`（term 段内切分逻辑，commit `c24a851` 专门修这个） |
| **原因** | 设计文档 T-19 §3.5 原定"不渲染嵌套高亮、长词覆盖短词"；但搜索高亮是**用户显式操作**，优先级应高于背景性的词典高亮（T-22 §7.3 也确认"搜索高亮视觉上更突出、作前景"）。 |
| **忽略后果** | 若搜索高亮只处理 `text` 段、跳过 `term` 段（`useSegmentedContent.js` 早期版本就是这么写的：`if (seg.type === 'term') { out.push(seg); continue }`），则**搜索词恰好是词典术语时不会高亮**——这正是 commit `c24a851 fix: search highlight in term segments` 修掉的 bug。 |
| **重现成本** | **约 3–4 轮 / 2–3 小时** |

### 1.5 搜索命中滚动 vs 阅读进度恢复的冲突

| 项 | 内容 |
|----|------|
| **规则** | 两者都写 `contentRef.scrollTop`，**冲突靠"时机隔离"解决**：进度恢复只在 `props.chapters.length` 变化或 `initialPosition` 变化时触发（`watch`），而搜索跳转是**用户主动点击**、发生在数据已就绪之后。若同一时刻都触发，**搜索跳转优先**（因为它晚发生）。 |
| **位置** | 恢复：`ReaderContent.vue:257-271`（两个 watch）；跳转：`ReaderContent.vue:189`；进度保存：`Reader.vue:209-213` |
| **风险点** | `Reader.vue` 里 `useReadingProgress(filename)` 已 watch 自动 restore，`onMounted` 里**又手动调了一次 `progress.restore()`**（`Reader.vue:264`）→ 双触发。 |
| **忽略后果** | 重写若不隔离时机，会出现"点搜索跳过去了，又被进度恢复拽回顶部"或反之。 |
| **重现成本** | **约 2–3 轮 / 1.5–2 小时** |

### 1.6 搜索的"长度门槛"与"数量上限"

| 项 | 内容 |
|----|------|
| **规则** | ① 关键词**必须 ≥ 2 字**才搜索/高亮（`length < 2` 直接清空）；② 结果**上限 50 条**（`found.length >= 50` break）；③ 上下文摘要**前后各 20 字**（代码 `idx-20` / `idx+kw.length+20`）。 |
| **位置** | `ReaderSearch.vue:69`、`ReaderSearch.vue:94-98`、`ReaderSearch.vue:90-92`；高亮侧 `ReaderContent.vue:74,88` |
| **原因** | ≥2 字：避免单字（如"佛""心"）命中爆炸，且中文单字无检索意义。上限 50：佛经单字命中可能上千，防止渲染卡死。**注意：设计文档 T-22 §3.2 写的是"前后各 30 字"，代码实际是 20 字——文档与实现已不一致，以代码为准。** |
| **忽略后果** | 不设门槛 → 搜"佛"卡死页面；不设上限 → 长经书搜索渲染数千 DOM 节点。 |
| **重现成本** | **约 1–2 轮 / 1 小时** |

**第 1 节小计重现成本：约 19–29 轮 / 15–21 小时**（对应 git 里 17 次 commit 的试错）

---

## 2. 术语高亮匹配规则（`composables/useHighlighter.js`）

| 项 | 内容 |
|----|------|
| **规则①：Trie 正向最长匹配** | 从文本**每个位置**出发沿 Trie 下行，记录"最后一个 `isTerm` 终点"作为该起点的最长匹配。命中后 `pos += match.length`（**跳过整个词**，不重叠）。 |
| **位置** | `useHighlighter.js:21-31 longestMatch`、`54-78 highlight` |
| **规则②：重叠词取舍** | 由于是"逐位 + 最长优先 + 命中即跳"，**前缀重叠（"般若" vs "般若波罗蜜多"）自动取长词**，与设计文档 T-19 §3.2 的"贪心长词优先"效果等价，但实现更省（无需先收集全部再排序去重）。 |
| **规则③：哪些词不应高亮** | **数字短语过滤**：若匹配词的前一个或后一个字符是数词（`NUMERAL_CHARS = '零一二三四五六七八九十百千万亿兆〇○０-９'`），则**放弃该匹配、逐字输出**。目的：避免"三十七尊"被误切成"十七尊"。见 `useHighlighter.js:33-45 isNumeralPhrase`。 |
| **规则④：长度/空值** | 空文本、非字符串返回 `null`；`enabledTerms` 为空时 Trie 为 `null`，`highlight` 返回 `null`；结果若只有单一 `text` 段则返回 `null`（**表示"无需高亮"，调用方 fallback 为原文**）。见 `useHighlighter.js:54-77`。 |
| **规则⑤：词典启用/禁用后如何刷新** | 双层机制：`enabledTerms` 是 `computed`，依赖 `enabledDicts`；`toggleDict()` 后 `refreshKey.value++`（`stores/dict.js:27-38`），`Reader.vue:40` 用 `:key="dictStore.refreshKey"` **强制重挂载整个 `ReaderContent`**（`ReaderDictSelector` 另有"强制刷新"按钮手动 `triggerRefresh`）。 |
| **规则⑥：35314 词 Trie 构建时机** | 在 `useHighlighter` 内用 `computed` 惰性构建（`useHighlighter.js:48-52`），**依赖 `enabledTerms` 变化才重建**；`useHighlighter` 接收的是 **ref 或普通数组都兼容**（`enabledTermsRef?.value || enabledTermsRef`）——commit `f220998 fix: useHighlighter 支持 ref 参数` 专门为响应式加。**设计文档 T-19 原计划用 Web Worker 构建，实际在主线程 computed 里构建**（偏差）。 |
| **忽略后果** | ① 用"先收集全部命中再排序"→ 复杂度更高且易错；② 漏掉数词过滤 → "三十七尊"误高亮"十七尊"（有单测保护，见 `useHighlighter.test.js:45-48`）；③ 词典切换后不高亮刷新 → 用户点了开关但正文没变（这是 `e4660bb/61cb5d0/486b2ff/ee8fa91` 一串 commit 反复修的问题）。 |
| **重现成本** | **约 5–7 轮 / 4–6 小时**（数词规则和"刷新机制"各占一半） |

---

## 3. 释义清洗规则（`utils/text.js`）

### 3.1 三种释义数据结构的兼容

| 结构 | 示例 | 提取规则 | 位置 |
|------|------|---------|------|
| 字符串 | `"梵语 prajñā 的音译…"` | 原样返回 | `text.js:2` |
| 数组 | `[{c:"释义1"},{c:"释义2"}]` | 逐项取 `.c` 拼接 `\n` | `text.js:3-9` |
| 对象 | `{c:"释义…"}` | 取 `.c` | `text.js:10` |
| 其它 | `null`/`number` | 返回 `''` | `text.js:11` |

**为什么**：MDX 词典源有三种导出形态；commit `2f61143 fix: 词典释义 definition 为数组时正确提取内容`、`1765d5d fix: TypeError e.replace is not a function` 都是这里踩的坑。**忽略后果**：直接 `.replace` 会因非字符串抛 TypeError（真实发生过）。

### 3.2 十条正则各自解决的脏数据问题（`text.js:14-32`）

| # | 正则 | 解决的脏数据 | 位置 |
|---|------|-------------|------|
| 1 | `\\r\\n` → `\n` | **字面量** `\r\n` 字符串（非真实换行，JSON 双重转义残留） | L17 |
| 2 | `\\r` → `\n` | 同上，孤立字面量 `\r` | L18 |
| 3 | `\\t` → `` | 字面量 `\t` 制表符残留 | L19 |
| 4 | `\t` → `` | 真实制表符 | L20 |
| 5 | `[〔【][^〕】]*[〕】]\s*$` | 行尾的 `〔…〕`/`【…】` 标注（如词源注） | L21 |
| 6 | `［[^］]*］` | 全角方括号 `［…］` 注 | L22 |
| 7 | `（参阅[^）]*）` | 全角"（参阅…）"交叉引用 | L23 |
| 8 | `（参阅'[^']*'[^）]*）` | 带单引号的"（参阅'…'…）" | L24 |
| 9 | `［参阅'[^']*'[^］]*］` | 方括号版"参阅" | L25 |
| 10 | `〔参考资料〕[^]*$` / `^\s*製作說明…` / `^\s*中国当代佛教网辞典…` / `^\s*阿彌陀佛…` | **整段版权/水印/页眉尾注**（非贪婪到文末，`/s` 跨行） | L26-29 |

**为什么**：这些脏数据来自 MDX 转 JSON 的转换产物（见 `scripts/convert-mdx-dicts.*`）。**忽略后果**：用户点开释义看到"（参阅'某某'）［製作說明］中国当代佛教网辞典 阿彌陀佛…"一大串垃圾。commit `e811acb fix: 词典释义标签清理` 即为此。

### 3.3 构建期截断规则

| 项 | 内容 |
|----|------|
| **规则** | 内联进 `dictIndex.js` 的释义**截断到 300 字**（超出补 `...`）。 |
| **位置** | `scripts/build-dict-index.cjs:41-42` |
| **原因** | commit `86f70fc`：为把 30MB 词典内联进 bundle、避免运行时 fetch 超时，**牺牲释义完整性换体积**。 |
| **忽略后果** | 重写若恢复完整释义 → 首屏体积爆炸 / fetch 超时（回到旧问题）。若保留截断 → 需知道"用户看到的释义是残缺的"，产品上要有交代（如"查看完整释义"入口）。 |
| **重现成本** | **约 1–2 轮 / 1 小时**（但决策本身很贵：内联 vs fetch 是架构级取舍，见 §6） |

**第 3 节小计重现成本：约 6–9 轮 / 5–8 小时**

---

## 4. 段落级目录与进度恢复的边界条件

| 项 | 内容 |
|----|------|
| **规则①：`para.id` 如何生成** | 构建期由 `scripts/convert-sutras.cjs:43` 生成：`id: \`p${currentChapter.paraIndex++}\``，**按章节内序号**，每章从 `p1` 重新计数。**因此 `para.id` 在经内不唯一（跨章节会重复 p1、p2…）**——定位必须**同时用 `chapterIdx` + `paraId`**，单靠 `paraId` 会命中错误段落。 |
| **位置** | `convert-sutras.cjs:43`；消费端 `ReaderContent.vue:191 document.getElementById(\`para-${paraId}\`)`（**注意：这里只用了 paraId，是全项目最脆弱的隐式假设之一**） |
| **规则②：进度百分比如何计算** | `percent = maxScroll > 0 ? Math.round((position / maxScroll) * 100) : 0`，其中 `maxScroll = scrollHeight - clientHeight`。见 `ReaderContent.vue:154-156`。 |
| **规则③：恢复时的定位精度** | 恢复**只恢复像素位置 `position`**（`useReadingProgress.js:17`），**不恢复"当前章节"**。设计文档 T-27 §9.8 明确要求"同时保存当前章节索引用于快速定位"，但**实现未做**（`readerStore.currentChapter` 从不被写入，恒为 0）。 |
| **规则④：切换经书时状态如何隔离** | 每个经书用**独立 localStorage key**：`progress-${sutraId}`、`bookmarks-${sutraId}`、`notes-${sutraId}`、`reading-time-${sutraId}`（`storage.js` 统一加 `br-` 前缀）。切换经书时 `Reader.vue:263 readerStore.reset(filename)` 清空内存态并从对应 key 重新读。**关键**：`Reader.vue` 依赖 `route.params.id` 变化重挂载（`filename` 是 computed，`useReadingProgress` watch 它）。 |
| **规则⑤：单章节经文隐藏目录** | 设计 T-27 §3.1：章节数=1 时隐藏目录按钮/只显示"全文"。实现里 `ReaderContent.vue:14` 和 `ReaderTOC.vue:30` 用 `v-if="chapters.length > 1"` 控制**章节标题**显示，但目录按钮本身未按此隐藏。 |
| **忽略后果** | ① 只存 paraId → 目录跳转/搜索跳转会跳到**同号的其他章节段落**；② 不恢复 currentChapter → 目录高亮/进度显示失真；③ 切换经书 key 不隔离 → 进度串书（A 书的进度跑到 B 书）。 |
| **重现成本** | **约 4–6 轮 / 3–4 小时**（para.id 非全局唯一这个坑尤其隐蔽） |

---

## 5. 交互细节（长按选词 / 弹窗 / 笔记跳转）

### 5.1 长按选词（`Reader.vue:166-196`）

| 项 | 内容 |
|----|------|
| **规则** | 长按 **500ms** 判定"选中文字"→ 显示"查释义/笔记"按钮；抬手后 **300ms** 复查选区是否仍存在。 |
| **位置** | `Reader.vue:166-179`（`onTouchStart`/`onTouchEnd`，`setTimeout` 500/300） |
| **原因：为什么只绑触摸事件** | 用 `touchstart/touchend` + `{passive:true}` 而非 `mousedown`：**移动端优先**，且 `passive:true` 避免滚动性能告警。桌面端靠浏览器原生鼠标选区（`window.getSelection()`）即可，无需额外绑定。**忽略后果**：绑 mousedown 会在移动端与滚动冲突；不加 passive 会拖慢滚动。 |
| **为什么用两段 setTimeout** | 长按判定需要"按下持续 500ms"；抬手后需要等系统选区稳定（300ms）再读 `window.getSelection()`，否则读到空选区。 |
| **忽略后果** | 用单一事件/固定延时 → 要么误触发（滑动时弹按钮），要么选区读不到。 |
| **重现成本** | **约 2–3 轮 / 1.5–2 小时** |

### 5.2 词典弹窗（`DictPopup.vue`）

| 项 | 内容 |
|----|------|
| **规则** | 弹窗是**底部抽屉**（`position:fixed; bottom:0; max-height:60vh; overflow-y:auto`），释义用 `white-space:pre-wrap` 保留换行。**释义已在构建期截断到 300 字**（见 §3.3），弹窗**不再做二次截断**。 |
| **位置** | `DictPopup.vue:81-87`（面板样式）、`:45-47`（渲染 `formatDefinition(r.definition)`） |
| **展示逻辑** | `loading` → "查询中…"；`results.length===0` → "暂无释义"；否则按词典卡片列表渲染。词典名映射 `dictNames` 在**组件内硬编码**（`DictPopup.vue:69-73`）。 |
| **忽略后果** | 若不保留 `pre-wrap` → 释义换行全丢，挤成一坨；若重复截断 → 与构建期截断叠加。 |
| **重现成本** | **约 1–2 轮 / 1 小时** |

### 5.3 笔记跳转定位（`Notes.vue:153-158`）—— 已知有 bug

| 项 | 内容 |
|----|------|
| **现状（有 bug）** | `jumpToReader` 只 push 到 `/reader/:sutraId`，**不带任何位置参数**：<br>`router.push({ path: \`/reader/${encodeURIComponent(note.sutraId)}\`, query: { from: '#/notes' } })` |
| **为什么是 bug** | ① 笔记 `note` 对象里**没有存段落锚点**（`stores/notes.js:34` 存了 `paragraphId: ''`，**恒为空串**）；② 跳转后无法定位到笔记对应的经文位置，只能落到**上次阅读进度**。 |
| **正确做法应该是什么** | ① 添加笔记时**记录来源锚点**（`chapterIdx + paraId + paraOffset`，从 `window.getSelection()` 反查所在段落）；② `note` 增加 `anchor: {chapterIdx, paraId, offset}` 字段；③ 跳转时带上锚点：`/reader/:id?chapter=X&para=Y&offset=Z` 或 `query` 传参；④ 阅读页 `onMounted` 读取 query 并调用 `scrollToPara`（复用搜索跳转那套定位逻辑，含 §1.2 的动画等待）。 |
| **忽略后果** | 重写若照抄现状 → "点笔记跳转"永远跳不准（落到随机进度位置）；用户会反复投诉。 |
| **重现成本** | **约 2–3 轮 / 2 小时**（含设计锚点存储方案） |

**第 5 节小计重现成本：约 5–8 轮 / 4.5–6 小时**

---

## 6. 架构级隐性决策（最贵，最容易被"重写"抹掉）

| 决策 | 内容 | 位置/证据 | 忽略后果 | 重现成本 |
|------|------|-----------|---------|---------|
| **词典数据内联** | 把 30MB 词典**内联进 `dictIndex.js` 并截断 300 字**，取消运行时 fetch。原因：*"解决 30MB 词典文件 fetch 超时导致查不到释义的问题"*。 | commit `86f70fc` | 重写若恢复"运行时 fetch 词典 JSON" → **fetch 超时 bug 原样复现**（这是被真实用户踩过的坑）。 | **3–5 轮 / 4–6 小时** |
| **中文文件名 + hash 路由** | 经文 JSON 用**中文文件名**（如 `《八识规矩颂释》.json`），路由用 `createWebHashHistory` + `encodeURIComponent`。 | `router/index.js:22`、`Reader.vue:141`；commit `1faf8cc→592716c→c06fc19`（ASCII 改名后又回滚） | 重写若改用 ASCII 文件名 → 需同步改 manifest/脚本/部署；若用 history 路由 → GitHub Pages 404。**来回折腾了 4 次 commit**。 | **2–3 轮 / 2 小时** |
| **`ReaderContent` 必须能"强制重挂载"** | 词典切换刷新高亮，靠 `:key="refreshKey"` 整块重挂载，而非细粒度响应式更新。 | `Reader.vue:40`、`stores/dict.js:38` | 重写若去掉这个机制又不解决细粒度刷新 → 高亮开关失效（`e4660bb/61cb5d0/486b2ff/ee8fa91` 一串 commit 的教训）。 | **3–4 轮 / 3 小时** |
| **`ReaderContent` 缺 `defineProps` 会白屏** | 曾因漏写 `defineProps` 导致**正文整块空白**。 | commit `5fefafb` | 重写若把 props 定义漏了 → 白屏，且排查成本高。 | **1 轮 / 1 小时** |
| **`computed` 追踪不了大嵌套对象** | `props.chapters`（大嵌套）变化时 `computed` 不重算，必须 `watch + deep` 或换 ref。 | commit `99859db` message 原文；废弃的 `useSegmentedContent.js` 就死在这上面 | 重写若用 `computed` 派生分段 → 搜索/高亮不刷新。 | **3–4 轮 / 3 小时** |

**第 6 节小计重现成本：约 12–17 轮 / 13–16 小时**

---

## 7. 设计文档 vs 实现的偏差（重写者的"意图锚点"）

> 这些偏差本身是隐性知识：**文档写的是"意图"，代码是"妥协后的现实"**。重写者需知道"为什么偏离"，而不是盲目照抄任一方。

| 设计文档（意图） | 实际实现（现实） | 评价 |
|----------------|----------------|------|
| T-19：Trie 用 **Web Worker** 构建 | 主线程 `computed` 构建 | 妥协（省复杂度，但 35k 词有卡顿风险） |
| T-19：**4 色**区分词典类型（内置/官方/用户/多词典） | 单一色 `.dict-highlight`（accent 棕） | **未实现**，重写可补齐 |
| T-19：`data-dict-ids` 属性 + 多词典重叠色 | 无 | 未实现 |
| T-20：PC 端**跟随词条浮动弹窗** + 移动端 Bottom Sheet | **只有** Bottom Sheet | 简化（PC 也用了底部抽屉） |
| T-20：释义/笔记支持 **Markdown（marked+DOMPurify）** | 纯文本 + 正则清洗 | **未实现**，重写可补齐 |
| T-22：搜索结果上下文 **前后 30 字** | 前后 **20 字** | 已漂移，以代码为准 |
| T-22：高亮用 `<mark class="sutra-search-highlight">` + **TreeWalker 直接改 DOM** | Vue 分段渲染 `<span class="search-highlight">` | 架构升级（更 Vue 化，但引入了 §1 的定位复杂度） |
| T-22：搜索面板关闭**自动清除**搜索高亮 | 保留到 `Reader` 显式清空 `searchKeyword` | 行为差异 |
| T-27：`IntersectionObserver` 自动跟踪 `currentChapter` | **未实现**（恒为 0） | 未实现，导致书签标签恒为"开头" |
| T-27：`tocPinned`（PC 钉住目录） | 未实现 | 未实现 |
| T-27：进度保存节流 30 秒或变化 >10% | 每次滚动节流 100ms 即存 | 更频繁 |

---

## 8. 汇总：隐性知识重现成本总表

| 知识域 | 条目数 | 重现成本（轮次） | 重现成本（工时） | 优先级 |
|--------|-------|----------------|----------------|--------|
| 1. 搜索高亮 + 滚动定位 | 6 | 19–29 | 15–21h | **P0**（用户改了 22 次） |
| 2. 术语高亮匹配（Trie） | 6 | 5–7 | 4–6h | **P0** |
| 3. 释义清洗 | 3 | 6–9 | 5–8h | P1 |
| 4. 目录 + 进度恢复边界 | 5 | 4–6 | 3–4h | P1 |
| 5. 交互细节 | 3 | 5–8 | 4.5–6h | P1 |
| 6. 架构级决策 | 5 | 12–17 | 13–16h | **P0**（最贵、最易被抹掉） |
| **合计** | **28 条** | **51–76 轮** | **44.5–61h** | — |

> **保守口径**：即便只看 git 里**有 commit 记录**的 fix/debug（30+ 次），每次按 0.5–1h 计，隐性知识的**已沉没发现成本 ≥ 15–30 小时**。重写若忽略本清单，这部分成本将**原样重付**。

---

## 9. 对重写决策的意义（结论）

1. **"重新开发用不了多少时间"是错觉**：代码量可以快速重写（4217 行，AI 几天能产出），但**这 28 条隐性规则是"发现型知识"，只能靠试错获得，不能靠生成获得**。它们正是那 30+ 次 fix commit 的沉淀。

2. **本清单把"发现型成本"变成了"继承型成本"**：
   - **全量重写**：若把本清单作为**行为规格 + 验收基准**交付，重写者可直接跳过 51–76 轮试错 → 重写变可行。
   - **分块重写**：本清单就是"保留哪些行为、重写哪些实现"的边界定义（如：§1 的定位逻辑必须**行为等价**迁移，§6 的数据内联决策必须**原样继承**）。

3. **验收基准**：重写完成后，用本清单逐条回归——尤其 §1.2（动画期坐标不稳）、§1.3（坐标系统不一致）、§4①（para.id 非全局唯一）、§6（内联词典）这四条，任何一条没复现，就是**功能性倒退**。

4. **一句话**：**代码可以重写，试错换来的规则不能。这份清单就是"重写能不能一次做对"的分水岭。**

---

*文档版本 v1.0　｜　提炼自 git 全量历史（30+ fix/debug commit）+ 逐文件精读 + 设计文档偏差比对*
