# 动态加载 TXT 经文功能

## 快速开始

### 1. 添加 TXT 文件
将经文 TXT 文件放到 `public/sutras/` 目录下：

```
public/sutras/
└── your-sutra.txt
```

### 2. 在 Reader.vue 配置经文

```javascript
const dynamicSutraConfigs = {
  'your-sutra-id': {
    id: 'your-sutra-id',
    title: '经文标题',
    fullName: '《经文全名》',
    translator: '译者',
    cover: '📖',
    description: '描述',
    wordCount: 1000,
    chapters: [{ title: '全文', url: '/sutras/your-sutra.txt' }]
  }
}
```

### 3. 访问经文

```
http://localhost:5173/reader/your-sutra-id
```

## 示例

已包含示例：
- `public/sutras/xin-jing.txt` - 心经示例

## 详细文档

完整使用指南请查看：[docs/DYNAMIC_SUTRA_LOADING.md](./DYNAMIC_SUTRA_LOADING.md)

## 功能特性

✅ 从本地 TXT 文件加载
✅ 支持多章节经文
✅ 支持远程 URL 加载
✅ 加载状态和错误处理
✅ 可扩展的工具函数

## 工具函数

位于 `src/utils/sutra-loader.js`：

- `loadSutraFromUrl(url)` - 从 URL 加载经文
- `loadSutraChapter(url, title)` - 加载并格式化章节
- `loadMultiChapterSutra(chapters)` - 批量加载多章节
- `createDynamicSutra(sutraInfo)` - 创建完整经文对象
