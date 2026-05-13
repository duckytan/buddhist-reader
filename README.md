# 般若佛经阅读器

> 禅意极简风格的佛经阅读与词典查询 Web 应用

[![GitHub stars](https://img.shields.io/github/stars/duckytan/buddhist-reader)](https://github.com/duckytan/buddhist-reader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 核心特性

| 特性 | 说明 |
|------|------|
| **禅意设计** | 宣纸色背景、墨色文字、檀木色强调，零阴影哲学 |
| **点击即查** | 经文中术语自动高亮，点击即显示释义 |
| **长按选词** | 长按任意文字可选中查释义 |
| **多词典并行** | 3 部佛教词典同时查询，先返回先显示 |
| **小说阅读体验** | 连续滚动、字体/主题可调、书签进度 |
| **完全离线** | 所有数据本地存储，无需网络 |

## 在线预览

**https://5173-310948cd4c1c6a73.monkeycode-ai.online**

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/duckytan/buddhist-reader.git
cd buddhist-reader

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开 http://localhost:5173
```

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Vue 3 + Composition API |
| 构建 | Vite 5 |
| UI | 纯手写组件 |
| 状态 | Pinia |
| 路由 | Vue Router 4 |
| 存储 | localStorage |

## 项目结构

```
├── public/              # 静态资源
│   ├── sutras/          # 30 部经书 JSON
│   └── dicts/           # 3 部词典 JSON
├── src/                 # 源代码（v3.0 开发中）
├── docs/                # 文档
├── scripts/             # 转换脚本
└── archive/             # 归档版本
```

## 文档

| 文档 | 说明 |
|------|------|
| [架构设计](docs/plans/2026-05-03-v3.0-architecture-design.md) | v3.0 技术方案 |
| [开发指南](docs/DEVELOPMENT.md) | 环境搭建与开发流程 |
| [API 文档](docs/API.md) | 数据格式规范 |
| [问题排查](docs/TROUBLESHOOTING.md) | 常见问题解决 |
| [迁移指南](docs/v3.0-migration-guide.md) | v2.0 → v3.0 |
| [禅意设计](docs/design/ZEN-DESIGN.md) | 设计系统规范 |
| [贡献指南](CONTRIBUTING.md) | 参与项目开发 |
| [变更日志](CHANGELOG.md) | 版本历史 |

## 数据资产

- **30 部经书**：唐密系列，578K 字
- **3 部词典**：35781 条佛教术语

## 版权说明

本应用仅供个人学习研究使用。经文内容版权归原作者或相关出版社所有。

## License

[MIT](LICENSE)
