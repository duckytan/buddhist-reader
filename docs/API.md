# 数据格式 API 文档

> 般若佛经阅读器 v3.0 — 经书与词典数据格式规范

## 经书数据

### 单部经书 JSON

文件位置：`public/sutras/{filename}.json`

```json
{
  "title": "心经大义要释",
  "filename": "《心经大义要释》.json",
  "author": "冯达庵",
  "category": "prajna",
  "chapterCount": 2,
  "totalChars": 39094,
  "description": "般若波罗蜜多心经大义要释...",
  "chapters": [
    {
      "title": "全文",
      "content": "般若波罗蜜多心经大义要释..."
    },
    {
      "title": "结经",
      "content": "释题..."
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 经书标题 |
| `filename` | string | 文件名（含扩展名） |
| `author` | string | 作者 |
| `category` | string | 分类：prajna/yogacara/chan/mantra/general/biography |
| `chapterCount` | number | 章节数 |
| `totalChars` | number | 总字数（不含空白） |
| `description` | string | 简介（前 200 字） |
| `chapters` | array | 章节列表 |
| `chapters[].title` | string | 章节标题 |
| `chapters[].content` | string | 章节正文 |

### 经书清单 Manifest

文件位置：`public/sutras/manifest.json`

```json
[
  {
    "title": "八识规矩颂释",
    "filename": "《八识规矩颂释》.json",
    "author": "冯达庵",
    "category": "yogacara",
    "chapterCount": 1,
    "totalChars": 23444,
    "description": "《八识规矩颂释》..."
  }
]
```

### 分类说明

| 分类值 | 中文名 | 经书数量 |
|--------|--------|----------|
| `prajna` | 般若部 | 4 |
| `yogacara` | 唯识部 | 2 |
| `chan` | 禅宗部 | 3 |
| `mantra` | 密咒部 | 8 |
| `general` | 佛学通论 | 12 |
| `biography` | 传记 | 1 |

---

## 词典数据

### 单部词典 JSON

文件位置：`public/dicts/{filename}.json`

```json
{
  "name": "中国当代佛教网辞典",
  "version": "1.0",
  "entries": [
    {
      "term": "般若",
      "definition": "梵语 Prajñā 的音译，意为智慧...",
      "pinyin": "bō rě",
      "category": "term"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 词典名称 |
| `version` | string | 版本号 |
| `entries` | array | 词条列表 |
| `entries[].term` | string | 词条名称 |
| `entries[].definition` | string | 释义内容 |
| `entries[].pinyin` | string | 拼音（可选） |
| `entries[].category` | string | 分类：term/name/sanskrit |

### 词典清单 Manifest

文件位置：`public/dicts/manifest.json`

```json
[
  {
    "id": "dict-1",
    "name": "中国当代佛教网辞典",
    "filename": "中国当代佛教网辞典.json",
    "author": "中国当代佛教网",
    "entryCount": 24552,
    "description": "收录佛教基本词汇、人物、寺院、典籍等"
  }
]
```

### 词典列表

| ID | 名称 | 条目数 | 文件大小 |
|----|------|--------|----------|
| dict-1 | 中国当代佛教网辞典 | 24,552 | 16MB |
| dict-2 | 新编佛教辞典（陈兵） | 4,830 | 4.8MB |
| dict-3 | 中华佛教百科全书 | 6,399 | 31MB |

---

## 使用示例

### 加载经书列表

```javascript
const response = await fetch('/sutras/manifest.json')
const sutras = await response.json()
// sutras: [{ title, filename, author, category, ... }]
```

### 加载单部经书

```javascript
const filename = encodeURIComponent('《心经大义要释》.json')
const response = await fetch(`/sutras/${filename}`)
const sutra = await response.json()
// sutra: { title, chapters: [{ title, content }], ... }
```

### 加载词典索引

```javascript
const response = await fetch('/dicts/manifest.json')
const dicts = await response.json()
// dicts: [{ id, name, filename, entryCount, ... }]
```

### 加载单部词典

```javascript
const response = await fetch('/dicts/中国当代佛教网辞典.json')
const dict = await response.json()
// dict: { name, entries: [{ term, definition, ... }] }

// 查找词条
const entry = dict.entries.find(e => e.term === '般若')
```

---

## 数据生成

### 从 TXT 生成经书 JSON

```bash
node scripts/convert-sutras.cjs
```

输入：`temp-sutras/*.txt`
输出：`public/sutras/*.json` + `public/sutras/manifest.json`

### 从 dictionary.json 生成分词典 JSON

```bash
node scripts/convert-dictionary.cjs
```

输入：`archive/v1.0/public/dictionary.json`
输出：`public/dicts/*.json` + `public/dicts/manifest.json`

---

## 注意事项

1. **文件名编码**：中文文件名在 URL 中需要 `encodeURIComponent`
2. **文件大小**：词典 JSON 较大（最大 31MB），建议按需加载
3. **缓存策略**：浏览器会自动缓存静态 JSON，更新数据需清缓存或改文件名
4. **CORS**：`public/` 目录下的文件通过 Vite 静态服务提供，无 CORS 问题
