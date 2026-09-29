# 般若佛经阅读器 · 代码级腐化度审计

> 审计人：寇豆码（Kou）· 软件工程师　｜　日期：2026-09-29　｜　版本：v3.1.0
> 范围：`src/` 全部源码（35 个手写文件 + 1 个自动生成文件 `data/dictIndex.js`，约 4217 行，不含 20MB 生成物）
> 方法：逐文件精读 + 只读静态分析（行数统计 / 符号引用 grep / 重复片段比对 / git 历史取证）
> 约束：**未修改任何业务代码**，本文件为唯一产出物。
> 立场：独立判断，不迎合架构师既有结论；只对"代码本身能不能救"负责。

---

## 0. 一句话结论（先给判断）

> **这份代码不是"全局屎山"，但也绝不是"擦擦就能用"。**
> 它的腐化是**结构性、集中于核心链路（阅读 + 查词）的局部系统性腐化**：地基（分层 / 状态 / 设计令牌 / 工具层）是健康的，承重墙（`Reader.vue` + `ReaderContent.vue` + 弹层体系 + 词典数据加载）是烂的，而且**有 git 证据表明这些承重墙已经被反复补丁 10+ 次仍未修好**。
> 结论：**不该整块推倒，也不该在现有 `ReaderContent.vue` 上继续补。正确策略是"保留地基、重建承重墙"——重写约 40% 的代码（核心 3 块），可消除约 80% 的痛点。**

---

## 1. 逐文件质量评估表

评分口径：**5 = 干净**；4 = 良好（清日志即可）；3 = 一般（需清理/抽取）；2 = 差（需重构）；1 = 屎山（需重写）。

| # | 文件 | 行数 | 函数数 | 最长函数(行数@位置) | 最高圈复杂度(估) | 职责数 | 重复代码 | 死代码 | 错误处理 | 隐式耦合 | 评分 | 处置 |
|---|------|-----|-------|-------------------|----------------|-------|---------|--------|---------|---------|------|------|
| 1 | `main.js` | 42 | 0 | — | 1 | 3 | 无 | 无 | 有全局 errorHandler | **import 置于文件底部**；在组件外直接用 store | 3 | 重构 |
| 2 | `App.vue` | 40 | 1 | onMounted 12 | 2 | 2 | 无 | 无 | 无 | 监听 window 事件，正常 | 4 | 保留 |
| 3 | `router/index.js` | 26 | 0 | — | 1 | 1 | 无 | **无 `DictManager` 路由** | — | 无 | 5 | 保留 |
| 4 | `components/AppShell.vue` | 38 | 1 | onMounted 1 | 1 | 2 | 无 | 无 | 无 | 无 | 4 | 保留(清日志) |
| 5 | `components/AppTabBar.vue` | 167 | 2 | — | 2 | 2 | 内联 SVG 4 份 60 行 | 无 | 无 | 无 | 3 | 重构 |
| 6 | `components/bookshelf/SutraCard.vue` | 66 | 3 | — | 2 | 1 | 类别映射表(与 store 重复) | 无 | 无 | 无 | 5 | 保留 |
| 7 | `components/dict/DictPopup.vue` | 126 | 3 | — | 2 | 2 | 词典名映射(与 DictSearch 重复)；slide-up CSS | 无 | 无 | 无 | 3 | 重构 |
| 8 | `components/reader/ReaderContent.vue` | 322 | 11 | **`scrollToPara` 60 行@189** | **~13** | **6** | `insertSearchHighlights` 两段 20 行近重复 | `scrollTo` 无外部调用 | **空 catch / 无** | **直操 DOM(getElementById/TreeWalker/getBoundingClientRect)** | **1** | **重写** |
| 9 | `components/reader/ReaderDictSelector.vue` | 140 | 2 | — | 2 | 2 | overlay+panel+slide CSS | 无 | 无 | 无 | 3 | 重构 |
| 10 | `components/reader/ReaderHeader.vue` | 76 | 0 | — | 1 | 1 | 无 | 无 | 无 | 无 | 4 | 保留 |
| 11 | `components/reader/ReaderNotes.vue` | 198 | 6 | formatTime 4 | 3 | 3 | 弹层 CSS；`formatTime`(与 Notes.vue 重复) | 无 | 无 | 无 | 3 | 重构 |
| 12 | `components/reader/ReaderProgress.vue` | 43 | 0 | — | 1 | 1 | 无 | 无 | 无 | 无 | 5 | 保留 |
| 13 | `components/reader/ReaderSearch.vue` | 163 | 5 | `onSearch` 37 行@67 | ~8 | 3 | 弹层 CSS；`escapeHtml`+高亮逻辑内联 | 无 | 无 | `v-html`；搜索逻辑写死在组件内 | 2 | 重构 |
| 14 | `components/reader/ReaderSettings.vue` | 147 | 4 | — | 2 | 2 | 弹层 CSS；字号/行距/主题标签(与 Settings.vue 重复且**文案不一致**) | 无 | 无 | 无 | 3 | 重构 |
| 15 | `components/reader/ReaderTOC.vue` | 166 | 1 | — | 2 | 2 | overlay+panel+slide CSS | 无 | 无 | 无 | 3 | 重构 |
| 16 | `composables/useDictLoader.js` | 29 | 3 | — | 2 | 1 | 无 | **`clearCache()` 空函数**；`errors` 无人消费 | **try/catch 掩盖真实错误** | 无 | 3 | 重构 |
| 17 | `composables/useDictSearch.js` | 52 | 4 | executeSearch 18 | 3 | 2 | 无 | `executeSearch` 外部未用；`searching` 伪状态 | 无 | **`debounceTimer` 无卸载清理** | 3 | 重构 |
| 18 | `composables/useHighlighter.js` | 94 | 6 | highlight 24 | ~6 | 1 | 无 | 无 | 无 | 无(纯函数) | 4 | 保留 |
| 19 | `composables/useReadingProgress.js` | 41 | 5 | — | 3 | 2 | 无 | 无 | 无 | watch 内自触发 restore，与外部 restore() **双触发** | 3 | 重构 |
| 20 | `composables/useSutraLoader.js` | 46 | 3 | load 26 | 4 | 1 | 无 | 无 | 重试逻辑尚可 | **模块级全局变量 `manifestLoaded`** | 3 | 重构 |
| 21 | `pages/Bookshelf.vue` | 155 | 2 | — | 2 | 2 | 无 | 无 | 有 loading/error 分支 | 无 | 4 | 保留(清日志) |
| 22 | `pages/DictManager.vue` | 168 | 2 | loadManifest 12 | 2 | 2 | 与 Reader 的 manifest fetch 重复 | **整页孤儿，未接入路由** | 有 | 无 | **1** | **删除/重写** |
| 23 | `pages/DictSearch.vue` | 220 | 6 | — | 3 | 3 | 词典名映射 + `formatDefinition`(与 utils/text.js 及 DictPopup **三份重复**) | 无 | 无 | 无 | 2 | 重构 |
| 24 | `pages/Notes.vue` | 318 | 6 | — | 4 | 3 | `formatTime`；筛选/编辑逻辑 | 无 | 无 | **computed 内突变 note 对象(副作用)** | 2 | 重构 |
| 25 | `pages/Reader.vue` | 319 | **~25** | onMounted 29 行@261 | **~9** | **10+** | 无 | `progress.progressPercent` 未用 | **多处空 catch / 静默失败** | **window.getSelection / addEventListener / fetch 内联** | **2** | **重写** |
| 26 | `pages/Settings.vue` | 221 | 6 | — | 3 | 3 | 标签映射(与 ReaderSettings 重复)；`confirm()` | 无 | 无 | **`localStorage.clear()` 粗暴清库** | 3 | 重构 |
| 27 | `stores/dict.js` | 46 | 6 | — | 3 | 1 | 无 | **`lookupResult`/`lookupLoading`/`definitionCache` 外部未用** | 无 | 无 | 3 | 重构 |
| 28 | `stores/notes.js` | 78 | 7 | getAllNotes 9 | 3 | 1 | 无 | 无 | **`addNote`/`updateNote` 静默返回** | **每次调用都重读 storage(N+1)** | 2 | 重构 |
| 29 | `stores/reader.js` | 48 | 5 | — | 2 | 1 | 无 | **`removeBookmark` 从未被调用**；`currentChapter` 只读从不写(=恒 0) | 无 | 无 | 3 | 重构 |
| 30 | `stores/settings.js` | 60 | 5 | — | 3 | 2 | 无 | 无 | 无 | **store 内直接操作 `document.documentElement`(DOM 副作用)** | 2 | 重构 |
| 31 | `stores/sutra.js` | 66 | 5 | — | 3 | 1 | 无 | 无 | try/catch + error 状态，较规范 | 无 | 4 | 保留 |
| 32 | `utils/dictSearchEngine.js` | 61 | 2 | searchDictTerms 45 | ~7 | 1 | 无 | 无 | 无 | 无 | 3 | 重构 |
| 33 | `utils/storage.js` | 53 | 9 | — | 2 | 1 | 无 | 无 | **优雅降级 + try/catch 规范** | 无 | 4 | 保留 |
| 34 | `utils/text.js` | 38 | 3 | cleanDefinition 18 | ~4 | 1 | 与 DictSearch 局部实现重复 | 无 | 无 | 无(纯函数) | 3 | 重构 |
| 35 | `styles/tokens.css` | 114 | — | — | — | 1 | 无 | 无 | — | 无 | 5 | 保留 |
| 36 | `styles/themes.css` | 49 | — | — | — | 1 | 无 | 无 | — | 无 | 5 | 保留 |
| 37 | `styles/base.css` | 75 | — | — | — | 1 | 无 | 无 | — | **`font-size:16px !important`** | 4 | 保留 |
| 38 | `composables/__tests__/useHighlighter.test.js` | 55 | 6 | — | 1 | 1 | 无 | 无 | 无 | 无 | 4 | 保留 |
| 39 | `composables/__tests__/useReadingProgress.test.js` | 51 | 5 | — | 1 | 1 | 无 | 无 | 无 | 无 | 4 | 保留 |
| 40 | `data/dictIndex.js` | 6 行 / 20MB | — | — | — | 1 | — | — | — | **全量静态打进 bundle** | — | 改按需分片 |

**评分分布（37 个业务文件，不含 2 个测试）：**

| 评分 | 数量 | 占比 | 文件 |
|------|------|------|------|
| **1 分（屎山）** | **2** | 5.4% | `ReaderContent.vue`、`DictManager.vue` |
| **2 分（差）** | **6** | 16.2% | `Reader.vue`、`ReaderSearch.vue`、`DictSearch.vue`、`Notes.vue`、`stores/notes.js`、`stores/settings.js` |
| 3 分（一般） | 16 | 43.2% | （见上表） |
| 4 分（良好） | 8 | 21.6% | `App.vue`、`AppShell.vue`、`ReaderHeader.vue`、`useHighlighter.js`、`Bookshelf.vue`、`stores/sutra.js`、`utils/storage.js`、`base.css` |
| 5 分（干净） | 5 | 13.5% | `router`、`SutraCard.vue`、`ReaderProgress.vue`、`tokens.css`、`themes.css` |

**加权均分 ≈ 3.22 / 5**。分布形态值得注意：**不是"一边倒的烂"，而是"两端都有"——5 个满分文件证明作者具备写出干净代码的能力，2 个 1 分文件证明复杂度一旦上来就失控。** 这本身就是"低级模型 + 补丁堆叠"的典型指纹。

---

## 2. 「屎山」具体证据清单（最烂 10 段，全部带 `文件:行号`）

> 标注「主链路」= 处于"阅读 + 查词"核心路径，用户高频触达。

### ① `ReaderContent.vue:87-142` — `insertSearchHighlights` 两段近重复循环 【主链路】
```js
for (const seg of segments) {
  if (seg.type === 'term') {            // 分支 A：约 20 行
    const text = seg.content; const lower = text.toLowerCase()
    let lastIdx = 0; let pos = lower.indexOf(kwLower, lastIdx)
    while (pos !== -1) {
      if (pos > lastIdx) out.push({ type: 'term', content: text.slice(lastIdx, pos) })
      out.push({ type: 'search', content: text.slice(pos, pos + keyword.length) })
      lastIdx = pos + keyword.length; pos = lower.indexOf(kwLower, lastIdx)
    }
    if (lastIdx < text.length) out.push({ type: 'term', content: text.slice(lastIdx) })
    continue
  }
  // 分支 B：与分支 A 逐行同构，仅把 'term' 换成 'text'（约 18 行）
  const text = seg.content; const lower = text.toLowerCase()
  ... // 完全相同的 while 逻辑复制一遍
}
```
**为什么烂**：两段循环逻辑**逐行同构，只差一个类型字符串**，应抽成 `splitByKeyword(seg, kwLower)`。这是"补丁式编程"的直接产物——先写 term 分支能跑，再加 search 分支时直接复制。**且在主链路**（每次渲染每段都跑）。

### ② `ReaderContent.vue:189-249` — `scrollToPara` 60 行 / 5 层嵌套 / 8 条 console.log 【主链路】
```js
function scrollToPara(chapterIdx, paraId, paraOffset) {
  nextTick(() => {
    const paraEl = document.getElementById(`para-${paraId}`)      // ← 全局 DOM 查询
    console.log('[ReaderContent] scrollToPara - chapterIdx:', ...)  // ← 8 条日志散布全函数
    ...
    if (paraOffset != null) {
      const allHighlights = paraEl.querySelectorAll('.search-highlight')
      if (allHighlights.length > 0) {
        const walker = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT)  // ← 手工 TreeWalker
        while ((node = walker.nextNode())) {
          if (node.parentElement?.classList?.contains('search-highlight')) {
            if (charCount >= paraOffset) { targetHighlight = allHighlights[highlightIndex]; break }
            highlightIndex++
          }
          charCount += node.textContent.length
        }
        ...
```
**为什么烂**：单一函数承担"查 DOM → 遍历文本节点 → 手工累加字符偏移 → 计算 scrollTop → 赋值"五件事，圈复杂度 ~13；用 `document.getElementById` 全局查询而非 ref；手工 TreeWalker 算偏移是脆弱的临时方案。**git 铁证**：`b9e4ade`→`f7a429d`→`d6f930b`→`9f1c7a2`→`99859db` 连续 5 次 commit 都在改这一段的滚动偏移，仍没修干净。

### ③ `ReaderContent.vue:68-85` — `getSegments` 在模板 `v-for` 里逐段重算 + 4 条日志 【主链路】
```html
<template v-for="(seg, si) in getSegments(para.text, props.searchKeyword)" :key="si">
```
```js
function getSegments(content, kw) {
  console.log('[ReaderContent] getSegments - kw param:', kw, ...)   // ← 每次渲染每段都打印
  ...
  if (kw && kw.length >= 2) {
    console.log('[ReaderContent] calling insertSearchHighlights with kw:', kw)
    result = insertSearchHighlights(result, kw)
    console.log('[ReaderContent] insertSearchHighlights done - result segments:', ...)
    if (searchCount > 0) console.log('[ReaderContent] search segments:', ...)
  }
  return result
}
```
**为什么烂**：**函数在模板表达式里被调用 → Vue 每次重新渲染都会对每一段落执行高亮计算**（长经文上千段 = 上千次 Trie 匹配 + 日志拼接）。这是主链路最热的点，却是最脏的点。

### ④ `Reader.vue:152-207` — 触摸选择/长按/查词/笔记混杂，魔法值 500/300ms 【主链路】
```js
function onTouchStart() {
  touchTimer = setTimeout(() => {
    const selection = window.getSelection()                    // ← 直接读全局选区
    if (selection && selection.toString().trim().length > 0) showSelectionBtn.value = true
  }, 500)                                                       // ← 魔法值
}
function onTouchEnd() {
  clearTimeout(touchTimer)
  setTimeout(() => {                                            // ← 又一个裸 setTimeout
    const selection = window.getSelection()
    showSelectionBtn.value = selection && selection.toString().trim().length > 0
  }, 300)                                                       // ← 魔法值
}
```
**为什么烂**：把"长按 500ms 判定 / 抬手 300ms 复查"的交互时序硬编码进页面组件，且直接依赖 `window.getSelection()`（隐式耦合浏览器全局态）。应抽成 `useTextSelection` composable。

### ⑤ `Reader.vue:261-289` — 单个 `onMounted` 塞 6 类副作用 【主链路】
```js
onMounted(() => {
  readerStore.reset(filename.value); progress.restore(); loader.load(filename.value)
  startReadingTimer()
  nextTick(() => { pageRef.value.addEventListener('touchstart', onTouchStart, {passive:true}) ... })
  fetch(`${import.meta.env.BASE_URL}dicts/manifest.json`).then(r => r.json())
    .then(data => { dictManifest.value = data })
    .catch(e => { console.error('Failed to load dict manifest:', e) })   // ← 静默失败
})
```
**为什么烂**：一个生命周期钩子同时管：状态重置 / 进度恢复 / 数据加载 / 计时器 / DOM 事件绑定 / manifest 网络请求。**职责数 10+ 的"上帝组件"缩影**。manifest 加载失败仅 `console.error`，用户无感知。

### ⑥ `Reader.vue:209-213` — 滚动节流里打日志 【主链路】
```js
function onProgress(percent) {
  progressPercent.value = percent
  progress.save(readerStore.scrollPosition, percent)
  console.log('[Reader] progress saved, position:', readerStore.scrollPosition, 'percent:', percent)
}
```
**为什么烂**：滚动是最高频事件（节流 100ms），每次都在控制台打印——**生产环境刷屏**。`ReaderContent.vue` 里 `onScroll` 每 100ms 还会连带触发 `getSegments` 的日志。全项目 **52 条 console 语句**，`ReaderContent.vue` 独占 **23 条**。

### ⑦ `stores/settings.js:33-41` — store 里直接操作 DOM
```js
function setTheme(name) { theme.value = name; document.documentElement.setAttribute('data-theme', name) }
function applyBodyStyles() {
  document.documentElement.style.setProperty('--text-body', fontSize.value)
  document.documentElement.style.setProperty('--leading-body', lineHeight.value)
}
```
**为什么烂**：Pinia store 应只管状态，这里却直接写 `document.documentElement`——**状态层与视图层耦合**，无法在 SSR / 单测 / 多实例下工作。且 `fontSize` 与 `fontSizeIndex` 双份状态手工同步，存在漂移风险。

### ⑧ `pages/Notes.vue:131-141` — computed 内突变数据（副作用）
```js
const displayedNotes = computed(() => {
  let notes = notesStore.searchNotes(searchQuery.value)
  ...
  for (const note of notes) {
    const sutra = sutraStore.sutraList.find(s => s.filename === note.sutraId)
    note.sutraTitle = sutra ? sutra.title : note.sutraId      // ← 在 computed 里改对象！
  }
  return notes
})
```
**为什么烂**：computed 应是纯函数，这里却在其中给每个 note 注入 `sutraTitle` 字段——**依赖响应式缓存的副作用**，一旦 store 数据是共享引用会污染源数据，且 `searchNotes` 内部还会重新读 storage。

### ⑨ `stores/notes.js:8-23` — 每次调用重读 storage（N+1）+ 字段混用
```js
function getNotes(sutraId) {
  const existing = storage.getObject(`notes-${sutraId}`) || []   // ← 每次同步 JSON.parse
  allNotes.value[sutraId] = existing
  return existing
}
function getAllNotes() {
  const result = []
  for (const sutraId of Object.keys(allNotes.value)) {
    for (const note of allNotes.value[sutraId]) result.push({ ...note, sutraId })
  }
  return result.sort((a, b) => (b.createdAt || b.time) - (a.createdAt || a.time))  // ← 两个时间字段混用
}
```
**为什么烂**：`addNote`/`updateNote`/`deleteNote` 内部都先 `getNotes()` → 每次操作都同步读一次 localStorage；`createdAt` 与 `time` 两套字段并存，排序靠 `||` 兜底，说明字段是分两次加的（`time` 先有、`createdAt` 后补）。

### ⑩ `pages/DictManager.vue`（整文件 168 行）— 孤儿死页面
`router/index.js` 只注册了 `bookshelf / notes / dicts(DictSearch) / settings`，**`DictManager.vue` 全项目零引用**（grep 确认），却保留着完整的模板+逻辑+样式 168 行。同类死代码还有：`stores/dict.js` 的 `lookupResult/lookupLoading/definitionCache`、`stores/reader.js` 的 `removeBookmark`（从未被调用）、`useDictLoader.clearCache()`（空函数）、`ReaderContent.scrollTo`（无外部调用）。

### 附：跨文件重复（不是单段，但性质同属屎山）
| 重复内容 | 出现位置 | 次数 |
|---------|---------|------|
| 弹层 `overlay + panel + slide-up` CSS | DictPopup / ReaderNotes / ReaderSearch / ReaderSettings / ReaderTOC / ReaderDictSelector | **6 份** |
| `themeLabels / sizeLabels / lineHeightLabels` | ReaderSettings.vue:93-95 vs Settings.vue:108-110 | 2 份（**文案还不一致：'夜间' vs '墨夜'**） |
| 词典名映射 `dict-1/2/3` | DictPopup.vue:69 / DictSearch.vue:103-113 | 3 份 |
| `formatDefinition` | utils/text.js:34 / DictSearch.vue:118 / DictPopup 转发 | 3 份 |
| `formatTime` | ReaderNotes.vue:132 / Notes.vue:143 | 2 份 |
| 类别标签 `般若/唯识/…` | stores/sutra.js:12 / SutraCard.vue:23 | 2 份 |

---

## 3. 最关键的三问

### 3a. 腐化是「局部的」还是「系统性的」？

**结论：混合型，且重心偏向系统性——腐化不是随机的，而是精确聚集在"高复杂度 + 核心链路"上，并在那里反复补丁。**

**判据一：腐化位置高度集中，而非均匀散布。**
- **健康的**（4–5 分）：整个 `styles/`（设计令牌体系完整）、`router`、`utils/storage.js`、`stores/sutra.js`、`useHighlighter.js`（有真实算法）、外围展示组件（SutraCard / ReaderProgress / ReaderHeader / Bookshelf）。这些是"地基"，成色明显好于均值。
- **烂的**（1–2 分）：全部落在 **`Reader.vue` + `ReaderContent.vue` + 弹层体系 + 词典数据加载 + 展示型页面（Notes/DictSearch）**。这不是随机噪声，是"复杂度一高就失控"的系统性模式。

**判据二：git 历史证明核心链路"改不动"。**
```
59284f2 debug: add detailed console logs for search highlight and scroll positioning
2ad3112 debug: pass searchKeyword as explicit param to getSegments
c24a851 fix: search highlight in term segments + precise scroll to keyword
b9e4ade fix: increase scroll offset to -120 for search keyword positioning
f7a429d fix: reduce scroll offset to -40 for keyword closer to top
d969d3f fix: pass paraOffset to scrollToPara for precise keyword positioning
de482d4 fix: missing parenthesis in while loop syntax   ← 连语法括号都修错了
```
**连续 10+ 次 commit 全部围绕同一件事（搜索高亮 + 滚动定位）**，甚至出现 `-120`→`-40` 这种"拧螺丝"式反复试错，最后还留了 23 条 debug 日志没删。这是**设计无法吸收变更**的教科书信号——典型的局部结构性腐化。

**判据三：存在一处真正的"系统性"问题——数据架构。**
`src/data/dictIndex.js` **20MB 静态打进 bundle**（`stores/dict.js` 直接 `import`），而 `public/dicts/` 下又躺着 **50MB 同源 JSON**（`中国当代佛教网辞典.json` 16MB 等），后者运行时**只被读了 manifest.json**（仅取词典元信息展示）。即：**同一份词典数据存了两遍，一份全量压进 JS 包、一份几乎闲置**。这是架构级决策失误，不属任何单文件。

**综合判定**：**"核心链路系统性腐化 + 数据层架构缺陷 + 地基健康"**。因此——**分块重写"核心链路"完全可行且必要**（因为烂的是可隔离的 3 块），**但整块推倒整个项目是浪费**（因为地基是好的）。

---

### 3b. 如果我接手长期维护，真实策略是什么？

**心里话：不整块推倒，但也绝不在现有 `ReaderContent.vue` 上继续打补丁。策略是"保地基、拆承重墙、重写核心 3 块"。**

**保留（不重写，最多清理）——约 60% 代码：**
- 项目脚手架 / `vite.config.js` / 路由 / Pinia 骨架 / `utils/storage.js`
- 整套 CSS 设计令牌（`tokens.css` + `themes.css` + `base.css`）——**这是全项目最值钱的资产，直接复用**
- `useHighlighter.js`（Trie 算法，保留并补测试）
- 外围展示组件：`SutraCard` / `ReaderProgress` / `ReaderHeader` / `Bookshelf` / `stores/sutra.js`

**重写（3 块，约 40% 代码，消除 80% 痛点）：**
1. **阅读页（`Reader.vue` + `ReaderContent.vue`）** → 拆成三层：
   - 渲染层：纯函数 `buildSegments(text, terms, keyword)`（脱离模板、可缓存、可单测）
   - 交互层：`useTextSelection` / `useReadingProgress` / `useReaderTabs` composables（消除 `window.getSelection` 与生命周期堆叠）
   - 锚点层：用语义化锚点（`data-para-id` + `scrollIntoView({block:'center'})`）替代手工 TreeWalker 算偏移
2. **弹层体系（6 个组件）** → 抽 1 个通用 `<BottomSheet>` / `<SidePanel>` 基座，消灭 6 份复制粘贴的 overlay/panel/transition。
3. **词典数据层** → 把 20MB `dictIndex` 拆成按需分片（首字母/词频分片 + 动态 `import()`），复用 `public/dicts/*.json`，把首屏 JS 从 20MB 量级砍到几百 KB。

**顺手清理（低成本高收益）：**
- 删除全部 52 条 `console.*`（`eslint no-console` 生产环境直接改 `error`）
- 删除死代码：`DictManager.vue` 整页、`removeBookmark`、`lookupResult/lookupLoading`、空 `clearCache`
- 抽取公共常量（标签映射、词典名、`formatTime`、`formatDefinition`）到 `constants/` + `utils/format.js`

**工期直觉**：核心 3 块重写 ≈ 2–3 周（含回归）；清理 ≈ 2–3 天。**这比"推倒整个项目重做"（重写所有外围页面 + 重新攒 20MB 词典管线）省一半以上，且风险可控。**

**一句话**：**"屎山"这个判断是准确的，但它指的是那三面承重墙，不是整栋楼。拆墙重建，别拆楼。**

---

### 3c. 有哪些部分「写得不错、值得保留」？

这同样重要——**全盘否定是错的，这份代码里有真东西：**

1. **`styles/tokens.css` + `themes.css`（评分 5）** —— 一套完整的语义化设计令牌（颜色 / 字体 / 字号 / 字重 / 行高 / 间距 / 圆角 / 断点 / 触控尺寸），并实现了 `paper / night / eye-care` 三主题的变量覆写。**这是专业级的设计系统基础，成色远高于同类个人项目，必须原样继承。**
2. **分层架构本身（`pages / components / stores / composables / utils / styles`）** —— 目录职责清晰，无循环依赖（架构师已确认）。这个骨架是对的，值得保留。
3. **`composables/useHighlighter.js`（评分 4）** —— 用 **Trie 树 + 正向最长匹配**实现经文分词高亮，还处理了"数词短语误匹配"（`三十七尊` 不误切 `十七尊`）。**有真实算法含量**，且**自带单元测试**（`useHighlighter.test.js` 覆盖最长匹配、数词排除）。这是全项目质量最高的逻辑代码。
4. **`utils/storage.js`（评分 4）** —— localStorage 不可用时**优雅降级到内存 fallback**，统一前缀 `br-`，提供类型化 getter（`getObject/getString/getNumber`）且全程 try/catch。**少见地干净、健壮**。
5. **路由与入口设计** —— hash 路由（利于静态部署 / GitHub Pages）、路由懒加载 `import()`、`KeepAlive` 缓存列表页，都是合理决策。
6. **`stores/sutra.js`（评分 4）** —— 状态 + loading + error 三态齐全，`try/catch/finally` 规范，是全项目错误处理写得最对的一个 store。
7. **`vite.config.js` 的构建约定** —— 注入版本号/commit hash、构建期自动生成词典索引、`base` 按 mode 切换，工程化意识在线。
8. **已存在的 2 个单元测试** —— 证明作者**有测试意识**，只是没坚持。重写时应在此思路上扩展到核心渲染管线。

---

## 4. 给决策的一句话汇总

| 问题 | 答案 |
|------|------|
| 腐化范围 | **核心链路（阅读/查词）+ 数据层：系统性；地基与外围：局部且健康** |
| 评分均分 | **3.22 / 5**（1 分×2、2 分×6、3 分×16、4 分×8、5 分×5） |
| 最烂 3 段 | `ReaderContent.vue:189-249`（scrollToPara）、`ReaderContent.vue:87-142`（重复高亮循环）、`Reader.vue:261-289`（上帝 onMounted） |
| 值得保留 | **设计令牌体系、分层骨架、Trie 高亮算法、storage 降级、路由/工程化配置** |
| 维护策略 | **保地基、拆承重墙：重写核心 3 块（~40% 代码），不推倒全楼** |
| 是否继续在旧 `ReaderContent` 上补 | **否。已补 10+ 次仍未修好，继续补是负收益。** |

> 本审计与架构师的独立代码级评估可交叉验证。若两者结论一致（"局部系统性、可分块重建、地基保留"），则"从零重建"不是最优解，"保留地基 + 重写核心链路"才是。
