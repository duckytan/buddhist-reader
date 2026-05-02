# 动态加载 TXT 经文指南

## 功能说明

应用现在支持从 TXT 文件动态加载经文，无需将经文内容硬编码在代码中。这样您可以轻松添加新的经文，只需将 TXT 文件放置到指定位置即可。

## 使用方法

### 1. 准备 TXT 文件

将经文 TXT 文件放置到 `public/sutras/` 目录下：

```
public/
└── sutras/
    ├── xin-jing.txt
    ├── di-zang-jing-chapter1.txt
    ├── a-mi-tuo-jing.txt
    └── jin-gang-jing-chapter1.txt
```

**TXT 文件格式：**
- 纯文本格式，UTF-8 编码
- 段落之间用空行分隔
- 不需要特殊标记或格式

示例 `xin-jing.txt`：
```
观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。

舍利子，色不异空，空不异色，色即是空，空即是色，受想行识，亦复如是。
```

### 2. 配置经文

在 `src/pages/Reader.vue` 中的 `dynamicSutraConfigs` 对象添加经文配置：

```javascript
const dynamicSutraConfigs = {
  'xin-jing-dynamic': {
    id: 'xin-jing-dynamic',
    title: '心经 (动态)',
    fullName: '《般若波罗蜜多心经》',
    translator: '唐三藏法师玄奘译',
    cover: '📖',
    description: '般若经类中最短的一部，共260字，是大乘佛教的核心经典之一',
    wordCount: 260,
    chapters: [{ title: '全文', url: '/sutras/xin-jing.txt' }]
  }
}
```

### 3. 访问经文

通过 URL 访问动态经文：
```
http://localhost:5173/reader/xin-jing-dynamic
```

## 配置参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 经文唯一标识符 |
| `title` | string | 是 | 简短标题 |
| `fullName` | string | 是 | 完整标题 |
| `translator` | string | 是 | 译者 |
| `cover` | string | 是 | 封面 emoji |
| `description` | string | 是 | 描述 |
| `wordCount` | number | 是 | 字数 |
| `chapters` | array | 是 | 章节数组 |

## 章节配置

每个经文可以有多个章节：

```javascript
chapters: [
  {
    title: '第一品：忉利天宫神通品第一',
    url: '/sutras/di-zang-jing-chapter1.txt'
  },
  {
    title: '第二品：分身集会品第二',
    url: '/sutras/di-zang-jing-chapter2.txt'
  }
]
```

## 远程经文加载

也支持从远程 URL 加载经文：

```javascript
{
  id: 'remote-sutra',
  title: '远程经文',
  fullName: '《远程佛经》',
  translator: '译者',
  cover: '📖',
  description: '从远程服务器加载',
  wordCount: 1000,
  chapters: [
    {
      title: '全文',
      url: 'https://example.com/sutras/remote.txt'
    }
  ]
}
```

## 工具函数

项目提供了以下工具函数（位于 `src/utils/sutra-loader.js`）：

### `loadSutraFromUrl(url)`
从 URL 加载 TXT 经文

```javascript
import { loadSutraFromUrl } from '@/utils/sutra-loader'

const text = await loadSutraFromUrl('/sutras/xin-jing.txt')
```

### `loadSutraChapter(url, chapterTitle)`
加载经文并格式化为章节内容

```javascript
import { loadSutraChapter } from '@/utils/sutra-loader'

const chapter = await loadSutraChapter('/sutras/xin-jing.txt', '全文')
// { title: '全文', content: '经文内容...' }
```

### `loadMultiChapterSutra(chapters)`
批量加载多章节经文

```javascript
import { loadMultiChapterSutra } from '@/utils/sutra-loader'

const chapters = await loadMultiChapterSutra([
  { title: '第一章', url: '/chapter1.txt' },
  { title: '第二章', url: '/chapter2.txt' }
])
```

### `createDynamicSutra(sutraInfo)`
创建动态经文对象（最常用）

```javascript
import { createDynamicSutra } from '@/utils/sutra-loader'

const sutra = await createDynamicSutra({
  id: 'xin-jing',
  title: '心经',
  fullName: '《般若波罗蜜多心经》',
  translator: '唐三藏法师玄奘译',
  cover: '📖',
  description: '描述',
  wordCount: 260,
  chapters: [{ title: '全文', url: '/sutras/xin-jing.txt' }]
})
```

## 示例配置文件

参考 `src/data/sutras-config.js` 查看完整的配置示例。

## 注意事项

1. **文件路径**：本地文件路径以 `/` 开头，相对于 `public` 目录
2. **编码格式**：TXT 文件必须使用 UTF-8 编码
3. **CORS 限制**：远程 URL 需要支持 CORS 或配置代理
4. **错误处理**：如果文件加载失败，会显示错误信息和重试按钮

## 高级用法

### 从后端 API 获取经文列表

```javascript
const fetchSutraList = async () => {
  const response = await fetch('/api/sutras')
  const sutras = await response.json()
  return sutras
}
```

### 支持用户上传 TXT 文件

```javascript
const handleFileUpload = async (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    // 处理经文内容
  }
  reader.readAsText(file)
}
```

## 故障排查

### 加载失败
- 检查文件路径是否正确
- 确认文件已放置在 `public/sutras/` 目录
- 查看浏览器控制台的错误信息

### 中文乱码
- 确认 TXT 文件使用 UTF-8 编码保存
- 使用编辑器（如 VS Code）转换文件编码

### 远程文件无法加载
- 检查 URL 是否正确
- 确认服务器支持 CORS
- 考虑使用代理服务器
