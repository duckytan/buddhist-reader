# Service 层接口抽象设计 报告

> 任务编号：T-48
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

### 1.1 背景

v2.0 项目方案明确架构原则为"纯前端优先、接口预留"，即所有功能在前端完成，但数据访问层抽象为接口，随时可切换为后端 API。当前 v1.0 的数据访问直接耦合在组件和 Store 中（localStorage、硬编码数据），缺乏统一的抽象层。

### 1.2 目标

1. 定义统一的 Service 接口规范，使 UI 层和 Store 层不依赖具体实现
2. 支持 IndexedDB 实现（v2.0 当前方案）与 REST API 实现（未来可选）的无缝切换
3. 统一数据格式、错误处理、版本管理，为多平台（H5/小程序/App）预留扩展能力

## 2. 架构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    UI 层 (Vue 3 Components)               │
├─────────────────────────────────────────────────────────┤
│                    Store 层 (Pinia)                      │
│  sutraStore | dictStore | readerStore | settingStore     │
├─────────────────────────────────────────────────────────┤
│                    Service 层 (接口 + 实现)               │
│                                                         │
│  ┌─────────────┐  ISutraService  ┌──────────────────┐   │
│  │ SutraService│◄──────────────►│ SutraServiceImpl  │   │
│  └─────────────┘   (interface)   │ (IndexedDB)       │   │
│                                  │ SutraApiService   │   │
│  ┌─────────────┐  IDictService   │ (REST API, v2.1+) │   │
│  │ DictService │◄──────────────►│                   │   │
│  └─────────────┘   (interface)   └──────────────────┘   │
│                                                         │
│  ┌────────────────┐ ┌──────────────┐ ┌───────────────┐ │
│  │ ProgressService│ │ StatsService │ │  TTSService   │ │
│  └────────────────┘ └──────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Storage 层 (底层存储)                  │
│  IndexedDB (idb) | File Cache | In-Memory Trie/Cache    │
└─────────────────────────────────────────────────────────┘
```

**核心原则**：
- UI 和 Store 只依赖 Service 接口（TypeScript `interface`）
- 具体实现通过工厂函数或依赖注入注册
- 切换后端只需替换实现实例，无需改动 Store 和 UI

### 2.2 接口定义

所有接口使用 TypeScript 定义，返回值统一包装为 `ServiceResult<T>`。

#### 基础类型

```typescript
// types/service.ts

// 统一 Service 返回值
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: ServiceError
}

// 统一错误结构
export interface ServiceError {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

// 错误码枚举
export enum ErrorCode {
  // 通用
  UNKNOWN = 'UNKNOWN',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_PARAM = 'INVALID_PARAM',
  DUPLICATE = 'DUPLICATE',

  // 存储层
  STORAGE_FULL = 'STORAGE_FULL',
  DB_VERSION_MISMATCH = 'DB_VERSION_MISMATCH',

  // 网络层（预留）
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // 业务层
  SUTRA_IMPORT_FAILED = 'SUTRA_IMPORT_FAILED',
  DICT_IMPORT_FAILED = 'DICT_IMPORT_FAILED',
  MDX_PARSE_ERROR = 'MDX_PARSE_ERROR',
  TTS_NOT_SUPPORTED = 'TTS_NOT_SUPPORTED',
}

// 分页参数
export interface PageParams {
  page: number
  pageSize: number
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

#### ISutraService

```typescript
// services/interfaces/ISutraService.ts

export interface SutraMeta {
  id: string
  title: string
  fullName: string
  translator: string
  cover: string
  description: string
  chapters: ChapterMeta[]
  totalWordCount: number
  loadStatus: 'pending' | 'loading' | 'ready' | 'error'
}

export interface ChapterMeta {
  index: number
  title: string
  wordCount: number
}

export interface ChapterContent {
  sutraId: string
  chapterIndex: number
  content: string
  wordCount: number
}

export interface SutraImportOptions {
  title?: string
  translator?: string
  description?: string
}

export interface ISutraService {
  /** 获取经书列表 */
  getSutraList(): Promise<ServiceResult<SutraMeta[]>>

  /** 获取单部经书元信息 */
  getSutra(id: string): Promise<ServiceResult<SutraMeta | null>>

  /** 获取指定章节内容 */
  getChapter(sutraId: string, chapterIndex: number): Promise<ServiceResult<ChapterContent | null>>

  /** 导入经书（txt 等格式） */
  importSutra(file: File, options?: SutraImportOptions): Promise<ServiceResult<SutraMeta>>

  /** 删除经书 */
  deleteSutra(id: string): Promise<ServiceResult<void>>

  /** 搜索经文内容 */
  searchSutra(query: string, sutraId?: string): Promise<ServiceResult<SearchResultItem[]>>
}

export interface SearchResultItem {
  sutraId: string
  chapterIndex: number
  position: number
  snippet: string
}
```

#### IDictService

```typescript
// services/interfaces/IDictService.ts

export interface DictConfig {
  dictId: string
  name: string
  type: 'builtin' | 'external' | 'user'
  enabled: boolean
  entryCount: number
  version: string
  uploadedAt?: string
  fileSize: number
  sourceFile?: string
  mdxStrategy?: 'parsed' | 'direct'
  authority?: 'official' | 'personal'
}

export interface DictEntry {
  term: string
  pinyin?: string
  sanskrit?: string
  definition: string
  category?: string
  _dictId: string
  _dictName: string
  _sourceId: string
  _version: number
}

export interface DictTermIndex {
  term: string
  dictId: string
  pinyin?: string
  category?: string
  hasDef: boolean
}

export interface DictHealthReport {
  dictId: string
  entryCount: number
  duplicateCount: number
  missingDefinitionCount: number
  formatErrors: string[]
  conflictsWithBuiltIn: number
  conflictsWithOtherDicts: number
}

export interface DictVersion {
  id: string
  dictId: string
  version: string
  uploadedAt: string
  entryCount: number
}

export interface UserNote {
  entryKey: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface DictImportOptions {
  dictName?: string
  dictId?: string
}

export interface IDictService {
  /** 初始化：加载索引，构建 Trie */
  init(): Promise<ServiceResult<void>>

  /** 获取所有词典列表（含开关状态） */
  getAllDicts(): Promise<ServiceResult<DictConfig[]>>

  /** 获取启用的词典列表 */
  getEnabledDicts(): Promise<ServiceResult<DictConfig[]>>

  /** 切换词典开关 */
  toggleDict(dictId: string, enabled: boolean): Promise<ServiceResult<DictConfig>>

  /** 查询单个词典的词条释义（按需加载） */
  lookupTerm(term: string, dictId: string): Promise<ServiceResult<DictEntry | null>>

  /** 批量查询（多词典并行） */
  lookupTermAll(term: string, dictIds: string[]): Promise<ServiceResult<DictEntry[]>>

  /** 获取词典词条索引列表（用于构建 Trie） */
  getTermIndex(dictId: string): Promise<ServiceResult<DictTermIndex[]>>

  /** 导入词典（JSON/CSV/MDX） */
  importDict(file: File, options?: DictImportOptions): Promise<ServiceResult<DictConfig>>

  /** 删除词典 */
  deleteDict(dictId: string): Promise<ServiceResult<void>>

  /** 获取词典版本历史 */
  getDictVersions(dictId: string): Promise<ServiceResult<DictVersion[]>>

  /** 获取词典体检报告 */
  getDictHealthReport(dictId: string): Promise<ServiceResult<DictHealthReport>>

  /** 添加/更新用户笔记 */
  setUserNote(entryKey: string, content: string): Promise<ServiceResult<UserNote>>

  /** 获取用户笔记 */
  getUserNote(entryKey: string): Promise<ServiceResult<UserNote | null>>

  /** 删除用户笔记 */
  deleteUserNote(entryKey: string): Promise<ServiceResult<void>>
}
```

#### IProgressService

```typescript
// services/interfaces/IProgressService.ts

export interface ReadingProgress {
  id: string
  sutraId: string
  chapter: number
  position: number
  readTime: number
  lastReadAt: string
}

export interface IProgressService {
  /** 保存阅读进度 */
  saveProgress(sutraId: string, chapter: number, position: number): Promise<ServiceResult<ReadingProgress>>

  /** 获取单部经书的阅读进度 */
  getProgress(sutraId: string): Promise<ServiceResult<ReadingProgress | null>>

  /** 获取所有阅读进度 */
  getAllProgress(): Promise<ServiceResult<ReadingProgress[]>>

  /** 保存书签 */
  addBookmark(sutraId: string, chapter: number, position: number, note?: string): Promise<ServiceResult<Bookmark>>

  /** 获取书签列表 */
  getBookmarks(sutraId: string): Promise<ServiceResult<Bookmark[]>>

  /** 删除书签 */
  deleteBookmark(bookmarkId: string): Promise<ServiceResult<void>>
}

export interface Bookmark {
  id: string
  sutraId: string
  chapter: number
  position: number
  note?: string
  createdAt: string
}
```

#### IStatsService

```typescript
// services/interfaces/IStatsService.ts

export interface ReadingStats {
  sutraId: string
  date: string
  count: number
  duration: number
}

export interface StatsSummary {
  totalReadCount: number
  totalReadDuration: number
  currentStreak: number
  longestStreak: number
  topSutras: { sutraId: string; title: string; count: number }[]
  dailyStats: ReadingStats[]
}

export interface IStatsService {
  /** 记录诵读会话 */
  recordSession(sutraId: string, duration: number): Promise<ServiceResult<void>>

  /** 获取统计数据 */
  getStats(period: 'day' | 'week' | 'month' | 'all'): Promise<ServiceResult<StatsSummary>>

  /** 获取连续诵读天数 */
  getStreak(): Promise<ServiceResult<{ current: number; longest: number }>>
}
```

#### ITTSService

```typescript
// services/interfaces/ITTSService.ts

export interface TTSVoice {
  id: string
  name: string
  lang: string
  localService: boolean
}

export interface TTSOptions {
  voiceId?: string
  rate?: number
  pitch?: number
  volume?: number
}

export interface ITTSService {
  /** 获取可用语音列表 */
  getVoices(): Promise<ServiceResult<TTSVoice[]>>

  /** 朗读文本 */
  speak(text: string, options?: TTSOptions): Promise<ServiceResult<void>>

  /** 暂停朗读 */
  pause(): Promise<ServiceResult<void>>

  /** 恢复朗读 */
  resume(): Promise<ServiceResult<void>>

  /** 停止朗读 */
  stop(): Promise<ServiceResult<void>>

  /** 是否正在朗读 */
  isSpeaking(): boolean

  /** 是否支持 TTS */
  isSupported(): boolean
}

/**
 * ISettingService — 设置服务
 */

export interface AppSettings {
  // 阅读设置
  fontSize: number
  lineHeight: number
  showPinyin: boolean
  showHighlight: boolean
  theme: 'light' | 'warm' | 'dark'

  // TTS 设置
  ttsVoiceId?: string
  ttsRate: number

  // 词典设置
  defaultDictIds: string[]

  // 系统
  migrated: boolean
  lastAppVersion: string
}

export interface ISettingService {
  /** 获取全部设置 */
  getAll(): Promise<ServiceResult<AppSettings>>

  /** 获取单个设置项 */
  get<K extends keyof AppSettings>(key: K): Promise<ServiceResult<AppSettings[K]>>

  /** 更新单个设置项 */
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<ServiceResult<void>>

  /** 批量更新设置 */
  setAll(settings: Partial<AppSettings>): Promise<ServiceResult<void>>

  /** 重置为默认值 */
  reset(): Promise<ServiceResult<void>>
}
```

### 2.3 Service 注册与工厂

```typescript
// services/factory.ts

import type { ISutraService } from './interfaces/ISutraService'
import type { IDictService } from './interfaces/IDictService'
import type { IProgressService } from './interfaces/IProgressService'
import type { IStatsService } from './interfaces/IStatsService'
import type { ITTSService } from './interfaces/ITTSService'
import type { ISettingService } from './interfaces/ISettingService'

// 当前运行模式
export type ServiceMode = 'local' | 'api'

export interface ServiceRegistry {
  sutra: ISutraService
  dict: IDictService
  progress: IProgressService
  stats: IStatsService
  tts: ITTSService
  setting: ISettingService
}

let registry: ServiceRegistry | null = null

/** 初始化 Service 工厂（应用启动时调用一次） */
export async function initServices(mode: ServiceMode = 'local'): Promise<ServiceRegistry> {
  if (registry) return registry

  if (mode === 'local') {
    const { SutraServiceLocal } = await import('./impl/SutraServiceLocal')
    const { DictServiceLocal } = await import('./impl/DictServiceLocal')
    const { ProgressServiceLocal } = await import('./impl/ProgressServiceLocal')
    const { StatsServiceLocal } = await import('./impl/StatsServiceLocal')
    const { TTSServiceLocal } = await import('./impl/TTSServiceLocal')
    const { SettingServiceLocal } = await import('./impl/SettingServiceLocal')

    registry = {
      sutra: new SutraServiceLocal(),
      dict: new DictServiceLocal(),
      progress: new ProgressServiceLocal(),
      stats: new StatsServiceLocal(),
      tts: new TTSServiceLocal(),
      setting: new SettingServiceLocal(),
    }
  } else {
    // mode === 'api': 未来 REST API 实现
    const { SutraServiceApi } = await import('./impl/SutraServiceApi')
    const { DictServiceApi } = await import('./impl/DictServiceApi')
    const { ProgressServiceApi } = await import('./impl/ProgressServiceApi')
    const { StatsServiceApi } = await import('./impl/StatsServiceApi')
    // TTS 和 Setting 仍使用本地实现
    const { TTSServiceLocal } = await import('./impl/TTSServiceLocal')
    const { SettingServiceLocal } = await import('./impl/SettingServiceLocal')

    registry = {
      sutra: new SutraServiceApi(),
      dict: new DictServiceApi(),
      progress: new ProgressServiceApi(),
      stats: new StatsServiceApi(),
      tts: new TTSServiceLocal(),
      setting: new SettingServiceLocal(),
    }
  }

  return registry
}

/** 获取已注册的 Service 实例 */
export function getServices(): ServiceRegistry {
  if (!registry) {
    throw new Error('Services not initialized. Call initServices() first.')
  }
  return registry
}
```

## 3. 数据格式标准化

### 3.1 统一响应包装

所有 Service 方法返回 `ServiceResult<T>`，确保上层处理一致：

```typescript
// 成功响应
{ success: true, data: { ... } }

// 失败响应
{ success: false, error: { code: 'NOT_FOUND', message: '经书不存在', timestamp: '...' } }
```

### 3.2 统一数据模型

#### 词典条目（所有来源统一）

```typescript
{
  term: '般若',              // 必需：词条
  pinyin: 'bō rě',           // 可选：拼音
  sanskrit: 'prajñā',        // 可选：梵文
  definition: '...',         // 必需：释义（支持 Markdown）
  category: '核心术语',       // 可选：分类
  _dictId: 'builtin',        // 系统：词典 ID
  _dictName: '内置词典',     // 系统：词典名称
  _sourceId: 'builtin',      // 系统：来源 ID
  _version: 1,               // 系统：词典版本
}
```

#### 经书数据

```typescript
{
  id: 'xin-jing',
  title: '心经',
  fullName: '般若波罗蜜多心经',
  translator: '唐三藏法师玄奘译',
  cover: '📖',
  description: '...',
  chapters: [{ index: 0, title: '全文', wordCount: 260 }],
  totalWordCount: 260,
  loadStatus: 'ready',  // pending | loading | ready | error
}
```

### 3.3 数据版本标记

所有持久化数据携带版本字段，用于迁移和兼容性判断：

```typescript
interface VersionedData {
  _schemaVersion: number    // 当前数据结构的 schema 版本
  _migratedAt?: string      // 最后迁移时间
}
```

## 4. 错误处理

### 4.1 异常分类

| 分类 | 错误码范围 | 说明 | 处理策略 |
|------|-----------|------|---------|
| **客户端错误** | `INVALID_PARAM`, `NOT_FOUND`, `DUPLICATE` | 用户操作或参数问题 | 提示用户，可重试 |
| **存储层错误** | `STORAGE_FULL`, `DB_VERSION_MISMATCH` | IndexedDB 相关 | 降级处理，提示清理 |
| **网络错误** | `NETWORK_ERROR`, `SERVER_ERROR`, `UNAUTHORIZED` | 后端 API 相关（预留） | 离线降级到本地缓存 |
| **业务错误** | `SUTRA_IMPORT_FAILED`, `DICT_IMPORT_FAILED` 等 | 业务逻辑失败 | 显示详细错误信息 |
| **未知错误** | `UNKNOWN` | 未分类异常 | 记录日志，友好提示 |

### 4.2 错误处理工具

```typescript
// services/errorHandler.ts

import { ErrorCode, type ServiceError, type ServiceResult } from '../types/service'

/** 创建成功结果 */
export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data }
}

/** 创建失败结果 */
export function err<T>(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ServiceResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  }
}

/** 安全执行异步操作，捕获异常并包装为 ServiceResult */
export async function safeExecute<T>(fn: () => Promise<T>): Promise<ServiceResult<T>> {
  try {
    const data = await fn()
    return ok(data)
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))

    // 特定异常映射为对应 ErrorCode
    if (error.name === 'NotFoundError') {
      return err<T>(ErrorCode.NOT_FOUND, error.message)
    }
    if (error.name === 'QuotaExceededError') {
      return err<T>(ErrorCode.STORAGE_FULL, '存储空间不足')
    }
    if (error.name === 'VersionError') {
      return err<T>(ErrorCode.DB_VERSION_MISMATCH, '数据库版本不匹配')
    }

    return err<T>(ErrorCode.UNKNOWN, error.message)
  }
}
```

### 4.3 错误消息映射（面向用户）

```typescript
// 内部错误码 → 用户友好提示
const USER_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN]: '发生未知错误，请稍后重试',
  [ErrorCode.NOT_FOUND]: '未找到相关内容',
  [ErrorCode.INVALID_PARAM]: '输入参数不正确',
  [ErrorCode.DUPLICATE]: '该数据已存在',
  [ErrorCode.STORAGE_FULL]: '浏览器存储空间已满，请清理缓存',
  [ErrorCode.DB_VERSION_MISMATCH]: '数据版本不兼容，请刷新页面',
  [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [ErrorCode.SERVER_ERROR]: '服务器异常，请稍后重试',
  [ErrorCode.UNAUTHORIZED]: '请先登录',
  [ErrorCode.SUTRA_IMPORT_FAILED]: '经书导入失败，请检查文件格式',
  [ErrorCode.DICT_IMPORT_FAILED]: '词典导入失败，请检查文件格式',
  [ErrorCode.MDX_PARSE_ERROR]: 'MDX 词典解析失败',
  [ErrorCode.TTS_NOT_SUPPORTED]: '当前浏览器不支持语音朗读',
}

export function getUserMessage(error: ServiceError): string {
  return USER_MESSAGES[error.code] || error.message
}
```

## 5. 接口版本管理

### 5.1 版本策略

采用 URL 路径版本 + 请求头协商的混合策略：

| 层次 | 方式 | 说明 |
|------|------|------|
| **本地实现** | `ServiceResult<T>` 结构不变 | 通过 schema version 迁移 |
| **REST API（预留）** | `/api/v1/`, `/api/v2/` | URL 路径版本 |
| **客户端协商** | `Accept: application/vnd.buddhist.v1+json` | Content Negotiation |

### 5.2 接口版本号

```typescript
// types/service.ts
export const SERVICE_API_VERSION = '1.0.0'

// 每次不兼容变更时递增，Store 层根据版本做兼容处理
```

### 5.3 REST API 版本演进示例

```
v1 (当前预留):
  GET  /api/v1/sutras           → 经书列表
  GET  /api/v1/sutras/:id       → 经书详情
  GET  /api/v1/sutras/:id/chapters/:ch  → 章节内容
  GET  /api/v1/dicts            → 词典列表
  GET  /api/v1/dicts/:id/lookup?term=般若  → 词条查询

v2 (未来可能):
  GET  /api/v2/sutras           → 支持分页、搜索参数
  POST /api/v2/sutras/import    → 异步导入（返回 taskId）
  WS   /api/v2/stream           → 流式推送章节内容
```

### 5.4 本地 Schema 版本迁移

```typescript
// storage/migrations.ts

export const CURRENT_SCHEMA_VERSION = 1

interface Migration {
  fromVersion: number
  toVersion: number
  migrate: (db: IDBDatabase) => Promise<void>
}

export const migrations: Migration[] = [
  // 示例：v1 → v2 迁移
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   async migrate(db) {
  //     // 新增 bookmarks 表
  //     db.createObjectStore('bookmarks', { keyPath: 'id' })
  //   },
  // },
]

export async function runMigrations(db: IDBDatabase, currentVersion: number): Promise<void> {
  for (const migration of migrations) {
    if (currentVersion >= migration.fromVersion && currentVersion < migration.toVersion) {
      await migration.migrate(db)
    }
  }
}
```

## 6. 实现示例

### 6.1 DictService — IndexedDB 实现

```typescript
// services/impl/DictServiceLocal.ts

import type {
  IDictService,
  DictConfig,
  DictEntry,
  DictTermIndex,
  DictHealthReport,
  DictVersion,
  UserNote,
  DictImportOptions,
} from '../interfaces/IDictService'
import type { ServiceResult } from '../../types/service'
import { safeExecute, ok, err } from '../errorHandler'
import { ErrorCode } from '../../types/service'
import { getDB } from '../../storage/db'
import { dictStore } from '../../storage/dictStore'

export class DictServiceLocal implements IDictService {
  async init(): Promise<ServiceResult<void>> {
    return safeExecute(async () => {
      const db = await getDB()
      // 加载启用的词典索引，构建 Trie
      const configs = await dictStore.getAllConfigs(db)
      const enabled = configs.filter(c => c.enabled)
      // 构建 Trie（委托给 engine/trie）
      return ok(undefined)
    })
  }

  async getAllDicts(): Promise<ServiceResult<DictConfig[]>> {
    return safeExecute(async () => {
      const db = await getDB()
      const configs = await dictStore.getAllConfigs(db)
      return ok(configs)
    })
  }

  async getEnabledDicts(): Promise<ServiceResult<DictConfig[]>> {
    return safeExecute(async () => {
      const db = await getDB()
      const configs = await dictStore.getEnabledConfigs(db)
      return ok(configs)
    })
  }

  async toggleDict(dictId: string, enabled: boolean): Promise<ServiceResult<DictConfig>> {
    return safeExecute(async () => {
      const db = await getDB()
      const config = await dictStore.getConfig(db, dictId)
      if (!config) {
        return err<DictConfig>(ErrorCode.NOT_FOUND, `词典 ${dictId} 不存在`)
      }
      config.enabled = enabled
      await dictStore.saveConfig(db, config)
      return ok(config)
    })
  }

  async lookupTerm(term: string, dictId: string): Promise<ServiceResult<DictEntry | null>> {
    return safeExecute(async () => {
      const db = await getDB()
      const key = `${dictId}::${term}`
      const entry = await dictStore.getEntry(db, key)
      return ok(entry || null)
    })
  }

  async lookupTermAll(term: string, dictIds: string[]): Promise<ServiceResult<DictEntry[]>> {
    return safeExecute(async () => {
      const db = await getDB()
      const entries = await Promise.all(
        dictIds.map(async (dictId) => {
          const entry = await dictStore.getEntry(db, `${dictId}::${term}`)
          return entry
        })
      )
      return ok(entries.filter(Boolean) as DictEntry[])
    })
  }

  async getTermIndex(dictId: string): Promise<ServiceResult<DictTermIndex[]>> {
    return safeExecute(async () => {
      const db = await getDB()
      const terms = await dictStore.getTermIndex(db, dictId)
      return ok(terms)
    })
  }

  async importDict(file: File, options?: DictImportOptions): Promise<ServiceResult<DictConfig>> {
    return safeExecute(async () => {
      // 根据文件类型分发处理
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'json' || ext === 'csv') {
        return await this._importJsonOrCsv(file, options)
      }
      if (ext === 'mdx') {
        return await this._importMdx(file, options)
      }
      return err<DictConfig>(ErrorCode.DICT_IMPORT_FAILED, '不支持的文件格式')
    })
  }

  async deleteDict(dictId: string): Promise<ServiceResult<void>> {
    return safeExecute(async () => {
      const db = await getDB()
      await dictStore.deleteDict(db, dictId)
      return ok(undefined)
    })
  }

  async getDictVersions(dictId: string): Promise<ServiceResult<DictVersion[]>> {
    return safeExecute(async () => {
      const db = await getDB()
      const versions = await dictStore.getVersions(db, dictId)
      return ok(versions)
    })
  }

  async getDictHealthReport(dictId: string): Promise<ServiceResult<DictHealthReport>> {
    return safeExecute(async () => {
      const db = await getDB()
      const report = await dictStore.generateHealthReport(db, dictId)
      return ok(report)
    })
  }

  async setUserNote(entryKey: string, content: string): Promise<ServiceResult<UserNote>> {
    return safeExecute(async () => {
      const db = await getDB()
      const note = await dictStore.saveNote(db, entryKey, content)
      return ok(note)
    })
  }

  async getUserNote(entryKey: string): Promise<ServiceResult<UserNote | null>> {
    return safeExecute(async () => {
      const db = await getDB()
      const note = await dictStore.getNote(db, entryKey)
      return ok(note || null)
    })
  }

  async deleteUserNote(entryKey: string): Promise<ServiceResult<void>> {
    return safeExecute(async () => {
      const db = await getDB()
      await dictStore.deleteNote(db, entryKey)
      return ok(undefined)
    })
  }

  // --- 私有方法 ---

  private async _importJsonOrCsv(
    file: File,
    options?: DictImportOptions
  ): Promise<ServiceResult<DictConfig>> {
    // 解析 JSON/CSV → 入库 → 返回配置
    const text = await file.text()
    const entries = options?.dictId
      ? JSON.parse(text)
      : this._parseCsv(text)
    const db = await getDB()
    const dictId = options?.dictId || `user-${Date.now()}`
    const config = await dictStore.importEntries(db, dictId, entries, {
      name: options?.dictName || file.name,
      type: 'user',
    })
    return ok(config)
  }

  private async _importMdx(
    file: File,
    options?: DictImportOptions
  ): Promise<ServiceResult<DictConfig>> {
    // 使用 mdict-js 解析 MDX → 入库
    return err<DictConfig>(ErrorCode.MDX_PARSE_ERROR, 'MDX 导入待实现')
  }

  private _parseCsv(text: string): unknown[] {
    // 简化的 CSV 解析
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = values[i] })
      return obj
    })
  }
}
```

### 6.2 DictService — REST API 实现（预留）

```typescript
// services/impl/DictServiceApi.ts

import type {
  IDictService,
  DictConfig,
  DictEntry,
  DictTermIndex,
  DictHealthReport,
  DictVersion,
  UserNote,
  DictImportOptions,
} from '../interfaces/IDictService'
import type { ServiceResult } from '../../types/service'
import { safeExecute, err } from '../errorHandler'
import { ErrorCode } from '../../types/service'
import { SERVICE_API_VERSION } from '../../types/service'

const API_BASE = '/api/v1'

/** 统一的 API 请求包装 */
async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<ServiceResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Accept': `application/vnd.buddhist.v1+json`,
        'X-Service-Version': SERVICE_API_VERSION,
        ...(options?.headers || {}),
      },
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      return err<T>(
        response.status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.SERVER_ERROR,
        errorBody?.message || `HTTP ${response.status}`,
      )
    }

    const data = await response.json()
    return { success: true, data: data.data }
  } catch (e) {
    return err<T>(ErrorCode.NETWORK_ERROR, e instanceof Error ? e.message : '网络请求失败')
  }
}

export class DictServiceApi implements IDictService {
  async init(): Promise<ServiceResult<void>> {
    // 从 API 获取词典配置，构建本地 Trie 索引
    return safeExecute(async () => {
      const result = await apiRequest<DictConfig[]>('/dicts')
      if (!result.success) return result
      // 构建 Trie（委托给 engine/trie）
      return { success: true }
    })
  }

  async getAllDicts(): Promise<ServiceResult<DictConfig[]>> {
    return apiRequest('/dicts')
  }

  async getEnabledDicts(): Promise<ServiceResult<DictConfig[]>> {
    return apiRequest('/dicts?enabled=true')
  }

  async toggleDict(dictId: string, enabled: boolean): Promise<ServiceResult<DictConfig>> {
    return apiRequest(`/dicts/${dictId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
  }

  async lookupTerm(term: string, dictId: string): Promise<ServiceResult<DictEntry | null>> {
    return apiRequest(`/dicts/${dictId}/lookup?term=${encodeURIComponent(term)}`)
  }

  async lookupTermAll(term: string, dictIds: string[]): Promise<ServiceResult<DictEntry[]>> {
    return apiRequest('/dicts/lookup-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, dictIds }),
    })
  }

  async getTermIndex(dictId: string): Promise<ServiceResult<DictTermIndex[]>> {
    return apiRequest(`/dicts/${dictId}/terms`)
  }

  async importDict(file: File, options?: DictImportOptions): Promise<ServiceResult<DictConfig>> {
    const formData = new FormData()
    formData.append('file', file)
    if (options?.dictName) formData.append('dictName', options.dictName)

    return apiRequest('/dicts/import', {
      method: 'POST',
      body: formData,
    })
  }

  async deleteDict(dictId: string): Promise<ServiceResult<void>> {
    return apiRequest(`/dicts/${dictId}`, { method: 'DELETE' })
  }

  async getDictVersions(dictId: string): Promise<ServiceResult<DictVersion[]>> {
    return apiRequest(`/dicts/${dictId}/versions`)
  }

  async getDictHealthReport(dictId: string): Promise<ServiceResult<DictHealthReport>> {
    return apiRequest(`/dicts/${dictId}/health`)
  }

  async setUserNote(entryKey: string, content: string): Promise<ServiceResult<UserNote>> {
    return apiRequest('/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryKey, content }),
    })
  }

  async getUserNote(entryKey: string): Promise<ServiceResult<UserNote | null>> {
    return apiRequest(`/notes/${encodeURIComponent(entryKey)}`)
  }

  async deleteUserNote(entryKey: string): Promise<ServiceResult<void>> {
    return apiRequest(`/notes/${encodeURIComponent(entryKey)}`, { method: 'DELETE' })
  }
}
```

### 6.3 对比分析

| 维度 | IndexedDB 实现 | REST API 实现 |
|------|---------------|--------------|
| **数据源** | 本地 IndexedDB | 远程 HTTP API |
| **初始化** | 读取本地索引，构建 Trie | 获取 API 配置，缓存到本地，构建 Trie |
| **查询延迟** | ~5-20ms（IndexedDB 查询） | ~50-200ms（网络往返） |
| **离线支持** | 完全离线可用 | 需本地缓存降级 |
| **数据同步** | 无需同步 | 需处理冲突和增量同步 |
| **错误处理** | QuotaExceeded, VersionError | NetworkError, HTTP 4xx/5xx |
| **代码复用** | 同一接口，不同实现 | 同一接口，不同实现 |
| **切换成本** | 仅替换工厂函数 | 仅替换工厂函数 |

## 7. 结论与建议

### 7.1 Service 层架构结论

1. **接口与实现分离**是 v2.0 的核心架构决策，通过 TypeScript `interface` 定义契约，确保 Store 和 UI 层不依赖具体实现
2. **统一 `ServiceResult<T>` 包装**简化了错误处理，使上层只需判断 `success` 字段
3. **工厂模式 `initServices(mode)`** 提供了灵活的实现切换机制，支持 `local` / `api` 双模式
4. **错误码体系**分为客户端、存储层、网络层、业务层四类，覆盖当前和未来场景
5. **接口版本**通过 `SERVICE_API_VERSION` 和 schema migration 双管齐下

### 7.2 对开发阶段的建议

| 阶段 | 任务 | 说明 |
|------|------|------|
| Phase 1 | 定义所有 `interface` | 在 Phase 1 完成接口定义，Store 层依赖接口 |
| Phase 1 | 实现 `*ServiceLocal` | IndexedDB 实现，满足 v2.0 需求 |
| Phase 1 | 实现 `initServices()` 工厂 | 确保依赖注入可用 |
| Phase 2+ | 按需添加 `*ServiceApi` | 后端 API 实现可推迟到需要时 |
| 长期 | 维护 `ErrorCode` 枚举 | 每次新增错误类型时同步更新 |

### 7.3 与 Clean Architecture Repository 模式的对比

| 维度 | Clean Architecture Repository | 本方案 Service 层 |
|------|------------------------------|------------------|
| **层级位置** | Domain 层与 Infrastructure 层之间 | 与 Store 层和 Storage 层之间 |
| **职责** | 数据访问抽象，隐藏数据源细节 | 数据访问 + 业务逻辑（如字典合并、健康报告） |
| **接口粒度** | 通常按聚合根（Entity）定义 | 按业务领域（Sutra/Dict/Progress/Stats/TTS）定义 |
| **返回类型** | 直接返回 Entity 或 null | 包装为 `ServiceResult<T>`（含错误信息） |
| **事务支持** | 支持跨 Repository 事务 | 暂不需要（IndexedDB 单表操作） |

本方案更贴近实际项目需求：在纯前端架构中，Service 层同时承担了 Repository 的数据访问抽象和 UseCase 的业务逻辑协调职责。`ServiceResult<T>` 包装比直接返回 Entity 更适合前端错误处理。

## 8. 对 v2.1 方案的影响

1. **后端 API 接入零成本**：v2.1 若需要接入后端，只需实现 `*ServiceApi` 类并修改 `initServices('api')`，Store 层和 UI 层无需任何改动
2. **混合模式可行**：部分 Service 使用 API（如 Sutra/Dict），部分保持本地（如 TTS/Setting），工厂函数已支持混合注册
3. **离线降级策略**：REST API 实现可在网络失败时自动降级到 IndexedDB 缓存，实现"在线优先、离线兜底"
4. **多平台复用**：小程序和 App 可复用同一套 `interface` 定义，只需替换底层 Storage 实现（小程序使用 wx.storage，App 使用 SQLite）
5. **数据同步机制**：未来如需多端同步，可在 Service 层增加 `sync()` 方法，利用 `ServiceResult<T>` 的错误码体系处理冲突
6. **API Gateway 设计**：后端 REST API 的路由设计可直接映射 Service 接口方法（如 `GET /api/v1/dicts/:id/lookup?term=xxx` 对应 `lookupTerm(term, dictId)`），降低前后端对接成本
