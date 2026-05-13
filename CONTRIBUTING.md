# 贡献指南

> 般若佛经阅读器

感谢你的贡献！以下是参与项目开发的指南。

## 开发流程

### 1. Fork & Clone

```bash
git clone https://github.com/duckytan/buddhist-reader.git
cd buddhist-reader
```

### 2. 创建分支

```bash
git checkout -b YYMMDD-feat-xxx
```

分支命名规范：
- `YYMMDD-feat-xxx` — 新功能
- `YYMMDD-fix-xxx` — 修复
- `YYMMDD-docs-xxx` — 文档
- `YYMMDD-refactor-xxx` — 重构

### 3. 开发

- 遵循 [Zen 设计系统](docs/design/ZEN-DESIGN.md)
- 使用纯手写组件，不引入 UI 组件库
- Store 职责单一，避免交叉
- 代码提交前运行 `npm run lint`

### 4. 提交

```bash
git add -A
git commit -m "feat: 添加书架页面"
git push -u origin YYMMDD-feat-xxx
```

提交信息格式：
```
<type>(<scope>): <subject>

<body>
```

类型：
- `feat` — 新功能
- `fix` — 修复
- `docs` — 文档
- `style` — 格式
- `refactor` — 重构
- `chore` — 构建/工具

### 5. Pull Request

- 描述清楚改动内容
- 关联相关 Issue
- 确保 CI 通过

## 代码规范

### Vue 组件

```vue
<template>
  <div class="component-name">
    <!-- 模板 -->
  </div>
</template>

<script setup>
// Composition API
import { ref, computed } from 'vue'

const props = defineProps({
  title: String
})

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<style scoped>
.component-name {
  /* 样式 */
}
</style>
```

### JavaScript

- 使用 ES6+ 语法
- 优先使用 `const`，必要时用 `let`
- 函数使用箭头函数
- 异步使用 `async/await`

### CSS

- 使用 CSS 变量（`var(--xxx)`）
- 颜色引用设计 tokens
- 移动端优先（`min-width` 媒体查询）

## 目录结构

```
src/
├── components/     # 可复用组件
├── pages/          # 页面组件
├── stores/         # Pinia Store
├── composables/    # 可复用逻辑
├── utils/          # 工具函数
└── styles/         # 全局样式
```

## 测试

（待补充测试框架）

## 文档

- 修改代码时同步更新相关文档
- 新功能需要更新 `docs/API.md`
- 问题排查更新 `docs/TROUBLESHOOTING.md`

## 数据贡献

### 添加经书

1. 准备 TXT 格式原文
2. 放入 `temp-sutras/`
3. 运行 `node scripts/convert-sutras.cjs`
4. 提交并推送

### 添加词典

1. 准备 JSON 格式词典数据
2. 放入 `public/dicts/`
3. 更新 `public/dicts/manifest.json`
4. 提交并推送

## 行为准则

- 尊重他人，友善交流
- 专注技术讨论，避免宗教争论
- 保护版权，不传播未经授权的经文

## 联系方式

- Issue: https://github.com/duckytan/buddhist-reader/issues
- Email: （待补充）
