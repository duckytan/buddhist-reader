# v3.1.0 归档（2026-09-29）

## 为什么归档

原作者决定**放弃在 v3.1.0 基础上继续迭代，改为重写**。归档目的有两个：

1. **保留历史**：v3.1.0 是最后一个在 Vercel 上运行过的版本，保留其完整源码以便追溯
2. **作为重写的行为参考**：新版本的开发需要对照旧实现的真实行为（而非文档描述），尤其是那些"试错才试出来"的隐性规则

## 包含内容

```
archive/v3.1.0/
├── src/            # 完整源码（35 文件，约 3979 行，不含 src/data/dictIndex.js 时）
├── index.html      # 入口快照
├── package.json    # 依赖快照（Vue 3.4 / Vite 5 / Pinia 2 / Vue Router 4）
└── vite.config.js  # 构建配置快照
```

**注意**：`src/data/dictIndex.js`（20.8MB）是**构建产物**，由 `scripts/build-dict-index.cjs` 从 `public/dicts/manifest.json` 生成。归档中保留了该文件以反映当时的完整状态，但它**随时可由脚本重建**。

## 如何重建旧版本（如需对照运行）

```bash
# 依赖版本见本目录 package.json
npm install

# 重建词典索引（必须，否则启动报错）
node scripts/build-dict-index.cjs

# 启动
npm run dev
```

## 已知问题（重写时必须避免重蹈）

归档版本存在以下已确认问题，详见 `docs/refactor/` 下的分析文档：

| 问题 | 严重度 | 证据 |
|------|--------|------|
| 20.8MB 词典数据静态内联进 JS bundle，其中 19.4MB 是截断到 300 字的释义副本 | P0 | `src/data/dictIndex.js`、`scripts/build-dict-index.cjs:39` |
| 释义被截断导致词典弹窗展示不完整（功能性回归） | P0 | 同上 |
| `public/dict-chunks`(48MB) + `dict-defs`(19MB) 零引用，纯死资产 | P0 | 全仓 grep 无运行时引用 |
| `ReaderContent.vue:189-249` 手工 TreeWalker 数字符定位，61 行、8 条调试日志 | P1 | 见代码质量审计 |
| `ReaderSearch.vue:110-120` 手写 escapeHtml + `v-html`，XSS 面 | P1 | 全仓唯一 v-html |
| `DictManager.vue` 整页孤儿，未接入路由 | P2 | `src/router/index.js` |
| 书签只写不读、阅读时长只采集不展示、笔记跳转不定位段落 | P2 | 功能全景地图 |
| 52 处 `console.log` 生产残留 | P3 | 全仓 |

## 相关分析文档

本归档是 2026-09-29 深度分析的产物，完整分析见：

| 文档 | 内容 |
|------|------|
| `docs/refactor/2026-09-29-feature-inventory.md` | 功能全景地图（55 个功能点，含「文档有但代码没有」的落差清单） |
| `docs/refactor/2026-09-29-architecture-diagnosis.md` | 架构诊断（技术债 27 条，P0×4 / P1×9 / P2×8 / P3×6） |
| `docs/refactor/2026-09-29-code-quality-audit.md` | 逐文件代码质量审计（均分 3.22/5） |
| `docs/refactor/2026-09-29-code-rot-assessment.md` | 代码级腐化度评估（处置分布：保留 36% / 重构 59% / 重写 5%） |
| `docs/refactor/2026-09-29-refactor-vs-rewrite-decision.md` | 升级改造 vs 从零重建决策论证 |
| `docs/refactor/2026-09-29-rewrite-cost-inventory.md` | 重建成本盘点（功能侧 ≈43 人天净重做） |
| `docs/refactor/2026-09-29-rewrite-feasibility.md` | 全量重写可行性重估（A/B1/B2 三方案对比） |
| `docs/refactor/2026-09-29-implicit-knowledge-handover.md` | **隐性知识继承清单（28 条，重写的行为规格与验收基准）** |
