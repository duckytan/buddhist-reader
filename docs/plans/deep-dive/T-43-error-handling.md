# 错误处理与异常恢复 报告

> 任务编号：T-43
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 是纯前端 SPA 应用，所有数据存储于浏览器 IndexedDB 中，无后端支撑。这种架构下，错误来源与传统的客户端-服务器应用有显著差异：

- **浏览器环境差异**：Safari ITP、隐私模式、低版本浏览器对 IndexedDB 的支持不一致
- **存储容量限制**：iOS Safari 的 50MB 硬限制，移动端存储空间不足
- **离线场景**：纯前端天然离线可用，但首次加载和字典导入需要网络
- **第三方库兼容性**：`mdict-js`、`lzo-wasm` 等库在浏览器环境可能有特殊行为

**目标**：
1. 建立全局错误边界，防止单个组件崩溃导致整个应用白屏
2. 为数据加载失败设计合理的重试机制
3. 提供用户友好的错误提示，符合"禅意"UI 风格
4. 设计 IndexedDB 不可用时的降级链路（详见 T-40）
5. 建立可选的日志记录方案，便于问题诊断

## 2. 错误分类

| 错误类型 | 来源 | 严重程度 | 处理策略 |
|----------|------|----------|----------|
| **数据库不可用** | IndexedDB 被禁用/隐私模式/损坏 | 严重 | 降级到 localStorage → 内存 Map → 提示用户 |
| **存储空间不足** | QuotaExceededError | 严重 | 清理缓存 → 提示用户释放空间 → 阻止写入 |
| **词典解析失败** | MDX 格式不支持/JSON 格式错误 | 中等 | 捕获异常 → 展示具体错误 → 允许跳过 |
| **经书加载失败** | 分块数据缺失/格式错误 | 中等 | 重试 3 次 → 标记为 error 状态 → 提示重新导入 |
| **TTS 不可用** | 浏览器不支持 Web Speech API | 轻微 | 隐藏 TTS 按钮 → Toast 提示"当前浏览器不支持" |
| **MDX 查询超时** | 大文件 mdict-js 查询过慢 | 轻微 | 5 秒超时 → 显示加载中 → 允许重试 |
| **路由切换失败** | 组件懒加载失败/网络中断 | 中等 | 显示错误页 → 提供"重新加载"按钮 |
| **Trie 构建失败** | 内存不足/词条数据异常 | 严重 | 降级为简单字符串匹配 → 日志记录 |
| **文件读取失败** | FileReader API 异常/文件损坏 | 中等 | Toast 提示具体原因 → 允许重新选择文件 |
| **版本迁移失败** | v1.0 数据格式不兼容 | 中等 | 跳过迁移 → 提示用户手动导入备份 |

### 2.1 严重程度定义

| 级别 | 定义 | UI 表现 | 是否可恢复 |
|------|------|---------|-----------|
| **严重 (critical)** | 核心功能不可用，应用无法正常运行 | 全屏错误页 + 恢复引导 | 部分可降级 |
| **中等 (major)** | 部分功能不可用，不影响核心阅读 | Toast/Dialog 提示 + 降级方案 | 通常可恢复 |
| **轻微 (minor)** | 边缘功能不可用，不影响主流程 | Toast 轻提示或静默处理 | 无需恢复 |

## 3. 全局错误边界

### 3.1 Vue errorCaptured 错误边界组件

使用 Vue 3 的 `errorCaptured` 生命周期钩子构建错误边界，实现局部错误隔离：

```javascript
// components/common/ErrorBoundary.vue
<template>
  <slot v-if="!hasError" />
  <div v-else class="error-fallback">
    <div class="error-icon">{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p class="error-message">{{ message }}</p>
    <button v-if="recoverable" @click="retry" class="retry-btn">
      重新加载
    </button>
    <button v-if="showDetails" @click="toggleDetails" class="detail-btn">
      {{ showDetailContent ? '收起详情' : '查看详情' }}
    </button>
    <pre v-if="showDetailContent" class="error-stack">{{ errorStack }}</pre>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'

const props = defineProps({
  title: { type: String, default: '加载失败' },
  message: { type: String, default: '内容加载时出现问题，请稍后重试' },
  recoverable: { type: Boolean, default: true },
  showDetails: { type: Boolean, default: false },
})

const hasError = ref(false)
const errorStack = ref('')
const showDetailContent = ref(false)

function toggleDetails() {
  showDetailContent.value = !showDetailContent.value
}

onErrorCaptured((error, instance, info) => {
  hasError.value = true
  errorStack.value = `${error.message}\n组件: ${instance?.$options?.name || 'unknown'}\n位置: ${info}`
  // 可选：上报错误日志
  logError(error, instance, info)
  // 阻止错误继续向上冒泡
  return false
})

function retry() {
  hasError.value = false
  errorStack.value = ''
}

function logError(error, instance, info) {
  // v2.0 仅 console，v2.1 可接入 Sentry 等第三方服务
  console.error('[ErrorBoundary]', {
    message: error.message,
    component: instance?.$options?.name,
    info,
    timestamp: new Date().toISOString(),
  })
}
</script>
```

### 3.2 全局 App 级错误处理

```javascript
// main.js
import { createApp, nextTick } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 1. 未捕获的 Promise 错误
window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason)
  event.preventDefault() // 阻止浏览器默认错误提示
})

// 2. 全局未捕获的运行时错误
window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.message, event.filename, event.lineno)
})

// 3. Vue 全局错误处理
app.config.errorHandler = (error, instance, info) => {
  console.error('[VueError]', {
    error: error.message,
    component: instance?.$options?.name,
    info,
    timestamp: new Date().toISOString(),
  })

  // 严重错误：展示全局错误页（通过 Pinia store 控制）
  if (isCriticalError(error)) {
    import('./stores/error.js').then(({ useErrorStore }) => {
      const errorStore = useErrorStore()
      errorStore.setCritical(error, info)
    })
  }
}

// 判断是否为严重错误
function isCriticalError(error) {
  const criticalMessages = [
    'IndexedDB',
    'QuotaExceededError',
    'InvalidStateError',
  ]
  return criticalMessages.some(msg => error.message?.includes(msg))
}

app.mount('#app')
```

### 3.3 错误边界应用策略

在各页面和关键组件外层包裹 ErrorBoundary，实现细粒度隔离：

```vue
<!-- pages/Reader.vue -->
<template>
  <div class="reader-page">
    <ErrorBoundary
      title="经文加载失败"
      message="当前经文数据无法加载，请尝试重新导入"
      :recoverable="true"
    >
      <SutraContent v-if="sutraReady" :sutra="currentSutra" />
    </ErrorBoundary>

    <ErrorBoundary
      title="词典查询失败"
      message="释义暂时无法加载"
      :recoverable="true"
      :show-details="false"
    >
      <DictionaryPopup :term="selectedTerm" />
    </ErrorBoundary>
  </div>
</template>
```

### 3.4 Pinia 错误状态管理

```javascript
// stores/error.js
import { defineStore } from 'pinia'

export const useErrorStore = defineStore('error', {
  state: () => ({
    criticalError: null,
    isShowingError: false,
    errorHistory: [],
    maxHistory: 50,
  }),

  actions: {
    setCritical(error, info) {
      this.criticalError = {
        message: error.message,
        stack: error.stack,
        info,
        timestamp: new Date().toISOString(),
      }
      this.isShowingError = true
      this.addHistory(this.criticalError)
    },

    clearCritical() {
      this.isShowingError = false
      this.criticalError = null
    },

    addHistory(entry) {
      this.errorHistory.unshift(entry)
      if (this.errorHistory.length > this.maxHistory) {
        this.errorHistory.pop()
      }
    },
  },
})
```

## 4. 重试机制

### 4.1 通用重试工具函数

```javascript
// utils/retry.js

/**
 * 带指数退避的重试工具
 * @param {Function} fn - 异步操作函数
 * @param {Object} options
 * @param {number} options.maxRetries - 最大重试次数，默认 3
 * @param {number} options.baseDelay - 初始延迟（ms），默认 200
 * @param {number} options.maxDelay - 最大延迟（ms），默认 5000
 * @param {Function} options.shouldRetry - 自定义重试判断
 * @param {Function} options.onRetry - 重试回调
 * @returns {Promise<any>}
 */
export async function withRetry(fn, {
  maxRetries = 3,
  baseDelay = 200,
  maxDelay = 5000,
  shouldRetry,
  onRetry,
} = {}) {
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 自定义判断是否需要重试
      if (shouldRetry && !shouldRetry(error, attempt)) {
        throw error
      }

      // 非重试错误直接抛出
      if (!isRetryableError(error)) {
        throw error
      }

      if (attempt < maxRetries) {
        // 指数退避 + 随机抖动
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100,
          maxDelay
        )

        onRetry?.(error, attempt, delay)

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error) {
  if (!error) return false
  // 不重试的情况
  const nonRetryable = [
    'TypeError',     // 类型错误通常是代码 bug
    'SyntaxError',   // 语法错误
    'SecurityError', // 安全限制
  ]
  return !nonRetryable.includes(error.name)
}
```

### 4.2 IndexedDB 操作重试

```javascript
// storage/db.js
import { openDB } from 'idb'
import { withRetry } from '../utils/retry.js'

export async function openDatabaseWithRetry() {
  return withRetry(
    () => openDB('buddhist-reader', 1, { upgrade }),
    {
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 3000,
      shouldRetry: (error) => {
        // 版本错误不重试
        if (error.name === 'VersionError') return false
        // 权限错误不重试
        if (error.name === 'SecurityError') return false
        return true
      },
      onRetry: (error, attempt, delay) => {
        console.warn(`数据库打开失败 (尝试 ${attempt}/3), ${delay}ms 后重试`)
      },
    }
  )
}

export async function dbGetWithRetry(storeName, key, retries = 2) {
  return withRetry(
    async () => {
      const db = await getDB()
      return db.get(storeName, key)
    },
    { maxRetries: retries }
  )
}

export async function dbPutWithRetry(storeName, value, retries = 2) {
  return withRetry(
    async () => {
      const db = await getDB()
      return db.put(storeName, value)
    },
    {
      maxRetries: retries,
      shouldRetry: (error) => {
        // 存储满不重试
        if (error.name === 'QuotaExceededError') return false
        return true
      },
    }
  )
}
```

### 4.3 经书数据加载重试

```javascript
// services/sutraService.js
import { withRetry } from '../utils/retry.js'
import { sutraStore } from '../storage/sutraStore.js'

class SutraService {
  async getSutra(id) {
    return withRetry(
      async () => {
        const sutra = await sutraStore.get(id)
        if (!sutra) {
          throw new Error(`经书 ${id} 不存在`)
        }
        return sutra
      },
      {
        maxRetries: 3,
        baseDelay: 300,
        shouldRetry: (error) => {
          // 经书不存在不重试
          if (error.message.includes('不存在')) return false
          return true
        },
      }
    )
  }

  async getChapter(sutraId, chapterIndex) {
    return withRetry(
      async () => {
        const content = await sutraStore.getChapter(sutraId, chapterIndex)
        if (!content) {
          throw new Error(`章节 ${chapterIndex} 数据缺失`)
        }
        return content
      },
      { maxRetries: 2 }
    )
  }
}
```

### 4.4 词典查询重试

```javascript
// services/dictService.js
import { withRetry } from '../utils/retry.js'
import { dictStore } from '../storage/dictStore.js'
import { definitionCache } from '../engine/definitionCache.js'

class DictService {
  async lookupTerm(term, dictId) {
    const key = `${dictId}::${term}`

    // L1 缓存命中
    const cached = definitionCache.get(key)
    if (cached) return cached

    // L2 IndexedDB 查询（带重试）
    return withRetry(
      async () => {
        const entry = await dictStore.getEntry(key)
        if (entry) {
          definitionCache.set(key, entry)
        }
        return entry
      },
      { maxRetries: 2 }
    )
  }
}
```

### 4.5 重试策略汇总

| 场景 | 重试次数 | 退避策略 | 超时 | 不可重试条件 |
|------|---------|---------|------|-------------|
| IndexedDB 打开 | 3 次 | 500ms → 1s → 2s | 无 | VersionError, SecurityError |
| IndexedDB 查询 | 2 次 | 200ms → 400ms | 3s | QuotaExceededError |
| IndexedDB 写入 | 2 次 | 200ms → 400ms | 3s | QuotaExceededError |
| 经书加载 | 3 次 | 300ms → 600ms → 1.2s | 5s | 经书不存在 |
| 词典查询 | 2 次 | 200ms → 400ms | 2s | 词典不存在 |
| MDX 查询 | 1 次 | 1s | 5s | 文件格式错误 |
| 文件解析 | 0 次 | — | 10s | 任何错误 |
| v1.0 迁移 | 1 次 | 500ms | 无 | 数据格式不兼容 |

## 5. 错误提示

### 5.1 提示层级设计

| 级别 | 组件 | 使用场景 | 自动消失 | 用户操作 |
|------|------|---------|---------|---------|
| **Toast** | Vant `showToast` | 轻微错误、操作反馈 | 是（2-3 秒） | 无需操作 |
| **Dialog** | Vant `showDialog` | 需要用户确认/选择 | 否 | 点击按钮 |
| **Notification** | Vant `showNotify` | 较重要通知 | 是（5 秒） | 可点击关闭 |
| **ErrorPage** | 全屏组件 | 严重错误，应用无法继续 | 否 | 点击恢复/返回 |
| **Inline Fallback** | ErrorBoundary 内 | 局部组件渲染失败 | 否 | 点击重试 |

### 5.2 错误提示文案规范

佛教应用的错误提示应保持**温和、不焦虑**的风格：

| 场景 | 不推荐 | 推荐 |
|------|--------|------|
| 词典查询失败 | "查询出错！错误码：500" | "释义暂时无法加载，请稍后重试" |
| 存储空间不足 | "QuotaExceededError: 存储空间已满" | "存储空间不足，请清理部分数据后重试" |
| 数据库损坏 | "InvalidStateError: 数据库损坏" | "检测到数据异常，可以从备份恢复" |
| TTS 不可用 | "浏览器不支持 Web Speech API" | "当前浏览器暂不支持诵读功能" |
| 经书加载失败 | "Failed to load sutra: undefined is not an object" | "经文加载未成功，请尝试重新导入" |

### 5.3 错误提示组件封装

```javascript
// utils/errorNotify.js
import { showToast, showDialog, showNotify } from 'vant'

/**
 * 根据错误严重程度展示不同的提示
 */
export function notifyError(error, options = {}) {
  const {
    level = 'minor',    // minor | major | critical
    title = '提示',
    fallbackMessage = '出现了一些问题，请稍后重试',
    onConfirm,
  } = options

  const message = getFriendlyMessage(error, fallbackMessage)

  switch (level) {
    case 'minor':
      showToast({
        message,
        duration: 2000,
        position: 'bottom',
      })
      break

    case 'major':
      showNotify({
        type: 'danger',
        message,
        duration: 5000,
      })
      break

    case 'critical':
      showDialog({
        title,
        message,
        confirmButtonText: '确定',
        showCancelButton: !!onConfirm,
        cancelButtonText: '取消',
      }).then((action) => {
        if (action === 'confirm' && onConfirm) {
          onConfirm()
        }
      })
      break
  }
}

/**
 * 将技术错误转换为用户友好的提示
 */
function getFriendlyMessage(error, fallback) {
  if (!error) return fallback

  // 已知错误类型映射
  const messageMap = {
    'QuotaExceededError': '存储空间不足，请在设置中清理部分数据',
    'InvalidStateError': '数据读取异常，请尝试刷新页面',
    'VersionError': '数据版本不兼容，请导入最新备份',
    'SecurityError': '当前浏览器限制了数据存储功能',
    'AbortError': '操作被中断，请重试',
    'TimeoutError': '操作超时，请检查网络连接后重试',
    'NotFoundError': '未找到所需数据，请确认数据已正确导入',
  }

  return messageMap[error.name] || error.message || fallback
}
```

### 5.4 全局错误页

```vue
<!-- components/common/CriticalError.vue -->
<template>
  <div v-if="isShowingError" class="critical-error-page">
    <div class="error-content">
      <div class="error-icon">
        <span class="icon-lotus">&#x1FAB7;</span>
      </div>
      <h2>应用遇到了一些问题</h2>
      <p class="error-desc">{{ errorDescription }}</p>

      <div class="action-buttons">
        <button class="btn-primary" @click="handleRecover">
          {{ recoverAction }}
        </button>
        <button class="btn-secondary" @click="handleContinue">
          继续使用
        </button>
      </div>

      <details class="error-details">
        <summary>技术详情</summary>
        <pre>{{ errorStack }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useErrorStore } from '../../stores/error.js'

const errorStore = useErrorStore()

const isShowingError = computed(() => errorStore.isShowingError)
const criticalError = computed(() => errorStore.criticalError)

const errorDescription = computed(() => {
  if (!criticalError.value) return ''
  const msg = criticalError.value.message || ''
  if (msg.includes('IndexedDB')) {
    return '浏览器数据存储功能出现异常，这可能影响阅读进度和词典功能。'
  }
  if (msg.includes('QuotaExceeded')) {
    return '浏览器存储空间已满，无法继续保存数据。'
  }
  return '应用运行过程中出现了未预期的错误。'
})

const recoverAction = computed(() => {
  if (!criticalError.value) return '尝试恢复'
  const msg = criticalError.value.message || ''
  if (msg.includes('IndexedDB') || msg.includes('数据库')) {
    return '尝试修复数据'
  }
  return '刷新页面'
})

function handleRecover() {
  errorStore.clearCritical()
  if (criticalError.value?.message?.includes('IndexedDB')) {
    // 引导用户进入数据恢复流程
    window.location.href = '/#/recover'
  } else {
    window.location.reload()
  }
}

function handleContinue() {
  errorStore.clearCritical()
}
</script>
```

### 5.5 加载状态与错误过渡

```vue
<!-- 统一的加载-错误-成功状态组件 -->
<template>
  <div v-if="status === 'loading'" class="loading-state">
    <div class="spinner" />
    <p>{{ loadingText }}</p>
  </div>
  <slot v-else-if="status === 'success'" />
  <div v-else-if="status === 'error'" class="error-state">
    <p class="error-text">{{ errorMessage }}</p>
    <button v-if="retryable" @click="$emit('retry')" class="retry-btn">
      重试
    </button>
  </div>
  <slot v-else name="empty" />
</template>

<script setup>
defineProps({
  status: { type: String, default: 'loading' }, // loading | success | error | empty
  loadingText: { type: String, default: '加载中...' },
  errorMessage: { type: String, default: '加载失败，请稍后重试' },
  retryable: { type: Boolean, default: true },
})

defineEmits(['retry'])
</script>
```

## 6. 降级策略

### 6.1 存储降级链路

根据 T-47 缓存策略报告的设计，存储降级分为四级：

```
L1: 内存 LRU 缓存（DefinitionCache）     < 0.001ms
  ↓ 未命中
L2: IndexedDB 查询（dict_entries）       < 5ms
  ↓ 不可用/QuotaExceededError
L3: localStorage 降级                    键值对，容量 5MB
  ↓ 不可用（隐私模式）
L4: 内存 Map（仅当前会话）               页面刷新后丢失
```

### 6.2 存储降级实现

```javascript
// storage/storageProvider.js
import { openDB } from 'idb'

/**
 * 存储 Provider 接口
 * 所有具体实现必须实现此接口
 */
class StorageProvider {
  async get(key) { throw new Error('Not implemented') }
  async set(key, value) { throw new Error('Not implemented') }
  async remove(key) { throw new Error('Not implemented') }
  async getAll() { throw new Error('Not implemented') }
  async clear() { throw new Error('Not implemented') }
  get isAvailable() { return true }
  get type() { return 'unknown' }
}

/**
 * IndexedDB Provider
 */
class IndexedDBProvider extends StorageProvider {
  constructor(dbName, version, upgradeFn) {
    super()
    this.dbName = dbName
    this.version = version
    this.upgradeFn = upgradeFn
    this._db = null
  }

  async getDb() {
    if (this._db) return this._db
    this._db = await openDB(this.dbName, this.version, { upgrade: this.upgradeFn })
    return this._db
  }

  async get(storeName, key) {
    const db = await this.getDb()
    return db.get(storeName, key)
  }

  async set(storeName, key, value) {
    const db = await this.getDb()
    return db.put(storeName, { id: key, ...value })
  }

  async remove(storeName, key) {
    const db = await this.getDb()
    return db.delete(storeName, key)
  }

  async getAll(storeName) {
    const db = await this.getDb()
    return db.getAll(storeName)
  }

  async clear(storeName) {
    const db = await this.getDb()
    return db.clear(storeName)
  }

  get isAvailable() {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null
    } catch {
      return false
    }
  }

  get type() { return 'indexeddb' }
}

/**
 * localStorage Provider
 */
class LocalStorageProvider extends StorageProvider {
  constructor() {
    super()
    this._available = false
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      this._available = true
    } catch {
      this._available = false
    }
  }

  async get(storeName, key) {
    if (!this._available) return null
    try {
      const raw = localStorage.getItem(`${storeName}::${key}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  async set(storeName, key, value) {
    if (!this._available) return
    try {
      localStorage.setItem(`${storeName}::${key}`, JSON.stringify(value))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[localStorage] 存储空间已满')
      }
    }
  }

  async remove(storeName, key) {
    if (!this._available) return
    localStorage.removeItem(`${storeName}::${key}`)
  }

  async getAll(storeName) {
    if (!this._available) return []
    const results = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${storeName}::`)) {
        try {
          results.push(JSON.parse(localStorage.getItem(key)))
        } catch { /* skip invalid */ }
      }
    }
    return results
  }

  async clear(storeName) {
    if (!this._available) return
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${storeName}::`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
  }

  get isAvailable() { return this._available }
  get type() { return 'localStorage' }
}

/**
 * Memory Provider（纯内存）
 */
class MemoryProvider extends StorageProvider {
  constructor() {
    super()
    this._stores = new Map()
  }

  async get(storeName, key) {
    const store = this._stores.get(storeName)
    return store?.get(key) ?? null
  }

  async set(storeName, key, value) {
    if (!this._stores.has(storeName)) {
      this._stores.set(storeName, new Map())
    }
    this._stores.get(storeName).set(key, value)
  }

  async remove(storeName, key) {
    this._stores.get(storeName)?.delete(key)
  }

  async getAll(storeName) {
    const store = this._stores.get(storeName)
    return store ? Array.from(store.values()) : []
  }

  async clear(storeName) {
    this._stores.delete(storeName)
  }

  get isAvailable() { return true }
  get type() { return 'memory' }
}

/**
 * StorageManager - 自动降级管理器
 */
class StorageManager {
  constructor() {
    this.providers = []
    this.activeProvider = null
  }

  /**
   * 注册 Provider（按优先级从高到低）
   */
  register(provider) {
    this.providers.push(provider)
  }

  /**
   * 初始化：选择第一个可用的 Provider
   */
  async init() {
    for (const provider of this.providers) {
      if (provider.isAvailable) {
        this.activeProvider = provider
        console.log(`[StorageManager] 使用存储: ${provider.type}`)
        return provider
      }
    }
    // 理论上 MemoryProvider 永远可用
    this.activeProvider = new MemoryProvider()
    console.warn('[StorageManager] 所有持久化存储不可用，使用内存模式')
    return this.activeProvider
  }

  // 代理方法
  async get(...args) { return this.activeProvider.get(...args) }
  async set(...args) { return this.activeProvider.set(...args) }
  async remove(...args) { return this.activeProvider.remove(...args) }
  async getAll(...args) { return this.activeProvider.getAll(...args) }
  async clear(...args) { return this.activeProvider.clear(...args) }

  get type() { return this.activeProvider?.type || 'unknown' }
  get isDegraded() {
    return this.activeProvider && this.activeProvider.type !== 'indexeddb'
  }
}

// 创建全局实例
const storageManager = new StorageManager()

export { storageManager, IndexedDBProvider, LocalStorageProvider, MemoryProvider }
```

### 6.3 功能降级策略

| 功能 | 正常模式 | 降级模式 | 触发条件 |
|------|---------|---------|---------|
| **数据存储** | IndexedDB 多表 | localStorage 键值对 | IndexedDB 不可用/损坏 |
| **释义缓存** | LRU Map (1000 条) | 内存 Map (无限制，无淘汰) | 内存压力过大 |
| **词典匹配** | 分层 Trie | 简单字符串 includes() | Trie 构建失败/内存不足 |
| **MDX 查询** | mdict-js direct | 跳过，提示"大词典暂不可用" | mdict-js 加载失败 |
| **TTS 诵读** | Web Speech API | 隐藏按钮 | 浏览器不支持 |
| **拼音标注** | 精确匹配表 | 关闭拼音功能 | 拼音表加载失败 |
| **统计功能** | IndexedDB 记录 | 仅内存统计 | 存储不可用 |
| **经书分块加载** | 按需加载章节 | 全量加载小经文，大经文截断 | 存储空间不足 |

### 6.4 Trie 降级实现

```javascript
// engine/trie/fallbackMatcher.js

/**
 * 当 Trie 不可用时的降级匹配器
 * 使用简单的字符串匹配，性能 O(n*m) 但功能可用
 */
export class FallbackMatcher {
  constructor(terms) {
    this.terms = terms  // [{ term, dictId }]
    // 按长度降序排序，确保长词优先
    this.terms.sort((a, b) => b.term.length - a.term.length)
  }

  /**
   * 在文本中搜索匹配的术语
   * @param {string} text
   * @returns {Array<{ term: string, start: number, end: number, dictId: string }>}
   */
  search(text) {
    const results = []
    const covered = new Set() // 已覆盖的位置，避免重复匹配

    for (const { term, dictId } of this.terms) {
      let index = 0
      while ((index = text.indexOf(term, index)) !== -1) {
        // 检查是否与已有结果重叠
        let overlap = false
        for (let i = index; i < index + term.length; i++) {
          if (covered.has(i)) {
            overlap = true
            break
          }
        }

        if (!overlap) {
          results.push({
            term,
            start: index,
            end: index + term.length,
            dictId,
          })
          for (let i = index; i < index + term.length; i++) {
            covered.add(i)
          }
        }

        index += 1
      }
    }

    return results.sort((a, b) => a.start - b.start)
  }
}
```

### 6.5 降级状态通知

```javascript
// stores/system.js
import { defineStore } from 'pinia'

export const useSystemStore = defineStore('system', {
  state: () => ({
    storageMode: 'indexeddb',  // indexeddb | localStorage | memory
    isDegraded: false,
    degradedFeatures: [],      // 已降级的功能列表
    lastDegradationTime: null,
  }),

  actions: {
    setStorageMode(mode) {
      this.storageMode = mode
      this.isDegraded = mode !== 'indexeddb'
      if (this.isDegraded) {
        this.lastDegradationTime = new Date().toISOString()
      }
    },

    addDegradedFeature(feature) {
      if (!this.degradedFeatures.includes(feature)) {
        this.degradedFeatures.push(feature)
      }
    },

    clearDegradedFeatures() {
      this.degradedFeatures = []
    },
  },
})
```

## 7. 日志记录

### 7.1 日志等级定义

| 等级 | 标识 | 使用场景 | 默认输出 |
|------|------|---------|---------|
| **DEBUG** | `[DBG]` | 调试信息，开发环境 | console |
| **INFO** | `[INF]` | 正常操作记录（如初始化、数据加载） | console（生产可关闭） |
| **WARN** | `[WRN]` | 可恢复异常（如重试、降级） | console |
| **ERROR** | `[ERR]` | 不可恢复错误 | console + 可选上报 |

### 7.2 轻量日志模块

```javascript
// utils/logger.js

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

class Logger {
  constructor(module, level = 'INFO') {
    this.module = module
    this.level = LOG_LEVELS[level] ?? LOG_LEVELS.INFO
    this.maxHistory = 100
    this.history = []
  }

  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug(`[DBG][${this.module}]`, ...args)
      this._record('DEBUG', args)
    }
  }

  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(`[INF][${this.module}]`, ...args)
      this._record('INFO', args)
    }
  }

  warn(...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(`[WRN][${this.module}]`, ...args)
      this._record('WARN', args)
    }
  }

  error(...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(`[ERR][${this.module}]`, ...args)
      this._record('ERROR', args)
    }
  }

  _record(level, args) {
    this.history.push({
      level,
      args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)),
      timestamp: Date.now(),
    })
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
  }

  // 导出最近 N 条日志供用户反馈问题时使用
  exportHistory(count = 20) {
    const recent = this.history.slice(-count)
    return recent.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString()
      return `[${entry.level}][${time}] ${entry.args.join(' ')}`
    }).join('\n')
  }
}

// 创建模块级日志实例
const loggers = new Map()

export function createLogger(moduleName, level) {
  if (!loggers.has(moduleName)) {
    loggers.set(moduleName, new Logger(moduleName, level))
  }
  return loggers.get(moduleName)
}
```

### 7.3 使用示例

```javascript
// services/dictService.js
import { createLogger } from '../utils/logger.js'

const logger = createLogger('DictService', import.meta.env.DEV ? 'DEBUG' : 'WARN')

class DictService {
  async lookupTerm(term, dictId) {
    logger.debug('查询词条', { term, dictId })
    // ...
    logger.warn('IndexedDB 查询失败，重试中', { error: e.message })
    // ...
    logger.error('词典查询完全失败', { term, dictId })
  }
}
```

### 7.4 可选的错误上报方案（v2.1+）

v2.0 阶段不引入第三方错误上报服务。预留以下方案供 v2.1 参考：

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **Sentry** | 生产环境错误监控 | 功能完善、Source Map 支持 | 需要自建或付费 |
| **LogRocket** | 用户会话录制回放 | 可重现用户操作路径 | 隐私合规要求高 |
| **自定义上报** | 自有服务器 | 完全可控 | 需要后端支持 |
| **用户导出日志** | 问题反馈 | 零依赖、纯前端 | 需要用户手动操作 |

**推荐路径**：v2.1 接入 Sentry 免费版（5,000 errors/month），配置 Source Map 以追踪压缩后代码的实际错误位置。

### 7.5 用户导出日志功能

```javascript
// utils/diagnostics.js
import { createLogger } from './logger.js'

/**
 * 收集诊断信息，供用户反馈问题时导出
 */
export async function collectDiagnostics() {
  const info = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    storageQuota: null,
    storageUsage: null,
    indexedDBAvailable: typeof indexedDB !== 'undefined',
    localStorageAvailable: typeof localStorage !== 'undefined',
    webSpeechAvailable: typeof SpeechSynthesisUtterance !== 'undefined',
  }

  // 存储配额
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate()
    info.storageQuota = `${(estimate.quota / 1024 / 1024).toFixed(1)}MB`
    info.storageUsage = `${(estimate.usage / 1024 / 1024).toFixed(1)}MB`
  }

  return info
}

/**
 * 导出诊断报告（供用户下载）
 */
export async function exportDiagnostics() {
  const diagnostics = await collectDiagnostics()
  const logHistory = createLogger('App').exportHistory(50)

  const report = JSON.stringify({
    ...diagnostics,
    recentLogs: logHistory.split('\n'),
  }, null, 2)

  const blob = new Blob([report], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `buddhist-reader-diagnostics-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
```

## 8. 结论与建议

### 8.1 v2.0 错误处理策略总结

| 功能 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| **全局错误边界（ErrorBoundary）** | **本期实现** | P0 | 局部错误隔离，防止白屏 |
| **App 级错误捕获** | **本期实现** | P0 | unhandledrejection + errorHandler |
| **Pinia 错误状态管理** | **本期实现** | P0 | criticalError store |
| **重试机制（指数退避）** | **本期实现** | P0 | withRetry 工具函数 |
| **用户友好错误提示** | **本期实现** | P0 | notifyError 分层提示 |
| **全局错误页** | **本期实现** | P0 | CriticalError 组件 |
| **存储降级链路** | **本期实现** | P0 | IndexedDB → localStorage → memory |
| **Trie 降级** | **本期实现** | P1 | FallbackMatcher 字符串匹配 |
| **轻量日志模块** | **本期实现** | P1 | Logger 类 + 诊断导出 |
| **功能降级状态** | **本期实现** | P1 | systemStore 记录降级信息 |
| **Sentry 集成** | **v2.1** | - | 生产环境错误监控 |

### 8.2 核心设计原则

1. **优雅降级优于崩溃**：任何功能失败都应有降级方案，而不是直接报错退出
2. **错误隔离**：使用 ErrorBoundary 实现组件级隔离，词典加载失败不影响经文阅读
3. **用户友好**：所有错误提示使用温和的佛教风格文案，避免技术术语和红色警告
4. **自动恢复优先**：重试机制对用户透明，无需手动操作
5. **日志可导出**：提供诊断信息导出功能，方便问题排查

### 8.3 关键实现文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/common/ErrorBoundary.vue` | 新增 | 可复用的错误边界组件 |
| `src/components/common/CriticalError.vue` | 新增 | 全局严重错误页 |
| `src/components/common/AsyncState.vue` | 新增 | 加载-错误-成功状态组件 |
| `src/stores/error.js` | 新增 | 错误状态 Pinia store |
| `src/stores/system.js` | 新增 | 系统状态（降级信息） |
| `src/utils/retry.js` | 新增 | 指数退避重试工具 |
| `src/utils/errorNotify.js` | 新增 | 分层错误提示封装 |
| `src/utils/logger.js` | 新增 | 轻量日志模块 |
| `src/utils/diagnostics.js` | 新增 | 诊断信息收集与导出 |
| `src/storage/storageProvider.js` | 新增 | 存储 Provider 抽象 + 降级管理器 |
| `src/engine/trie/fallbackMatcher.js` | 新增 | Trie 降级匹配器 |
| `src/main.js` | 修改 | 添加全局错误处理器 |

## 9. 对 v2.1 方案的影响

### 9.1 新增/修改文件清单

| 文件 | 操作 | 阶段 | 说明 |
|------|------|------|------|
| `src/main.js` | 修改 | v2.0 | 添加 unhandledrejection / Vue errorHandler |
| `src/App.vue` | 修改 | v2.0 | 挂载 CriticalError 全局组件 |
| `src/components/common/ErrorBoundary.vue` | 新增 | v2.0 | 可复用错误边界 |
| `src/components/common/CriticalError.vue` | 新增 | v2.0 | 全屏错误页 |
| `src/stores/error.js` | 新增 | v2.0 | 错误状态管理 |
| `src/stores/system.js` | 新增 | v2.0 | 系统降级状态 |
| `src/utils/retry.js` | 新增 | v2.0 | 重试工具 |
| `src/utils/errorNotify.js` | 新增 | v2.0 | 分层提示 |
| `src/utils/logger.js` | 新增 | v2.0 | 日志模块 |
| `src/utils/diagnostics.js` | 新增 | v2.0 | 诊断导出 |
| `src/storage/storageProvider.js` | 新增 | v2.0 | 存储降级管理器 |
| `src/engine/trie/fallbackMatcher.js` | 新增 | v2.0 | 降级匹配器 |

### 9.2 Service 层修改

所有 Service 方法需要：
1. 使用 `withRetry` 包裹关键 IndexedDB 操作
2. 捕获错误后调用 `notifyError` 展示用户友好的提示
3. 降级时更新 `systemStore` 的降级状态

```javascript
// 所有 Service 的统一错误处理模式
import { withRetry } from '../utils/retry.js'
import { notifyError } from '../utils/errorNotify.js'
import { useSystemStore } from '../stores/system.js'

class AnyService {
  async someOperation() {
    const systemStore = useSystemStore()
    try {
      return await withRetry(
        async () => {
          // 实际操作
        },
        { shouldRetry: (e) => e.name !== 'QuotaExceededError' }
      )
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        systemStore.addDegradedFeature('storage')
      }
      notifyError(error, { level: 'major' })
      throw error
    }
  }
}
```

### 9.3 v2.1 远期增强

| 增强项 | 说明 | 优先级 |
|--------|------|--------|
| **Sentry 集成** | 生产环境错误监控，含 Source Map | P1 |
| **错误频率统计** | 记录各类错误出现频率，识别高发问题 | P2 |
| **自动修复向导** | 针对常见错误提供一键修复引导 | P2 |
| **错误上报开关** | 用户可选择是否上报匿名错误数据 | P3 |
| **性能监控** | 结合错误数据监控关键操作耗时 | P2 |
| **离线错误队列** | 错误先存本地，网络恢复后批量上报 | P3 |

---

*文档版本: v1.0.0*
*最后更新: 2026-05-02*
