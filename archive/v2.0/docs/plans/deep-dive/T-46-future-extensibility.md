# 未来扩展性分析 报告

> 任务编号：T-46
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md, docs/plans/deep-dive/T-48-service-layer-abstract.md

## 1. 背景与目标

### 1.1 背景

v2.0 项目方案确立"纯前端优先、接口预留"的核心架构原则，通过 Service 层抽象（T-48）实现了 IndexedDB 与 REST API 实现的无缝切换能力。然而，项目在长远发展上将面临多平台迁移、后端接入、国际化、用户账户等多个维度的扩展需求。

### 1.2 目标

1. 分析微信小程序迁移的技术可行性与实现路径
2. 评估已设计的 Service 抽象对后端 API 接入的覆盖度
3. 规划多语言国际化（i18n）的预留方案
4. 设计用户账户系统的预留接口
5. 明确词典分享功能（D22 不做清单）的边界处理方式

### 1.3 分析原则

- **最小侵入**：扩展点以接口预留、数据字段预留为主，不增加 v2.0 实现负担
- **可逆性**：预留设计不应影响 v2.0 的纯前端架构
- **渐进式**：未来扩展通过新增实现类、新增字段完成，不破坏已有代码

## 2. 微信小程序迁移

### 2.1 技术路径对比

| 方案 | 说明 | 优势 | 劣势 | 推荐度 |
|------|------|------|------|--------|
| **A. uni-app** | 一套代码编译到 H5 + 小程序 | 开发成本低，Vue 生态兼容 | 性能损耗，小程序 API 差异需适配 | 推荐 |
| **B. Taro** | React/Vue 跨端框架 | 多端支持好 | 学习成本，与现有 Vite 构建冲突 | 不推荐 |
| **C. 原生小程序重写** | 使用 WXML + WXSS 重写 | 最佳性能，完全可控 | 开发成本高，代码无法复用 | 不推荐 |
| **D. WebView 嵌入** | H5 直接嵌入小程序 WebView | 零改动 | 性能差，部分 API 不可用，审核风险 | 不推荐 |

**推荐方案 A（uni-app）**：Vue 3 语法直接兼容，现有组件可复用，通过条件编译处理平台差异。

### 2.2 迁移架构

```
┌─────────────────────────────────────────────────────┐
│                  共享业务逻辑层                       │
│  ├── services/     (Service 接口和实现完全复用)       │
│  ├── engine/       (Trie/高亮/拼音引擎完全复用)       │
│  └── data/         (静态数据完全复用)                 │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌───────────────────┐   ┌───────────────────────┐
│   H5 适配层        │   │  小程序适配层           │
│  (v2.0 当前)       │   │  (v2.1 新增)           │
│                   │   │                       │
│  storage/         │   │  storage/             │
│    → IndexedDB    │   │    → wx.storage       │
│    → idb          │   │    → wx.getStorageSync│
│                   │   │                       │
│  components/      │   │  components/          │
│    → Vant         │   │    → Vant Weapp       │
│    → Vue Router   │   │    → 小程序页面       │
│                   │   │                       │
│  TTS/             │   │  TTS/                 │
│    → Web Speech   │   │    → wx.createInner   │
│      API          │   │       AudioContext    │
└───────────────────┘   └───────────────────────┘
```

### 2.3 关键差异与适配点

#### 2.3.1 存储层适配

```typescript
// storage/adapters/StorageAdapter.ts — 统一存储接口

export interface IStorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

// H5 实现 — 当前方案
export class IndexedDBAdapter implements IStorageAdapter {
  // 使用 idb 封装 IndexedDB 操作
}

// 小程序实现 — 未来方案
export class WxStorageAdapter implements IStorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = wx.getStorageSync(key)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    wx.setStorageSync(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    wx.removeStorageSync(key)
  }

  async clear(): Promise<void> {
    wx.clearStorageSync()
  }
}
```

**v2.0 预留动作**：在 storage/ 层增加 `IStorageAdapter` 接口定义，当前实现仍直接使用 idb。

#### 2.3.2 UI 组件差异

| H5 (Vant 4) | 小程序 (Vant Weapp) | 适配策略 |
|-------------|---------------------|----------|
| `<van-button>` | `<van-button>` | 组件名一致，props 需检查 |
| `<van-popup>` | `<van-popup>` | 事件名可能有差异 |
| `<van-cell>` | `<van-cell>` | slot 语法不同 |
| Vue Router 路由 | 小程序页面路由 | 需封装统一导航 API |
| `window.scrollTo` | `wx.pageScrollTo` | 需封装统一滚动 API |

#### 2.3.3 TTS 引擎差异

| 能力 | H5 (Web Speech API) | 小程序 |
|------|---------------------|--------|
| API | `SpeechSynthesis` | `wx.createInnerAudioContext` |
| 语音选择 | 多语音可选 | 依赖微信内置 TTS |
| 离线支持 | 取决于浏览器 | 需联网调用微信 TTS |
| 回调事件 | `onend`, `onerror` | `onEnded`, `onError` |

**预留设计**：`ITTSService` 接口已定义（T-48），小程序只需新增 `TTSServiceWx` 实现类。

### 2.4 MDX 词典在小程序中的限制

| 问题 | 说明 | 应对方案 |
|------|------|----------|
| mdict-js 依赖 LZO | `lzo-wasm` 基于 WebAssembly | 小程序支持 WASM，但需确认体积限制 |
| 小程序包体积限制 | 主包 2MB，总包 20MB | 大词典必须走分包加载或云端查询 |
| IndexedDB 不可用 | 小程序无 IndexedDB | 迁移到 `wx.cloud.database` 或本地缓存 |

**结论**：小程序端的 MDX 词典建议采用"云端查询 + 本地缓存"模式，由后端 API 提供释义查询服务（T-48 已预留 `DictServiceApi`）。

### 2.5 迁移步骤规划

| 阶段 | 任务 | 工时预估 |
|------|------|----------|
| 准备期 | 抽取共享代码到 `shared/` 目录 | 1 周 |
| 适配期 | 实现 `WxStorageAdapter`, `TTSServiceWx` | 1 周 |
| UI 移植 | 用 Vant Weapp 重写页面组件 | 2 周 |
| 测试期 | 小程序端功能测试 + 性能调优 | 1 周 |
| 发布期 | 提交微信审核 | 3-5 天 |

### 2.6 v2.0 需要做的预留

1. **storage/ 层增加接口抽象**：定义 `IStorageAdapter`，当前实现封装 idb
2. **TTS 服务解耦**：`ITTSService` 接口已定义，确保实现类可替换
3. **组件平台隔离**：将平台无关的组件放入 `components/shared/`，平台特定组件放入 `components/h5/` 和 `components/wx/`
4. **构建配置分离**：保留 Vite 配置的同时，预留 uni-app 的 `pages.json` 和 `manifest.json`

## 3. 后端 API 接入

### 3.1 已设计的覆盖度评估

T-48 Service 层抽象已覆盖以下后端接入需求：

| Service | 接口完备度 | API 实现 | 说明 |
|---------|-----------|----------|------|
| `ISutraService` | 完整 | `SutraServiceApi` 已预留 | 经书列表/详情/章节/导入/搜索 |
| `IDictService` | 完整 | `DictServiceApi` 已预留 | 词典管理/查询/导入/笔记 |
| `IProgressService` | 完整 | `ProgressServiceApi` 已预留 | 进度/书签 |
| `IStatsService` | 完整 | `StatsServiceApi` 已预留 | 统计 |
| `ITTSService` | 完整 | 保持本地实现 | TTS 无需后端 |
| `ISettingService` | 完整 | 保持本地实现 | 设置无需后端 |

**结论**：T-48 的 Service 接口设计已完全覆盖后端 API 接入需求，v2.0 无需额外修改。

### 3.2 后端 API 路由设计

```
# 经书服务
GET    /api/v1/sutras                    # 经书列表
GET    /api/v1/sutras/:id                # 经书详情
GET    /api/v1/sutras/:id/chapters/:ch   # 章节内容
POST   /api/v1/sutras/import             # 导入经书
DELETE /api/v1/sutras/:id                # 删除经书
GET    /api/v1/sutras/search?q=关键词     # 搜索经文

# 词典服务
GET    /api/v1/dicts                     # 词典列表
GET    /api/v1/dicts/:id                 # 词典详情
POST   /api/v1/dicts/:id/toggle          # 切换开关
GET    /api/v1/dicts/:id/lookup?term=般若  # 词条查询
POST   /api/v1/dicts/lookup-batch        # 批量查询
GET    /api/v1/dicts/:id/terms           # 词条索引
POST   /api/v1/dicts/import              # 导入词典
DELETE /api/v1/dicts/:id                 # 删除词典
GET    /api/v1/dicts/:id/versions        # 版本历史
GET    /api/v1/dicts/:id/health          # 体检报告

# 用户笔记
POST   /api/v1/notes                     # 添加/更新笔记
GET    /api/v1/notes/:entryKey           # 获取笔记
DELETE /api/v1/notes/:entryKey           # 删除笔记

# 阅读进度
POST   /api/v1/progress                  # 保存进度
GET    /api/v1/progress/:sutraId         # 获取进度
GET    /api/v1/progress                  # 全部进度
POST   /api/v1/bookmarks                 # 添加书签
GET    /api/v1/bookmarks/:sutraId        # 书签列表
DELETE /api/v1/bookmarks/:id             # 删除书签

# 功德统计
POST   /api/v1/stats/session             # 记录诵读
GET    /api/v1/stats?period=month        # 统计数据
GET    /api/v1/stats/streak              # 连续天数
```

### 3.3 混合模式支持

T-48 的工厂模式已支持混合模式（部分 Service 走 API，部分保持本地）：

```typescript
// 未来 v2.1 可实现的混合配置
export async function initServices(config: MixedServiceConfig): Promise<ServiceRegistry> {
  registry = {
    sutra: config.sutra === 'api' ? new SutraServiceApi() : new SutraServiceLocal(),
    dict: config.dict === 'api' ? new DictServiceApi() : new DictServiceLocal(),
    progress: config.progress === 'api' ? new ProgressServiceApi() : new ProgressServiceLocal(),
    stats: config.stats === 'api' ? new StatsServiceApi() : new StatsServiceLocal(),
    tts: new TTSServiceLocal(),       // TTS 永远本地
    setting: new SettingServiceLocal(), // 设置永远本地
  }
  return registry
}
```

### 3.4 离线降级策略

当 API 模式遇到网络问题时，自动降级到本地缓存：

```typescript
// 降级策略伪代码
class DictServiceApi implements IDictService {
  private localFallback: DictServiceLocal

  async lookupTerm(term: string, dictId: string): Promise<ServiceResult<DictEntry | null>> {
    try {
      const result = await apiRequest(`/dicts/${dictId}/lookup?term=${term}`)
      // 成功时缓存到本地
      if (result.success && result.data) {
        await this.localFallback.cacheEntry(result.data)
      }
      return result
    } catch (networkError) {
      // 网络失败时降级到本地缓存
      return this.localFallback.lookupTerm(term, dictId)
    }
  }
}
```

### 3.5 数据同步冲突处理

多端同步时的冲突策略：

| 数据类型 | 冲突策略 | 说明 |
|----------|----------|------|
| 阅读进度 | 取最新 | 按 `lastReadAt` 时间戳 |
| 书签 | 合并 | 所有书签并集 |
| 用户笔记 | 取最新 | 按 `updatedAt` 时间戳 |
| 功德统计 | 累加 | 按日期聚合后求和 |
| 词典设置 | 取最新 | 开关状态取最后修改 |

## 4. 多语言国际化

### 4.1 技术方案

采用 `vue-i18n`（Vue I18n v9）作为国际化方案：

| 维度 | 选型 | 说明 |
|------|------|------|
| 框架 | vue-i18n v9 | 与 Vue 3 Composition API 原生兼容 |
| 格式 | JSON 消息文件 | `zh-CN.json`, `en-US.json` |
| 加载 | 按需加载 | 按语言包拆分 chunk，避免全量加载 |
| 存储 | `ISettingService` | 通过设置服务持久化语言偏好 |

### 4.2 v2.0 预留设计

#### 4.2.1 消息文件结构

```
src/
└── locales/                    # v2.0 创建空目录
    ├── zh-CN.json              # 简体中文（v2.0 已有全部文案）
    ├── en-US.json              # 英文（v2.0 预留空文件或骨架）
    └── index.ts                # i18n 初始化配置（v2.0 预留）
```

```json
// locales/zh-CN.json 示例
{
  "common": {
    "appName": "般若佛经阅读器",
    "loading": "加载中...",
    "error": "发生错误",
    "retry": "重试"
  },
  "bookshelf": {
    "title": "经书架",
    "empty": "暂无经书",
    "import": "导入经书"
  },
  "reader": {
    "settings": "阅读设置",
    "fontSize": "字号",
    "tts": "朗读"
  },
  "dict": {
    "manager": "词典管理",
    "import": "导入词典",
    "healthReport": "词典体检报告"
  }
}
```

#### 4.2.2 AppSettings 扩展

在 `ISettingService` 的 `AppSettings` 中增加语言字段：

```typescript
export interface AppSettings {
  // ... 现有字段

  // 国际化设置（v2.0 预留）
  locale: 'zh-CN' | 'en-US' | 'auto'  // auto = 跟随系统
}
```

#### 4.2.3 系统语言检测

```typescript
// locales/index.ts — v2.0 预留
import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

function detectSystemLocale(): string {
  const browserLang = navigator.language || 'zh-CN'
  const matched = SUPPORTED_LOCALES.find(
    locale => browserLang.startsWith(locale.split('-')[0])
  )
  return matched || 'zh-CN'
}

export const i18n = createI18n({
  legacy: false,              // Composition API 模式
  locale: 'zh-CN',            // v2.0 固定中文
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    // 'en-US': 未来加载
  },
})
```

### 4.3 支持语言规划

| 语言 | 优先级 | 说明 |
|------|--------|------|
| zh-CN | P0（当前） | 简体中文，默认语言 |
| zh-TW | P1 | 繁体中文，佛教用户重要市场 |
| en-US | P1 | 英文，学术研究用户 |
| ja | P2 | 日文，日本佛教用户 |
| ko | P3 | 韩文 |
| th | P3 | 泰文，南传佛教用户 |

### 4.4 非文本国际化

除了 UI 文案，以下也需要国际化支持：

| 类型 | 说明 | 处理方式 |
|------|------|----------|
| 佛经原文 | 经文内容本身 | **不翻译**，保持原文 |
| 词典释义 | 词典内容 | **不翻译**，多语言词典独立管理 |
| 拼音标注 | 术语拼音 | 仅中文需要，其他语言隐藏 |
| 日期格式 | 统计页面 | 使用 `Intl.DateTimeFormat` |
| 数字格式 | 统计数字 | 使用 `Intl.NumberFormat` |

### 4.5 v2.0 需要做的预留

1. **创建 `src/locales/` 目录和 `zh-CN.json`**：将当前硬编码在组件中的中文文案提取到消息文件
2. **安装 vue-i18n 依赖**：但不启用多语言，仅用单语言模式
3. **AppSettings 增加 `locale` 字段**：默认值 `'zh-CN'`
4. **组件中使用 `t()` 函数**：逐步替换硬编码中文，v2.0 阶段可在中文消息文件中直接引用

## 5. 用户账户系统

### 5.1 需求分析

未来用户账户系统的核心需求：

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 登录/注册 | 手机号/邮箱/微信授权 | P1 |
| 数据同步 | 跨端同步阅读进度、书签、笔记 | P1 |
| 云备份 | 用户词典和设置云端备份 | P2 |
| 社交分享 | 分享诵读成果、功德统计 | P3 |
| 付费功能 | 高级词典、VIP 专属经文 | P3 |

### 5.2 Service 层预留接口

```typescript
// services/interfaces/IAuthService.ts — v2.0 预留，不实现

export interface UserProfile {
  uid: string
  displayName: string
  avatar?: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  type: 'phone' | 'email' | 'wechat' | 'anonymous'
  // 根据 type 携带不同字段
  phone?: string
  code?: string        // 验证码
  email?: string
  password?: string
  wxCode?: string      // 微信授权码
}

export interface IAuthService {
  /** 登录 */
  login(credentials: LoginCredentials): Promise<ServiceResult<UserProfile>>

  /** 注册 */
  register(info: RegisterInfo): Promise<ServiceResult<UserProfile>>

  /** 登出 */
  logout(): Promise<ServiceResult<void>>

  /** 获取当前用户 */
  getCurrentUser(): Promise<ServiceResult<UserProfile | null>>

  /** 更新用户资料 */
  updateProfile(updates: Partial<UserProfile>): Promise<ServiceResult<UserProfile>>

  /** 检查登录状态 */
  isAuthenticated(): boolean

  /** 获取认证令牌 */
  getToken(): string | null
}
```

### 5.3 Service 工厂扩展

```typescript
// services/factory.ts — v2.0 预留 auth 字段

export interface ServiceRegistry {
  sutra: ISutraService
  dict: IDictService
  progress: IProgressService
  stats: IStatsService
  tts: ITTSService
  setting: ISettingService
  auth: IAuthService | null     // v2.0 为 null，v2.1+ 接入
}
```

### 5.4 数据模型扩展

#### 5.4.1 用户相关字段

```typescript
// 经书和进度数据增加用户归属
export interface ReadingProgress {
  // ... 现有字段
  uid?: string    // 用户 ID，v2.0 为空
}

export interface Bookmark {
  // ... 现有字段
  uid?: string    // 用户 ID，v2.0 为空
}

export interface UserNote {
  // ... 现有字段
  uid?: string    // 用户 ID，v2.0 为空
}
```

#### 5.4.2 本地匿名模式

v2.0 纯前端模式下，生成匿名用户 ID 作为数据归属标识：

```typescript
// 应用启动时生成
function getAnonymousUid(): string {
  let uid = localStorage.getItem('anon-uid')
  if (!uid) {
    uid = `anon-${crypto.randomUUID()}`
    localStorage.setItem('anon-uid', uid)
  }
  return uid
}
```

### 5.5 认证令牌管理

```typescript
// services/auth/TokenManager.ts — v2.0 预留

export interface TokenInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number    // Unix 时间戳
}

export class TokenManager {
  private token: TokenInfo | null = null

  async save(token: TokenInfo): Promise<void> {
    this.token = token
    // 持久化到 IndexedDB
  }

  async load(): Promise<TokenInfo | null> {
    // 从 IndexedDB 恢复
    return this.token
  }

  isExpired(): boolean {
    return this.token ? Date.now() >= this.token.expiresAt : true
  }

  async refresh(): Promise<TokenInfo | null> {
    // 调用刷新接口
    return null
  }

  clear(): void {
    this.token = null
  }

  getAuthHeader(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token.accessToken}` } : {}
  }
}
```

### 5.6 v2.0 需要做的预留

1. **创建 `IAuthService` 接口文件**：定义但不实现
2. **ServiceRegistry 增加 `auth` 字段**：v2.0 设为 `null`
3. **数据模型增加 `uid` 字段**：v2.0 始终为匿名 ID
4. **API 请求预留 Authorization header**：`DictServiceApi` 等已有 `apiRequest` 包装，增加 token 注入
5. **设置页面预留"登录"入口**：UI 上显示占位按钮，点击提示"功能开发中"

## 6. 词典分享功能

### 6.1 D22 决策回顾

D22 决策明确将"词典分享/市场功能"列入 v2.0 **不做清单**：

> D22: 用户之间分享词典、词典市场，明确列入"不做清单"

**不做的原因**：
- 涉及版权风险（佛教词典多为编译整理，版权归属复杂）
- 需要后端基础设施（文件存储、分发 CDN、审核系统）
- 与 v2.0 "纯前端优先"原则冲突
- 社区生态建设是长期运营问题，非技术问题

### 6.2 数据模型预留

虽然功能不做，但数据模型应预留分享相关字段：

```typescript
export interface DictConfig {
  // ... 现有字段

  // 分享相关（v2.0 预留，始终为 null/默认值）
  shareable: boolean           // 是否允许分享，默认 false
  shareId?: string             // 分享 ID（唯一标识符）
  shareUrl?: string            // 分享链接
  shareCount: number           // 被分享/下载次数，默认 0
  license?: string             // 许可协议（如 CC-BY-SA）
  author?: string              // 词典作者（与上传者区分）
}
```

### 6.3 未来分享技术路径

当 v2.1+ 考虑实现词典分享时，有以下技术路径可选：

#### 路径 A：P2P 文件分享（去中心化）

```
用户导出词典 → 生成 .dict 文件 → 通过微信/邮件分享 → 对方导入
```

- **优点**：无需后端，纯前端可实现
- **缺点**：无分发渠道、无审核、无统计
- **实现成本**：低

```typescript
// 词典导出功能
async exportDict(dictId: string): Promise<File> {
  const entries = await dictStore.getEntries(db, dictId)
  const config = await dictStore.getConfig(db, dictId)
  const bundle = {
    format: 'buddhist-reader-dict-v1',
    config: { name: config.name, version: config.version, author: config.author },
    entries: entries,
  }
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' })
  return new File([blob], `${config.name}.json`, { type: blob.type })
}
```

#### 路径 B：中心化词典市场（需后端）

```
用户上传 → 后端审核 → CDN 分发 → 用户浏览/搜索/下载
```

- **优点**：可控、可审核、有统计
- **缺点**：需要完整后端 + 运营
- **实现成本**：高

#### 路径 C：分享码机制（折中方案）

```
用户上传到自己的服务器 → 生成分享码 → 其他用户在阅读器中输入分享码下载
```

- **优点**：后端轻量（仅转发），用户上传到任意对象存储
- **缺点**：依赖用户自有存储
- **实现成本**：中

### 6.4 导出/导入接口预留

在 `IDictService` 中预留导出接口（v2.0 不实现）：

```typescript
export interface IDictService {
  // ... 现有接口

  // 导出/导入（v2.0 预留）
  /** 导出词典为可分享文件 */
  exportDict(dictId: string): Promise<ServiceResult<Blob>>

  /** 从分享文件导入词典 */
  importSharedDict(file: File): Promise<ServiceResult<DictConfig>>

  /** 生成分享信息 */
  generateShareInfo(dictId: string): Promise<ServiceResult<ShareInfo>>
}

export interface ShareInfo {
  dictId: string
  name: string
  entryCount: number
  shareId: string
  shareUrl?: string
}
```

### 6.5 v2.0 边界处理

| 功能 | v2.0 状态 | 说明 |
|------|-----------|------|
| 词典导出为 JSON 文件 | **实现** | 本质是数据备份功能，与分享不冲突 |
| 词典导入 JSON 文件 | **实现** | 已支持 JSON/CSV/MDX 导入 |
| "分享"按钮 | **隐藏** | UI 上不出现 |
| 分享相关字段 | **预留** | DictConfig 中的 share 字段 |
| exportDict 接口 | **预留** | 接口定义，不实现 |
| 词典市场页面 | **不创建** | v2.0 不涉及 |

### 6.6 与 D21（知识卡片泛化）的关系

D21 提出将词典扩展为更通用的"知识模型"：

```typescript
// 未来的泛化知识模型
export interface KnowledgePack {
  id: string
  type: 'dictionary' | 'glossary' | 'annotation' | 'qa'
  name: string
  version: string
  entries: KnowledgeEntry[]
  metadata: Record<string, unknown>   // 扩展字段
}

export interface KnowledgeEntry {
  term: string
  type: 'term' | 'annotation' | 'qa'
  content: string
  metadata: Record<string, unknown>   // 扩展字段
}
```

**建议**：v2.0 的 `DictEntry` 已包含 `_dictId`, `_sourceId`, `_version` 等元字段，与泛化模型兼容，无需额外修改。

## 7. 结论与建议

### 7.1 扩展性策略总结

| 扩展方向 | v2.0 预留动作 | v2.1+ 实现路径 | 复杂度 |
|----------|--------------|---------------|--------|
| 微信小程序 | `IStorageAdapter` 接口 | uni-app + Vant Weapp | 中 |
| 后端 API | `*ServiceApi` 已预留 | 实现 API 类 + 后端开发 | 高 |
| 多语言 i18n | `locales/` + `vue-i18n` | 翻译消息文件 | 低 |
| 用户账户 | `IAuthService` 接口 | Auth 实现 + 后端 | 高 |
| 词典分享 | 导出功能 + 字段预留 | P2P 或中心化市场 | 低/高 |

### 7.2 核心架构决策

1. **接口驱动设计**：所有业务模块通过接口定义，实现可替换，已验证可行（T-48）
2. **存储抽象层**：增加 `IStorageAdapter` 是跨平台迁移的关键前提
3. **数据模型前瞻性**：关键字段（uid, shareId, locale）预留不影响当前功能
4. **渐进式实现**：v2.0 聚焦纯前端，所有后端相关功能通过工厂模式延迟初始化

### 7.3 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 预留接口过多导致代码膨胀 | 维护负担增加 | 仅预留已确定未来需要的接口，不猜需求 |
| 存储抽象层增加复杂度 | 开发成本 | v2.0 仅定义接口，实现仍直接用 idb |
| 小程序端 MDX 词典无法运行 | 功能缺失 | 小程序走云端查询模式（需要后端） |
| i18n 预留后组件全部需改 | 工作量大 | v2.0 阶段先创建消息文件，组件暂不改 |

### 7.4 开发优先级建议

```
v2.0 (当前):
  ✅ Service 接口定义
  ✅ IndexedDB 实现
  ✅ 工厂模式
  ⬜ IStorageAdapter 接口定义
  ⬜ locales/ 目录 + zh-CN.json
  ⬜ IAuthService 接口定义
  ⬜ DictConfig 增加预留字段

v2.1 (下一版本):
  ⬜ 后端 API 实现 (*ServiceApi)
  ⬜ 用户认证系统
  ⬜ 数据同步服务
  ⬜ 词典导出功能

v2.2 (后续):
  ⬜ 微信小程序适配
  ⬜ 英文国际化
  ⬜ 词典 P2P 分享
```

## 8. 对 v2.1 方案的影响

### 8.1 直接影响项

1. **Service 工厂函数需支持混合配置**：T-48 的 `initServices(mode: ServiceMode)` 需扩展为支持逐项配置的模式，允许 sutra/dict 走 API 而 progress 保持本地
2. **增加 `IStorageAdapter` 接口**：作为跨平台（H5/小程序/App）的统一存储抽象，v2.1 后端接入时也可用于缓存层
3. **增加 `IAuthService` 实现**：v2.1 若接入用户系统，需实现至少一种登录方式（推荐手机号验证码）
4. **API 请求增加认证中间件**：`apiRequest` 函数需自动注入 `Authorization: Bearer <token>` header
5. **数据同步服务**：新增 `ISyncService` 接口，处理本地与云端数据的冲突合并

### 8.2 间接影响项

6. **小程序端需要后端支持**：MDX 词典在小程序中无法本地运行，v2.1 后端需提供词典查询 API
7. **i18n 消息文件需同步维护**：后端 API 的错误消息也需支持多语言，前后端消息 key 对齐
8. **词典导出格式标准化**：v2.0 导出的 JSON 格式需考虑未来作为分享格式的兼容性
9. **后端 API 需支持匿名模式**：v2.0 的匿名用户 ID 在 v2.1 升级时可选择绑定到真实账户

### 8.3 不建议 v2.1 做的事

1. **不建议实现词典市场**：D22 已明确列入不做清单，至少等到 v2.3+
2. **不建议同时做小程序和后端**：两者都依赖后端 API，应先后端、后小程序
3. **不建议在 v2.1 做多语言**：国际化是独立的大工程，建议在功能稳定后再做
