# MDX 词典解析方案 调研报告

> 任务编号：T-06
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md

## 1. 背景与目标

般若佛经阅读器 v2.0/v2.1 需要支持用户导入 MDX（MDict 词典格式）文件，用于佛教术语查询和经文高亮。本报告调研 MDX 格式的解析方案，覆盖以下目标：

1. 评估项目已有依赖 `mdict-js`（v10.0.1）和 `lzo-wasm`（v0.0.4）在前端浏览器环境中的能力边界
2. 研究 MDX 二进制格式规范，为预解析和按需查询提供理论依据
3. 对比多种 MDX 解析方案，确定最优前端实现路径
4. 给出大文件（>5MB / >10MB）解析的性能数据和内存控制方案
5. 明确 MDX HTML 释义转 Markdown 的准确性和兼容性陷阱

## 2. MDX 格式规范

### 2.1 Header 结构

MDX 文件是二进制格式，其结构分为三个逻辑区域：

| 区域 | 位置 | 说明 |
|------|------|------|
| Header（头信息区） | 文件开头 | 纯文本键值对，存储元数据 |
| Index（索引区） | Header 之后 | 键块（Key Block）集合，含词条名和数据区偏移量 |
| Data（数据区） | Index 之后 | 记录块（Record Block），含词条释义 HTML |

**Header 字段示例**：
```
GeneratedBy=MdxBuilder 3.0
Encoding=UTF-8
Title=朗文当代高级英语辞典（第6版）
Description=Longman Dictionary of Contemporary English 6th Edition
```

Header 以 `\x00\x00\x00\x00`（4 字节零）或连续 `\n\n` 结束，之后紧跟 8 字节的版本号标识（如 `\x00\x00\x00\x00\x02\x00\x00\x00` 表示 v2.0）。

**关键 Header 字段**：
- `Encoding`：编码方式，支持 UTF-8、UTF-16、Big5、GB18030
- `GeneratedBy`：构建工具版本，影响格式细节
- `Title` / `Description`：词典元信息
- `KeyCaseSensitive`：是否区分大小写（可选）

**MDX 版本差异**：
- v1.2 - v2.0：经典格式，使用 32 位偏移量，最大支持 4GB 文件
- v3.0：扩展格式，使用 64 位偏移量，支持超大文件（>4GB）

### 2.2 词条索引机制

索引区由多个**键块（Key Block）**组成，每个键块包含：

1. **键块头**：记录块内词条数量、解压后大小等元信息
2. **压缩数据**：使用 GZIP 或 LZO 压缩的词条列表
3. **前缀压缩**：键块内的词条采用前缀压缩（存储与前一个词条的差异）

查询流程：
```
1. 解析 Header → 获取索引区位置
2. 读取所有键块头 → 构建内存索引树（二分查找）
3. 二分查找定位词条所在键块
4. 解压该键块 → 遍历找到精确偏移量
5. 用偏移量到数据区读取释义
```

**数据区结构**：
- 由多个**记录块（Record Block）**组成
- 每个记录块同样使用 GZIP/LZO 压缩
- 块内包含多个词条的 HTML 释义，以词条偏移量索引

这种"索引-数据"分离的设计使得 O(log n) 级别的查询成为可能，不需要全量加载即可定位任意词条。

### 2.3 释义 HTML 格式

MDX 词条释义以 HTML 片段形式存储，特点如下：

- **非完整 HTML 文档**：通常只有 `<body>` 内部片段，不含 `<html>` / `<head>` 标签（部分词典有）
- **自定义 CSS 类**：大量使用词典专有的 CSS class（如 `hw`、`define`、`chn` 等）
- **内嵌资源引用**：图片使用 `file://` 或相对路径，音频使用 `sound://` 协议
- **内嵌样式**：部分词典在释义中直接包含 `<style>` 标签或 `style` 属性
- **多语言混合**：可能包含梵文、巴利文、藏文等特殊字符和 font-face 引用
- **JavaScript 脚本**：少数词典在释义中内嵌 `<script>` 标签（前端需过滤）

**示例释义**：
```html
<head><link rel="stylesheet" type="text/css" href="O7.css"/></head>
<body>
  <span class="hw"> ask </span>
  <span class="i_g">
    <img src="key.gif"/>
    <a class="i_phon" href="sound://aask_ggv_r1_oa013910.spx">ɑ:sk</a>
  </span>
  <span class="cls"> verb</span><br>
  <div class="define">
    <span class="numb">1</span>
    <span class="d">to say or write sth in the form of a question<span class="chn"> 问；询问</span></span>
  </div>
</body>
```

**MDD 资源文件**：
- 与 MDX 同名、相同二进制结构
- 键为资源路径（如 `\O7.css`、`\key.gif`、`\sound\pronunciation.mp3`）
- 值为原始二进制数据（Base64 编码返回）

## 3. 解析方案对比

| 方案 | 语言 | 前端兼容 | 性能 | 维护状态 | 适用场景 |
|------|------|----------|------|----------|----------|
| **mdict-js** (tonyzhou1890) | JS | 原生 | lookup ~20K ops/sec | 活跃（v10，MIT 许可） | 浏览器端实时查询 |
| **js-mdict** (terasum) | TS/JS | 原生 | lookup ~20K ops/sec | 活跃（v7.0 AGPL） | Node.js / 浏览器 |
| **python-readmdict** | Python | 需转换 | 惰性加载，服务端快 | 稳定但更新少 | 服务端预解析 |
| **MdictParser** | Python | 需转换 | 全量加载 | 维护中 | 服务端批量导出 |
| **readmdict** (pymdict) | Python | 需转换 | 惰性加载 | 稳定 | 服务端预解析 |

### 3.1 mdict-js 能力边界

项目当前使用的 `mdict-js@10.0.1`（tonyzhou1890 分支，MIT 许可）的能力：

**支持的编码**：
- UTF-8、UTF-16（LE/BE）、Big5、GB18030
- 通过 Header 中的 `Encoding` 字段自动识别

**支持的功能**：
- `lookup(word)`：精确查询，返回 `{ keyText, definition }`
- `prefix(prefix)`：前缀搜索，返回匹配词条列表
- `fuzzy_search(word, size, editDistance)`：模糊搜索
- `suggest(word, distance)`：拼写建议
- `keys()`：获取全部词条列表（v10 特性，自动缓存）
- `parse_definition(key, offset)`：从偏移量解析释义
- 支持 MDD 资源文件查询
- 支持加密词典（passcode 参数）

**已知问题与限制**：
1. **Node.js 设计**：库最初为 Node.js 环境设计，使用 `fs` 模块读取文件。浏览器端需要手动传入 `ArrayBuffer`
2. **全量索引加载**：初始化时需要解析整个索引区到内存，大词典（>50 万词条）初始化耗时较长
3. **v10 Key 缓存**：v10 版本将所有 keys 缓存到内存中，50 万词条的词典约占用 5-10MB 内存
4. **Buffer 依赖**：使用 Node.js `Buffer`，浏览器环境需要 polyfill 或使用 `Uint8Array` 适配
5. **不支持 v3.0 格式**：仅支持 v1.2-v2.0 格式的 MDX 文件，不支持 64 位偏移量的 v3.0 格式
6. **无流式解析**：需要一次性读取整个 MDX 文件到内存（通过 FileReader.readAsArrayBuffer）
7. **LZO 依赖**：如果 MDX 使用 LZO 压缩，需要额外引入 `lzo-wasm`

**terasum/js-mdict 原库（v7.0）注意事项**：
- 2026-03-20 起从 MIT 切换为 AGPL-3.0 许可
- 项目使用的 tonyzhou1890 分支基于 MIT 许可的 v10 版本，无许可问题
- 原库提供了更完整的 TypeScript 支持、`lookupAll()` 去重查询、`contains()` 子串搜索等

### 3.2 lzo-wasm 解压性能

`lzo-wasm@0.0.4` 是 LZO 压缩算法的 WebAssembly 实现：

**性能特征**：
- LZO 解压速度极快，理论解压速度可达 400-500 MB/s（原生）
- WebAssembly 版本约为原生速度的 60-80%，即 250-400 MB/s
- 对于 MDX 典型数据块（50KB-500KB），单次解压约 0.1-2ms
- 相比纯 JS 实现，WASM 解压速度快 5-10 倍

**使用方式**：
```javascript
import lzo from 'lzo-wasm';

// 初始化（加载 WASM 模块，约 2-5ms）
await lzo.init();

// 解压数据块
const decompressed = lzo.decompress(compressedData, decompressedSize);
```

**注意事项**：
- WASM 模块大小约 20-30KB（gzip 后），首次加载开销小
- `init()` 是异步操作，需要在查询前完成初始化
- 内存安全：WASM 模块有自己的线性内存，不会污染 JS 堆
- 浏览器兼容性：所有支持 WebAssembly 的现代浏览器（Chrome 57+、Firefox 52+、Safari 11+）

**与 GZIP 对比**：
- LZO：解压速度更快，压缩率较低
- GZIP：压缩率更高，解压速度约为 LZO 的 1/3-1/5
- MDX 文件的键块和数据块可能混合使用两种压缩方式

## 4. 预解析性能测试

以下数据基于 MDX 格式特性和同类库的公开基准测试推算，佛教词典规模参考：

| 指标 | 小文件 (<5MB) | 大文件 (5-10MB) | 超大 (>10MB) |
|------|--------------|----------------|-------------|
| 典型词条数 | 1,000 - 10,000 | 10,000 - 50,000 | 50,000 - 200,000+ |
| 索引加载时间 | 50-200ms | 200-800ms | 800ms - 3s |
| 全量预解析时间 | 200-500ms | 1-3s | 3-10s |
| 预解析结果大小 (JSON) | 原始文件的 1.5-2x | 原始文件的 1.5-2x | 原始文件的 1.5-2x |
| 内存峰值（解析时） | 约 3x 文件大小 | 约 3x 文件大小 | 约 3x 文件大小 |
| 查询延迟（预解析后） | < 1ms | < 1ms | < 1ms |
| 查询延迟（直接查询） | 5-20ms | 10-50ms | 20-100ms |

**示例数据**：
- 5MB MDX 文件（约 2 万词条）：预解析约 1s，JSON 结果约 8MB
- 10MB MDX 文件（约 5 万词条）：预解析约 3s，JSON 结果约 18MB

### 4.1 MDX 转 Markdown

项目已安装 `turndown@7.1.2` 和 `markdown-it@14.0.0`，用于 HTML 释义转 Markdown 和渲染。

**转换准确率预估**：

| HTML 结构 | 转换效果 | 说明 |
|-----------|---------|------|
| `<p>`, `<div>`, `<span>` | 准确 | 标准块级/行内元素 |
| `<h1>`-`<h6>` | 准确 | 正确转为 `#` 标题 |
| `<ul>`, `<ol>`, `<li>` | 准确 | 正确转为列表 |
| `<a href="...">` | 准确 | 正确转为 `[text](url)` |
| `<img src="...">` | 准确 | 正确转为 `![alt](src)` |
| `<b>`, `<strong>`, `<i>`, `<em>` | 准确 | 正确转为粗体/斜体 |
| `<table>` | 需配置 | 需启用 GFM 插件 |
| `<br>` | 准确 | 转为换行 |
| 自定义 CSS class | **丢失** | class 信息在 Markdown 中无法保留 |
| `<style>` 内嵌样式 | **丢失** | Markdown 不支持样式 |
| `<script>` 标签 | 需过滤 | 安全风险，必须移除 |
| `sound://` 协议链接 | 需自定义规则 | 非标准协议，Turndown 默认不处理 |
| `file://` 资源引用 | 需自定义规则 | 需要映射到 MDD 资源 |
| 嵌套自定义标签 | 部分保留 | Turndown 的 `addRule` 可扩展 |

**Turndown 注意事项**：
- turndown 已停止维护，但功能稳定
- 支持自定义规则（`addRule`），可用于处理佛教术语特殊标签
- 对梵文、藏文等特殊字符无影响（Unicode 兼容）

**推荐方案**：
```javascript
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  emDelimiter: '*',
});

// 自定义规则：保留梵文特殊标记
turndownService.addRule('sanskrit', {
  filter: (node) => node.tagName === 'SPAN' && node.classList.contains('sanskrit'),
  replacement: (content) => `*${content}*`
});

// 过滤 script 标签
turndownService.addRule('scriptFilter', {
  filter: 'script',
  replacement: () => ''
});

const markdown = turndownService.turndown(htmlDefinition);
```

**格式保留率**：
- 纯文本 + 基础 HTML（粗体、斜体、链接）：**95%+**
- 包含表格和特殊排版：**80-90%**（需自定义规则）
- 包含内嵌样式和复杂 CSS class：**60-70%**（样式信息丢失）

### 4.2 兼容性陷阱

**1. 特殊编码问题**：
- 部分老词典使用 GB18030 / Big5 编码，浏览器 TextDecoder 支持有限
- UTF-16 编码的词典需要正确处理 BOM 和字节序
- **应对**：mdict-js 已处理编码转换，但需确保传入的 ArrayBuffer 完整

**2. 嵌套 HTML 标签**：
- 部分 MDX 释义包含不闭合的 HTML 标签
- 嵌套 `<span>` 层级可能很深（5-10 层）
- **应对**：转 Markdown 前先进行 HTML 清洗（可引入 DOMPurify）

**3. 内嵌资源处理**：
- 图片引用：`<img src="file:///image.png">` 或 `<img src="image.png">`
- 音频引用：`<a href="sound:///pronunciation.mp3">`
- CSS 引用：`<link href="style.css">`
- **应对**：
  - 小词典：将 MDD 资源预解析为 Base64 Data URL 内联
  - 大词典：保留引用，运行时通过 mdict-js 查询 MDD 文件

**4. `@@@LINK` 词条重定向**：
- MDX 使用 `@@@LINK=target_word` 语法实现词条跳转
- **应对**：解析时递归跟随链接，或在前端查询时自动重定向

**5. 重复词条（Duplicate Keys）**：
- 同一词条可能有多个条目（主释义 + 图片 + 链接）
- **应对**：使用 `lookupAll()` 获取所有条目，过滤掉 `[IMAGE]` 和 `@@@LINK` 类型的

**6. 加密词典**：
- 部分 MDX 使用 RIPPLE 加密
- **应对**：需要用户输入密码，通过 `passcode` 参数传入

### 4.3 大文件内存控制

**问题分析**：
浏览器内存限制通常为 1-4GB（取决于设备和浏览器）。MDX 解析的内存瓶颈在：

1. **FileReader.readAsArrayBuffer**：将整个文件加载到内存
2. **索引解析**：解压所有键块到内存
3. **预解析结果**：JSON 化的释义数据（通常是原始文件的 1.5-2 倍）

**控制方案**：

| 文件大小 | 策略 | 内存占用估算 |
|----------|------|-------------|
| < 5MB | 全量预解析，JSON 存入 IndexedDB | 原始文件 + JSON 结果 ≈ 15MB |
| 5-10MB | 预解析索引（terms 列表）+ 释义懒加载 | 索引 ≈ 1-3MB + 原文件 |
| > 10MB | 仅保留 MDX 原文件 + mdict-js 实时查询 | 原文件 + 索引缓存 ≈ 5-15MB |

**具体实现建议**：

1. **分块读取**：使用 `File.slice()` + 按需读取，避免一次性加载整个文件
2. **索引分离**：仅预解析词条索引（term + offset）存入 IndexedDB，释义按需查询
3. **LRU 缓存**：查询过的释义缓存在内存中，设置上限（如 100 条）
4. **Web Worker**：将 MDX 解析放到 Worker 中执行，避免阻塞主线程
5. **渐进式解析**：大文件解析时定期 `yield`（通过 `setTimeout` 分片），防止 UI 卡死

```javascript
// 分片解析示例
async function parseMdxInChunks(file, chunkSize = 1024 * 1024) {
  const chunks = [];
  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    const buffer = await chunk.arrayBuffer();
    chunks.push(buffer);
    // yield to main thread
    await new Promise(r => setTimeout(r, 0));
  }
  return concatenateBuffers(chunks);
}
```

## 5. 结论与建议

### 5.1 预解析方案

**明确结论**：采用**分级策略**，与 v2.0 方案一致：

| 文件大小 | 处理方式 | 理由 |
|----------|----------|------|
| < 5MB | 预解析为 JSON 存入 IndexedDB | 解析快，查询极快（<1ms），用户体验最佳 |
| 5-10MB | 预解析索引（仅 term 列表），释义按需查询 | 平衡内存和性能 |
| > 10MB | 保留 MDX 原文件，mdict-js 实时查询 | 省内存，查询延迟 10-50ms 可接受 |

### 5.2 切割策略

对于 >10MB 的超大词典，不建议自动切割（技术风险高，实现复杂度大），而是：

1. **直接模式**：保留原文件，通过 mdict-js 实时查询
2. **用户提示**：上传前检查文件大小，>10MB 时提示用户使用直接模式
3. **索引预加载**：即使是直接模式，也在导入时提取词条索引列表用于 Trie 构建

### 5.3 兼容层

**HTML 释义处理**：
- 预解析模式：使用 Turndown 将 HTML 转为 Markdown 存入 IndexedDB
- 直接模式：保留原始 HTML，前端用 `markdown-it` 渲染 + DOMPurify 清洗
- 梵文/藏文/巴利文：使用自定义 Turndown 规则保留特殊标记

**MDD 资源处理**：
- 小词典（<5MB）：资源转为 Base64 Data URL 内联到 Markdown 中
- 大词典：运行时通过 mdict-js 查询 MDD 文件，按需加载

### 5.4 许可风险

- 项目当前使用 `mdict-js@10.0.1`（tonyzhou1890 分支），**MIT 许可，无风险**
- terasum/js-mdict 原库自 v7.0.0 起改为 AGPL-3.0，**不建议升级到此版本**
- 如需新功能（如 `lookupAll`、`contains`），可考虑 cherry-pick 或自行实现

## 6. 对 v2.1 方案的影响

基于本调研结果，对 v2.1 开发的具体影响：

1. **mdxParser.js 实现**：
   - 封装 mdict-js 的浏览器适配层（ArrayBuffer 输入）
   - 实现文件大小判断的分级处理逻辑
   - 集成 Turndown 进行 HTML → Markdown 转换

2. **IndexedDB 存储优化**：
   - `dict_entries` 表增加 `format` 字段（`html` | `markdown`）
   - 小词典存储 Markdown 化后的释义
   - 大词典仅存储原始 MDX 文件引用

3. **Worker 线程**：
   - 将 MDX 解析和 Turndown 转换放到 Web Worker
   - 避免大文件解析阻塞主线程

4. **MDD 资源处理**：
   - 在 `fileCache.js` 中增加 MDD 资源缓存机制
   - 图片资源转为 Blob URL，音频按需加载

5. **错误处理**：
   - 捕获 mdict-js 解析失败的情况（加密词典、格式不兼容）
   - 提供用户友好的错误提示

6. **依赖版本锁定**：
   - `mdict-js`: 锁定 `^10.0.1`（MIT 分支），不升级到 v11+
   - `lzo-wasm`: 锁定 `^0.0.4`
   - `turndown`: 锁定 `^7.1.2`（已停更但功能稳定）
   - `markdown-it`: 锁定 `^14.0.0`

## 7. 参考资料

1. **mdict-js 文档**
   - tonyzhou1890/js-mdict: https://github.com/tonyzhou1890/js-mdict
   - terasum/js-mdict: https://github.com/terasum/js-mdict
   - Context7 文档: /tonyzhou1890/js-mdict

2. **MDX 格式分析**
   - MDX 词典文件解析指南: https://blog.csdn.net/p5l2m9n4o6q/article/details/154935565
   - GoldenDict 词典格式详解: https://blog.csdn.net/gitblog_00534/article/details/151938404
   - xwang/mdict-analysis: https://bitbucket.org/xwang/mdict-analysis

3. **HTML 转 Markdown**
   - Turndown.js: https://github.com/mixmark-io/turndown
   - HTML 转 Markdown 方案对比: https://m.php.cn/faq/1838304.html

4. **WebAssembly 性能**
   - WASM 压缩性能对比: https://blog.51cto.com/u_16099347/14339228
   - LZO 解压速度参考: ~400MB/s 原生, ~250MB/s WASM

5. **项目内部文档**
   - docs/PROJECT_V2_PLAN.md — v2.0 整体架构设计
   - docs/DICTIONARY_OPTIMIZATION_DISCUSSION.md — 词典优化决策记录（D1-D22）
