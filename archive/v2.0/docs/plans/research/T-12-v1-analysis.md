# v1.0 代码与数据逆向分析 报告

> 任务编号：T-12
> 完成日期：2026-05-02
> 基于：archive/v1.0/ 源码

## 1. 背景与目标

v1.0 版本已归档至 `archive/v1.0/`，现需要对其代码和数据进行系统性逆向分析，提取可迁移到 v2.0 的数据资产、工具函数和设计资源。分析覆盖数据层、核心逻辑、UI 资产三大类，为 v2.0 重构提供决策依据。

## 2. 数据结构提取

### 2.1 内置词典数据 (dictionary.js)

**状态：文件不存在**。代码中多处引用 `@/data/dictionary`，但该文件从未在 v1.0 中创建。这是一个 **v1.0 未完成的功能**。

引用位置：
- `src/stores/dictionaries.js:9` — `import { dictionary as builtinDictionary }`
- `src/components/DictionaryPopup.vue:66` — `import { dictionary }`
- `.codebuddy/rules/data-structures.mdc:129` — 规范文档定义

**预期数据格式**（根据代码推导）：

```javascript
{
  term: '般若',              // 词条
  pinyin: 'bō rě',           // 拼音
  sanskrit: 'prajñā',        // 梵文（可选）
  definition: '释义文本',     // 释义
  category: '核心术语',       // 分类
}
```

**规划分类**（来自 `.codebuddy/rules/data-structures.mdc`）：

| 分类 | 规划词条数 | 示例 |
|------|-----------|------|
| 核心术语 | 20 | 般若, 菩萨, 菩提, 涅槃, 如来 |
| 人物称谓 | 15 | 释迦牟尼, 观世音, 弥勒 |
| 地理名相 | 10 | 西方极乐世界, 娑婆世界 |
| 修行方法 | 15 | 禅定, 持戒, 布施 |
| 佛教名数 | 10 | 三界, 六道, 四圣谛 |
| 常见梵语 | 10 | 南无, 阿弥陀佛 |
| 其他术语 | 20 | ... |
| **合计** | **~100** | |

| 词典名称 | 类型 | 词条数 | 可迁移性 | 备注 |
|----------|------|--------|----------|------|
| 内置词典 (dictionary.js) | builtin | 0（文件未创建） | 需手动创建 | v1.0 未完成，v2.0 需从零编写 |

### 2.2 外部词典数据 (public/dictionary.json)

**实际存在的词典数据**，从 MDX 文件预解析生成：

| 指标 | 数值 |
|------|------|
| 文件大小 | 50 MB |
| 头词条数 | 35,781 |
| 释义条目数（展开后） | 40,184 |
| 多来源词条 | 6,554（同一词条来自多个词典） |
| 单来源词条 | 29,227 |
| 词典来源数 | 4 |

**词典来源列表**：

| 来源 ID | 来源名称 | 类型 |
|---------|---------|------|
| direct | 直接条目（无明确来源标记） | 混合 |
| source-中华佛教百科全书2020.1.8.mdx | 中华佛教百科全书 | MDX 转换 |
| source-中国当代佛教网辞典 | 中国当代佛教网辞典 | MDX 转换 |
| source-新编佛教辞典 - 陈兵 | 新编佛教辞典 | MDX 转换 |

**数据格式**（压缩字段名）：

```javascript
// 单来源条目
{ "t": "词条", "p": "拼音", "s": "梵文", "d": "释义", "c": "分类" }

// 多来源条目（d 为数组）
{ "t": "词条", "p": "拼音", "s": "梵文", "d": [
    { "s": "来源名", "c": "释义内容" },
    { "s": "来源名", "c": "释义内容" }
  ], "c": "分类" }
```

| 词典名称 | 类型 | 词条数 | 可迁移性 | 备注 |
|----------|------|--------|----------|------|
| 中华佛教百科全书 | external (MDX) | ~40,000 | 可直接复用 | 50MB JSON，v2.0 需改为按需加载 |
| 中国当代佛教网辞典 | external (MDX) | 部分 | 可直接复用 | 与主文件合并存储 |
| 新编佛教辞典 | external (MDX) | 部分 | 可直接复用 | 与主文件合并存储 |
| 22部佛学辞典合集.mdx | MDX 原文件 | 未知 | 需重新解析 | public/mdict/ 目录下 |
| 达摩实用大辞典.mdx | MDX 原文件 | 未知 | 需重新解析 | public/mdict/ 目录下 |

### 2.3 经书元数据 (sutras.js)

**硬编码经书**（`src/data/sutras.js`）：

| 经书名称 | ID | 译者 | 章节数 | 字数 | 内容完整性 | 可迁移性 |
|----------|----|------|--------|------|-----------|----------|
| 心经 | xin-jing | 唐三藏法师玄奘译 | 1 | 260 | 全文 | 直接复用 |
| 地藏经 | di-zang-jing | 唐于阗国三藏沙门实叉难陀译 | 1 | 28,000 | 仅第一品 | 需补充完整 |
| 阿弥陀经 | a-mi-tuo-jing | 姚秦龟兹三藏鸠摩罗什译 | 1 | 1,800 | 部分 | 需补充完整 |
| 金刚经 | jin-gang-jing | 姚秦三藏法师鸠摩罗什译 | 1 | 5,200 | 仅第一品 | 需补充完整 |
| 观音经 | guan-yin-jing | 姚秦三藏法师鸠摩罗什译 | 1 | 3,000 | 部分 | 需补充完整 |

**动态经书配置**（`src/data/sutras-config.js`）：

另有 17 部动态经书通过 TXT 文件加载（`public/sutras/` 目录），主要为冯达庵、唐普式居士的论著：

| 经书名称 | 作者 | 字数 | 来源文件 |
|----------|------|------|---------|
| 大乘起信论 | 梁真谛译 | 15,000 | 《大乘起信论》.txt |
| 发菩提心论 | 龙树菩萨造 | 8,000 | 《发菩提心论》.txt |
| 八识规矩颂释 | 玄奘法师 | 5,000 | 《八识规矩颂释》.txt |
| 禅宗明心见性与密宗即身成佛 | 冯达庵 | 10,000 | 冯达庵《禅宗明心见性与密宗即身成佛》.txt |
| 禅海塔灯题句 | 冯达庵 | 6,000 | 冯达庵《禅海塔灯题句》.txt |
| 法华特论 | 冯达庵 | 12,000 | 冯达庵《法华特论》.txt |
| 心经广义 | 冯达庵 | 20,000 | 冯达庵《心经广义》.txt |
| 佛法要论 | 冯达庵 | 25,000 | 冯达庵《佛法要论》.txt |
| 天眼通原理 | 冯达庵 | 7,000 | 冯达庵《天眼通原理》.txt |
| 新时代的佛法 | 冯达庵 | 9,000 | 冯达庵《新时代的佛法》.txt |
| 法门寺塔地宫唐密曼荼罗 | 唐普式 | 8,000 | 唐普式《法门寺塔地宫的唐密曼荼罗之我见》.txt |
| 七觉支颂 | 唐普式 | 4,000 | 唐普式《七觉支颂》.txt |
| 论著六大缘起 | 唐普式 | 10,000 | 唐普式《论著六大缘起》.txt |
| 唐密与广东 | 唐普式 | 11,000 | 唐普式《唐密与广东》.txt |
| 印度密教管窥 | 唐普式 | 13,000 | 唐普式《印度密教管窥》.txt |
| 宗门三关直指 | 唐普式 | 7,000 | 唐普式《宗门三关直指》.txt |
| 心经大义要释 | 唐普式 | 未知 | 唐普式《般若波罗蜜多心经大义要释》.txt |

`public/sutras/` 目录实际文件数：**31 个 TXT 文件**（含未在配置中列出的额外文件）。

### 2.4 读音映射 (pronunciation-map.js)

**文件位置**：`src/data/pronunciation-map.js` 与 `src/utils/pronunciation.js` 内容一致。

| 术语 | 拼音 | 备注 |
|------|------|------|
| 般若 | bō rě | 梵语 prajñā 的音译 |
| 菩萨 | pú sà | 菩提萨埵的简称 |
| 摩诃 | mó hē | 梵语 mahā，意为大 |
| 迦叶 | jiā shè | 佛弟子，禅宗初祖 |
| 阿难 | ā nán | 佛弟子，多闻第一 |
| 舍利 | shè lì | 佛骨舍利 |
| 婆娑 | pó suō | 娑婆世界的简称 |
| 提婆 | tí pó | 梵语 deva，意为天 |
| 须弥 | xū mí | 须弥山 |
| 南无 | nā mó | 梵语 namas，意为致敬 |
| 波罗 | bō luó | 梵语 pāramitā 的音译部分 |
| 末那 | mò nà | 第八识 |
| 阿赖耶 | ā lài yé | 第八识藏识 |
| 毗尼 | pí ní | 戒律 |
| 那由他 | nà yóu tuō | 印度大数名称 |
| 劫 | jié | 时间单位，劫波 |

**覆盖范围**：16 个佛教术语/多音字，均为音译词或佛教特殊读音。
**可迁移性**：直接复用，格式完全兼容 v2.0 设计。

## 3. 核心逻辑分析

### 3.1 Trie 实现 (utils/trie.js)

**文件**：`src/utils/trie.js`（100 行）

**数据结构**：使用纯 JavaScript 对象作为节点，每个字符为一个属性键：

```javascript
// 节点结构
{
  '般': {
    '若': {
      isEnd: true,
      term: '般若'
    }
  }
}
```

**核心函数**：

| 函数 | 功能 | 时间复杂度 |
|------|------|-----------|
| `buildTrie(dictionary)` | 从词条数组构建 Trie 树 | O(n * m)，n=词条数，m=平均词长 |
| `findMatches(trie, text)` | 在文本中查找所有匹配（长度>1） | O(n^2)，n=文本长度 |
| `removeOverlaps(matches)` | 去重，保留最长匹配 | O(n log n)，排序开销 |

**可复用性评估**：

| 维度 | v1.0 实现 | v2.0 需求 | 兼容度 |
|------|-----------|-----------|--------|
| 数据结构 | 纯对象 | Map（更高效的 char 查找） | 需重构 |
| 动态增删 | 不支持 | 支持词典开关切换 | 需重构 |
| 多词典 | 单 Trie | 多 Trie + 合并 | 需重构 |
| 匹配算法 | 前缀匹配 | 保持不变 | 可复用 |
| 去重策略 | 长词优先 | 保持不变 | 可复用 |

**结论**：算法思路（前缀匹配 + 长词优先去重）可复用，但数据结构和 API 需要完全重写。

### 3.2 存储逻辑 (utils/storage.js)

**文件**：`src/utils/storage.js`（127 行）

**localStorage 键值结构**：

| 键名（完整） | 存储内容 | 数据格式 | 所属模块 |
|-------------|---------|---------|---------|
| `buddhist-reader-settings` | 阅读设置 | `{ fontSize, showPinyin, ttsSpeed }` | settings store |
| `buddhist-reader-progress` | 阅读进度 | `{ sutraId: { percentage, chapterIndex, scrollPosition, lastReadTime } }` | progress store |
| `buddhist-reader-history` | 阅读历史 | `[{ sutraId, lastReadTime, progress }]` (最多10条) | progress store |
| `buddhist-reader-theme` | 主题设置 | `boolean` (是否暗色模式) | theme store |
| `buddhist-reader-dict-settings` | 词典设置 | `{ enabledDictIds: [], dictColors: {} }` | dictionaries store |
| `buddhist-reader-ignored-terms` | 忽略词条 | `string[]` | ignoredTerms store |

**封装函数**：

| 函数 | 功能 |
|------|------|
| `saveStorage(key, value)` | 序列化保存 |
| `loadStorage(key, defaultValue)` | 反序列化读取 |
| `removeStorage(key)` | 删除单条 |
| `clearStorage()` | 清除所有 `buddhist-reader-` 前缀数据 |
| `getStorageKeys()` | 列出所有键 |
| `isStorageFull()` | 检测存储空间 |
| `getStorageSize()` | 计算已用空间（字节） |

**用户词典 IndexedDB**（`src/utils/userDictStorage.js`）：

| 属性 | 值 |
|------|-----|
| 数据库名 | `buddhist-reader-dicts` |
| 表名 | `user-dictionaries` |
| 版本 | 1 |
| 主键 | `id`（字符串） |
| 记录结构 | `{ id, name, entries, createdAt }` |

**迁移策略**：v2.0 需要编写迁移脚本，将上述 localStorage 键值转换为 IndexedDB 表记录。

### 3.3 TTS 封装 (utils/tts.js)

**文件**：`src/utils/tts.js`（166 行）

**类结构**：`TTSEngine`

| 属性 | 默认值 | 说明 |
|------|--------|------|
| `rate` | 1.0 | 语速 (0.1-10) |
| `pitch` | 1.0 | 音调 (0-2) |
| `lang` | 'zh-CN' | 语言 |
| `voice` | null | 选中的语音 |
| `status` | 'idle' | 状态：idle/playing/paused/error |

**方法列表**：

| 方法 | 功能 |
|------|------|
| `loadVoices()` | 加载语音列表，处理 Chrome 异步加载 |
| `selectBestVoice()` | 优先选择中文本地语音 |
| `speak(text)` | 朗读文本 |
| `pause()` / `resume()` / `stop()` | 播放控制 |
| `setRate(rate)` / `setPitch(pitch)` / `setVoice(voice)` | 参数设置 |
| `getStatus()` | 获取当前状态 |

**兼容性处理**：
- Chrome 需要等待 `onvoiceschanged` 事件
- 优先选择 `localService` 的中文语音
- 完善的错误处理和状态通知

**可复用性**：**直接复用**。Web Speech API 是标准浏览器 API，封装完整且稳定。

### 3.4 其他工具函数

**MDX 解析器**（`src/utils/mdxParser.js`）：
- 使用 `mdict-ts` 库解析 MDX 文件
- 将 File 对象转为 ArrayBuffer 后解析
- 提取所有词条为 `{ t, d, p, s, c }` 格式
- 支持进度回调

**释义格式化**（`src/utils/formatDefinition.js`，232 行）：
- 支持多种词典格式：制表符分隔、换行分隔、HTML 内容
- 编码清理：BOM、乱码字符、零宽字符
- XSS 防护：移除 script/style 标签、事件处理器
- 文字检测：梵文、巴利文、藏文自动识别
- **可复用性**：直接复用，v2.0 释义格式统一为 Markdown 后需适配

**经文加载器**（`src/utils/sutra-loader.js`）：
- 从 URL 加载 TXT 经文
- 支持单章节和多章节批量加载
- 动态创建经文对象
- **可复用性**：逻辑可复用，v2.0 改为从 IndexedDB 加载

## 4. UI 资产提取

### 4.1 配色方案

**禅意 UI 配色**（`src/assets/styles/variables.scss`）：

#### 日间模式

| 变量名 | 色值 | 用途 | 描述 |
|--------|------|------|------|
| `--primary-color` | `#FF6B35` | 主色/高亮边框 | 赤褐色 - warm, Buddhist-inspired |
| `--highlight-bg` | `#FFF3CD` | 词典高亮背景 | 金黄 - wisdom/golden light |
| `--bg-page` | `#F5F5F5` | 页面背景 | 宣纸白 - rice paper |
| `--bg-card` | `#FFFFFF` | 卡片背景 | 纯白 |
| `--text-primary` | `#333333` | 主文本 | 墨黑 - ink black |
| `--text-secondary` | `#666666` | 辅助文本 | - |
| `--text-hint` | `#999999` | 提示文本 | - |
| `--border-color` | `#E0E0E0` | 边框 | - |
| `--divider-color` | `#EEEEEE` | 分割线 | - |

#### 夜间模式

| 变量名 | 色值 | 描述 |
|--------|------|------|
| `--bg-page` | `#1A1A1A` | 深空灰 - deep night |
| `--bg-card` | `#2A2A2A` | 禅堂灰 - meditation hall |
| `--highlight-bg` | `#4A4A4A` | 夜间高亮 |
| `--text-primary` | `#E0E0E0` | 夜间主文本 |
| `--text-secondary` | `#B0B0B0` | 夜间辅助文本 |
| `--text-hint` | `#808080` | 夜间提示文本 |
| `--border-color` | `#3A3A3A` | 夜间边框 |
| `--divider-color` | `#333333` | 夜间分割线 |

#### 词典颜色池

```
['#FF6B35', '#0891B2', '#8B5CF6', '#059669', '#DC2626',
 '#D97706', '#2563EB', '#7C3AED', '#DB2777', '#059669']
```

### 4.2 字体栈

| 变量名 | 字体栈 | 用途 |
|--------|--------|------|
| `--font-heading` | `'Source Han Serif CN', 'Noto Serif SC', serif` | 标题（宋体风格） |
| `--font-body` | `'Source Han Sans CN', 'Noto Sans SC', sans-serif` | 正文（黑体风格） |
| `--font-sanskrit` | `'Noto Sans Devanagari', 'Sanskrit 2003', 'ITF Devanagari', 'Mangal', sans-serif` | 梵文/天城文 |
| `--font-tibetan` | `'Noto Sans Tibetan', 'Microsoft Himalaya', sans-serif` | 藏文 |
| `--font-pali` | `'Noto Sans Devanagari', 'VU Palatino Linotype', sans-serif` | 巴利文 |

### 4.3 CSS 变量

**完整的 Design Token 体系**（`variables.scss`）：

#### 字号等级（12 级）

| 变量 | 值 | 适用场景 |
|------|-----|---------|
| `--font-size-xs` | 12px | 极小文本、标签 |
| `--font-size-sm` | 14px | 辅助文本 |
| `--font-size-base` | 16px | 正文 |
| `--font-size-lg` | 18px | 大正文 |
| `--font-size-xl` | 20px | 小标题 |
| `--font-size-2xl` | 24px | 标题 |
| `--font-size-3xl` | 30px | 大标题 |
| `--font-size-4xl` | 36px | 页面标题 |
| `--font-size-5xl` ~ `--font-size-8xl` | 48px ~ 96px | 展示性标题 |

#### 行高

| 变量 | 值 |
|------|-----|
| `--line-height-tight` | 1.2 |
| `--line-height-base` | 1.5 |
| `--line-height-loose` | 1.8 |
| `--line-height-relaxed` | 2 |

#### 字重

| 变量 | 值 |
|------|-----|
| `--font-weight-light` | 300 |
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |

#### 间距系统（基准 8px）

| 变量 | 值 | 说明 |
|------|-----|------|
| `--space-1` | 4px | 0.25rem |
| `--space-2` | 8px | 0.5rem |
| `--space-3` | 12px | 0.75rem |
| `--space-4` | 16px | 1rem |
| `--space-5` | 20px | 1.25rem |
| `--space-6` | 24px | 1.5rem |
| `--space-8` | 32px | 2rem |
| `--space-10` | 48px | 3rem |
| `--space-12` | 64px | 4rem |

#### 圆角

| 变量 | 值 |
|------|-----|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |
| `--radius-full` | 9999px |

#### 阴影

| 变量 | 值 |
|------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| `--shadow-base` | `0 2px 8px rgba(0, 0, 0, 0.08)` |
| `--shadow-md` | `0 4px 16px rgba(0, 0, 0, 0.1)` |
| `--shadow-lg` | `0 8px 32px rgba(0, 0, 0, 0.12)` |

#### 响应式断点

| 断点 | 范围 | 设备 |
|------|------|------|
| mobile | < 768px | 手机 |
| tablet | 768px - 1023px | 平板 |
| desktop | >= 1024px | PC |

## 5. v1.0 vs v2.0 差异对比

| 模块 | v1.0 实现 | v2.0 计划 | 迁移策略 |
|------|-----------|-----------|----------|
| **框架** | Vue 3 + Vant 4 + Pinia | Vue 3 + Vant 4 + Pinia | 保持不变 |
| **经书数据** | 5部硬编码 + 17部 TXT 动态加载 | IndexedDB 分块存储，按需加载 | 数据迁移至 IndexedDB |
| **内置词典** | 文件未创建（缺失） | IndexedDB 存储，50+ 词条 | v2.0 从零编写 |
| **外部词典** | 50MB JSON 全量加载 | 按需加载 + MDX 原文件查询 | dictionary.json 保留，改为懒加载 |
| **MDX 词典** | mdxParser.js 预解析 | <5MB 预解析，>=5MB 直接查询 | 保留解析逻辑，增加大小判断 |
| **Trie 引擎** | 静态纯对象，不支持增删 | 动态 Trie + 多 Trie 合并 | 算法复用，重写实现 |
| **数据存储** | localStorage（设置/进度）+ IndexedDB（用户词典） | 统一 IndexedDB | 编写迁移脚本 |
| **TTS** | Web Speech API 封装类 | 同 v1.0 | 直接复用 |
| **读音映射** | 16 个佛教术语 | 同 v1.0，可扩展 | 直接复用 |
| **释义格式化** | HTML 格式化 | Markdown 统一格式 | 需适配 Markdown 渲染 |
| **配色方案** | CSS 变量 + SCSS | CSS 变量保留 | 直接复用 |
| **字体栈** | 思源黑体/宋体 + 梵文/藏文 | 同 v1.0 | 直接复用 |
| **响应式** | SCSS mixin | Vant 4 自带 + 自定义 | 部分复用 |
| **用户词典** | IndexedDB 单表 | IndexedDB 多表（含版本链） | 数据结构升级 |
| **词典开关** | Pinia store + localStorage | IndexedDB 持久化 | 迁移存储方式 |
| **忽略词条** | localStorage Set | IndexedDB | 迁移 |
| **阅读进度** | localStorage Map | IndexedDB | 迁移 |
| **阅读历史** | localStorage 数组 | IndexedDB | 迁移 |

## 6. 迁移清单

### 6.1 直接复用

以下代码和数据可直接复制到 v2.0 项目中，无需修改或仅需极少调整：

| 文件/数据 | 目标位置 | 调整说明 |
|-----------|---------|---------|
| `src/data/pronunciation-map.js` | `src/data/pronunciationMap.js` | 改文件名，内容不变 |
| `src/utils/pronunciation.js` | `src/engine/pinyin.js` | 改文件名，保留 `addPinyinAnnotation` 等函数 |
| `src/utils/tts.js` | `src/utils/tts.js` | 直接复制 |
| `src/assets/styles/variables.scss` | `src/assets/styles/tokens.scss` | 完整保留所有 CSS 变量 |
| `src/assets/styles/reset.scss` | `src/assets/styles/reset.scss` | 直接复制 |
| `src/utils/formatDefinition.js` | `src/utils/formatDefinition.js` | 直接复制（v2.0 释义改为 Markdown 后需评估） |
| `public/dictionary.json` | `public/dictionary.json` | 保留原文件，v2.0 改为懒加载 |
| `public/sutras/*.txt` | `public/sutras/*.txt` 或 IndexedDB | 31 个 TXT 文件可保留或导入数据库 |
| `public/mdict/*.mdx` | `public/mdict/*.mdx` | MDX 原文件保留 |
| `src/utils/storage.js` 中的工具函数 | `src/utils/storage.js` | 仅作为 v1.0 数据迁移脚本使用 |

### 6.2 需要重构

以下代码块需要基于 v1.0 的逻辑重新实现：

| 代码块 | v1.0 问题 | v2.0 重构方向 | 工作量 |
|--------|----------|--------------|--------|
| **Trie 引擎** | 纯对象结构，不支持动态增删，不支持多词典 | Map 节点 + TrieManager 多实例 + Merger 合并 | 中（6h） |
| **词典 Store** | 全量加载 external dict，内存占用高 | 按需加载 + IndexedDB 查询 + 缓存层 | 大（8h） |
| **经书 Store** | 硬编码 + TXT 动态加载 | IndexedDB 分块存储 + SutraService | 中（4h） |
| **所有 Store 的 localStorage** | 碎片化存储，无版本管理 | 统一 IndexedDB + 数据迁移脚本 | 中（6h） |
| **内置词典数据** | 文件不存在 | 从零编写 50+ 词条 | 中（4h） |
| **DictionaryPopup** | 依赖全量加载的 entries | 改为异步查询 + 流式展示 | 中（6h） |
| **MDX 解析器** | 仅支持预解析 | 增加文件大小判断，支持直接查询 | 小（2h） |
| **Reader 页面高亮逻辑** | 全量 Trie 匹配 | 改为多 Trie 合并搜索 | 中（4h） |

### 6.3 废弃不用

v1.0 中存在但 v2.0 不需要或将被替代的部分：

| 内容 | 原因 |
|------|------|
| `src/data/sutras.js` 硬编码经书内容 | v2.0 改为 IndexedDB 动态加载 |
| `src/data/sutras-config.js` 动态经书配置 | v2.0 改为 SutraService 统一管理 |
| `src/utils/sutra-loader.js` TXT 加载器 | v2.0 从 IndexedDB 读取，不再 fetch TXT |
| `src/utils/storage.js` 的 CRUD 封装 | v2.0 统一使用 `idb` 操作 IndexedDB |
| `src/stores/ignoredTerms.js` 单独 Store | v2.0 合并到 settingStore 或独立 settings 表 |
| 旧版 `progressStore` 的 localStorage 逻辑 | 迁移到 IndexedDB progressStore |
| `src/stores/theme.js` 的 localStorage 逻辑 | 迁移到 IndexedDB settingStore |
| `src/stores/settings.js` 的 localStorage 逻辑 | 迁移到 IndexedDB settingStore |
| v1.0 的 `.codebuddy/rules/` AI 编程规则 | v2.0 使用新的 AGENTS.md 和项目规则 |

## 7. 结论与建议

### 迁移优先级排序

**P0（必须迁移/重写）**：
1. Trie 引擎 — 核心匹配算法，v2.0 架构依赖
2. IndexedDB 存储层 — v2.0 数据基础
3. 内置词典数据 — 需从零编写 50+ 佛教术语
4. 读音映射 — 直接复用
5. TTS 引擎 — 直接复用

**P1（建议迁移）**：
1. 配色方案与设计 Token — 保持禅意 UI 一致性
2. 释义格式化函数 — 需适配 Markdown
3. external dictionary.json — 保留但改为懒加载
4. 经书 TXT 文件 — 可保留或导入数据库

**P2（可延后）**：
1. MDX 解析器增强 — Phase 3 再处理
2. 用户词典版本链 — Phase 3 功能
3. 阅读统计功能 — Phase 4 优化

### 实施建议

1. **先建基础设施**：IndexedDB + Service 层 + Pinia stores，再迁移数据
2. **内置词典先行**：50+ 词条需在 Phase 1 完成，否则高亮功能无法工作
3. **v1.0 数据迁移脚本**：在 v2.0 首次启动时自动检测并迁移 localStorage 数据
4. **保持 CSS Token 不变**：避免 UI 风格变化，用户无感知升级
5. **dictionary.json 分批处理**：50MB 文件不宜全量加载，建议预建索引 + 按需查释义

## 8. 参考资料

### v1.0 源码文件

| 文件路径 | 行数 | 说明 |
|---------|------|------|
| `archive/v1.0/src/data/sutras.js` | 126 | 5 部硬编码经书 |
| `archive/v1.0/src/data/sutras-config.js` | 286 | 17 部动态经书配置 |
| `archive/v1.0/src/data/pronunciation-map.js` | 25 | 16 个读音映射 |
| `archive/v1.0/src/utils/pronunciation.js` | 65 | 拼音标注工具 |
| `archive/v1.0/src/utils/trie.js` | 100 | Trie 树实现 |
| `archive/v1.0/src/utils/storage.js` | 127 | localStorage 封装 |
| `archive/v1.0/src/utils/tts.js` | 166 | TTS 引擎 |
| `archive/v1.0/src/utils/userDictStorage.js` | 163 | IndexedDB 用户词典 |
| `archive/v1.0/src/utils/formatDefinition.js` | 232 | 释义格式化 |
| `archive/v1.0/src/utils/mdxParser.js` | 55 | MDX 解析器 |
| `archive/v1.0/src/utils/sutra-loader.js` | 76 | 经文加载器 |
| `archive/v1.0/src/stores/dictionaries.js` | 560 | 词典状态管理 |
| `archive/v1.0/src/stores/settings.js` | 67 | 设置管理 |
| `archive/v1.0/src/stores/progress.js` | 113 | 阅读进度 |
| `archive/v1.0/src/stores/theme.js` | 61 | 主题管理 |
| `archive/v1.0/src/stores/ignoredTerms.js` | 70 | 忽略词条 |
| `archive/v1.0/src/assets/styles/variables.scss` | 103 | CSS 设计 Token |
| `archive/v1.0/src/assets/styles/global.scss` | 72 | 全局样式 |
| `archive/v1.0/src/assets/styles/reset.scss` | 48 | 样式重置 |
| `archive/v1.0/src/components/DictionaryPopup.vue` | 482 | 词典弹窗组件 |
| `archive/v1.0/public/dictionary.json` | 50MB | 外部词典数据 |
| `archive/v1.0/public/sutras/*.txt` | 31 文件 | 经文 TXT 文件 |
| `archive/v1.0/public/mdict/*.mdx` | 5 文件 | MDX 词典原文件 |

### v2.0 规划文档

| 文件路径 | 说明 |
|---------|------|
| `docs/PROJECT_V2_PLAN.md` | v2.0 完整项目方案 |
| `docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md` | 词典优化讨论（22 项决策） |
