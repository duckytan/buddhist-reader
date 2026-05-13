# 开发环境搭建指南

> 般若佛经阅读器 v3.0

## 环境要求

- **Node.js**: 18.x 或更高
- **npm**: 9.x 或更高
- **Git**: 任意版本

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/duckytan/buddhist-reader.git
cd buddhist-reader

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
# http://localhost:5173
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 5173） |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint 检查并自动修复 |

## 项目结构

```
├── public/              # 静态资源
│   ├── sutras/          # 经书 JSON 数据
│   ├── dicts/           # 词典 JSON 数据
│   └── lzo-wasm.wasm    # WASM 文件
├── src/                 # 源代码（v3.0 开发中）
├── archive/             # 归档版本
│   ├── v1.0/            # v1.0 源码
│   └── v2.0/            # v2.0 源码
├── docs/                # 文档
├── scripts/             # 转换脚本
└── .monkeycode/         # 项目配置
```

## 开发工作流

### 1. 创建功能分支

```bash
# 从 main 创建分支，格式：YYMMDD-feat-xxx
git checkout -b 260503-feat-add-bookshelf
```

### 2. 开发

- 遵循 Zen 设计系统（`docs/design/ZEN-DESIGN.md`）
- 使用纯手写组件，不引入 UI 组件库
- Store 职责单一，避免交叉

### 3. 提交前检查

```bash
npm run lint
```

### 4. 提交并推送

```bash
git add -A
git commit -m "feat: 添加书架页面"
git push -u origin 260503-feat-add-bookshelf
```

### 5. 合并到 main

```bash
git checkout main
git merge 260503-feat-add-bookshelf
git push
```

## Vite 配置注意事项

- `host: true` — 必须，否则预览平台无法访问
- `allowedHosts: ['.monkeycode-ai.online']` — 预览平台白名单
- `define: { global: 'globalThis' }` — mdict-js 兼容性

## 数据资产

项目已包含以下数据，无需重新生成：

- **30 部经书**: `public/sutras/*.json`
- **3 部词典**: `public/dicts/*.json`（35781 条）
- **原始 TXT**: `temp-sutras/*.txt`

如需重新转换，使用：

```bash
node scripts/convert-sutras.cjs      # TXT → JSON
node scripts/convert-dictionary.cjs  # dictionary.json → 分词典 JSON
```

## 常见问题

### Q: 开发服务器无法外部访问？
A: 检查 `vite.config.js` 中是否有 `host: true` 和 `allowedHosts`。

### Q: 词典数据加载失败？
A: 检查 `public/dicts/` 目录是否存在，且 `manifest.json` 格式正确。

### Q: 如何添加新的经书？
A: 将 TXT 文件放入 `temp-sutras/`，运行 `convert-sutras.cjs`，然后提交。

## 相关文档

- [架构设计](docs/plans/2026-05-03-v3.0-architecture-design.md)
- [禅意设计系统](docs/design/ZEN-DESIGN.md)
- [任务清单](.monkeycode/specs/v3.0/tasklist.md)
- [Agent 指南](AGENTS.md)
