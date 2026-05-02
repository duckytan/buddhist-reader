# 功德统计页面 分析报告

> 任务编号：T-23
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 需要在 v1.0 基础上新增功德统计功能，为修行者提供可视化的诵读数据展示。v1.0 中统计功能极为简单，仅通过 localStorage 存储阅读次数，无可视化展示，无趋势分析。

v2.0 的功德统计需要满足以下目标：
- 多维度展示诵读数据（天/周/月/年），帮助修行者了解自身修习进度
- 计算并展示连续诵读天数，激励持续修行
- 提供轻量级可视化图表，符合移动端优先的禅意 UI 风格
- 支持数据导出备份，与 T-24 设置页面的导出功能协同
- 数据存储于 IndexedDB `reading_stats` 表（v2.0 方案已定义表结构）

核心原则：**简单、专注、不打扰**——统计页面不追求复杂的商业分析仪表板风格，而是以禅意极简方式呈现修行者的功德进度。

## 2. 统计维度

| 维度 | 展示内容 | 计算方式 |
|------|----------|----------|
| 按天 | 每日诵读次数、总时长、诵读经书数 | 从 `reading_stats` 表按 `date` 字段 GROUP BY，聚合 `count`（次数）、`duration`（秒数）、去重 `sutra_id`（经书数） |
| 按周 | 每周诵读次数趋势、总时长 | 按 ISO 周号分组（周一到周日），将 7 天的统计数据累加，展示柱状图趋势 |
| 按月 | 月度诵读总量对比、日均时长 | 按 `YYYY-MM` 分组，计算当月总次数、总时长、日均诵读时长（总时长/当月天数） |
| 按年 | 年度趋势、累计功德 | 按年份分组，展示逐年变化趋势（折线图），计算生涯累计诵读次数和总时长 |

### 2.1 聚合粒度与数据模型

IndexedDB `reading_stats` 表以"每日每部经书"为粒度存储：

```
Table: reading_stats
┌────────────────────────────┬────────────┬────────────┬────────┬──────────┐
│ id (PK)                    │ sutra_id   │ date       │ count  │ duration │
├────────────────────────────┼────────────┼────────────┼────────┼──────────┤
│ stats::xin-jing::2026-05-02│ xin-jing   │ 2026-05-02 │ 3      │ 900      │
│ stats::jin-gang::2026-05-02│ jin-gang   │ 2026-05-02 │ 1      │ 1800     │
└────────────────────────────┴────────────┴────────────┴────────┴──────────┘
```

**各维度计算逻辑**：

```javascript
// StatsService 聚合方法

// 按天：直接查询指定日期范围
async function getDailyStats(startDate, endDate) {
  // 返回 [{ date, count, duration, sutraCount }]
  // 缺失日期填充 count=0, duration=0（保持连续性）
}

// 按周：按 ISO 周号聚合
async function getWeeklyStats(weeks) {
  // weeks=12 表示最近 12 周
  // 按 date → weekOfYear 映射，累加 count 和 duration
  // 返回 [{ weekLabel, count, duration, sutraCount }]
}

// 按月：按月份聚合
async function getMonthlyStats(months) {
  // months=12 表示最近 12 个月
  // 按 YYYY-MM 分组
  // 返回 [{ monthLabel, count, duration, sutraCount, dailyAvg }]
}

// 按年：按年份聚合
async function getYearlyStats() {
  // 从有数据的第一年到当前年
  // 返回 [{ year, count, duration, sutraCount, cumulativeCount }]
}
```

### 2.2 默认展示范围

| 维度 | 默认范围 | 可扩展范围 |
|------|----------|------------|
| 按天 | 最近 7 天 | 最近 30 天 |
| 按周 | 最近 4 周 | 最近 12 周 |
| 按月 | 最近 6 个月 | 最近 12 个月 |
| 按年 | 全部年份 | — |

## 3. 图表库选型

### 3.1 候选库对比

| 库 | 包大小 (gzip) | 移动端 | 图表类型 | Vue 集成 | 适用性 |
|----|---------------|--------|----------|----------|--------|
| **Chart.js** | ~60KB | 优秀，原生 Canvas，触控响应好 | 折线图、柱状图、饼图、雷达图等 | vue-chartjs，Tree-shaking 友好 | **推荐** |
| ECharts | ~300KB (全量) / ~100KB (按需) | 良好，ZRender Canvas 引擎 | 全部图表类型，地图、关系图等 | vue-echarts | 过重 |
| ApexCharts | ~50KB | 良好，SVG 渲染 | 折线图、柱状图、饼图等 | vue3-apexcharts | 可选 |
| lightweight-charts | ~20KB | 良好，Canvas | 仅金融类（K 线、面积图） | 手动封装 | 不适用 |
| 纯 CSS 柱状图 | 0KB | 优秀 | 简单柱状图 | 原生 Vue | 补充方案 |

### 3.2 选型决策

**推荐：Chart.js（按需引入） + 纯 CSS 柱状图（轻量场景）**

理由如下：

1. **包大小合理**：Chart.js 支持 Tree-shaking，仅引入需要的图表类型（折线图 + 柱状图 + 饼图）后，实际增加约 30-40KB（gzip），远小于 ECharts 的全量引入。

2. **移动端优化好**：Chart.js 原生 Canvas 渲染，对移动端触控缩放、滑动响应有良好支持，且 v4.x 版本默认响应式。

3. **图表类型覆盖需求**：功德统计只需要折线图（趋势）、柱状图（日/周/月分布）、饼图/环形图（经书占比），Chart.js 完全满足。

4. **禅意风格适配**：Chart.js 的样式配置灵活，可以通过 CSS 变量控制颜色、字体，与项目的禅意 UI 风格统一。

5. **ECharts 过重**：ECharts 虽然功能强大，但对于简单的诵读统计来说属于"杀鸡用牛刀"，且包体积是 Chart.js 的 5-8 倍，不符合项目"轻量"原则。

6. **纯 CSS 补充**：对于简单的"最近 7 天柱状图"场景，可以用纯 CSS 实现，零依赖，加载更快。

### 3.3 Chart.js 按需引入方案

```javascript
// 仅引入需要的模块，控制包大小
import {
  Chart,
  LineController,  // 折线图（年度趋势）
  BarController,   // 柱状图（日/周/月统计）
  DoughnutController, // 环形图（经书占比）
  CategoryScale,   // 分类轴
  LinearScale,     // 数值轴
  TimeScale,       // 时间轴
  PointElement,    // 数据点
  LineElement,     // 线元素
  BarElement,      // 柱状图元素
  ArcElement,      // 弧形元素（环形图）
  Tooltip,         // 悬浮提示
  Legend,          // 图例
} from 'chart.js'

Chart.register(
  LineController, BarController, DoughnutController,
  CategoryScale, LinearScale, TimeScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend
)
```

### 3.4 纯 CSS 柱状图方案（最近 7 天快捷展示）

```css
/* 7 天柱状图 - 纯 CSS 实现 */
.weekly-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 80px;
  padding: 0 16px;
}

.weekly-bar {
  flex: 1;
  background: var(--color-primary);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.weekly-bar-label {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
```

这种方案适合首页快捷卡片，展示最近 7 天的诵读柱状图，无需加载任何图表库。

## 4. 连续诵读天数

### 4.1 算法设计

连续诵读天数（Streak）的计算逻辑：从**今天**往前数，连续有诵读记录的天数。

```javascript
/**
 * 计算连续诵读天数
 * @param {string[]} dates - 已排序的诵读日期数组 ['2026-05-02', '2026-05-01', '2026-04-30', ...]
 * @returns {number} 连续天数
 */
function calculateStreak(dates) {
  if (!dates || dates.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 检查今天是否有诵读记录
  const todayStr = formatDate(today)
  const hasToday = dates.includes(todayStr)

  if (!hasToday) {
    // 今天没有诵读，检查昨天是否有
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)

    if (!dates.includes(yesterdayStr)) {
      return 0 // 昨天也没有，连续天数为 0
    }

    // 从昨天开始往前数
    let streak = 1
    let currentDate = new Date(yesterday)

    for (let i = 1; i < dates.length; i++) {
      currentDate.setDate(currentDate.getDate() - 1)
      const dateStr = formatDate(currentDate)
      if (dates.includes(dateStr)) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  // 今天有诵读，从今天开始往前数
  let streak = 1
  let currentDate = new Date(today)

  for (let i = 1; i < dates.length; i++) {
    currentDate.setDate(currentDate.getDate() - 1)
    const dateStr = formatDate(currentDate)
    if (dates.includes(dateStr)) {
      streak++
    } else {
      break
    }
    }
  return streak
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}
```

### 4.2 边界情况处理

| 场景 | 结果 | 说明 |
|------|------|------|
| 从未诵读 | 0 天 | 无数据 |
| 今天首次诵读 | 1 天 | 今天有记录，昨天无 |
| 今天 + 昨天 + 前天 | 3 天 | 连续 3 天 |
| 今天无，昨天有，前天有 | 2 天 | 从今天往前断了一天，回退到昨天开始算 |
| 今天无，昨天无 | 0 天 | 断流超过 1 天 |
| 跨月/跨年连续 | 正常计算 | 日期计算不受月/年边界影响 |

### 4.3 展示设计

```
┌──────────────────────────────────────┐
│                                      │
│    🔥 连续诵读 12 天                  │
│                                      │
│  上次中断: 2026-04-20                 │
│  最长记录: 30 天 (2026-01-15)         │
│                                      │
│  一 二 三 四 五 六 日                 │
│  ● ● ● ● ○ ○ ●                       │
│  ← 最近 7 天（● 有诵读，○ 无）        │
│                                      │
└──────────────────────────────────────┘
```

- 连续天数用较大字体突出展示，配以火焰 icon（禅意风格可用莲花 icon 替代）
- 展示"最长连续记录"作为历史最佳，激励用户超越
- 最近 7 天用圆点可视化，直观看到连续情况

### 4.4 性能优化

连续天数计算的数据量很小（只需日期列表，不需要详细诵读记录），优化策略：

1. **预计算 + 缓存**：每次记录诵读时更新 `streak` 缓存值，避免每次进入页面都重新计算
2. **IndexedDB 索引**：在 `reading_stats` 表的 `date` 字段上建立索引，快速查询有记录的日期

```javascript
// 在 StatsService 中维护 streak 缓存
async function updateStreakOnRecord(date) {
  const allDates = await getAllReadingDates()
  const streak = calculateStreak(allDates)
  await db.put('settings', { key: 'stats.streak', value: streak })
  await db.put('settings', { key: 'stats.lastReadDate', value: date })
}
```

## 5. 功德排行榜

### 5.1 功能定位

功德排行榜是一个**可选的远期功能**，涉及用户间的比较与竞争机制。鉴于项目"简单、专注、不打扰"的核心理念，排行榜在 v2.0 中**不实现**，但预留设计。

### 5.2 设计考虑

如果未来引入排行榜功能，需要解决以下问题：

| 问题 | 挑战 | 可能方案 |
|------|------|----------|
| 纯前端限制 | 当前所有数据在本地 IndexedDB，无法跨用户比较 | 需要后端 API 支持 |
| 隐私保护 | 修行者可能不希望公开诵读数据 | 匿名排行、昵称排行、自愿加入 |
| 排行维度 | 按次数？按时长？按连续天数？ | 多维度排行，用户可选 |
| 反作弊 | 如何防止虚假刷数据 | 后端校验、合理上限 |

### 5.3 v2.0 替代方案：个人里程碑

不引入用户间排行，改为**个人里程碑系统**，更符合修行理念：

| 里程碑 | 触发条件 | 展示 |
|--------|----------|------|
| 初发心 | 首次诵读 | "今日开启修行之路" |
| 持之以恒 | 连续 7 天 | "连续诵读一周，精进不懈" |
| 精进修行 | 连续 30 天 | "一月精进，功德日增" |
| 百日筑基 | 累计诵读 100 天 | "百日筑基，功德圆满" |
| 千遍诵读 | 累计诵读 1000 次 | "千遍诵读，智慧增长" |
| 万卷经书 | 累计诵读时长 10000 分钟 | "万时修行，福慧双修" |

里程碑数据同样存储在 IndexedDB 中：

```
Table: milestones
┌──────────────────┬─────────────────┬────────────┬──────────┐
│ id (PK)          │ milestone_id    │ achieved   │ sutra_id │
├──────────────────┼─────────────────┼────────────┼──────────┤
│ milestone::001   │ first-read      │ 2026-05-02 │ xin-jing │
│ milestone::002   │ streak-7        │ 2026-05-08 │ —        │
└──────────────────┴─────────────────┴────────────┴──────────┘
```

## 6. 数据导出

### 6.1 导出范围

功德统计数据纳入 T-24 设置页面"阅读数据导出"的范围：

```json
{
  "version": "2.0.0",
  "exportedAt": "2026-05-02T10:00:00Z",
  "data": {
    "readingStats": [
      {
        "sutraId": "xin-jing",
        "date": "2026-05-02",
        "count": 3,
        "duration": 900
      },
      {
        "sutraId": "jin-gang-jing",
        "date": "2026-05-02",
        "count": 1,
        "duration": 1800
      }
    ],
    "milestones": [
      {
        "milestoneId": "first-read",
        "achieved": "2026-05-02",
        "sutraId": "xin-jing"
      }
    ]
  }
}
```

### 6.2 CSV 导出（可选）

为方便用户在 Excel 等工具中分析，提供 CSV 格式导出：

```csv
日期,经书,诵读次数,诵读时长(秒),诵读时长(分钟)
2026-05-02,心经,3,900,15
2026-05-02,金刚经,1,1800,30
2026-05-01,心经,2,600,10
```

CSV 导出通过纯前端实现，无需额外依赖：

```javascript
function exportStatsAsCSV(stats) {
  const BOM = '\uFEFF' // UTF-8 BOM，Excel 正确识别中文
  const headers = '日期,经书,诵读次数,诵读时长(秒),诵读时长(分钟)\n'
  const rows = stats.map(s =>
    `${s.date},${s.sutraTitle},${s.count},${s.duration},${Math.round(s.duration / 60)}`
  ).join('\n')

  const csv = BOM + headers + rows
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `功德统计-${formatDate(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

### 6.3 导出入口

功德统计页面提供两个导出入口：

1. **统计页面顶部导出按钮**：仅导出功德统计数据（CSV 格式）
2. **设置页面"导出备份"**：全量数据导出（JSON 格式，包含统计数据）

```
┌──────────────────────────────────────┐
│  <  功德统计              [导出 CSV] │
├──────────────────────────────────────┤
│                                      │
```

## 7. 结论与建议

### 7.1 功德统计方案总结

| 项目 | 推荐方案 | 理由 |
|------|----------|------|
| 图表库 | Chart.js（按需引入） + 纯 CSS 柱状图 | 包大小可控（30-40KB gzip），移动端优化好，满足需求 |
| 统计维度 | 天/周/月/年 四个维度 | 覆盖日常修习分析的各个粒度 |
| 连续天数 | 从今天/昨天往前倒推算法 | 简单可靠，考虑了"今天还没读"的边界情况 |
| 排行榜 | v2.0 不实现，改用个人里程碑 | 更符合修行理念，纯前端可实现 |
| 数据导出 | CSV（统计页）+ JSON（设置页） | 满足不同使用场景 |

### 7.2 页面布局建议（移动端）

```
┌──────────────────────────────────────┐
│  <  功德统计              [导出 CSV] │
├──────────────────────────────────────┤
│                                      │
│  ── 功德概览 ──────────────────────   │
│                                      │
│  累计诵读    128 次                   │
│  累计时长    64 小时                  │
│  诵读经书    5 部                     │
│                                      │
│  ── 连续诵读 ──────────────────────   │
│                                      │
│    🪷 连续 12 天                      │
│    最长记录: 30 天                    │
│    ● ● ● ● ○ ○ ●  (最近 7 天)        │
│                                      │
│  ── 最近 7 天 ─────────────────────   │
│                                      │
│  [纯 CSS 柱状图]                      │
│  周一 周二 周三 周四 周五 周六 周日   │
│                                      │
│  ── 统计维度 ──────────────────────   │
│                                      │
│  [天] [周] [月] [年]   ← Tab 切换    │
│  [Chart.js 折线图/柱状图]             │
│                                      │
│  ── 经书占比 ─────────────────────   │
│                                      │
│  [Chart.js 环形图]                    │
│  心经 45%  金刚经 30%  阿弥陀经 25%  │
│                                      │
│  ── 个人里程碑 ────────────────────   │
│                                      │
│  ✅ 初发心     2026-01-15             │
│  ✅ 连续 7 天  2026-01-22             │
│  ✅ 连续 30 天 2026-02-14             │
│  ⬜ 百日筑基   0/100 天               │
│  ⬜ 千遍诵读   128/1000 次            │
│                                      │
└──────────────────────────────────────┘
```

### 7.3 组件拆分建议

```
src/components/stats/
├── StatsOverview.vue         # 功德概览卡片（累计次数、时长、经书数）
├── StreakDisplay.vue         # 连续诵读展示（天数 + 7 天圆点）
├── WeeklyBars.vue            # 纯 CSS 7 天柱状图
├── StatsChart.vue            # Chart.js 图表封装（折线/柱状）
├── SutraPieChart.vue         # Chart.js 环形图（经书占比）
├── MilestoneList.vue         # 个人里程碑列表
└── StatsExportButton.vue     # CSV 导出按钮
```

### 7.4 优先级建议

| 优先级 | 功能 | 理由 |
|--------|------|------|
| **P0** | StatsService + IndexedDB 查询 | 数据基础 |
| **P0** | 功德概览（累计次数、时长、经书数） | 统计页面核心信息 |
| **P0** | 连续诵读天数计算 + 展示 | 核心激励功能 |
| **P0** | 按天维度展示（纯 CSS 柱状图） | 最高频使用场景 |
| **P1** | Chart.js 集成 + 周/月/年维度 | 丰富分析维度 |
| **P1** | 经书占比环形图 | 了解诵读偏好 |
| **P1** | CSV 导出 | 数据备份 |
| **P2** | 个人里程碑 | 增强激励机制 |
| **P3** | 排行榜（需后端） | 远期功能 |

## 8. 对 v2.1 方案的影响

本分析结果对 v2.1 及后续方案的具体影响：

1. **新增 Chart.js 依赖**：需要在 `package.json` 中添加 `chart.js` 和 `vue-chartjs`，并在 Vite 配置中按需引入以控制包大小。建议通过动态导入（`import()`）实现路由级代码分割，仅在访问统计页面时加载图表库。

2. **新增 Pinia stats store**：v2.0 方案中已有 `stores/stats.js` 预留，需要实现完整的状态管理，包括：统计维度切换（day/week/month/year）、图表数据缓存、连续天数缓存。

3. **新增 StatsService**：在 `services/statsService.js` 中实现聚合查询逻辑，包括 `recordSession()`、`getDailyStats()`、`getWeeklyStats()`、`getMonthlyStats()`、`getYearlyStats()`、`getStreak()`、`getSutraDistribution()`。

4. **Stats.vue 页面组件**：新增统计页面路由 `#/stats`，按上述布局实现。使用 Vant 的 Tab 组件切换统计维度，Vant Cell 展示概览数据。

5. **IndexedDB reading_stats 表增强**：v2.0 方案中该表已定义，需要在 `db.js` 初始化时确保 `date` 字段有索引（index），支持按日期范围快速查询。

6. **阅读页触发记录**：Reader.vue 在用户关闭阅读页面或暂停阅读时，需要调用 `statsService.recordSession(sutraId, duration)` 记录本次诵读数据。需要合理的节流策略，避免频繁写入。

7. **里程碑系统预留**：在 IndexedDB 中新增 `milestones` 表，或在 `settings` 表中以 key-value 形式存储里程碑达成状态。里程碑的触发检测应在每次 `recordSession` 后执行。

8. **CSV 导出工具函数**：在 `utils/export.js` 中新增 `exportStatsAsCSV()` 函数，处理 UTF-8 BOM 和中文编码，确保 Excel 正确显示。

9. **禅意主题色适配图表**：Chart.js 的全局默认配置需要与项目的禅意风格统一，包括：主色调（暖色系）、背景色（浅米色/白色）、字体（宋体/楷体）、网格线颜色（淡灰色）。建议在 StatsChart.vue 中统一配置。

10. **无障碍考虑**：图表数据需要提供文本替代方案（如表格形式的数据展示），方便屏幕阅读器用户获取统计信息。可在图表下方放置可展开的数据表格。

---

*文档版本: v1.0*
*最后更新: 2026-05-02*
