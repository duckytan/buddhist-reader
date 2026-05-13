# 设置页面 分析报告

> 任务编号：T-24
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 需要建设一个完整的设置页面，作为用户管理阅读偏好、词典行为、显示效果和数据的核心入口。v1.0 中设置极为简单，仅通过 localStorage 存储 3 项设置（fontSize、showPinyin、ttsSpeed），无设置页面 UI，设置项分散在阅读器组件中。v2.0 随着词典管理、多词典开关、统计功能、书签笔记等新功能的引入，设置项显著增多，需要统一归类、集中管理。

核心目标：
- 合理分类所有设置项，提供清晰的设置页面布局
- 统一持久化策略，从 localStorage 迁移到 IndexedDB（D1 决策）
- 支持设置导入导出，方便用户备份和跨设备迁移
- 提供数据清理和应用重置功能，管理用户数据生命周期
- 移动端优先，符合 Vant 4 组件规范，与 v2.0 禅意 UI 风格一致

## 2. 功能分类

| 分类 | 设置项 | 持久化方式 | 备注 |
|------|--------|------------|------|
| **阅读设置** | 字体大小（12px-32px，默认 18px） | IndexedDB `settings` 表 | 滑块 + 预览，v1.0 保留 |
| | 行高倍数（1.2-2.0，默认 1.6） | IndexedDB `settings` 表 | 新增，影响阅读舒适度 |
| | 显示拼音（开/关，默认关） | IndexedDB `settings` 表 | v1.0 保留，控制术语上方拼音标注 |
| | TTS 语速（0.5x-2.0x，默认 1.0x） | IndexedDB `settings` 表 | v1.0 保留，Web Speech API |
| | TTS 语音（浏览器可用语音列表） | IndexedDB `settings` 表 | 新增，选择首选语音 |
| | 自动保存阅读进度（开/关，默认开） | IndexedDB `settings` 表 | 新增，控制进度自动记录行为 |
| **词典设置** | 词典开关状态（每个词典独立） | IndexedDB `dict_config` 表 | D6 决策，词典管理页面维护 |
| | 高亮颜色主题（暖黄/淡蓝/翠绿/无） | IndexedDB `settings` 表 | 新增，控制术语高亮显示颜色 |
| | 释义弹窗位置（跟随/底部/居中） | IndexedDB `settings` 表 | 新增，移动端适配 |
| | 点击术语自动弹出释义（开/关，默认开） | IndexedDB `settings` 表 | 新增，控制交互行为 |
| **显示设置** | 主题模式（明亮/暗黑/跟随系统，默认明亮） | IndexedDB `settings` 表 | 新增，暗色模式支持 |
| | 段落间距（紧凑/标准/宽松，默认标准） | IndexedDB `settings` 表 | 新增，控制经文段落间距 |
| | 章节标题显示（开/关，默认开） | IndexedDB `settings` 表 | 新增，控制章节标题可见性 |
| | 功德统计显示（开/关，默认开） | IndexedDB `settings` 表 | 新增，控制统计入口可见性 |
| **数据管理** | 设置导入/导出（JSON 文件） | 文件操作 | 新增，设置备份与恢复 |
| | 阅读数据导入/导出（JSON 文件） | 文件操作 | 新增，进度、书签、笔记备份 |
| | 缓存清理（释义缓存、文件缓存） | IndexedDB 操作 | 新增，释放存储空间 |
| | 全部数据重置 | IndexedDB 操作 | 新增，二次确认后清除所有数据 |
| | v1.0 数据迁移状态 | IndexedDB `settings` 表 | 仅用于迁移标记 |

**分类说明**：

- **阅读设置**：直接影响经文阅读体验的参数，包括文字大小、拼音、TTS 等。这些是用户最高频调整的设置。
- **词典设置**：与词典功能相关的行为偏好。词典开关状态已在 `dict_config` 表中管理（T-18 分析），不重复存储。
- **显示设置**：影响整体 UI 外观的参数，如主题、间距等。
- **数据管理**：非"设置"而是"操作"，提供数据生命周期管理功能。放在设置页面底部，用分割线区分。

## 3. 设置持久化

### 3.1 为什么选择 IndexedDB

v1.0 使用 localStorage 存储所有设置，v2.0 统一迁移到 IndexedDB，原因如下：

| 对比维度 | localStorage | IndexedDB | 结论 |
|---------|-------------|-----------|------|
| 存储容量 | ~5-10MB | 数百 MB-数 GB | IndexedDB 胜出 |
| 数据类型 | 仅字符串（需 JSON 序列化） | 任意类型（结构化） | IndexedDB 更灵活 |
| 异步/同步 | 同步（阻塞主线程） | 异步（Promise 封装） | IndexedDB 不影响性能 |
| 查询能力 | 仅 key-value | 索引、范围查询 | IndexedDB 更强大 |
| 事务支持 | 无 | 有（原子操作） | IndexedDB 更安全 |
| v2.0 架构一致性 | 与"统一 IndexedDB"原则冲突 | 符合 D1 决策 | IndexedDB 一致 |

**决策**：所有设置统一存入 IndexedDB `settings` 表，彻底告别 localStorage。

### 3.2 IndexedDB settings 表结构

```
Table: settings (应用设置)
┌──────────────────────┬──────────────┬──────────────┬──────────────┐
| key (PK)             | value        | category     | updated_at   |
├──────────────────────┼──────────────┼──────────────┼──────────────┤
| reading.fontSize     | 18           | reading      | 2026-05-02   |
| reading.showPinyin   | false        | reading      | 2026-05-02   |
| reading.ttsSpeed     | 1.0          | reading      | 2026-05-02   |
| reading.ttsVoice     | ""           | reading      | 2026-05-02   |
| reading.lineHeight   | 1.6          | reading      | 2026-05-02   |
| reading.autoProgress | true         | reading      | 2026-05-02   |
| dict.highlightColor  | "warm-yellow"| dict         | 2026-05-02   |
| dict.popupPosition   | "follow"     | dict         | 2026-05-02   |
| dict.autoPopup       | true         | dict         | 2026-05-02   |
| display.theme        | "light"      | display      | 2026-05-02   |
| display.paraSpacing  | "standard"   | display      | 2026-05-02   |
| display.showChapters | true         | display      | 2026-05-02   |
| display.showStats    | true         | display      | 2026-05-02   |
| system.migrated      | true         | system       | 2026-05-02   |
└──────────────────────┴──────────────┴──────────────┴──────────────┘
```

**设计理由**：
- 采用 `key-value` 扁平结构，而非每行一个设置对象，便于单条读写
- `key` 使用 `category.settingName` 命名约定，方便按分类批量操作
- `category` 字段用于按分类过滤和页面分组渲染
- `updated_at` 用于设置同步和冲突检测（远期功能预留）

### 3.3 SettingStore 与 SettingService 的关系

```
UI (Settings.vue)
    │
    ▼
Pinia Store (settingStore)
    │ 读取/写入
    ▼
Service (settingService)
    │ 调用
    ▼
Storage (settingStore.js → IndexedDB)
```

- **settingStore.js**（storage 层）：直接操作 IndexedDB，提供 `get(key)`、`set(key, value)`、`getByCategory(category)`、`setBatch(pairs)` 等基础方法
- **settingService.js**（service 层）：封装业务逻辑，如 `getReadingSettings()`、`updateFontSize(size)`、`exportSettings()`、`importSettings(json)` 等
- **setting store**（Pinia）：UI 状态管理，持有当前设置值，响应式驱动 UI 更新

### 3.4 v1.0 数据迁移

v2.0 首次启动时自动从 localStorage 迁移设置到 IndexedDB：

```javascript
async function migrateSettingsFromV1() {
  const migrated = await db.get('settings', 'system.migrated')
  if (migrated) return

  const v1Settings = localStorage.getItem('buddhist-reader-settings')
  if (v1Settings) {
    const parsed = JSON.parse(v1Settings)
    // 迁移 fontSize → reading.fontSize
    if (parsed.fontSize !== undefined) {
      await db.put('settings', { key: 'reading.fontSize', value: parsed.fontSize, category: 'reading' })
    }
    // 迁移 showPinyin → reading.showPinyin
    if (parsed.showPinyin !== undefined) {
      await db.put('settings', { key: 'reading.showPinyin', value: parsed.showPinyin, category: 'reading' })
    }
    // 迁移 ttsSpeed → reading.ttsSpeed
    if (parsed.ttsSpeed !== undefined) {
      await db.put('settings', { key: 'reading.ttsSpeed', value: parsed.ttsSpeed, category: 'reading' })
    }
  }

  // 标记迁移完成
  await db.put('settings', { key: 'system.migrated', value: true, category: 'system' })

  // 可选：清除 v1.0 localStorage 数据
  // localStorage.removeItem('buddhist-reader-settings')
}
```

**迁移原则**：
- 迁移过程静默执行，用户无感知
- 迁移完成后保留 localStorage 数据（不主动删除），避免迁移失败导致数据丢失
- 迁移标记 `system.migrated` 写入 IndexedDB，防止重复迁移

## 4. 设置导入导出

### 4.1 导出功能

**导出数据范围**：
- 应用设置（`settings` 表中所有 category != 'system' 的记录）
- 阅读进度（`reading_progress` 表）
- 书签（`bookmarks` 表）
- 用户笔记（`user_notes` 表）
- 词典配置（`dict_config` 表，不含词典数据本身）

**不导出数据**：
- 词典释义数据（`dict_entries`）：体积大，用户可自行重新导入词典文件
- 词典索引（`dict_index`）：可从词典文件重建
- 功德统计（`reading_stats`）：低频备份需求，可放入"阅读数据导出"
- MDX 原文件缓存（`fileCache`）：体积大，用户保留原文件即可

**导出文件格式**：

```json
{
  "version": "2.0.0",
  "exportedAt": "2026-05-02T10:00:00Z",
  "appName": "般若佛经阅读器",
  "data": {
    "settings": [
      { "key": "reading.fontSize", "value": 18, "category": "reading" },
      { "key": "reading.showPinyin", "value": false, "category": "reading" }
    ],
    "progress": [
      { "sutraId": "xin-jing", "chapter": 0, "position": 120, "readTime": 300 }
    ],
    "bookmarks": [
      { "sutraId": "xin-jing", "chapter": 0, "position": 50, "note": "重要段落" }
    ],
    "notes": [
      { "entryKey": "builtin::般若", "note": "我的理解..." }
    ],
    "dictConfig": [
      { "dictId": "builtin", "enabled": true }
    ]
  }
}
```

**交互流程**：

```
用户点击 [导出设置]
    │
    ▼
选择导出范围弹窗（Vant ActionSheet）
    □ 应用设置（默认勾选）
    □ 阅读进度（默认勾选）
    □ 书签和笔记（默认勾选）
    □ 词典配置（默认勾选）
    │
    ▼
生成 JSON 文件
    │
    ▼
浏览器下载（<a download> 或 Blob URL）
    文件名：buddhist-reader-backup-20260502.json
```

### 4.2 导入功能

**导入流程**：

```
用户点击 [导入设置]
    │
    ▼
选择 JSON 文件（Vant Uploader / input[type=file]）
    │
    ▼
文件格式校验
    - 检查 "appName" 字段
    - 检查 "version" 字段兼容性
    - 检查 "data" 结构完整性
    │
    ├── 校验失败 → Toast 错误提示
    │
    ▼
导入预览（Vant Dialog）
    显示将导入的内容摘要：
    - 设置项：12 项
    - 阅读进度：3 部经书
    - 书签：5 个
    - 笔记：8 条
    │
    ▼
冲突处理策略选择
    - 覆盖现有数据（默认）
    - 跳过已有数据
    │
    ▼
执行导入（IndexedDB 事务）
    │
    ▼
Toast："导入成功"
    │
    ▼
刷新设置页面和相关页面
```

**版本兼容性**：
- v2.0 导入 v2.0 导出：完全兼容
- 未来版本导入旧版导出：需要字段映射和默认值填充
- 旧版导入新版导出：提示"导出文件版本过高，请升级应用"

### 4.3 设置重置

**范围**：仅重置 `settings` 表中的所有记录为默认值，不影响阅读进度、书签、词典数据。

```javascript
const DEFAULT_SETTINGS = {
  'reading.fontSize': 18,
  'reading.showPinyin': false,
  'reading.ttsSpeed': 1.0,
  'reading.ttsVoice': '',
  'reading.lineHeight': 1.6,
  'reading.autoProgress': true,
  'dict.highlightColor': 'warm-yellow',
  'dict.popupPosition': 'follow',
  'dict.autoPopup': true,
  'display.theme': 'light',
  'display.paraSpacing': 'standard',
  'display.showChapters': true,
  'display.showStats': true,
}

async function resetSettings() {
  const tx = db.transaction('settings', 'readwrite')
  const store = tx.objectStore('settings')
  // 清除所有非 system 类别的设置
  await store.clear()
  // 写入默认值
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const category = key.split('.')[0]
    await store.put({ key, value, category })
  }
  await tx.done
}
```

## 5. 数据清理

### 5.1 缓存清理

**缓存类型**：

| 缓存类型 | 存储位置 | 清理方式 | 影响 |
|---------|---------|---------|------|
| 释义缓存 | 内存（Map 对象） | 清空 Map | 下次点击术语时重新从 IndexedDB 加载 |
| 文件缓存（MDX 原文件） | IndexedDB `fileCache` 或 Cache API | 按词典 ID 删除 | 大 MDX 词典需要重新上传 |
| Trie 索引 | 内存（Trie 对象） | 重建 | 下次启动时自动重建 |

**清理交互**：

```
┌──────────────────────────────────────┐
│  缓存管理                            │
├──────────────────────────────────────┤
│                                      │
│  释义缓存          2.3 MB    [清理]  │
│  词典文件缓存      15.7 MB   [清理]  │
│                                      │
│  总计              18.0 MB   [全部清理] │
│                                      │
└──────────────────────────────────────┘
```

**清理确认**：点击 [清理] 按钮时弹出 Vant Dialog 确认，避免误操作。

### 5.2 全部数据重置

**最高级别操作**，清除所有用户数据，将应用恢复到首次安装状态。

**流程**：

```
用户点击 [重置所有数据]
    │
    ▼
Vant Dialog 警告
    标题："确认重置所有数据？"
    内容：此操作将删除以下内容且不可恢复：
          - 所有阅读进度
          - 所有书签
          - 所有用户笔记
          - 所有上传的词典
          - 所有功德统计
          - 所有个性化设置
    │
    ▼
二次确认：输入"重置"两字
    │
    ▼
执行重置
    - 删除 IndexedDB 所有表数据
    - 清除 Cache API 中的文件缓存
    - 保留 `system.migrated` 标记（不重新迁移）
    │
    ▼
Toast："数据已重置，页面将刷新"
    │
    ▼
window.location.reload()
```

**安全保障**：
1. 第一次确认：展示将被删除的数据清单
2. 第二次确认：要求输入"重置"文字（防误触）
3. 建议重置前导出备份：在重置按钮旁放置"先备份再重置"的引导文字

### 5.3 存储空间估算

提供存储空间使用情况展示，帮助用户了解数据占用：

```javascript
async function getStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      quota: estimate.quota,       // 总配额
      usage: estimate.usage,       // 已使用
      percent: (estimate.usage / estimate.quota * 100).toFixed(1)
    }
  }
  return null
}
```

**展示格式**：

```
存储空间：18.0 MB / 1.2 GB（1.5%）
```

## 6. 结论与建议

### 6.1 推荐的设置页面设计方案

**页面布局**（移动端）：

```
┌──────────────────────────────────────┐
│  <  设置                             │
├──────────────────────────────────────┤
│                                      │
│  ── 阅读设置 ──────────────────────   │
│  字体大小        18px    [━━━━━●━━]  │
│  行高            1.6x    [━━●━━━━━━]  │
│  显示拼音                [OFF    ●]   │
│  TTS 语速        1.0x    [━━●━━━━━━]  │
│  TTS 语音        系统默认      [>]   │
│  自动保存进度              [ON  ●]    │
│                                      │
│  ── 词典设置 ──────────────────────   │
│  高亮颜色        暖黄色         [>]   │
│  释义弹窗位置    跟随术语       [>]   │
│  点击自动弹出              [ON  ●]    │
│  词典管理                    [>]   │
│                                      │
│  ── 显示设置 ──────────────────────   │
│  主题模式        明亮           [>]   │
│  段落间距        标准           [>]   │
│  章节标题                  [ON  ●]    │
│  功德统计                  [ON  ●]    │
│                                      │
│  ── 数据管理 ──────────────────────   │
│  存储空间        18.0 MB / 1.2 GB    │
│  导出备份                    [>]      │
│  清理缓存                    [>]      │
│  重置设置                    [>]      │
│  重置所有数据（红色警告文字）  [>]    │
│                                      │
│  ── 关于 ──────────────────────────   │
│  版本            v2.0.0              │
│                                      │
└──────────────────────────────────────┘
```

**组件选择**：
- 设置分组：Vant CellGroup + title 属性
- 滑块设置：Vant Slider + Vant Cell 组合
- 开关设置：Vant Cell + Vant Switch
- 选项设置：Vant Cell + 右侧箭头 + 值文字
- 操作按钮：Vant Cell + 右侧箭头，底部操作用 Vant Button（红色警告）

### 6.2 持久化策略总结

| 数据类型 | 存储位置 | 理由 |
|---------|---------|------|
| 应用设置 | IndexedDB `settings` 表 | 统一管理，支持分类查询 |
| 词典开关 | IndexedDB `dict_config` 表 | 词典配置已有表结构 |
| 阅读进度 | IndexedDB `reading_progress` 表 | 已有表结构 |
| 书签/笔记 | IndexedDB `bookmarks` / `user_notes` 表 | 已有表结构 |
| 释义缓存 | 内存 Map | 生命周期跟随页面，无需持久化 |
| MDX 文件 | IndexedDB `fileCache` 或 Cache API | 大文件，需要二进制存储 |
| Trie 索引 | 内存 | 每次启动重建，无需持久化 |

### 6.3 优先级建议

| 优先级 | 功能 | 理由 |
|--------|------|------|
| **P0** | 设置页面基础布局 + 分类分组 | 设置页面的核心骨架 |
| **P0** | 阅读设置（字体、拼音、TTS） | 从 v1.0 迁移，用户最高频使用 |
| **P0** | IndexedDB settings 表 + Service 层 | 数据基础 |
| **P0** | v1.0 数据迁移 | 升级兼容性 |
| **P1** | 词典设置（高亮颜色、弹窗行为） | 增强阅读体验 |
| **P1** | 显示设置（主题、间距） | 视觉个性化 |
| **P1** | 设置导出 | 数据安全保障 |
| **P2** | 设置导入 | 配合导出使用 |
| **P2** | 缓存清理 | 存储空间管理 |
| **P2** | 全部数据重置 | 极端情况恢复 |
| **P2** | 存储空间展示 | 用户感知数据占用 |

### 6.4 技术风险提示

1. **IndexedDB 异步与响应式同步**：Pinia store 需要在异步加载 IndexedDB 数据后更新响应式状态，初始加载时 UI 可能短暂显示默认值。建议：store 初始化时显示骨架屏或 loading 状态。
2. **暗黑模式切换**：Vant 4 通过 CSS 变量实现暗黑模式，切换时需要同时更新 `<html>` 的 `class` 和 IndexedDB 中的 `display.theme` 值。
3. **TTS 语音列表异步获取**：`speechSynthesis.getVoices()` 在某些浏览器中是异步的（需要监听 `voiceschanged` 事件），需要在设置页面加载时处理。
4. **导出文件大小**：如果用户有大量书签和笔记，导出的 JSON 文件可能较大。建议使用 `Blob` + `URL.createObjectURL` 方式生成下载链接。

## 7. 对 v2.1 方案的影响

本分析结果对 v2.1 及后续方案的影响：

1. **暗色模式完整实现**：v2.0 设置页面预留了 `display.theme` 设置项，但暗色模式的 CSS 变量体系、组件级适配需要在 v2.1 中完善。建议 v2.1 引入 design token 系统统一管理主题色。

2. **设置同步（多设备）**：当前所有设置均为本地存储（IndexedDB），v2.1 若引入后端 API，需要在 `settings` 表中增加 `sync_status` 字段和 `last_synced_at` 时间戳，支持冲突检测（基于 `updated_at` 字段）。

3. **高级阅读设置**：v2.1 可扩展阅读设置项，如：自定义字体（上传 .ttf/.woff）、经文版本选择（不同译本）、夜间模式自动切换（基于系统时间）等。

4. **设置预设/方案**：v2.1 可支持用户保存多套设置方案（如"专注模式"、"学习模式"、"研究模式"），一键切换。需要在 `settings` 表之上增加 `profiles` 表。

5. **数据迁移策略扩展**：当前仅处理 v1.0 → v2.0 迁移。v2.1 及后续版本需要通用的 schema 版本迁移机制，类似数据库 migration，按版本号逐步升级。

6. **无障碍（Accessibility）设置**：当前设置页面未考虑无障碍功能。v2.1 应增加字体加粗、增大对比度、屏幕朗读优化等选项，满足 D20 决策的后续考虑。

7. **词典配置导出/导入的细化**：当前导出仅包含 `dict_config`（开关状态），不包含词典数据本身。v2.1 可考虑支持"完整词典包导出"，将词典文件与配置一起打包为 ZIP 文件，方便用户分享和迁移。

---

*文档版本: v1.0*
*最后更新: 2026-05-02*
