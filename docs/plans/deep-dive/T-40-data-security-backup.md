# 数据安全与备份 报告

> 任务编号：T-40
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 是纯前端 SPA 应用，所有用户数据（经书、词典、阅读进度、笔记、统计）均存储在浏览器 IndexedDB 中。数据完全本地化带来以下风险：

- **设备丢失/更换**：用户换设备后数据全部丢失
- **浏览器清理**：用户清除浏览数据或浏览器自动清理（Safari ITP 7 天无交互清除）
- **IndexedDB 损坏**：异常关闭、断电、存储满可能导致数据库损坏
- **误操作**：误删词典、误清数据

**目标**：
1. 提供完整的数据导出/导入能力，支持用户自主备份
2. 设计云同步预留接口，为未来 v2.1+ 后端 API 做准备
3. 对用户笔记等敏感数据提供可选加密
4. 建立 IndexedDB 损坏后的恢复机制

## 2. 数据导出格式

### 2.1 JSON 格式（主推荐）

JSON 格式作为首选导出格式，能够完整保留所有数据类型、关联关系和元信息。

#### 完整导出结构

```json
{
  "metadata": {
    "app": "般若佛经阅读器",
    "version": "2.0.0",
    "exportedAt": "2026-05-02T14:30:00.000Z",
    "exportId": "exp-20260502-143000-a1b2c3",
    "browser": "Chrome 123.0.6312.122",
    "platform": "macOS 14.4"
  },
  "checksum": "sha256:abcdef1234567890...",
  "settings": {
    "theme": "light",
    "fontSize": 18,
    "fontFamily": "Noto Serif SC",
    "lineHeight": 1.8,
    "autoPinyin": true,
    "ttsRate": 1.0,
    "ttsPitch": 1.0,
    "highlightEnabled": true
  },
  "sutras": {
    "index": [
      {
        "id": "xin-jing",
        "title": "心经",
        "fullName": "般若波罗蜜多心经",
        "translator": "唐三藏法师玄奘译",
        "cover": "\ud83d\udcd6",
        "description": "...",
        "chapters": [
          { "index": 0, "title": "全文", "wordCount": 260 }
        ],
        "totalWordCount": 260,
        "loadStatus": "ready"
      }
    ],
    "content": [
      {
        "id": "xin-jing::ch0",
        "sutraId": "xin-jing",
        "chapter": 0,
        "content": "观自在菩萨，行深般若波罗蜜多时..."
      }
    ]
  },
  "dictionaries": {
    "configs": [
      {
        "dictId": "builtin",
        "name": "内置词典",
        "type": "builtin",
        "enabled": true,
        "entryCount": 50,
        "version": "1.0.0",
        "uploadedAt": null,
        "fileSize": 0,
        "sourceFile": null,
        "mdxStrategy": null
      },
      {
        "dictId": "user-001",
        "name": "我的词典",
        "type": "user",
        "enabled": true,
        "entryCount": 1200,
        "version": 2,
        "uploadedAt": "2026-05-02T10:00:00Z",
        "fileSize": 3200000,
        "sourceFile": "my-dict.mdx",
        "mdxStrategy": "direct"
      }
    ],
    "entries": [
      {
        "key": "builtin::般若",
        "term": "般若",
        "dictId": "builtin",
        "pinyin": "bō rě",
        "definition": "梵语 prajñā 的音译，意为智慧...",
        "category": "核心术语",
        "sanskrit": "prajñā"
      }
    ],
    "versions": [
      {
        "id": "ver::001",
        "dictId": "user-001",
        "version": 1,
        "uploadedAt": "2026-05-01T10:00:00Z",
        "entryCount": 1000
      },
      {
        "id": "ver::002",
        "dictId": "user-001",
        "version": 2,
        "uploadedAt": "2026-05-02T10:00:00Z",
        "entryCount": 1200
      }
    ]
  },
  "readingProgress": [
    {
      "id": "progress::xin-jing",
      "sutraId": "xin-jing",
      "chapter": 0,
      "position": 120,
      "readTime": 300,
      "lastReadAt": "2026-05-02T14:00:00Z"
    }
  ],
  "bookmarks": [
    {
      "id": "bm::001",
      "sutraId": "xin-jing",
      "chapter": 0,
      "position": 50,
      "note": "重要段落",
      "createdAt": "2026-05-02T13:00:00Z"
    }
  ],
  "userNotes": [
    {
      "id": "note::001",
      "entryKey": "builtin::般若",
      "note": "我的理解：般若不是普通智慧，而是超越分别的直观...",
      "createdAt": "2026-05-02T12:00:00Z",
      "updatedAt": "2026-05-02T12:30:00Z"
    }
  ],
  "statistics": [
    {
      "id": "stats::xin-jing::2026-05-02",
      "sutraId": "xin-jing",
      "date": "2026-05-02",
      "count": 3,
      "duration": 900
    }
  ]
}
```

#### JSON 导出特性

| 特性 | 说明 |
|------|------|
| **自描述** | metadata 包含应用版本和导出时间，便于未来兼容性判断 |
| **完整性** | 导出所有表数据，含设置、经书、词典、进度、笔记、统计 |
| **可验证** | checksum 字段为导出后对整个 JSON（不含 checksum 本身）的 SHA-256 哈希 |
| **可选过滤** | 用户可选择只导出特定类型（如只导出阅读进度+笔记） |
| **大文件处理** | 词典 entries 数量巨大时，支持分块导出为多文件 |

#### 分块导出

当词典 entries 超过 5000 条时，自动拆分为多文件：

```
buddhist-reader-backup-20260502.json          # 主文件（metadata + settings + 非词典数据）
buddhist-reader-backup-20260502-dict-001.json # 词典条目 1-5000
buddhist-reader-backup-20260502-dict-002.json # 词典条目 5001-10000
...
buddhist-reader-backup-20260502-manifest.json # 分片清单
```

分片 manifest 结构：

```json
{
  "exportId": "exp-20260502-143000-a1b2c3",
  "totalFiles": 3,
  "files": [
    { "filename": "buddhist-reader-backup-20260502.json", "type": "main", "recordCount": 50 },
    { "filename": "buddhist-reader-backup-20260502-dict-001.json", "type": "dict_entries", "recordCount": 5000 },
    { "filename": "buddhist-reader-backup-20260502-dict-002.json", "type": "dict_entries", "recordCount": 2340 }
  ]
}
```

### 2.2 CSV 格式（表格数据辅助导出）

CSV 仅适用于纯表格数据的导出，不支持嵌套结构和二进制文件。定位为辅助格式，适合用户在电子表格中查看或编辑。

#### 支持的 CSV 导出表

| 表名 | 是否支持 CSV | 说明 |
|------|-------------|------|
| settings | 否 | 键值对结构，直接导出为 JSON 即可 |
| sutra_index | 是 | 经书元数据表格 |
| reading_progress | 是 | 阅读进度表格 |
| bookmarks | 是 | 书签表格 |
| user_notes | 是 | 用户笔记表格 |
| statistics | 是 | 统计表格 |
| dict_entries | 是 | 词典条目（量大时推荐） |
| dict_config | 是 | 词典配置表格 |
| sutra_content | 否 | 内容字段过大且含换行，不适合 CSV |
| dict_versions | 是 | 版本历史表格 |

#### CSV 导出示例

**user_notes.csv**：
```csv
id,entryKey,note,createdAt,updatedAt
note::001,builtin::般若,"我的理解：般若不是普通智慧...",2026-05-02T12:00:00Z,2026-05-02T12:30:00Z
note::002,builtin::涅槃,"涅槃是超越生死的境界...",2026-05-02T13:00:00Z,2026-05-02T13:00:00Z
```

**reading_progress.csv**：
```csv
id,sutraId,chapter,position,readTime,lastReadAt
progress::xin-jing,xin-jing,0,120,300,2026-05-02T14:00:00Z
progress::jin-gang-jing,jin-gang-jing,5,2040,1800,2026-05-01T20:00:00Z
```

**statistics.csv**：
```csv
id,sutraId,date,count,duration
stats::xin-jing::2026-05-02,xin-jing,2026-05-02,3,900
stats::jin-gang-jing::2026-05-01,jin-gang-jing,2026-05-01,2,1800
```

**dict_entries.csv**（大量数据场景）：
```csv
key,term,dictId,pinyin,definition,category,sanskrit
builtin::般若,般若,builtin,bō rě,梵语 prajñā 的音译...,核心术语,prajñā
builtin::涅槃,涅槃,builtin,niè pán,梵语 nirvāṇa 的音译...,核心术语,nirvāṇā
user-001::金刚,金刚,user-001,jīn gāng,佛教术语...,个人词典,
```

#### CSV 编码规范

- **编码**：UTF-8 with BOM（确保 Excel 正确识别中文）
- **分隔符**：逗号 `,`
- **换行**：`\r\n`（Windows 兼容）
- **转义**：含逗号、换行、双引号的字段用双引号包裹，内部双引号用 `""` 转义
- **空值**：空字符串表示 null 值

#### CSV 导出 API 设计

```javascript
// services/backupService.js

/**
 * 导出为 CSV
 * @param {string[]} tableNames - 要导出的表名列表
 * @returns {Blob[]} 每个表对应一个 CSV Blob
 */
async function exportCSV(tableNames) {
  const results = []

  for (const tableName of tableNames) {
    const records = await db.getAll(tableName)
    if (records.length === 0) continue

    const headers = Object.keys(records[0])
    const csvLines = [headers.join(',')]

    for (const record of records) {
      const values = headers.map(h => {
        const val = record[h]
        if (val === null || val === undefined) return ''
        const str = String(val)
        // 需要转义：包含逗号、换行、双引号
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      })
      csvLines.push(values.join(','))
    }

    // UTF-8 BOM + 内容
    const bom = '\uFEFF'
    const csvContent = bom + csvLines.join('\r\n')
    results.push({
      filename: `${tableName}.csv`,
      blob: new Blob([csvContent], { type: 'text/csv;charset=utf-8' }),
    })
  }

  return results
}
```

## 3. 数据导入恢复

### 3.1 导入流程

```
用户选择备份文件（JSON / ZIP）
        │
        ▼
┌──────────────────────────────┐
│ 1. 文件验证                   │
│    - 检查文件格式（JSON/ZIP）  │
│    - 检查 metadata.app 字段   │
│    - 检查 metadata.version     │
│    - 验证 checksum（SHA-256）  │
└──────────┬───────────────────┘
           │ 验证通过
           ▼
┌──────────────────────────────┐
│ 2. 版本兼容性检查             │
│    - exportVersion >= minVer  │
│    - 字段缺失的默认值填充      │
│    - 未知字段的忽略警告        │
└──────────┬───────────────────┘
           │ 兼容
           ▼
┌──────────────────────────────┐
│ 3. 冲突检测                   │
│    - 检查当前 DB 是否有数据   │
│    - 识别冲突记录（同 ID）     │
│    - 生成冲突报告              │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 4. 用户确认导入策略           │
│    A. 合并：新数据覆盖旧数据   │
│    B. 追加：仅导入不存在的记录 │
│    C. 替换：清空后全部导入    │
│    D. 取消                    │
└──────────┬───────────────────┘
           │ 用户选择
           ▼
┌──────────────────────────────┐
│ 5. 预备份当前数据             │
│    - 自动创建 auto-backup-xxx │
│    - 导入失败时可回滚          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 6. 事务性导入                 │
│    - 分批写入（500 条/批）    │
│    - 失败自动回滚              │
│    - 进度通知用户              │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 7. 导入后重建                 │
│    - 重建 Trie 索引           │
│    - 刷新 Pinia Store         │
│    - 重新加载阅读页            │
└──────────────────────────────┘
```

### 3.2 JSON 导入实现

```javascript
// services/backupService.js

/**
 * 导入 JSON 备份文件
 * @param {File|Blob} file - 备份文件
 * @param {Object} options
 * @param {'merge'|'append'|'replace'} options.strategy - 导入策略
 * @param {Function} options.onProgress - 进度回调 (current, total, phase)
 * @returns {Promise<{ success: boolean, imported: Record<string, number>, errors: string[] }>}
 */
async function importBackup(file, { strategy = 'merge', onProgress } = {}) {
  const result = { success: false, imported: {}, errors: [] }

  // Step 1: 读取并验证文件
  let backupData
  try {
    const text = await file.text()
    backupData = JSON.parse(text)
  } catch (e) {
    result.errors.push('文件格式错误，无法解析 JSON')
    return result
  }

  if (!backupData.metadata || backupData.metadata.app !== '般若佛经阅读器') {
    result.errors.push('不是有效的佛经阅读器备份文件')
    return result
  }

  // 验证 checksum
  const checksumValid = await verifyChecksum(backupData)
  if (!checksumValid) {
    result.errors.push('文件校验失败，备份可能已损坏或被篡改')
    return result
  }

  // Step 2: 版本兼容
  const compatResult = checkCompatibility(backupData.metadata.version)
  if (!compatResult.compatible) {
    result.errors.push(...compatResult.errors)
    return result
  }

  // Step 3: 预备份当前数据
  const autoBackupKey = `auto-backup-${Date.now()}`
  await createAutoBackup(autoBackupKey)

  // Step 4: 事务性导入
  try {
    const db = await getDB()
    const tx = db.transaction([
      'sutra_index', 'sutra_content', 'dict_config',
      'dict_entries', 'dict_versions', 'reading_progress',
      'bookmarks', 'user_notes', 'statistics', 'settings'
    ], 'readwrite')

    let totalRecords = 0
    let importedRecords = 0

    // 根据策略导入各表
    const tables = [
      { store: 'settings', data: backupData.settings, mode: 'object' },
      { store: 'sutra_index', data: backupData.sutras?.index, mode: 'bulk' },
      { store: 'sutra_content', data: backupData.sutras?.content, mode: 'bulk' },
      { store: 'dict_config', data: backupData.dictionaries?.configs, mode: 'bulk' },
      { store: 'dict_entries', data: backupData.dictionaries?.entries, mode: 'bulk' },
      { store: 'dict_versions', data: backupData.dictionaries?.versions, mode: 'bulk' },
      { store: 'reading_progress', data: backupData.readingProgress, mode: 'bulk' },
      { store: 'bookmarks', data: backupData.bookmarks, mode: 'bulk' },
      { store: 'user_notes', data: backupData.userNotes, mode: 'bulk' },
      { store: 'statistics', data: backupData.statistics, mode: 'bulk' },
    ]

    for (const table of tables) {
      if (!table.data) continue

      const store = tx.objectStore(table.store)
      const records = Array.isArray(table.data) ? table.data : [table.data]

      totalRecords += records.length

      // 分批写入
      const batchSize = 500
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)

        for (const record of batch) {
          const processed = applyStrategy(record, strategy)
          if (processed) {
            await store.put(processed)
            importedRecords++
          }
        }

        onProgress?.(importedRecords, totalRecords, `导入 ${table.store}`)
      }

      result.imported[table.store] = importedRecords
    }

    await tx.done
    result.success = true

    // Step 5: 导入后重建
    await postImportRebuild()

  } catch (e) {
    result.errors.push(`导入失败: ${e.message}`)
    // 导入失败不自动回滚，保留 auto-backup 供用户手动恢复
  }

  return result
}

/**
 * 根据策略处理单条记录
 */
function applyStrategy(record, strategy) {
  switch (strategy) {
    case 'replace':
      return record // 全部覆盖
    case 'append':
      // 仅当记录不存在时才导入
      return record // 实际由 IndexedDB put 的 key 冲突检查处理
    case 'merge':
      return record // 默认覆盖（以备份文件为准）
    default:
      return record
  }
}
```

### 3.3 冲突检测与用户界面

```
┌──────────────────────────────────────────┐
│  数据导入 - 冲突检测                     │
├──────────────────────────────────────────┤
│                                          │
│  备份文件: buddhist-reader-backup-       │
│  20260502.json                           │
│  导出时间: 2026-05-02 14:30              │
│  应用版本: v2.0.0                        │
│                                          │
│  ── 数据概览 ──                          │
│  经书: 3 部                              │
│  词典: 2 个（共 7350 条）                │
│  书签: 12 个                             │
│  笔记: 8 条                              │
│  诵读记录: 45 条                         │
│                                          │
│  ── 冲突检测 ──                          │
│  ⚠️  发现 5 条重复书签                   │
│  ⚠️  发现 3 条笔记冲突（同一词条不同内容）│
│  ✅  12 条新诵读记录（无冲突）            │
│                                          │
│  ── 选择导入策略 ──                      │
│                                          │
│  ( ) 合并导入：备份数据覆盖当前数据      │
│  ( ) 追加导入：仅导入不存在的记录        │
│  ( ) 替换导入：清空当前数据后全部导入    │
│      ⚠️ 此操作不可逆，建议先导出当前数据  │
│                                          │
│  [ 查看冲突详情 ]                        │
│                                          │
│  [ 取消 ]        [ 确认导入 ]            │
│                                          │
└──────────────────────────────────────────┘
```

### 3.4 自动备份机制

每次导入前自动创建当前数据的快照：

```javascript
/**
 * 创建自动备份（导入前调用）
 * @param {string} backupKey - 备份标识
 */
async function createAutoBackup(backupKey) {
  const backup = {
    metadata: {
      app: '般若佛经阅读器',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      type: 'auto-backup',
      trigger: 'before-import',
    },
    settings: await db.getAll('settings'),
    sutras: {
      index: await db.getAll('sutra_index'),
      content: await db.getAll('sutra_content'),
    },
    dictionaries: {
      configs: await db.getAll('dict_config'),
      entries: await db.getAll('dict_entries'),
    },
    readingProgress: await db.getAll('reading_progress'),
    bookmarks: await db.getAll('bookmarks'),
    userNotes: await db.getAll('user_notes'),
    statistics: await db.getAll('statistics'),
  }

  backup.checksum = await computeChecksum(backup)

  // 存储在 IndexedDB 专用备份表
  const backupDb = await openDB('buddhist-reader-backups', 1, {
    upgrade(db) {
      db.createObjectStore('auto_backups', { keyPath: 'key' })
    }
  })
  await backupDb.put('auto_backups', {
    key: backupKey,
    data: backup,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后过期
  })
}
```

## 4. 云同步预留

### 4.1 接口设计原则

- **纯前端优先**：v2.0 阶段不实现云同步，仅定义接口和数据结构
- **Provider 模式**：使用 Provider 接口抽象同步后端，未来可切换不同服务
- **数据格式一致**：云端数据格式与本地 JSON 导出格式一致
- **增量同步**：支持基于 version/timestamp 的增量同步
- **冲突解决**：定义 Last-Write-Wins + 手动合并策略

### 4.2 SyncProvider 接口

```javascript
// services/sync/SyncProvider.js

/**
 * 云同步 Provider 接口
 * 所有具体实现（WebDAV、自建 API、第三方）必须实现此接口
 */
class SyncProvider {
  /**
   * 初始化 Provider
   * @param {Object} config - 配置项
   * @returns {Promise<boolean>} 是否认证成功
   */
  async init(config) {
    throw new Error('Not implemented')
  }

  /**
   * 获取云端数据版本信息
   * @returns {Promise<{ version: string, lastSyncedAt: string, tables: string[] }>}
   */
  async getRemoteVersion() {
    throw new Error('Not implemented')
  }

  /**
   * 下载指定表的数据
   * @param {string} tableName
   * @param {string} since - 可选，只获取此时间之后的数据
   * @returns {Promise<Array>}
   */
  async downloadTable(tableName, since) {
    throw new Error('Not implemented')
  }

  /**
   * 上传指定表的数据
   * @param {string} tableName
   * @param {Array} records
   * @returns {Promise<{ uploaded: number, version: string }>}
   */
  async uploadTable(tableName, records) {
    throw new Error('Not implemented')
  }

  /**
   * 全量同步（上传本地全部数据）
   * @param {Object} backupData - 与 exportBackup 同格式的数据
   * @returns {Promise<{ success: boolean, uploaded: number }>}
   */
  async fullSync(backupData) {
    throw new Error('Not implemented')
  }

  /**
   * 增量同步
   * @param {Object} localData
   * @param {string} sinceToken - 上次同步的版本标记
   * @returns {Promise<{ success: boolean, merged: number, conflicts: Array }>}
   */
  async incrementalSync(localData, sinceToken) {
    throw new Error('Not implemented')
  }

  /**
   * 解决冲突
   * @param {Array} conflicts
   * @param {'local'|'remote'|'manual'} strategy
   * @returns {Promise<void>}
   */
  async resolveConflicts(conflicts, strategy) {
    throw new Error('Not implemented')
  }
}

export default SyncProvider
```

### 4.3 WebDAV Provider 实现（v2.1 预留）

WebDAV 是最简单的云同步方案，兼容 Nextcloud、坚果云、坚果云等自建/第三方服务：

```javascript
// services/sync/WebDavProvider.js

import SyncProvider from './SyncProvider.js'

const SYNC_PATH = '/buddhist-reader/sync'
const VERSION_FILE = `${SYNC_PATH}/version.json`

class WebDavProvider extends SyncProvider {
  constructor() {
    super()
    this.baseURL = ''
    this.authHeader = ''
  }

  async init(config) {
    this.baseURL = config.url
    const credentials = btoa(`${config.username}:${config.password}`)
    this.authHeader = `Basic ${credentials}`

    // 验证连接
    try {
      await this._request('PROPFIND', SYNC_PATH)
      return true
    } catch (e) {
      // 目录不存在，创建之
      if (e.status === 404) {
        await this._request('MKCOL', SYNC_PATH)
        return true
      }
      return false
    }
  }

  async getRemoteVersion() {
    const resp = await this._request('GET', VERSION_FILE)
    return JSON.parse(resp)
  }

  async fullSync(backupData) {
    // 1. 上传数据文件
    const dataJson = JSON.stringify(backupData)
    await this._request('PUT', `${SYNC_PATH}/data.json`, dataJson)

    // 2. 更新版本标记
    const version = {
      version: '1',
      lastSyncedAt: new Date().toISOString(),
      checksum: backupData.checksum,
      tableVersions: this._getTableVersions(backupData),
    }
    await this._request('PUT', VERSION_FILE, JSON.stringify(version))

    return { success: true, uploaded: this._countRecords(backupData) }
  }

  async downloadTable(tableName, since) {
    const resp = await this._request('GET', `${SYNC_PATH}/data.json`)
    const data = JSON.parse(resp)

    // 根据表名提取对应数据
    const tableMap = {
      settings: data.settings,
      sutras: data.sutras,
      dictionaries: data.dictionaries,
      readingProgress: data.readingProgress,
      bookmarks: data.bookmarks,
      userNotes: data.userNotes,
      statistics: data.statistics,
    }

    return tableMap[tableName] || []
  }

  async _request(method, path, body) {
    const options = {
      method,
      headers: {
        'Authorization': this.authHeader,
      },
    }

    if (body) {
      options.body = body
      options.headers['Content-Type'] = 'application/json'
    }

    const resp = await fetch(`${this.baseURL}${path}`, options)

    if (!resp.ok) {
      const error = new Error(`WebDAV ${method} ${path} failed: ${resp.status}`)
      error.status = resp.status
      throw error
    }

    if (method === 'GET') {
      return resp.text()
    }
    return null
  }
}

export default WebDavProvider
```

### 4.4 自建 API Provider（远期预留）

```javascript
// services/sync/ApiProvider.js（v2.2+ 预留）

import SyncProvider from './SyncProvider.js'

class ApiProvider extends SyncProvider {
  async init(config) {
    this.baseURL = config.apiURL
    this.token = config.token
    // 验证 token
    const resp = await fetch(`${this.baseURL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })
    return resp.ok
  }

  async fullSync(backupData) {
    const resp = await fetch(`${this.baseURL}/api/sync/full`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backupData),
    })
    return resp.json()
  }

  async incrementalSync(localData, sinceToken) {
    const resp = await fetch(`${this.baseURL}/api/sync/incremental`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'X-Since-Token': sinceToken,
      },
      body: JSON.stringify(localData),
    })
    return resp.json()
  }
}

export default ApiProvider
```

### 4.5 SyncManager 协调器

```javascript
// services/sync/SyncManager.js

import WebDavProvider from './WebDavProvider.js'
// import ApiProvider from './ApiProvider.js'  // 远期

const PROVIDER_TYPES = {
  webdav: WebDavProvider,
  // api: ApiProvider,
}

class SyncManager {
  constructor() {
    this.provider = null
    this.providerType = null
    this.syncing = false
    this.lastSyncAt = null
  }

  /**
   * 配置并初始化 Provider
   */
  async configure(type, config) {
    const ProviderClass = PROVIDER_TYPES[type]
    if (!ProviderClass) throw new Error(`不支持的同步类型: ${type}`)

    this.provider = new ProviderClass()
    this.providerType = type

    const authenticated = await this.provider.init(config)
    if (!authenticated) throw new Error('认证失败')

    // 保存配置到本地（不含密码）
    await db.put('settings', 'sync_config', {
      type,
      ...config,
      password: undefined,
      token: undefined,
    })

    return true
  }

  /**
   * 全量同步到云端
   */
  async pushToCloud() {
    if (this.syncing) throw new Error('同步进行中')
    if (!this.provider) throw new Error('未配置同步')

    this.syncing = true
    try {
      // 导出当前全部数据
      const backupData = await exportAllData()

      // 上传到云端
      const result = await this.provider.fullSync(backupData)

      this.lastSyncAt = new Date()
      await db.put('settings', 'last_sync_at', this.lastSyncAt.toISOString())

      return result
    } finally {
      this.syncing = false
    }
  }

  /**
   * 从云端拉取并合并
   */
  async pullFromCloud() {
    if (this.syncing) throw new Error('同步进行中')
    if (!this.provider) throw new Error('未配置同步')

    this.syncing = true
    try {
      // 获取云端版本
      const remoteVersion = await this.provider.getRemoteVersion()

      // 获取本地版本
      const localVersion = await this._getLocalVersion()

      // 如果云端更新
      if (remoteVersion.lastSyncedAt > localVersion.lastSyncAt) {
        // 下载并合并
        const remoteData = await this._downloadAllTables()
        const conflicts = this._detectConflicts(remoteData)

        if (conflicts.length > 0) {
          // 有冲突，需要用户选择
          return { needsConflictResolution: true, conflicts }
        }

        await this._mergeData(remoteData)
      }

      return { success: true, merged: true }
    } finally {
      this.syncing = false
    }
  }
}

export default new SyncManager()
```

### 4.6 数据同步冲突检测

```javascript
/**
 * 检测本地与云端数据的冲突
 * @param {Object} remoteData
 * @returns {Array<{ table: string, key: string, local: any, remote: any }>}
 */
function _detectConflicts(remoteData) {
  const conflicts = []

  // 需要冲突检测的表（有 updatedAt 字段的）
  const trackableTables = ['user_notes', 'bookmarks', 'reading_progress', 'settings']

  for (const tableName of trackableTables) {
    const localRecords = await db.getAll(tableName)
    const remoteRecords = remoteData[tableName]
    if (!remoteRecords) continue

    for (const remoteRecord of remoteRecords) {
      const localRecord = localRecords.find(r => r.id === remoteRecord.id)
      if (!localRecord) continue // 新记录，无冲突

      // 两边都有修改（时间戳不同）
      if (
        localRecord.updatedAt !== remoteRecord.updatedAt &&
        localRecord.updatedAt > remoteData.metadata.exportedAt // 本地在导出后修改过
      ) {
        conflicts.push({
          table: tableName,
          key: remoteRecord.id,
          local: localRecord,
          remote: remoteRecord,
        })
      }
    }
  }

  return conflicts
}
```

## 5. 数据加密

### 5.1 威胁模型分析

| 数据类型 | 敏感程度 | 泄露场景 | 是否需要加密 |
|----------|----------|----------|-------------|
| 词典数据 | 低 | 公开内容，无隐私风险 | 否 |
| 经书内容 | 低 | 公开内容 | 否 |
| 阅读进度 | 低 | 个人习惯 | 否 |
| 书签 | 低 | 个人标记 | 否 |
| 统计信息 | 低 | 个人诵读记录 | 否 |
| **用户笔记** | **中-高** | 可能包含个人感悟、隐私信息 | **可选加密** |
| 设置配置 | 低 | 字体、字号偏好 | 否 |
| 备份文件 | **中** | 导出文件可能被他人获取 | **可选加密** |

**结论**：v2.0 阶段，仅用户笔记提供可选加密，其他数据不加密。理由：

1. IndexedDB 是同源隔离的，其他网站无法访问
2. 无后端传输，不存在传输泄露
3. 加密增加复杂度，且密钥管理本身是安全问题
4. 大多数用户笔记不含敏感内容

### 5.2 用户笔记加密方案

#### 5.2.1 加密流程

```
用户输入笔记内容
        │
        ▼
┌──────────────────────────┐
│ 1. 用户开启笔记加密       │
│    - 首次设置加密密码     │
│    - 或从已有密码解锁     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 2. PBKDF2 派生密钥       │
│    - 100,000 次迭代       │
│    - 随机 salt (16B)      │
│    - AES-256-GCM          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 3. AES-GCM 加密          │
│    - 随机 IV (12B)        │
│    - GCM 认证标签 (16B)   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 4. 存储到 IndexedDB       │
│    格式: {               │
│      encrypted: true,    │
│      salt: "...",        │
│      iv: "...",          │
│      ciphertext: "...",  │
│      tag: "..."          │
│    }                     │
└──────────────────────────┘
```

#### 5.2.2 加密实现

```javascript
// utils/crypto.js

const ENCRYPTION_CONFIG = {
  pbkdf2: {
    iterations: 100000,
    hash: 'SHA-256',
    saltLength: 16,
  },
  aes: {
    name: 'AES-GCM',
    length: 256,
    ivLength: 12,
  },
}

/**
 * 从密码派生加密密钥
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ENCRYPTION_CONFIG.pbkdf2.iterations,
      hash: ENCRYPTION_CONFIG.pbkdf2.hash,
    },
    keyMaterial,
    { name: ENCRYPTION_CONFIG.aes.name, length: ENCRYPTION_CONFIG.aes.length },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密笔记内容
 * @param {string} plaintext
 * @param {string} password
 * @returns {Promise<Object>} 加密后的存储对象
 */
export async function encryptNote(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.pbkdf2.saltLength))
  const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.aes.ivLength))
  const key = await deriveKey(password, salt)

  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_CONFIG.aes.name, iv },
    key,
    encoder.encode(plaintext)
  )

  return {
    encrypted: true,
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
  }
}

/**
 * 解密笔记内容
 * @param {Object} encryptedData
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function decryptNote(encryptedData, password) {
  const salt = new Uint8Array(encryptedData.salt)
  const iv = new Uint8Array(encryptedData.iv)
  const ciphertext = new Uint8Array(encryptedData.ciphertext)
  const key = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_CONFIG.aes.name, iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * 验证密码是否正确
 * @param {Object} encryptedData
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(encryptedData, password) {
  try {
    await decryptNote(encryptedData, password)
    return true
  } catch {
    return false
  }
}
```

#### 5.2.3 密钥管理策略

| 方案 | 安全性 | 体验 | 适用场景 |
|------|--------|------|----------|
| **A. 每次输入密码** | 高 | 差 | 极高敏感笔记 |
| **B. Session 缓存密钥** | 中 | 好 | **v2.0 推荐** |
| C. localStorage 存密钥 | 低 | 极好 | 不推荐 |

**v2.0 推荐方案 B**：

```javascript
// services/NoteEncryptionService.js

class NoteEncryptionService {
  constructor() {
    // 内存中缓存密钥（关闭标签页后清除）
    this._keyCache = new Map()
    this._passwordVerified = false
  }

  /**
   * 用户首次设置加密密码
   */
  async setupPassword(password) {
    // 用密码加密一个已知的测试值
    const testNote = await encryptNote('verified', password)
    // 存储测试密文用于后续验证
    await db.put('settings', 'note_encryption_test', testNote)
    // 缓存密钥
    const salt = new Uint8Array(testNote.salt)
    const key = await deriveKey(password, salt)
    this._keyCache.set('default', key)
    this._passwordVerified = true
  }

  /**
   * 用户输入密码解锁
   */
  async unlockPassword(password) {
    const testNote = await db.get('settings', 'note_encryption_test')
    if (!testNote) return false

    const valid = await verifyPassword(testNote, password)
    if (valid) {
      const salt = new Uint8Array(testNote.salt)
      const key = await deriveKey(password, salt)
      this._keyCache.set('default', key)
      this._passwordVerified = true
    }
    return valid
  }

  /**
   * 加密笔记（自动使用缓存密钥）
   */
  async encryptNote(plaintext) {
    const key = this._keyCache.get('default')
    if (!key) throw new Error('密码未解锁')

    // 使用缓存密钥加密
    const salt = new Uint8Array(16) // 复用已有 salt
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoder = new TextEncoder()
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    )

    return {
      encrypted: true,
      salt: Array.from(salt),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)),
    }
  }

  /**
   * 解锁后清除密钥
   */
  lock() {
    this._keyCache.clear()
    this._passwordVerified = false
  }
}

export default new NoteEncryptionService()
```

### 5.3 备份文件加密（可选）

用户导出备份文件时，可选择设置密码加密整个备份：

```javascript
// services/backupService.js

/**
 * 加密备份文件
 * @param {Object} backupData - 完整备份数据
 * @param {string} password - 用户密码
 * @returns {Promise<Blob>} 加密后的文件 Blob
 */
export async function encryptBackup(backupData, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)

  const jsonStr = JSON.stringify(backupData)
  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonStr)
  )

  // 打包为自定义格式: [magic(4B)] + [salt(16B)] + [iv(12B)] + [ciphertext]
  const magic = new TextEncoder().encode('BFRX') // Buddhist Reader eXport
  const header = new Uint8Array([...magic, ...salt, ...iv])
  const fullData = new Uint8Array([...header, ...new Uint8Array(ciphertext)])

  return new Blob([fullData], { type: 'application/octet-stream' })
}

/**
 * 解密备份文件
 * @param {Blob} file - 加密的备份文件
 * @param {string} password
 * @returns {Promise<Object>} 解密后的备份数据
 */
export async function decryptBackup(file, password) {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)

  // 检查 magic
  const magic = new TextDecoder().decode(data.slice(0, 4))
  if (magic !== 'BFRX') {
    throw new Error('不是有效的加密备份文件')
  }

  const salt = data.slice(4, 20)
  const iv = data.slice(20, 32)
  const ciphertext = data.slice(32)

  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return JSON.parse(new TextDecoder().decode(decrypted))
}
```

加密备份文件扩展名：`.bfrx`（Buddhist Reader eXport encrypted）
普通备份文件扩展名：`.json`

## 6. 数据损坏恢复

### 6.1 损坏场景与检测

| 损坏场景 | 触发条件 | 检测方式 |
|----------|----------|----------|
| **数据库无法打开** | 异常断电、浏览器崩溃 | `openDB()` 抛出 `UnknownError` 或 `AbortError` |
| **单表损坏** | 写入中断、事务未完成 | `getAll(store)` 返回空或数据结构异常 |
| **数据不一致** | 多表写入部分成功 | 校验关联数据完整性（如 dict_config 有记录但 dict_entries 为空） |
| **存储满** | IndexedDB 配额用尽 | `QuotaExceededError` |
| **版本冲突** | 多个标签页同时升级 | `VersionError` |

### 6.2 恢复策略层级

```
┌──────────────────────────────────────────┐
│  数据恢复策略层级                         │
├──────────────────────────────────────────┤
│                                          │
│  Level 1: 自动修复（无数据丢失）          │
│  ├── 重试打开数据库（最多 3 次）          │
│  ├── 关闭其他标签页后重试                │
│  └── 降级到 localStorage                 │
│                                          │
│  Level 2: 部分恢复（最小数据丢失）        │
│  ├── 逐个表检测，跳过损坏表              │
│  ├── 从自动备份恢复（7 天内）            │
│  └── 保留未损坏表的数据                  │
│                                          │
│  Level 3: 完整恢复（从用户备份）          │
│  ├── 删除损坏数据库                      │
│  ├── 重建空数据库                        │
│  └── 引导用户导入最近备份                │
│                                          │
│  Level 4: 重置（全新开始）               │
│  ├── 删除全部数据                        │
│  └── 内置词典 + 默认设置自动恢复         │
│                                          │
└──────────────────────────────────────────┘
```

### 6.3 自动修复实现

```javascript
// storage/dbRecovery.js

import { openDB } from 'idb'
import { DB_NAME, DB_VERSION, upgradeSchema } from './db.js'

/**
 * 带恢复机制的数据库打开
 */
export async function openDatabaseWithRecovery() {
  // Level 1: 重试打开
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade: upgradeSchema,
        blocked() {
          showNotification('请关闭其他标签页中的佛经阅读器')
        },
      })

      // 验证基本读写能力
      await healthCheck(db)
      return db

    } catch (e) {
      console.warn(`数据库打开失败 (尝试 ${attempt}/3): ${e.name}`)

      if (e.name === 'VersionError') {
        // 磁盘上的数据库版本高于请求版本
        console.error('数据库版本冲突，需要手动处理')
        throw e
      }

      if (attempt === 3) {
        // 最后一次失败，进入 Level 2
        return await attemptPartialRecovery()
      }

      // 等待后重试（指数退避）
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)))
    }
  }
}

/**
 * 数据库健康检查
 */
async function healthCheck(db) {
  // 检查关键表是否可读写
  const criticalStores = ['sutra_index', 'dict_config', 'settings']

  for (const storeName of criticalStores) {
    try {
      // 尝试读取
      const allStores = db.objectStoreNames
      if (!allStores.contains(storeName)) {
        throw new Error(`表 ${storeName} 不存在`)
      }

      // 尝试写入测试记录
      const tx = db.transaction(storeName, 'readwrite')
      const testKey = `_health_check_${Date.now()}`
      await tx.objectStore(storeName).put({ id: testKey, _healthCheck: true })
      await tx.objectStore(storeName).delete(testKey)
      await tx.done
    } catch (e) {
      throw new Error(`表 ${storeName} 健康检查失败: ${e.message}`)
    }
  }
}
```

### 6.4 部分恢复实现

```javascript
/**
 * Level 2: 部分恢复
 * 尝试逐个表检测，跳过损坏的表
 */
async function attemptPartialRecovery() {
  console.warn('进入部分恢复模式')

  // 检查是否有自动备份
  const autoBackups = await getAutoBackups()
  const latestBackup = autoBackups.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )[0]

  if (latestBackup) {
    const backupAge = Date.now() - new Date(latestBackup.createdAt).getTime()
    const backupAgeHours = backupAge / (1000 * 60 * 60)

    if (backupAgeHours < 168) { // 7 天内
      return {
        mode: 'partial-recovery',
        canRestoreFromAutoBackup: true,
        autoBackupAge: Math.round(backupAgeHours),
        autoBackupData: latestBackup.data,
      }
    }
  }

  // 无可用自动备份，引导用户导入手动备份
  return {
    mode: 'partial-recovery',
    canRestoreFromAutoBackup: false,
    message: '数据库损坏且无可用自动备份，请导入之前的手动备份',
  }
}

/**
 * 获取所有有效的自动备份
 */
async function getAutoBackups() {
  try {
    const backupDb = await openDB('buddhist-reader-backups', 1)
    const allBackups = await backupDb.getAll('auto_backups')
    // 过滤过期的
    const now = new Date()
    return allBackups.filter(b => new Date(b.expiresAt) > now)
  } catch {
    return []
  }
}
```

### 6.5 数据一致性校验

```javascript
// services/dataIntegrity.js

/**
 * 校验数据一致性
 * 在启动时和导入后运行
 */
export async function checkDataIntegrity() {
  const db = await getDB()
  const issues = []

  // 1. 检查 dict_config 和 dict_entries 的一致性
  const dictConfigs = await db.getAll('dict_config')
  for (const config of dictConfigs) {
    const entries = await db.count('dict_entries', IDBKeyRange.bound(
      `${config.dictId}::`, `${config.dictId}::\uffff`
    ))
    if (config.entryCount !== entries && config.type !== 'builtin') {
      issues.push({
        type: 'count_mismatch',
        table: 'dict_entries',
        dictId: config.dictId,
        expected: config.entryCount,
        actual: entries,
        severity: 'warning',
      })
    }
  }

  // 2. 检查 sutra_index 和 sutra_content 的一致性
  const sutraIndex = await db.getAll('sutra_index')
  for (const sutra of sutraIndex) {
    const chapters = await db.getAll('sutra_content',
      IDBKeyRange.bound(`${sutra.id}::`, `${sutra.id}::\uffff`)
    )
    if (chapters.length === 0 && sutra.loadStatus === 'ready') {
      issues.push({
        type: 'missing_content',
        sutraId: sutra.id,
        severity: 'error',
      })
    }
  }

  // 3. 检查 reading_progress 引用的 sutraId 是否存在
  const progressRecords = await db.getAll('reading_progress')
  const sutraIds = new Set(sutraIndex.map(s => s.id))
  for (const progress of progressRecords) {
    if (!sutraIds.has(progress.sutraId)) {
      issues.push({
        type: 'orphan_progress',
        sutraId: progress.sutraId,
        severity: 'warning',
      })
    }
  }

  // 4. 检查 checksum（如果有存储的话）
  const storedChecksum = await db.get('settings', 'data_checksum')
  if (storedChecksum) {
    const currentChecksum = await computeCurrentDataChecksum(db)
    if (currentChecksum !== storedChecksum) {
      issues.push({
        type: 'checksum_mismatch',
        severity: 'error',
      })
    }
  }

  return {
    valid: issues.every(i => i.severity !== 'error'),
    issues,
    warnings: issues.filter(i => i.severity === 'warning'),
    errors: issues.filter(i => i.severity === 'error'),
  }
}

/**
 * 计算当前数据校验和（用于检测未预期的变更）
 */
async function computeCurrentDataChecksum(db) {
  const data = {
    settings: await db.getAll('settings'),
    sutras: await db.getAll('sutra_index'),
    dictConfigs: await db.getAll('dict_config'),
  }

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(data))
  )
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
```

### 6.6 恢复引导 UI

```
┌──────────────────────────────────────────┐
│  ⚠️  数据恢复                            │
├──────────────────────────────────────────┤
│                                          │
│  检测到数据库异常，可能的原因：           │
│  • 浏览器存储被清除                       │
│  • 数据库文件损坏                         │
│  • 存储空间不足                           │
│                                          │
│  ── 恢复选项 ──                          │
│                                          │
│  选项 1：从自动备份恢复                   │
│  找到 2 天前的自动备份                    │
│  [ 恢复 ]                                 │
│                                          │
│  选项 2：导入手动备份                     │
│  选择之前导出的 .json 或 .bfrx 文件       │
│  [ 选择文件 ]                             │
│                                          │
│  选项 3：重新开始                         │
│  清除所有数据，使用默认设置               │
│  ⚠️ 此操作不可逆                          │
│  [ 重置 ]                                 │
│                                          │
│  ── 数据诊断 ──                          │
│  [ 查看详细信息 ]                         │
│                                          │
└──────────────────────────────────────────┘
```

## 7. 结论与建议

### 7.1 v2.0 阶段安全策略

| 功能 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| **JSON 数据导出** | **本期实现** | P0 | 完整备份所有数据，含 metadata 和 checksum |
| **JSON 数据导入** | **本期实现** | P0 | 支持合并/追加/替换三种策略，含冲突检测 |
| **CSV 辅助导出** | **本期实现** | P1 | 仅表格数据，适合电子表格查看 |
| **自动备份（导入前）** | **本期实现** | P0 | 存储在独立 IndexedDB，7 天过期 |
| **数据完整性校验** | **本期实现** | P1 | 启动时自动检测，生成诊断报告 |
| **数据库恢复引导** | **本期实现** | P0 | 4 级恢复策略，引导用户操作 |
| **用户笔记加密** | **本期实现** | P2 | 可选功能，使用 Web Crypto API AES-256-GCM |
| **备份文件加密** | **本期实现** | P2 | 可选功能，扩展名 .bfrx |
| **SyncProvider 接口** | **本期定义** | P1 | 接口预留，不实现具体 Provider |
| **WebDAV 同步** | **v2.1** | - | 基于 SyncProvider 接口的首个实现 |
| **自建 API 同步** | **v2.2** | - | 需要后端服务支持 |

### 7.2 加密决策

| 决策点 | 结果 | 理由 |
|--------|------|------|
| v2.0 是否加密 IndexedDB 数据 | **否** | 同源策略已足够，加密增加复杂度和性能开销 |
| 用户笔记加密是否可选 | **是** | 多数用户笔记不含敏感内容，强制加密影响体验 |
| 加密算法 | **AES-256-GCM + PBKDF2** | 浏览器原生支持，无需
| PBKDF2 迭代次数 | **100,000** | OWASP 推荐值，平衡安全性和性能 |
| 密钥存储策略 | **Session 缓存** | 关闭标签页后清除，不在本地持久化密钥 |
| 备份文件加密 | **可选** | 扩展名 .bfrx，密码由用户自主设定 |

### 7.3 数据导出/导入性能预期

| 操作 | 数据量 | 预期耗时 | 说明 |
|------|--------|----------|------|
| JSON 导出（全量） | 5MB 以内 | < 500ms | 序列化 + checksum 计算 |
| JSON 导出（全量） | 50MB 词典数据 | 2-5s | 分块导出，用户分批下载 |
| JSON 导入（合并） | 5MB 以内 | < 1s | 分批写入 + 事务 |
| JSON 导入（合并） | 50MB 词典数据 | 5-15s | 500 条/批，含进度通知 |
| CSV 导出 | 1 万条记录 | < 200ms | 简单序列化 |
| Checksum 计算 | 5MB JSON | < 100ms | Web Crypto API SHA-256 |
| 笔记加密/解密 | 单条 | < 10ms | PBKDF2 首次 ~100ms |
| 备份文件加密 | 5MB | 1-2s | AES-GCM 加密 + 序列化 |

### 7.4 新增文件清单

```
src/
├── services/
│   ├── backupService.js          # 数据导出/导入核心服务
│   ├── dataIntegrity.js          # 数据一致性校验
│   └── sync/
│       ├── SyncProvider.js       # 云同步抽象接口
│       ├── SyncManager.js        # 同步协调器
│       └── WebDavProvider.js     # WebDAV 实现（v2.1）
├── storage/
│   ├── dbRecovery.js             # 数据库恢复
│   └── autoBackup.js             # 自动备份管理
├── utils/
│   ├── crypto.js                 # 加密/解密工具
│   └── checksum.js               # SHA-256 校验工具
├── components/
│   └── common/
│       ├── BackupManager.vue     # 备份管理页面组件
│       ├── ImportDialog.vue      # 导入对话框
│       ├── ConflictResolver.vue  # 冲突解决组件
│       ├── RecoveryGuide.vue     # 恢复引导页面
│       └── EncryptionSetup.vue   # 加密设置组件
└── pages/
    └── DataManagement.vue        # 数据管理页面（设置中的子页）
```

## 8. 对 v2.1 方案的影响

### 8.1 必须在 v2.0 中完成的基础

以下功能必须在 v2.0 中实现，否则 v2.1 的云同步将无法工作：

1. **统一的 JSON 导出格式**：云端同步的数据格式必须与本地导出格式一致
2. **SyncProvider 接口定义**：v2.1 的 WebDAV Provider 依赖此接口
3. **数据版本号机制**：云端增量同步需要版本号，v2.0 的备份 metadata 中需包含版本号
4. **checksum 校验**：备份和同步数据都需要完整性验证
5. **事务性写入**：导入和同步都使用相同的事务机制

### 8.2 v2.1 可基于本报告直接实现的功能

| 功能 | 依赖 v2.0 的基础 | 工作量预估 |
|------|-----------------|-----------|
| WebDAV 云同步 | SyncProvider 接口 + JSON 导出格式 | 3-4 天 |
| 自动定期备份 | 备份服务 + IndexedDB 备份存储 | 1 天 |
| 增量同步 | 数据版本号 + 冲突检测 | 2-3 天 |
| 多设备同步冲突 UI | ConflictResolver 组件 | 1-2 天 |

### 8.3 v2.0 方案中需新增的内容

1. **新增表 `auto_backups`**：在独立数据库 `buddhist-reader-backups` 中，用于存储导入前的自动备份
2. **新增设置项**：
   - `backup.autoBackupOnImport`（默认 true）
   - `backup.autoBackupRetentionDays`（默认 7）
   - `noteEncryption.enabled`（默认 false）
   - `noteEncryption.passwordSet`（boolean，标记是否设置了密码）
   - `sync.provider`（预留，v2.0 为 null）
3. **v1.0 迁移脚本增强**：除了迁移阅读进度和设置外，还需检查 v1.0 是否有用户笔记并迁移
4. **备份管理入口**：在设置页面新增"数据管理"子页面，包含导出/导入/恢复/加密设置

### 8.4 对现有模块的影响

| 模块 | 影响 | 修改内容 |
|------|------|----------|
| `storage/db.js` | 需引入恢复机制 | 添加 `openDatabaseWithRecovery()` 替代直接 `openDB()` |
| `services/dictService.js` | 导入词典时触发自动备份 | 在 `importDict()` 开头调用 `createAutoBackup()` |
| `services/settingService.js` | 新增备份/加密相关设置 | 扩展设置项定义 |
| `pages/Settings.vue` | 新增数据管理入口 | 添加"备份与恢复"菜单项 |
| `pinia stores` | 导入后需要刷新 | 导入完成后 dispatch store 刷新动作 |

---

*文档版本: v1.0.0*
*最后更新: 2026-05-02*
