# EventBus 跨组件通信方案 调研报告

> 任务编号：T-13
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

本项目 v2.0 需要实现词典开关与阅读页高亮刷新的跨组件通信机制。具体场景：

- 用户在词典管理页或设置页切换词典开关（ON/OFF）
- 阅读页需要实时响应开关变化，重建高亮显示
- 阅读页可能处于非激活状态（路由未挂载），需要在恢复时获取最新状态

核心调研目标：
1. 对比 Vue 3 生态下可行的跨组件通信方案
2. 设计词典开关→高亮刷新的事件时序
3. 处理阅读页后台运行时的订阅清理
4. 设计频繁开关切换的防抖策略

## 2. 事件方案对比

| 方案 | 包大小 | API 风格 | 类型安全 | 性能 | Vue 3 兼容 | 适用场景 |
|------|--------|----------|----------|------|------------|----------|
| mitt | ~200B gzip | `on/emit/off` 事件名模式 | 泛型支持（需手动声明 Events 类型） | 极高，纯函数实现 | 独立库，无依赖 | 简单事件通知，组件间解耦通信 |
| Pinia $subscribe | Pinia 已引入（~3KB gzip） | 响应式状态变更监听 | 自动推导 store 类型 | 高，依赖 Vue reactivity | 原生 Vue 3 生态 | 状态驱动场景，已有 Pinia 时零额外依赖 |
| Pinia $onAction | Pinia 已引入 | action 执行前/后钩子 | 自动推导 action 参数类型 | 高，与 $subscribe 相当 | 原生 Vue 3 生态 | 追踪 action 调用，审计日志 |
| provide/inject | 0（Vue 3 内置） | 依赖注入，`provide(key, value)` / `inject(key)` | 泛型支持 | 中，仅在祖先-后代组件间有效 | 原生 Vue 3 核心 API | 父子/祖孙组件传值，不适合跨路由通信 |
| 自定义 EventBus | 0（手写） | 类似 mitt 的 `on/emit/off` | 需自行实现类型推导 | 极高 | 无限制 | 无外部依赖场景，但重复造轮子 |

### 2.1 mitt 详细分析

- **包大小**：~200B gzip，是目前最小的事件库
- **API**：`emitter.on(event, handler)` / `emitter.emit(event, data)` / `emitter.off(event, handler)`
- **通配符**：支持 `emitter.on('*', handler)` 监听所有事件
- **类型安全**：`mitt<Events>()` 泛型支持，可精确约束事件名和 payload 类型
- **缺点**：独立依赖，需要额外引入；无内置防抖/节流能力

### 2.2 Pinia $subscribe 详细分析

- **包大小**：Pinia 已作为项目依赖（~3KB gzip），零额外开销
- **API**：`store.$subscribe(callback, options)` / `store.$onAction(callback)`
- **自动清理**：在组件 setup 中调用时，组件卸载自动取消订阅
- **detached 模式**：`{ detached: true }` 可让订阅在组件卸载后继续保持
- **flush 控制**：`{ flush: 'sync' | 'pre' | 'post' }` 控制回调触发时机
- **缺点**：$subscribe 监听的是整个 store 的状态变化，需要自行过滤无关变更

### 2.3 推荐方案

**推荐 Pinia $subscribe，理由如下：**

1. **项目已有 Pinia**：v2.0 方案已选定 Pinia 作为状态管理层，无需引入额外依赖
2. **词典开关本就是状态**：`dictStore.enabledDictIds` 是 store 的状态字段，开关操作直接修改状态，$subscribe 天然适配
3. **自动生命周期管理**：在 Vue 组件中调用 $subscribe 时，组件卸载自动清理，无需手动管理
4. **类型安全**：Pinia store 的类型完全自动推导，无需额外声明
5. **detached 订阅**：对于阅读页后台场景，可用 `detached: true` 保持订阅
6. **mitt 的不足**：mitt 是纯事件通知，不携带状态快照，消费方需额外查 store 获取最新状态；而 $subscribe 直接提供最新 state

**mitt 的适用场景**：如果需要解耦到 store 之外的纯事件通信（如 TTS 播放控制、全局快捷键等），可以后续引入 mitt 作为补充。但词典开关场景不需要。

## 3. 事件时序设计

### 3.1 词典开关切换流程

```
用户操作                Pinia Store              TrieManager            Reader 页面
   │                       │                         │                     │
   │  点击开关              │                         │                     │
   ├──────────────────────►│                         │                     │
   │  toggleDict(id)       │                         │                     │
   │                       │  更新 enabledDictIds    │                     │
   │                       ├────────────────────────►│                     │
   │                       │  rebuild Trie           │                     │
   │                       │                         │                     │
   │                       │  $subscribe 触发         │                     │
   │                       ├──────────────────────────────────────────────►│
   │                       │  mutation.payload       │                     │
   │                       │  + state.enabledDictIds │                     │
   │                       │                         │                     │
   │                       │                         │  refreshHighlight()  │
```

**具体步骤：**

1. 用户在词典管理页点击开关 → `dictStore.toggleDict(dictId, enabled)`
2. `toggleDict` action 执行：
   - 更新 `dict_config` 表的 `enabled` 字段（IndexedDB）
   - 更新 `state.enabledDictIds`（添加或移除 dictId）
3. Pinia `$subscribe` 检测到 `enabledDictIds` 变化
4. 阅读页收到订阅回调，触发高亮刷新：
   - TrieManager 根据新的 `enabledDictIds` 重新启用/禁用对应 Trie
   - 高亮引擎重新扫描当前经文内容
   - 更新 DOM 高亮标记

### 3.2 高亮刷新流程

```
$subscribe 回调触发
        │
        ▼
┌─────────────────────┐
│ 1. 判断变更是否相关   │ 检查 mutation.payload 是否包含 enabledDictIds
│    不相关 → 忽略     │
└──────────┬──────────┘
           │ 相关
           ▼
┌─────────────────────┐
│ 2. 更新 TrieManager  │ enable/disable 对应 Trie
│    启用/禁用 Trie     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. 重新扫描经文       │ 用合并后的 Trie 扫描当前章节内容
│    收集匹配结果       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 更新 DOM 高亮     │ 移除旧高亮，渲染新高亮
└─────────────────────┘
```

## 4. 事件订阅和清理

### 4.1 阅读页激活状态

Vue Router 路由切换时，非当前路由的页面组件会被卸载（unmount）。

| 场景 | 订阅策略 |
|------|----------|
| 阅读页处于活跃路由 | 正常 $subscribe，组件卸载自动清理 |
| 阅读页被卸载（切换到其他页面） | 使用 `detached: true` 保持订阅，或在 readerStore 中记录待处理变更 |
| 阅读页重新挂载 | 初始化时从 dictStore 读取最新 `enabledDictIds`，主动触发一次刷新 |

### 4.2 推荐实现

**方案 A：不订阅后台页面，依赖主动同步（推荐）**

```javascript
// Reader.vue onMounted
onMounted(() => {
  // 首次挂载时主动获取最新状态
  refreshHighlight()

  // 订阅词典开关变化（仅阅读页激活时有效）
  const dictStore = useDictStore()
  dictStore.$subscribe((mutation, state) => {
    // 仅关注 enabledDictIds 变化
    if (mutation.payload?.enabledDictIds) {
      debouncedRefresh()
    }
  })
  // 组件卸载时 Pinia 自动清理订阅
})
```

**为什么推荐方案 A：**
- 阅读页卸载后不再需要响应高亮刷新（用户看不到）
- 重新挂载时主动从 store 读取最新状态即可
- 无需 detached 订阅，无内存泄漏风险
- 实现简单，无需额外状态追踪

**方案 B：detached 订阅 + 延迟刷新（备选）**

```javascript
// 使用 detached 保持订阅
dictStore.$subscribe(callback, { detached: true })
// 需要手动清理
onBeforeUnmount(() => { unsubscribe() })
```

不推荐方案 B 的原因：增加手动清理负担，且后台刷新高亮无实际意义。

### 4.3 订阅清理检查清单

- [ ] 组件内 $subscribe：Pinia 自动清理，无需手动处理
- [ ] detached $subscribe：必须在 onBeforeUnmount 中手动 unsubscribe
- [ ] 全局服务层的 $subscribe（非组件上下文）：必须手动管理生命周期

## 5. 防抖和节流

### 5.1 问题分析

用户快速连续点击开关时，可能触发：
- 短时间内多次 $subscribe 回调
- 每次回调都重建 Trie 和重新扫描经文（性能开销大）

### 5.2 推荐方案：防抖（debounce）

**防抖优于节流的原因：**
- 开关切换的最终状态才是有意义的，中间过渡状态不需要处理
- 防抖等待操作停止后才执行一次刷新，避免无效重建
- 典型场景：用户快速切换多个词典开关，只需在所有切换完成后刷新一次

```javascript
import { debounce } from 'lodash-es' // 或手写简易 debounce

// 200ms 防抖
const debouncedRefresh = debounce(() => {
  refreshHighlight()
}, 200)

// $subscribe 中调用
dictStore.$subscribe((mutation, state) => {
  if (mutation.payload?.enabledDictIds) {
    debouncedRefresh()
  }
})
```

### 5.3 手写 debounce（零依赖方案）

项目已使用 Vant 4，不需要引入 lodash-es。可手写简易 debounce：

```javascript
function debounce(fn, delay = 200) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
```

### 5.4 节流场景

节流（throttle）不适用于词典开关场景。节流适合滚动事件、resize 事件等高频持续触发场景。开关切换是离散事件，用防抖更合适。

### 5.5 建议参数

| 场景 | 策略 | 延迟 |
|------|------|------|
| 词典开关切换 | debounce | 200ms |
| Trie 重建（大词典） | debounce + loading 状态 | 300ms |
| 搜索过滤 | debounce | 150ms |

## 6. 实现示例

### 6.1 dict store（Pinia）

```javascript
// stores/dict.js
import { defineStore } from 'pinia'

export const useDictStore = defineStore('dict', {
  state: () => ({
    enabledDictIds: new Set(['builtin']),
    allDicts: [],
  }),

  actions: {
    async toggleDict(dictId, enabled) {
      // 1. 更新 IndexedDB
      await dictStore.updateConfig(dictId, { enabled })

      // 2. 更新 store 状态
      if (enabled) {
        this.enabledDictIds.add(dictId)
      } else {
        this.enabledDictIds.delete(dictId)
      }
    },
  },
})
```

### 6.2 Reader.vue 订阅

```vue
<!-- pages/Reader.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useDictStore } from '@/stores/dict'
import { useReaderStore } from '@/stores/reader'
import trieManager from '@/engine/trie/manager'
import highlighter from '@/engine/highlighter'

const dictStore = useDictStore()
const readerStore = useReaderStore()

// 简易 debounce
function debounce(fn, delay = 200) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

async function refreshHighlight() {
  // 1. 更新 TrieManager
  trieManager.syncEnabledDicts(dictStore.enabledDictIds)

  // 2. 重新扫描当前章节
  const content = readerStore.currentChapterContent
  const matches = trieManager.searchAll(content)

  // 3. 更新 DOM 高亮
  highlighter.apply(matches)
}

const debouncedRefresh = debounce(refreshHighlight, 200)

let unsubscribe = null

onMounted(() => {
  // 首次加载刷新
  refreshHighlight()

  // 订阅词典开关变化
  unsubscribe = dictStore.$subscribe((mutation, state) => {
    if (mutation.payload?.enabledDictIds) {
      debouncedRefresh()
    }
  })
})

onBeforeUnmount(() => {
  // 清理 debounce 定时器
  debouncedRefresh.cancel?.()
  // Pinia 在组件上下文中自动清理 $subscribe
  // 如果使用了 detached，需手动调用 unsubscribe()
})
</script>
```

### 6.3 TrieManager 同步

```javascript
// engine/trie/manager.js
class TrieManager {
  constructor() {
    this.tries = new Map()       // dictId -> Trie
    this.enabledDicts = new Set()
  }

  register(dictId, trie) {
    this.tries.set(dictId, trie)
  }

  syncEnabledDicts(enabledDictIds) {
    // 启用新增的词典
    for (const id of enabledDictIds) {
      if (!this.enabledDicts.has(id)) {
        this.enabledDicts.add(id)
      }
    }
    // 禁用已移除的词典
    for (const id of this.enabledDicts) {
      if (!enabledDictIds.has(id)) {
        this.enabledDicts.delete(id)
      }
    }
  }

  searchAll(text) {
    const results = []
    for (const [dictId, trie] of this.tries) {
      if (this.enabledDicts.has(dictId)) {
        results.push(...trie.search(text))
      }
    }
    return this.deduplicate(results)
  }

  deduplicate(matches) {
    // 长词优先去重
    matches.sort((a, b) => b.term.length - a.term.length)
    const used = new Set()
    return matches.filter(m => {
      for (let i = m.start; i < m.end; i++) {
        if (used.has(i)) return false
      }
      for (let i = m.start; i < m.end; i++) used.add(i)
      return true
    })
  }
}

export default new TrieManager()
```

## 7. 结论与建议

### 明确结论

**词典开关→高亮刷新的跨组件通信采用 Pinia $subscribe 方案，不引入 mitt。**

理由总结：
1. 项目已使用 Pinia 作为状态管理，零额外依赖
2. 词典开关本质是状态变更，$subscribe 天然适配
3. 组件级自动生命周期管理，减少内存泄漏风险
4. 配合 debounce（200ms）处理频繁开关切换

### 实施建议

| 项目 | 建议 |
|------|------|
| 通信方案 | Pinia $subscribe |
| 防抖策略 | 200ms debounce |
| 后台页面处理 | 不订阅，重新挂载时主动同步 |
| mitt 引入时机 | 仅在需要纯事件通信（如 TTS 控制、全局快捷键）时引入 |

## 8. 对 v2.1 方案的影响

本调研结果对 v2.1 方案的具体影响：

1. **无需新增 mitt 依赖**：v2.1 的开发计划中不需要包含 mitt 的安装和配置步骤
2. **dict store 需暴露 enabledDictIds**：dictStore 的 state 中必须包含 `enabledDictIds` 字段（Set 或 Array），作为 $subscribe 的监听目标
3. **Reader.vue 需在 onMounted 中注册 $subscribe**：阅读页组件的 setup 中需添加词典开关订阅逻辑
4. **TrieManager 需提供 syncEnabledDicts 方法**：TrieManager 需要暴露同步启用词典列表的方法，供订阅回调调用
5. **防抖工具函数**：需在 utils 中提供 debounce 工具函数，或采用简易手写实现
6. **Store 层设计影响**：所有涉及跨组件状态通知的模块（如 TTS 播放控制、书签操作）都应优先通过 Pinia 状态变更 + $subscribe 实现，而非独立事件总线

## 9. 参考资料

- [Mitt GitHub](https://github.com/developit/mitt) — mitt 官方文档，~200B gzip
- [Pinia $subscribe 文档](https://pinia.vuejs.org/core-concepts/state.html#subscribing-to-the-state) — Pinia 官方状态订阅文档
- [Pinia $onAction 文档](https://pinia.vuejs.org/core-concepts/actions.html#subscribing-to-actions) — Pinia action 订阅文档
- [Vue 3 provide/inject 文档](https://vuejs.org/api/composition-api-dependency-injection.html) — Vue 3 依赖注入 API
- [Vue 3 事件总线迁移指南](https://v3-migration.vuejs.org/breaking-changes/events-api.html) — Vue 2 $on/$off/$emit 在 Vue 3 中的替代方案
- [Lodash debounce](https://lodash.com/docs/4.17.15#debounce) — lodash 防抖函数文档
