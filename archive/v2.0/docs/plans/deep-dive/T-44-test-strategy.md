# 测试策略 报告

> 任务编号：T-44
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.1 是一个基于 Vue 3 + Vite + Vant 4 的纯前端 Web 应用，核心功能包括词典高亮匹配（Trie 引擎）、MDX 词典解析、IndexedDB 结构化存储、TTS 朗读和功德统计。随着功能复杂度提升（从 v1.0 的硬编码 50 条词典扩展到支持数万条多词典并行），亟需建立分层测试体系保障代码质量。

**测试目标**：
- 保障核心引擎（Trie、高亮、MDX 解析）的正确性和性能
- 保障 IndexedDB 数据层的 CRUD 操作可靠性
- 保障 Service 层接口契约稳定，便于未来切换后端 API
- 保障 UI 组件在移动端/PC 端的渲染一致性
- 建立可持续运行的 CI/CD 测试流水线

## 2. 测试框架选型

| 框架 | 类型 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **Vitest** | 单元测试 | Vite 原生集成，零配置启动；Jest 兼容 API；内置 Chai 断言；TypeScript/ESM 一等支持；instant watch mode；社区活跃（GitHub 2275+ 代码片段，Benchmark 88.25） | 浏览器模式仍在实验阶段 | 纯 JS/TS 逻辑测试（Trie 引擎、工具函数、Service 层 mock 测试） |
| **Vue Test Utils** | 组件测试 | Vue 官方维护；mount/shallowMount 完整生命周期控制；与 Vitest 无缝集成；支持 Pinia/Vue Router 插件注入 | 不渲染真实 DOM（基于 jsdom），部分浏览器行为无法覆盖 | Vue 组件单元/集成测试（组件 props、events、slots、Pinia 集成） |
| **Playwright** | E2E 测试 | 跨浏览器（Chromium/Firefox/WebKit）；auto-wait + web-first assertions；原生组件测试支持（@playwright/experimental-ct-vue）；trace viewer 调试；Benchmark 90.51 | 安装体积较大（需下载浏览器二进制）；学习曲线略高 | 完整用户流程测试（书架 → 阅读 → 词典查询 → 设置） |
| **Cypress** | E2E 测试 | 实时热重载 + 时间旅行调试；庞大的插件生态；Dashboard 服务（付费）；Benchmark 93.7 | 仅支持 Chromium/Firefox（WebKit 有限）；iframe/cross-origin 处理复杂；运行速度慢于 Playwright | 备选方案，若团队已有 Cypress 经验可考虑 |

### 选型结论

| 层级 | 选择 | 理由 |
|------|------|------|
| 单元测试 | **Vitest** | 项目已使用 Vite，Vitest 零配置集成，`@vue/test-utils` 官方文档推荐搭配 |
| 组件测试 | **Vue Test Utils** | Vue 官方方案，与 Vitest 共享断言和 mock 基础设施 |
| E2E 测试 | **Playwright** | 多浏览器覆盖（WebKit 对 iOS  Safari 意义重大），速度优于 Cypress，原生支持 Vue 组件测试 |

## 3. 测试覆盖率目标

| 模块 | 目标覆盖率 | 备注 |
|------|------------|------|
| **核心引擎（engine/）** | **90%** | Trie 树、高亮引擎、拼音标注为项目核心算法，必须高标准覆盖；MDX 解析器需覆盖大/小文件分支 |
| **工具函数（utils/）** | **85%** | TTS 封装、格式化函数等纯函数，边界条件（空输入、特殊字符）需覆盖 |
| **Service 层（services/）** | **80%** | 通过 mock IndexedDB 接口测试业务逻辑，重点测试错误处理和重试机制 |
| **Storage 层（storage/）** | **70%** | IndexedDB 操作较难 mock，重点测试 schema 迁移和异常回滚 |
| **Pinia Stores（stores/）** | **70%** | 状态转换逻辑测试，重点测试复杂 action（如词典开关切换触发 Trie 重建） |
| **UI 组件（components/）** | **60%** | 组件测试以交互逻辑为主，样式和布局由 E2E 覆盖；重点测试词典弹窗、阅读器交互 |
| **页面（pages/）** | **40%** | 页面组件以 E2E 测试为主，单元测试覆盖路由守卫和页面级状态初始化 |
| **整体项目** | **70%** | 综合覆盖率目标，核心模块拉高平均 |

### 覆盖率工具配置

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

使用 `@vitest/coverage-v8` 作为覆盖率提供者（V8 引擎原生支持，比 Istanbul 更精确）。

## 4. 核心模块测试重点

### 4.1 Trie 引擎（最高优先级）

这是整个词典高亮功能的心脏，必须重点测试：

- **TrieNode**：`children` Map 操作、`isEnd` 标记、`dictIds` 数组管理
- **Trie**：
  - `insert(term, dictId)` — 单词条插入、中文/梵文混合词条
  - `build(terms)` — 批量构建、空数组、重复词条
  - `search(text)` — 精确匹配、前缀匹配、长词优先、多位置匹配
  - `destroy()` — 内存释放验证
- **TrieMerger**：
  - 多词典注册/注销
  - `enable/disable` 开关联动
  - `searchAll()` — 跨词典搜索、结果合并
  - `deduplicate()` — 长词优先去重（如 "般若波罗蜜多" 优先于 "般若"）、重叠匹配处理

### 4.2 高亮引擎（highlighter.js）

- 文本分段：正确拆分带高亮标记和不带标记的文本段
- 多词典标记合并：同一位置多词典命中时的渲染优先级
- 特殊字符处理：HTML 实体、梵文转写符号

### 4.3 IndexedDB 存储层

- **Schema 版本管理**：首次创建、版本升级、数据迁移（v1.0 → v2.0）
- **sutraStore**：经书 CRUD、分块加载、load_status 状态机
- **dictStore**：词典索引/释义分离存储、按需加载
- **progressStore**：阅读进度保存/恢复、并发写入
- **fileCache**：MDX 文件缓存、大小判断（< 5MB vs >= 5MB 分支）

### 4.4 Service 层

- **DictService**：词典导入（JSON/CSV/MDX）、开关切换、词条查询、笔记层合并、体检报告生成
- **SutraService**：经书列表、章节按需加载、txt 导入解析
- **ProgressService**：进度保存/获取、多经书并发
- **StatsService**：诵读记录、统计聚合、连续天数计算

### 4.5 Pinia Stores

- **dict store**：词典开关状态切换、Trie 重建触发
- **reader store**：阅读位置管理、TTS 状态同步
- **stats store**：功德数据聚合、日期范围筛选

### 4.6 UI 组件

- **DictionaryPopup**：多词典流式加载、loading 状态、笔记编辑
- **Reader**：经文渲染、高亮渲染、TTS 控制栏
- **DictManager**：词典列表、开关交互、导入上传、体检报告展示
- **Bookshelf**：经书卡片列表、导入经书

### 4.7 E2E 用户流程

| 流程 | 覆盖场景 |
|------|----------|
| 首次访问 | 空书架 → 引导提示 → 导入经书 |
| 阅读体验 | 打开经书 → 滚动阅读 → 点击术语查看释义 → 关闭弹窗 → 继续阅读 |
| 词典管理 | 打开词典管理 → 上传 JSON 词典 → 查看体检报告 → 开关切换 → 返回阅读页验证高亮变化 |
| TTS 朗读 | 打开 TTS → 播放/暂停 → 切换语速 → 关闭 |
| 设置与统计 | 修改设置 → 验证持久化 → 查看功德统计 |
| 多终端适配 | Desktop（1920px）、Tablet（768px）、Mobile（375px）响应式验证 |

## 5. CI/CD 集成

### 5.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=chromium

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
```

### 5.2 测试执行策略

| 触发场景 | 执行范围 |
|----------|----------|
| 本地开发（`npm run dev`） | Vitest watch 模式，仅运行变更文件相关测试 |
| 提交前（pre-commit） | ESLint + 变更文件的单元测试（通过 lint-staged） |
| PR 推送 | 全部单元测试 + 覆盖率 + E2E（仅 Chromium） |
| main 分支合并 | 全部单元测试 + 覆盖率 + E2E（Chromium + Firefox + WebKit） |
| 发布前 | 全量测试 + 性能基准测试（首屏加载 < 1s） |

### 5.3 依赖安装

```bash
# 单元测试 + 组件测试
npm install -D vitest @vitest/coverage-v8 @vue/test-utils jsdom

# E2E 测试
npm install -D @playwright/test

# Playwright 浏览器二进制
npx playwright install --with-deps chromium
```

## 6. 结论与建议

### 推荐测试策略

```
┌─────────────────────────────────────────────┐
│              E2E 测试 (Playwright)            │
│         关键用户流程 + 多浏览器 + 响应式       │
│              覆盖率目标: 40-60%               │
├─────────────────────────────────────────────┤
│         组件测试 (Vue Test Utils)             │
│       组件交互 + Pinia 集成 + 状态管理         │
│              覆盖率目标: 60-70%               │
├─────────────────────────────────────────────┤
│           单元测试 (Vitest)                   │
│     Trie 引擎 + Service 层 + 工具函数         │
│              覆盖率目标: 80-90%               │
└─────────────────────────────────────────────┘
```

### 分阶段实施建议

| Phase | 内容 | 时间 |
|-------|------|------|
| **Phase 1**（基础架构期） | 搭建 Vitest + Vue Test Utils 环境，为核心引擎（Trie、highlighter）编写测试 | 与 Phase 1 开发同步 |
| **Phase 2**（核心功能期） | 为 Service 层和 Storage 层编写测试，建立 mock IndexedDB 方案 | 与 Phase 2 开发同步 |
| **Phase 3**（增强功能期） | 引入 Playwright E2E，覆盖关键用户流程；补充组件测试 | Phase 3 开发完成后 |
| **Phase 4**（优化上线期） | 补齐覆盖率缺口，接入 CI/CD，建立性能基准测试 | Phase 4 期间 |

### 关键原则

1. **核心算法优先**：Trie 引擎和高亮引擎必须有 90%+ 覆盖率，这是项目的核心竞争力
2. **测试驱动 Service 层**：Service 层通过 mock 存储层接口编写测试，保障接口契约稳定
3. **E2E 聚焦用户价值**：E2E 测试不追求覆盖率数字，而是确保核心用户流程不被破坏
4. **渐进式提升**：不要求一次性达到目标，每个 Phase 只对新代码和修改代码编写测试
5. **mock 策略**：单元测试 mock IndexedDB，E2E 测试使用真实 IndexedDB（浏览器环境）

## 7. 对 v2.1 方案的影响

| 影响维度 | 具体内容 |
|----------|----------|
| **package.json** | 需新增 devDependencies：`vitest`、`@vitest/coverage-v8`、`@vue/test-utils`、`jsdom`、`@playwright/test` |
| **npm scripts** | 需新增：`test`（watch 模式）、`test:run`（单次运行）、`test:coverage`（覆盖率报告） |
| **vitest.config.js** | 需新建配置文件，配置 `environment: 'jsdom'`、coverage provider（v8）、alias `@` → `src/`、globals 注入 |
| **目录结构** | 新增 `__tests__/` 目录（与 src/ 平行），或采用 `*.test.js` 内联方式（推荐内联，便于维护） |
| **CI/CD** | 需新增 `.github/workflows/test.yml` GitHub Actions 配置 |
| **开发流程** | 开发者需养成 "改代码 → 写/更新测试 → 跑测试" 的习惯，pre-commit hook 可强制 lint + 单元测试 |
| **构建体积** | 测试依赖仅影响 devDependencies，不影响生产构建体积 |
| **v2.1 开发节奏** | 每个 Phase 需额外预留 15-20% 时间用于编写和维护测试 |
