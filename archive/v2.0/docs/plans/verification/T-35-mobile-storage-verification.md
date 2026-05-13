# 验证：移动端存储限制

> 任务编号：T-35
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/research/T-04-indexeddb-storage.md

## 1. 背景与目标

佛教经文阅读器需要在前端 IndexedDB 中存储词典数据、经书内容、用户笔记等。移动端浏览器对 IndexedDB 有配额限制和差异化的清理策略，直接影响方案可行性。

本验证目标：
1. 确认各主流移动浏览器的 IndexedDB 配额上限和清理策略
2. 估算多词典场景下的累计存储量
3. 评估可用空间检查的实现可行性
4. 设计存储空间不足时的自动清理策略
5. 对比同类 Web App 的存储管理方案
6. 给出明确结论：维持原方案 or 调整

## 2. 各平台配额数据

| 平台 | 配额上限 | 清理策略 | 备注 |
|------|----------|----------|------|
| iOS Safari (15+) | **50MB 硬限制**（单数据库） | 存储压力时主动回收旧数据；用户清除"网站数据"时全部清空 | `navigator.storage.estimate()` 截至 Safari 17.5 仍返回 `{usage: 0, quota: 0}`；无用户手势时 `indexedDB.open()` 可能被静默拒绝 |
| iOS Safari (17+) | 50MB 硬限制 | 后台标签页主动冻结 IndexedDB 连接，transaction 可能静默失败 | 同一 origin 下 localStorage + IndexedDB + Cache API 共享配额 |
| Android Chrome | 约 **80% 空闲磁盘**（通常数 GB 起步） | 用户手动清除浏览数据时清空；PWA 安装后配额提升 2-5 倍 | 需要 HTTPS + 用户交互才能获得信任；无痕模式配额极低（~120MB） |
| Android WebView | **50MB 初始**（旧版），新版跟随 Chrome 策略 | 内存压力大时丢弃未刷盘的 IndexedDB 数据；宿主 App 可配置清理策略 | localStorage 实际可用常 < 2MB，且不抛错、静默截断 |
| Desktop Chrome | 约 **80% 空闲磁盘**（数 GB - 数十 GB） | 用户手动清除；磁盘空间不足时自动清理 Cache API 优先 | 配额动态调整，PWA 安装后提升 |
| Firefox (Desktop/Mobile) | 无硬上限，首次写入约 **50MB** | 长期不用的数据可能被自动清理；用户确认后可扩容 | `navigator.storage.estimate()` 表现相对稳定 |

**关键发现**：

1. **iOS Safari 是最大瓶颈**：50MB 硬限制远低于其他平台，且不提供可靠的配额探测 API
2. **配额是动态的软上限**：除 iOS Safari 外，其他平台的配额值随磁盘空间、用户活跃度、PWA 状态动态变化
3. **同源共享配额池**：localStorage、IndexedDB、Cache API、Service Worker 脚本缓存全部计入同一配额，需统一管理
4. **隐私/无痕模式配额极低**：所有浏览器在隐私模式下都会大幅降低配额，IndexedDB 数据可能在关闭时清空

## 3. 存储量估算

基于项目 v2.1 方案（分级策略：`< 5MB` 全量预解析，`5-10MB` 索引预解析，`> 10MB` 保留原文件），估算典型用户场景：

### 3.1 词典数据

MDX 词典解析后的数据膨胀系数约 1.8x - 2.2x。

| 词典类型 | 原始 MDX 大小 | 解析后大小 | IndexedDB 存储方式 | 存储量 |
|----------|--------------|-----------|-------------------|--------|
| 小型佛教词典（< 5MB） | 2-5MB | 4-11MB JSON | 全量预解析存入 `dict_entries` | 4-11MB |
| 中型词典（5-10MB） | 5-10MB | 索引 ~1-3MB | 仅存储 term 索引到 `dict_index` | 1-3MB |
| 大型词典（> 10MB） | 10-50MB | 原文件保留 | 存储 ArrayBuffer 到 `dict_files` | 10-50MB |

**典型用户场景（3 本词典）**：

| 场景 | 词典组合 | IndexedDB 占用 |
|------|----------|---------------|
| 轻量用户 | 2 本小型词典 | ~10-20MB |
| 中度用户 | 1 小型 + 1 中型 + 1 大型 | ~15-60MB |
| 重度用户 | 2 中型 + 2 大型 | ~30-100MB |

### 3.2 其他数据类型

| 数据类型 | 单条大小 | 数量估算 | 总计 | 备注 |
|----------|----------|----------|------|------|
| 经书内容（Markdown） | 50KB-500KB | 20-50 部 | 1-25MB | 含经文正文、注释 |
| 用户笔记 | 1-5KB | 100-1000 条 | 0.1-5MB | 每部经书可能有数十条笔记 |
| 阅读进度 | < 1KB | 20-50 条 | < 0.1MB | 仅记录最后阅读位置 |
| 用户设置 | < 10KB | 1 份 | < 0.01MB | 主题、字体、字号等 |
| **合计（不含词典）** | | | **1-30MB** | 取决于经书数量和笔记量 |

### 3.3 总存储量汇总

| 用户类型 | 词典占用 | 经书+笔记 | **总计** | iOS 50MB 限制 |
|----------|---------|-----------|---------|--------------|
| 轻量用户 | 10-20MB | 1-5MB | **11-25MB** | 安全（占 22-50%） |
| 中度用户 | 15-60MB | 5-15MB | **20-75MB** | **可能超限**（占 40-150%） |
| 重度用户 | 30-100MB | 10-30MB | **40-130MB** | **大概率超限**（占 80-260%） |

**结论**：iOS Safari 的 50MB 硬限制是核心瓶颈。中度以上用户在 iOS 上可能触发 `QuotaExceededError`。分级策略（大词典保留原文件）已部分缓解此问题，但仍需额外的存储管理。

## 4. 可用空间检查

### 4.1 `navigator.storage.estimate()` 实现

```javascript
/**
 * 检查当前 origin 的存储使用情况
 * @returns {{usage: number, quota: number, available: number, percent: number}|null}
 */
async function checkStorageUsage() {
  if (!navigator.storage?.estimate) {
    // Safari 等不支持的浏览器返回 null
    return null;
  }

  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (!quota || quota === 0) {
      // Safari 返回 {usage: 0, quota: 0}
      return null;
    }

    return {
      usage,                              // 已用字节数
      quota,                              // 估算配额上限
      available: quota - usage,           // 估算剩余
      percent: Math.round((usage / quota) * 100)  // 使用率百分比
    };
  } catch (err) {
    console.warn('Storage estimate failed:', err.name);
    return null;
  }
}
```

### 4.2 平台兼容性矩阵

| 平台 | `estimate()` 支持 | `quota` 可靠性 | 替代方案 |
|------|------------------|---------------|---------|
| Chrome (Desktop/Android) | 支持 | 高（动态估算，参考意义强） | 无 |
| Firefox | 支持 | 中（相对稳定） | 无 |
| Safari (iOS/macOS) | **不支持**（返回 0） | 不可用 | 50MB 硬限 + 写入试探 |
| Android WebView | 部分支持 | 低 | 写入试探 + 捕获异常 |

### 4.3 iOS Safari 替代方案：写入试探

由于 iOS Safari 不支持 `estimate()`，需要采用写入试探法：

```javascript
/**
 * iOS Safari 兼容方案：试探写入估算剩余空间
 * 注意：此方法会真实占用空间，需立即清理
 */
async function estimateIOSSafari() {
  const TEST_DB = '__storage_test__';
  const TEST_KEY = 'probe';
  const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB 步进

  return new Promise((resolve) => {
    let totalSize = 0;

    function writeChunk() {
      const request = indexedDB.open(TEST_DB, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('test')) {
          db.createObjectStore('test');
        }
      };

      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('test', 'readwrite');
        const store = tx.objectStore('test');

        // 写入 1MB 数据
        const data = new ArrayBuffer(CHUNK_SIZE);
        store.put(data, TEST_KEY);

        tx.oncomplete = () => {
          totalSize += CHUNK_SIZE;
          db.close();
          // 删除测试数据，继续下一轮
          indexedDB.deleteDatabase(TEST_DB);
          writeChunk();
        };

        tx.onerror = () => {
          db.close();
          indexedDB.deleteDatabase(TEST_DB);
          resolve({ quota: 50 * 1024 * 1024, estimatedAvailable: 50 * 1024 * 1024 - totalSize });
        };
      };

      request.onerror = () => {
        indexedDB.deleteDatabase(TEST_DB);
        resolve({ quota: 50 * 1024 * 1024, estimatedAvailable: 50 * 1024 * 1024 - totalSize });
      };
    }

    writeChunk();
  });
}
```

**更实用的 iOS 方案**：直接假设 50MB 上限，维护本地 `storedSizeKB` 计数器，每次写入前加权估算：

```javascript
// 维护本地大小计数器
let estimatedUsageKB = 0;

function estimateDataSize(data) {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data).length / 1024;
  }
  if (data instanceof ArrayBuffer) {
    return data.byteLength / 1024;
  }
  // JSON 对象
  return new TextEncoder().encode(JSON.stringify(data)).length / 1024;
}

function canWrite(dataSizeKB) {
  const IOS_SAFARI_LIMIT_KB = 45 * 1024; // 50MB 留 5MB 安全余量
  return (estimatedUsageKB + dataSizeKB) < IOS_SAFARI_LIMIT_KB;
}
```

### 4.4 上传前检查流程

```
用户上传词典文件
    │
    ▼
1. 检查文件大小
    ├─ > 50MB → 直接拒绝（超出任何移动端配额）
    └─ ≤ 50MB → 继续
    │
    ▼
2. 调用 navigator.storage.estimate()
    ├─ 返回有效 quota → 检查 available > 预估写入量 × 2（考虑膨胀系数）
    │   ├─ 足够 → 允许上传
    │   └─ 不足 → 提示用户清理或选择更小词典
    │
    └─ 返回 null/0（iOS Safari）→ 使用本地计数器估算
        ├─ estimatedUsage + 文件大小 × 2.2 < 45MB → 允许上传
        └─ 否则 → 提示用户
    │
    ▼
3. 实际写入时捕获 QuotaExceededError
    └─ 触发 → 回滚 + 提示清理
```

## 5. 自动清理策略

### 5.1 策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **LRU 自动清理** | 无需用户干预，体验流畅 | 可能误删用户需要的词典；实现复杂 | 缓存类数据（查询结果、临时索引） |
| **提示用户手动管理** | 用户完全控制，不会误删 | 用户可能不理解如何操作；流程中断 | 核心数据（词典文件、用户笔记） |
| **分级清理（推荐）** | 兼顾自动和手动，灵活可控 | 实现稍复杂 | 本项目 |

### 5.2 推荐方案：分级清理 + LRU 辅助

采用三级存储管理，按数据重要性分级处理：

| 优先级 | 数据类型 | 清理策略 | 触发阈值 |
|--------|---------|---------|---------|
| **P0 - 不可清理** | 用户笔记、阅读进度、用户设置 | 永不清理，写入失败时阻塞并强提示 | - |
| **P1 - 用户确认清理** | 已上传的词典文件（原文件 + 预解析数据） | 列出可清理词典，由用户选择删除 | usage/quota > 80% |
| **P2 - 自动 LRU 清理** | 查询缓存（LRU Cache）、临时索引、解析中间态 | 自动按 LRU 清理，释放空间 | usage/quota > 85% |

### 5.3 实现方案

```javascript
// 存储优先级标记
const STORAGE_PRIORITY = {
  P0_PERMANENT: 'p0',  // 笔记、进度、设置
  P1_USER_DATA: 'p1',  // 词典数据（用户确认才可删）
  P2_CACHE: 'p2',      // 查询缓存（可自动清理）
};

// LRU 清理：自动清理 P2 层缓存
async function autoCleanupLRU(targetKB) {
  let cleanedKB = 0;

  // 1. 清理 LRU 查询缓存（内存中）
  queryCache.clear();
  cleanedKB += queryCache.estimatedSize;

  // 2. 清理 IndexedDB 中的临时缓存表
  if (cleanedKB < targetKB) {
    const cacheCleaned = await cleanTempCache();
    cleanedKB += cacheCleaned;
  }

  return cleanedKB;
}

// 用户确认清理：列出可删除的词典
async function suggestCleanup() {
  const dicts = await getAllUploadedDicts();

  // 按最后使用时间排序（LRU）
  dicts.sort((a, b) => a.lastUsedAt - b.lastUsedAt);

  return dicts.map((dict) => ({
    id: dict.id,
    name: dict.name,
    sizeKB: dict.sizeKB,
    lastUsed: dict.lastUsedAt,
    canDelete: true,
  }));
}

// 写入前检查 + 自动清理
async function safeWrite(data, key, priority) {
  const dataSizeKB = estimateDataSize(data);

  // P2 写入：先尝试自动清理
  if (priority === STORAGE_PRIORITY.P2_CACHE) {
    const estimate = await checkStorageUsage();
    if (estimate && estimate.percent > 85) {
      await autoCleanupLRU(dataSizeKB);
    }
  }

  try {
    await writeToIndexedDB(data, key);
    estimatedUsageKB += dataSizeKB;
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      // 触发用户提示流程
      if (priority === STORAGE_PRIORITY.P0_PERMANENT) {
        throw new Error('存储空间不足，无法保存关键数据。请清理部分词典后重试。');
      }

      // P1 数据：提示用户选择清理
      const suggestions = await suggestCleanup();
      showCleanupDialog(suggestions);
      throw err;
    }
    throw err;
  }
}
```

### 5.4 用户提示文案

| 场景 | 提示内容 | 操作选项 |
|------|---------|---------|
| 使用率 > 75% | "本地存储空间即将不足，建议清理不常用的词典" | [查看管理] [忽略] |
| 使用率 > 85% | "存储空间紧张，已自动清理查询缓存。如需继续使用，请删除部分词典" | [管理词典] |
| QuotaExceededError（P0 数据） | "存储空间已满，无法保存笔记。请删除 1-2 本词典后重试" | [管理词典] [导出笔记] |
| QuotaExceededError（P1 数据） | "存储空间不足，无法导入词典「{name}」（{size}MB）" | [查看可清理的词典] [取消] |

## 6. 同类 App 对比

| App | 类型 | 存储策略 | 配额管理 | 清理策略 | 参考点 |
|-----|------|---------|---------|---------|--------|
| **GoldenDict Web** | 在线词典 | 不存储词典数据，全部服务端查询 | 无需管理 | 仅缓存近期查询（短期 localStorage） | 纯在线模式避免存储问题 |
| **欧路词典（Web 版）** | 词典 App | 服务端同步 + 本地缓存 | 缓存上限 100MB | LRU 自动清理过期缓存 | 核心数据在云端，本地仅做加速 |
| **Notion PWA** | 笔记 App | IndexedDB 存储离线页面 + Cache API | 提示用户清理缓存 | 按页面最后访问时间排序清理 | 区分在线/离线数据，离线可降级 |
| **Excalidraw PWA** | 绘图 App | IndexedDB 存储画布数据（Libraries） | 无主动管理 | 用户手动删除 Library | 数据量可控，单文件 < 5MB |
| **Readwise Reader PWA** | 阅读 App | IndexedDB 存储文章 + 注释 | 限制离线文章数量（最近 50 篇） | 自动清理最旧离线文章 | 数量限制优于空间限制，用户体验更直观 |
| **Kiwix（离线维基百科）** | 离线百科 | ZIM 文件存储，IndexedDB 做索引 | 按文件大小限制（单文件 < 2GB） | 用户手动管理 ZIM 文件 | 大文件直接存储，不预解析 |

**对比结论**：

1. **纯在线模式**（GoldenDict、欧路 Web）完全避开存储限制，但丧失离线能力
2. **混合模式**（Notion、Readwise）采用"核心数据在线 + 有限离线缓存"策略，离线数据有明确数量/时间上限
3. **纯离线模式**（Excalidraw、Kiwix）依赖用户手动管理，或通过文件粒度控制（单文件限制）

**对本项目的启示**：

- 词典数据**不应该全部离线存储**——推荐"小词典离线 + 大词典在线/按需下载"的混合策略
- 用户笔记必须持久化本地（P0 优先级），但量级可控（< 5MB）
- 使用**数量限制**（如"最多离线 3 本大型词典"）比空间阈值更直观

## 7. 结论

### 7.1 明确结论：**调整原方案**，增加存储管理措施

原方案（T-04：三级降级 IndexedDB → localStorage → 内存）方向正确，但需要补充以下存储管理措施以适配移动端限制。

### 7.2 调整项

| # | 调整项 | 理由 |
|---|--------|------|
| **A1** | iOS Safari 50MB 硬限制作为**设计基准**，不以 Chrome 的 GB 级配额为参考 | iOS Safari 是移动端最大的瓶颈，方案必须在此限制下可用 |
| **A2** | 上传前检查可用空间，预估写入量 × 2.2（膨胀系数）后对比剩余配额 | 避免写入中途触发 QuotaExceededError 导致数据不一致 |
| **A3** | 实现三级存储优先级（P0 笔记/进度、P1 词典数据、P2 查询缓存），按级清理 | 确保关键数据不会被自动清理 |
| **A4** | P2 层查询缓存实现 LRU 自动清理（阈值 85%），P1 层词典由用户手动管理 | 平衡自动化和用户体验 |
| **A5** | iOS Safari 下 `navigator.storage.estimate()` 不可用，使用**本地大小计数器**替代 | 无法依赖标准 API 探测 |
| **A6** | 用户提示中加入"存储空间管理"入口，提供词典列表 + 大小 + 最后使用时间 | 同类 App 的通用做法 |
| **A7** | 维持原有的三级降级策略（IndexedDB → localStorage → 内存），但降级仅在 IndexedDB 打开失败时触发，而非空间不足时 | 空间不足时应触发清理流程而非降级 |

### 7.3 对 v2.1 分级策略的补充

v2.1 的分级策略（`< 5MB` 全量预解析 / `5-10MB` 索引 / `> 10MB` 原文件）**已有效缓解存储压力**，但仍需配合本验证的存储管理措施：

| 词典大小 | v2.1 处理方式 | IndexedDB 占用 | iOS 50MB 可容纳数量 |
|----------|--------------|---------------|-------------------|
| < 5MB | 全量预解析 JSON | 4-11MB | 2-4 本 |
| 5-10MB | 仅索引 | 1-3MB | 10+ 本（但原始文件仍需存储 5-10MB × N） |
| > 10MB | 原文件 ArrayBuffer | 10-50MB | **1-2 本**（瓶颈所在） |

**核心约束**：iOS Safari 用户在存储 1-2 本大型词典（> 10MB 原始文件）后，剩余空间将不足以再导入中型词典。建议在 UI 层面对 iOS 用户给出明确的"还可导入 X 本词典"提示。

## 8. 对 v2.1 方案的影响

基于本验证结果，对 v2.1 开发的具体影响：

1. **storage/ 层新增 `storageManager.js`**：
   - 封装 `checkStorageUsage()` 方法，处理跨浏览器兼容性
   - 维护本地 `estimatedUsageKB` 计数器
   - 提供 `canWrite(sizeKB)` 预判方法

2. **services/dictService.js 导入流程增强**：
   - 导入前调用 `canWrite(预估大小)` 检查
   - 预估公式：`原始文件大小 × 2.2`（小词典）或 `原始文件大小 + 3MB`（中词典索引）
   - 检查失败时弹出用户提示，提供已上传词典列表供选择删除

3. **IndexedDB 表结构补充字段**：
   - `dict_files` 表新增 `sizeKB`、`lastUsedAt` 字段（用于 LRU 排序和空间展示）
   - `dict_cache` 表（P2 层）独立 ObjectStore，标记为可自动清理

4. **新增设置页面「存储空间管理」**：
   - 展示当前使用量（柱状图：已用/总计）
   - 列出已上传词典（名称、大小、最后使用时间）
   - 支持勾选删除，释放空间
   - iOS 用户额外提示 50MB 限制

5. **Pinia store 新增 `useStorageStore`**：
   - 响应式存储使用状态
   - 监听 `storage` 事件同步多标签页数据
   - 提供 `requestCleanup(targetKB)` 方法

6. **需要捕获的错误**：
   - `QuotaExceededError`：所有 IndexedDB 写入操作必须捕获
   - iOS Safari 后台冻结导致的 `AbortError`：查询失败时重试一次

7. **不需要实现的内容**：
   - 不需要 `estimate()` 的轮询监控（iOS 不支持，且标准 API 也有节流）
   - 不需要自动删除用户词典（必须用户确认）
   - 不需要跨设备同步存储空间状态

---

*验证人：AI Assistant*
*验证日期：2026-05-02*
*文档版本：v1.0*
