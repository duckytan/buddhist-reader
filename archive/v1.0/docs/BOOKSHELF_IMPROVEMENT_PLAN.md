# 书架页面优化方案

> **创建日期**: 2026-04-26
> **版本**: v1.0
> **状态**: 规划阶段

---

## 📋 目录

- [1. 当前问题分析](#1-当前问题分析)
- [2. 优化方案总览](#2-优化方案总览)
- [3. 核心功能设计](#3-核心功能设计)
- [4. 布局与交互设计](#4-布局与交互设计)
- [5. 实施计划](#5-实施计划)

---

## 1. 当前问题分析

### 1.1 现有功能分析

基于当前代码，书架页面存在以下问题：

```vue
// 当前 Bookshelf.vue 的核心功能
- 搜索栏（基础）
- 网格布局展示经文卡片
- 加载动态经文
- "添加经文"按钮
```

### 1.2 存在的问题

| 问题类型 | 具体问题 | 严重程度 | 影响用户 |
|---------|---------|---------|---------|
| 🔴 严重 | 缺少列表视图，经文多时难以快速浏览 | 高 | 所有用户 |
| 🔴 严重 | 搜索功能不完善，无搜索历史 | 高 | 经文多的用户 |
| 🟡 中等 | 缺少分类和筛选功能 | 中 | 有特定需求的用户 |
| 🟡 中等 | 缺少排序功能（按时间、进度、名称） | 中 | 所有用户 |
| 🟢 轻微 | 缺少最近阅读记录 | 低 | 经常切换经文的用户 |
| 🟢 轻微 | 缺少收藏功能 | 低 | 重度用户 |

### 1.3 用户场景痛点

**场景1：经文数量超过10部**
```
用户痛点：
❌ 网格视图滚动太慢，很难快速找到目标
❌ 不知道某部经文是否有阅读进度
❌ 想找某类经文（如密宗）无从下手
```

**场景2：忘记经文名称**
```
用户痛点：
❌ 搜索需要输入完整名称
❌ 无搜索建议和历史记录
❌ 无法按译者/分类筛选
```

**场景3：切换阅读多部经文**
```
用户痛点：
❌ 最近阅读的经文混在大量经文中
❌ 需要多次滚动才能找到上次读的
```

---

## 2. 优化方案总览

### 2.1 核心改进方向

| 改进方向 | 说明 | 优先级 | 预估时间 |
|---------|------|--------|----------|
| 📋 列表/网格切换 | 支持列表和网格两种视图 | P0 | 2-3h |
| 🔍 增强搜索 | 搜索建议、历史记录、高亮 | P0 | 3-4h |
| 🏷️ 分类筛选 | 按分类、译者、阅读状态筛选 | P1 | 4-5h |
| 📊 排序功能 | 按名称、时间、进度排序 | P1 | 2-3h |
| 🕐 最近阅读 | 顶部显示最近阅读的经文 | P1 | 2-3h |
| ⭐ 收藏功能 | 收藏常用经文 | P2 | 2-3h |
| 📊 阅读统计 | 首页显示阅读统计 | P2 | 2-3h |

### 2.2 功能优先级矩阵

```
P0（必须实现）：
├── 列表/网格视图切换
└── 增强搜索功能

P1（重要功能）：
├── 分类筛选
├── 排序功能
└── 最近阅读

P2（锦上添花）：
├── 收藏功能
└── 阅读统计卡片
```

---

## 3. 核心功能设计

### 3.1 视图切换功能（列表/网格）⭐⭐⭐⭐⭐

#### 功能描述
- **网格视图**：卡片式展示，显示封面和标题（现有）
- **列表视图**：列表式展示，显示更多信息
- **记住用户偏好**：保存视图选择到本地存储
- **响应式适配**：移动端优先列表视图

#### 技术实现

```vue
<!-- src/pages/Bookshelf.vue -->
<template>
  <div class="bookshelf">
    <!-- 顶部搜索栏 -->
    <div class="shelf-header">
      <h1 class="page-title">般若佛经阅读器</h1>
      <div class="search-bar">
        <van-search
          v-model="searchQuery"
          placeholder="搜索经书、译者、分类..."
          @focus="showSearchHistory = true"
          @input="handleSearchInput"
        />
      </div>
    </div>

    <!-- 视图切换和筛选栏 -->
    <div class="shelf-actions">
      <div class="view-toggle">
        <button
          :class="['view-btn', { active: viewMode === 'grid' }]"
          @click="viewMode = 'grid'"
        >
          <van-icon name="apps-o" />
        </button>
        <button
          :class="['view-btn', { active: viewMode === 'list' }]"
          @click="viewMode = 'list'"
        >
          <van-icon name="list-switch" />
        </button>
      </div>

      <div class="filter-sort">
        <button @click="showFilterPopup = true">
          <van-icon name="filter-o" />
          筛选
          <span v-if="activeFilterCount > 0" class="badge">
            {{ activeFilterCount }}
          </span>
        </button>
        <button @click="toggleSort">
          <van-icon name="sort" />
          {{ currentSortLabel }}
        </button>
      </div>
    </div>

    <!-- 最近阅读 -->
    <div v-if="recentSutras.length > 0" class="recent-section">
      <div class="section-header">
        <h2>最近阅读</h2>
        <button @click="showAllRecent">查看全部</button>
      </div>
      <div class="recent-list">
        <div
          v-for="sutra in recentSutras"
          :key="sutra.id"
          class="recent-item"
          @click="openSutra(sutra)"
        >
          <div class="recent-cover">{{ sutra.cover }}</div>
          <div class="recent-info">
            <h3 class="recent-title">{{ sutra.title }}</h3>
            <p class="recent-meta">
              <span>{{ sutra.translator }}</span>
              <span>·</span>
              <span>{{ sutra.lastReadTime }}</span>
            </p>
            <div class="recent-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: sutra.progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ sutra.progress }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 经文列表/网格 -->
    <div class="shelf-content">
      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="list-view">
        <div
          v-for="sutra in filteredSutras"
          :key="sutra.id"
          class="list-item"
          @click="openSutra(sutra)"
        >
          <div class="list-cover">{{ sutra.cover }}</div>
          <div class="list-info">
            <div class="list-header">
              <h3 class="list-title">{{ sutra.title }}</h3>
              <button
                v-if="sutra.isFavorite"
                class="favorite-btn active"
                @click.stop="toggleFavorite(sutra)"
              >
                <van-icon name="star" />
              </button>
              <button
                v-else
                class="favorite-btn"
                @click.stop="toggleFavorite(sutra)"
              >
                <van-icon name="star-o" />
              </button>
            </div>
            <p class="list-fullname">{{ sutra.fullName }}</p>
            <div class="list-meta">
              <span class="meta-tag">{{ sutra.category }}</span>
              <span class="meta-tag">{{ sutra.translator }}</span>
              <span v-if="sutra.progress > 0" class="meta-tag progress">
                已读 {{ sutra.progress }}%
              </span>
            </div>
            <div v-if="sutra.progress > 0" class="list-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: sutra.progress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 网格视图 -->
      <div v-else class="grid-view">
        <div
          v-for="sutra in filteredSutras"
          :key="sutra.id"
          class="grid-item"
          @click="openSutra(sutra)"
        >
          <div class="grid-cover">{{ sutra.cover }}</div>
          <div class="grid-info">
            <h3 class="grid-title">{{ sutra.title }}</h3>
            <p class="grid-translator">{{ sutra.translator }}</p>
            <div v-if="sutra.progress > 0" class="grid-progress">
              <span>{{ sutra.progress }}%</span>
            </div>
          </div>
          <button
            v-if="sutra.isFavorite"
            class="grid-favorite active"
            @click.stop="toggleFavorite(sutra)"
          >
            <van-icon name="star" />
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索历史弹出层 -->
    <van-popup
      v-model:show="showSearchHistory"
      position="bottom"
      round
    >
      <div class="search-history">
        <div class="history-header">
          <h3>搜索历史</h3>
          <button @click="clearSearchHistory">清空</button>
        </div>
        <div class="history-tags">
          <van-tag
            v-for="(history, index) in searchHistory"
            :key="index"
            round
            @click="searchQuery = history; showSearchHistory = false"
          >
            {{ history }}
          </van-tag>
        </div>
        <div v-if="searchHistory.length === 0" class="empty-history">
          暂无搜索历史
        </div>
      </div>
    </van-popup>

    <!-- 筛选弹出层 -->
    <van-popup v-model:show="showFilterPopup" position="bottom" round>
      <div class="filter-panel">
        <div class="filter-header">
          <h3>筛选</h3>
          <button @click="resetFilters">重置</button>
        </div>

        <!-- 分类筛选 -->
        <div class="filter-section">
          <h4>分类</h4>
          <div class="filter-tags">
            <van-tag
              v-for="category in categories"
              :key="category"
              :type="selectedCategory === category ? 'primary' : 'default'"
              round
              @click="selectedCategory = selectedCategory === category ? '' : category"
            >
              {{ category }}
            </van-tag>
          </div>
        </div>

        <!-- 译者筛选 -->
        <div class="filter-section">
          <h4>译者</h4>
          <div class="filter-tags">
            <van-tag
              v-for="translator in translators"
              :key="translator"
              :type="selectedTranslator === translator ? 'primary' : 'default'"
              round
              @click="selectedTranslator = selectedTranslator === translator ? '' : translator"
            >
              {{ translator }}
            </van-tag>
          </div>
        </div>

        <!-- 阅读状态筛选 -->
        <div class="filter-section">
          <h4>阅读状态</h4>
          <div class="filter-tags">
            <van-tag
              :type="readStatus === 'all' ? 'primary' : 'default'"
              round
              @click="readStatus = 'all'"
            >
              全部
            </van-tag>
            <van-tag
              :type="readStatus === 'unread' ? 'primary' : 'default'"
              round
              @click="readStatus = 'unread'"
            >
              未读
            </van-tag>
            <van-tag
              :type="readStatus === 'reading' ? 'primary' : 'default'"
              round
              @click="readStatus = 'reading'"
            >
              进行中
            </van-tag>
            <van-tag
              :type="readStatus === 'completed' ? 'primary' : 'default'"
              round
              @click="readStatus = 'completed'"
            >
              已完成
            </van-tag>
          </div>
        </div>

        <div class="filter-footer">
          <button class="reset-btn" @click="resetFilters">重置</button>
          <button class="apply-btn" @click="applyFilters">应用</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sutras } from '@/data/sutras'
import { dynamicSutras } from '@/data/sutras-config'
import { createDynamicSutra } from '@/utils/sutra-loader'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const progressStore = useProgressStore()

// 视图模式
const viewMode = ref('list') // 'grid' | 'list'

// 搜索
const searchQuery = ref('')
const showSearchHistory = ref(false)
const searchHistory = ref(['般若', '心经', '金刚'])

// 筛选
const showFilterPopup = ref(false)
const selectedCategory = ref('')
const selectedTranslator = ref('')
const readStatus = ref('all')

// 排序
const sortType = ref('recent') // 'recent' | 'name' | 'progress'
const sortAscending = ref(false)

// 经文数据
const allSutras = ref([])
const loading = ref(true)

// 计算属性
const filteredSutras = computed(() => {
  let result = [...allSutras.value]

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.fullName.toLowerCase().includes(query) ||
      s.translator.toLowerCase().includes(query)
    )
  }

  // 分类过滤
  if (selectedCategory.value) {
    result = result.filter(s => s.category === selectedCategory.value)
  }

  // 译者过滤
  if (selectedTranslator.value) {
    result = result.filter(s => s.translator === selectedTranslator.value)
  }

  // 阅读状态过滤
  if (readStatus.value !== 'all') {
    result = result.filter(s => {
      if (readStatus.value === 'unread') return s.progress === 0
      if (readStatus.value === 'reading') return s.progress > 0 && s.progress < 100
      if (readStatus.value === 'completed') return s.progress === 100
      return true
    })
  }

  // 排序
  result.sort((a, b) => {
    if (sortType.value === 'name') {
      return sortAscending.value
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    }
    if (sortType.value === 'progress') {
      return sortAscending.value
        ? a.progress - b.progress
        : b.progress - a.progress
    }
    // 默认按最近阅读
    return (b.lastReadTime || 0) - (a.lastReadTime || 0)
  })

  return result
})

const recentSutras = computed(() => {
  return allSutras.value
    .filter(s => s.progress > 0 && s.lastReadTime)
    .sort((a, b) => b.lastReadTime - a.lastReadTime)
    .slice(0, 5)
})

const categories = computed(() => {
  const cats = new Set(allSutras.value.map(s => s.category))
  return Array.from(cats)
})

const translators = computed(() => {
  const trans = new Set(allSutras.value.map(s => s.translator))
  return Array.from(trans)
})

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedCategory.value) count++
  if (selectedTranslator.value) count++
  if (readStatus.value !== 'all') count++
  return count
})

const currentSortLabel = computed(() => {
  const labels = {
    recent: '最近',
    name: '名称',
    progress: '进度'
  }
  let label = labels[sortType.value]
  if (sortAscending.value) label += ' ↑'
  else label += ' ↓'
  return label
})

// 方法
const loadAllSutras = async () => {
  loading.value = true
  try {
    const loaded = [...sutras]
    for (const config of dynamicSutras) {
      const sutra = await createDynamicSutra(config)
      loaded.push(sutra)
    }
    allSutras.value = loaded
  } finally {
    loading.value = false
  }
}

const openSutra = (sutra) => {
  // 保存搜索历史
  if (searchQuery.value && !searchHistory.value.includes(searchQuery.value)) {
    searchHistory.value.unshift(searchQuery.value)
    if (searchHistory.value.length > 10) {
      searchHistory.value.pop()
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
  }

  router.push(`/reader/${sutra.id}`)
}

const handleSearchInput = () => {
  // 实时搜索
}

const toggleSort = () => {
  const types = ['recent', 'name', 'progress']
  const currentIndex = types.indexOf(sortType.value)
  if (currentIndex === types.length - 1) {
    sortType.value = types[0]
    sortAscending.value = false
  } else {
    sortType.value = types[currentIndex + 1]
  }
}

const resetFilters = () => {
  selectedCategory.value = ''
  selectedTranslator.value = ''
  readStatus.value = 'all'
}

const applyFilters = () => {
  showFilterPopup.value = false
}

const clearSearchHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

const toggleFavorite = (sutra) => {
  sutra.isFavorite = !sutra.isFavorite
  // 保存到 localStorage
  saveFavorites()
}

const saveFavorites = () => {
  const favorites = allSutras.value
    .filter(s => s.isFavorite)
    .map(s => s.id)
  localStorage.setItem('favorites', JSON.stringify(favorites))
}

const showAllRecent = () => {
  // 显示全部最近阅读
}

// 加载保存的数据
onMounted(async () => {
  await loadAllSutras()

  // 加载视图偏好
  const savedViewMode = localStorage.getItem('viewMode')
  if (savedViewMode) {
    viewMode.value = savedViewMode
  }

  // 加载搜索历史
  const savedHistory = localStorage.getItem('searchHistory')
  if (savedHistory) {
    searchHistory.value = JSON.parse(savedHistory)
  }

  // 加载收藏
  const savedFavorites = localStorage.getItem('favorites')
  if (savedFavorites) {
    const favoriteIds = JSON.parse(savedFavorites)
    allSutras.value.forEach(s => {
      s.isFavorite = favoriteIds.includes(s.id)
    })
  }
})

// 保存视图偏好
watch(viewMode, (newMode) => {
  localStorage.setItem('viewMode', newMode)
})
</script>

<style scoped lang="scss">
.bookshelf {
  min-height: 100vh;
  background-color: var(--bg-page);
}

.shelf-header {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  padding: var(--space-6) var(--space-4);
  color: white;

  .page-title {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-4);
  }

  .search-bar {
    :deep(.van-search) {
      background: rgba(255, 255, 255, 0.9);
      border-radius: var(--radius-lg);
    }
  }
}

.shelf-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);

  .view-toggle {
    display: flex;
    gap: var(--space-2);

    .view-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      transition: all var(--transition-fast);

      &.active {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
      }
    }
  }

  .filter-sort {
    display: flex;
    gap: var(--space-3);

    button {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);

      .badge {
        background: var(--primary-color);
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
      }
    }
  }
}

.recent-section {
  padding: var(--space-4);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);

    h2 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
    }

    button {
      color: var(--primary-color);
      font-size: var(--font-size-sm);
    }
  }

  .recent-list {
    display: flex;
    gap: var(--space-3);
    overflow-x: auto;
    padding-bottom: var(--space-2);
    -webkit-overflow-scrolling: touch;

    .recent-item {
      flex-shrink: 0;
      width: 140px;
      background: var(--bg-card);
      border-radius: var(--radius-md);
      padding: var(--space-3);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:active {
        transform: scale(0.98);
      }

      .recent-cover {
        font-size: 48px;
        text-align: center;
        margin-bottom: var(--space-2);
      }

      .recent-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        margin-bottom: var(--space-1);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .recent-meta {
        font-size: var(--font-size-xs);
        color: var(--text-hint);
        display: flex;
        align-items: center;
        gap: var(--space-1);
        margin-bottom: var(--space-2);
      }

      .recent-progress {
        .progress-bar {
          height: 3px;
          background: var(--divider-color);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: var(--space-1);
        }

        .progress-fill {
          height: 100%;
          background: var(--primary-color);
          transition: width var(--transition-fast);
        }

        .progress-text {
          font-size: var(--font-size-xs);
          color: var(--text-hint);
        }
      }
    }
  }
}

.list-view {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  .list-item {
    display: flex;
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:active {
      transform: scale(0.99);
    }

    .list-cover {
      width: 60px;
      height: 80px;
      font-size: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--highlight-bg);
      border-radius: var(--radius-sm);
      margin-right: var(--space-4);
    }

    .list-info {
      flex: 1;
      overflow: hidden;

      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--space-1);

        .list-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);
          margin: 0;
        }

        .favorite-btn {
          padding: var(--space-1);
          color: var(--text-hint);

          &.active {
            color: var(--primary-color);
          }
        }
      }

      .list-fullname {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin: 0 0 var(--space-2) 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .list-meta {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-2);

        .meta-tag {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          background: var(--bg-page);
          padding: 2px var(--space-2);
          border-radius: 4px;

          &.progress {
            color: var(--primary-color);
            background: rgba(255, 107, 53, 0.1);
          }
        }
      }

      .list-progress {
        .progress-bar {
          height: 4px;
          background: var(--divider-color);
          border-radius: 2px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: var(--primary-color);
            transition: width var(--transition-fast);
          }
        }
      }
    }
  }
}

.grid-view {
  padding: var(--space-4);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);

  .grid-item {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    position: relative;
    transition: all var(--transition-fast);

    &:active {
      transform: scale(0.98);
    }

    .grid-cover {
      font-size: 48px;
      text-align: center;
      margin-bottom: var(--space-2);
    }

    .grid-info {
      .grid-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        margin: 0 0 var(--space-1) 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .grid-translator {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin: 0 0 var(--space-2) 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .grid-progress {
        span {
          font-size: var(--font-size-xs);
          color: var(--primary-color);
          background: rgba(255, 107, 53, 0.1);
          padding: 2px var(--space-2);
          border-radius: 4px;
        }
      }
    }

    .grid-favorite {
      position: absolute;
      top: var(--space-2);
      right: var(--space-2);
      padding: var(--space-1);
      color: var(--text-hint);

      &.active {
        color: var(--primary-color);
      }
    }
  }
}

.search-history {
  padding: var(--space-6);

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);

    h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      margin: 0;
    }

    button {
      color: var(--primary-color);
      font-size: var(--font-size-sm);
    }
  }

  .history-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);

    :deep(.van-tag) {
      cursor: pointer;
    }
  }

  .empty-history {
    text-align: center;
    color: var(--text-hint);
    padding: var(--space-8) 0;
  }
}

.filter-panel {
  padding: var(--space-6);
  max-height: 70vh;
  overflow-y: auto;

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);

    h3 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      margin: 0;
    }

    button {
      color: var(--primary-color);
      font-size: var(--font-size-sm);
    }
  }

  .filter-section {
    margin-bottom: var(--space-6);

    h4 {
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
      margin: 0 0 var(--space-3) 0;
    }

    .filter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);

      :deep(.van-tag) {
        cursor: pointer;
      }
    }
  }

  .filter-footer {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);

    button {
      flex: 1;
      padding: var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
    }

    .reset-btn {
      background: var(--bg-page);
      color: var(--text-secondary);
      border: none;
    }

    .apply-btn {
      background: var(--primary-color);
      color: white;
      border: none;
    }
  }
}

// 响应式布局
@include mobile {
  .grid-view {
    grid-template-columns: repeat(2, 1fr);
  }
}

@include tablet {
  .grid-view {
    grid-template-columns: repeat(3, 1fr);
  }
}

@include desktop {
  .grid-view {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
```

#### UI 设计

**列表视图（推荐移动端）**：
```
┌─────────────────────────────────────┐
│      般若佛经阅读器                   │
│ [🔍 搜索经书、译者、分类...]         │
├─────────────────────────────────────┤
│ [☷] [≡] [筛选▼] [排序▼]              │
├─────────────────────────────────────┤
│ 最近阅读                             │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │ 📖心经│ │ 💎金刚│ │ 🎭楞伽│         │
│ │ 35%  │ │ 12%  │ │ 0%   │         │
│ └──────┘ └──────┘ └──────┘         │
├─────────────────────────────────────┤
│ 📖 心经              ⭐            │
│ 般若波罗蜜多心经                       │
│ [密宗] [唐三藏法师玄奘译] [已读 35%]  │
│ ━━━━━━━━━━━━━━━━━ 35%              │
├─────────────────────────────────────┤
│ 💎 金刚经                           │
│ 金刚般若波罗蜜经                      │
│ [般若] [鸠摩罗什译]                  │
├─────────────────────────────────────┤
│ 🎭 楞伽经                           │
│ 楞伽阿跋多罗宝经                      │
│ [唯识] [求那跋陀罗译]                │
└─────────────────────────────────────┘
```

**网格视图（推荐PC端）**：
```
┌─────────────────────────────────────┐
│      般若佛经阅读器                   │
│ [🔍 搜索经书、译者、分类...]         │
├─────────────────────────────────────┤
│ [☷] [≡] [筛选▼] [排序▼]              │
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │ 📖   │ │ 💎   │ │ 🎭   │ │ 🌟   ││
│ │ 心经 │ │ 金刚 │ │ 楞伽 │ │ 华严 ││
│ │ 35%  │ │ 12%  │ │ 0%   │ │ 0%   ││
│ │  ⭐  │ │      │ │      │ │      ││
│ └──────┘ └──────┘ └──────┘ └──────┘│
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │ 🌸   │ │ 🔥   │ │ 🌙   │ │ ☀️   ││
│ │ 药师 │ │ 涅槃 │ │ 胜鬘 │ │ 无量 ││
│ │ 0%   │ │ 0%   │ │ 0%   │ │ 0%   ││
│ │      │ │      │ │      │ │      ││
│ └──────┘ └──────┘ └──────┘ └──────┘│
└─────────────────────────────────────┘
```

#### 开发任务
- [ ] 实现视图切换逻辑（列表/网格）
- [ ] 创建列表视图布局
- [ ] 实现视图模式持久化
- [ ] 响应式布局适配

---

### 3.2 增强搜索功能 ⭐⭐⭐⭐⭐

#### 功能描述
- **搜索建议**：输入时显示常用经文和搜索历史
- **搜索历史**：保存最近10条搜索记录
- **搜索高亮**：搜索结果高亮匹配词
- **高级搜索**：支持拼音搜索、模糊搜索

#### UI 设计

**搜索输入时显示历史和建议**：
```
┌─────────────────────────────────────┐
│ [🔍 般若                   X]       │
└─────────────────────────────────────┘

弹出建议面板：
┌─────────────────────────────────────┐
│ 🔍 搜索历史                          │
├─────────────────────────────────────┤
│ [般若] [心经] [金刚] [菩萨]         │
├─────────────────────────────────────┤
│ 💡 搜索建议                          │
├─────────────────────────────────────┤
│ • 般若波罗蜜多心经                   │
│ • 金刚般若波罗蜜经                   │
│ • 摩诃般若波罗蜜经                   │
└─────────────────────────────────────┘
```

**搜索结果页**：
```
找到 3 部经文
┌─────────────────────────────────────┐
│ 📖 般若波罗蜜多心经                 │
│   "般若" <b>般若</b>波罗蜜多心经      │
│   [密宗] [唐三藏法师玄奘译]          │
├─────────────────────────────────────┤
│ 💎 金刚般若波罗蜜经                 │
│   <b>般若</b>波罗蜜                   │
│   [般若] [鸠摩罗什译]                 │
├─────────────────────────────────────┤
│ 🌟 摩诃般若波罗蜜经                 │
│   摩诃<b>般若</b>波罗蜜               │
│   [般若] [玄奘译]                     │
└─────────────────────────────────────┘
```

#### 开发任务
- [ ] 实现搜索历史管理
- [ ] 实现搜索建议（基于经文名称）
- [ ] 实现搜索结果高亮
- [ ] 实现拼音搜索（可选）

---

### 3.3 分类筛选功能 ⭐⭐⭐⭐

#### 功能描述
- **分类筛选**：按密宗、般若、净土等分类
- **译者筛选**：按译者（玄奘、鸠摩罗什等）筛选
- **阅读状态筛选**：未读/进行中/已完成
- **筛选计数**：显示当前激活的筛选条件数量

#### UI 设计

**筛选弹出层**：
```
┌─────────────────────────────────────┐
│          筛选             [重置]     │
├─────────────────────────────────────┤
│ 分类                                │
│ [密宗] [般若] [净土] [华严]          │
│ [法华] [涅槃] [唯识] [禅宗]          │
├─────────────────────────────────────┤
│ 译者                                │
│ [唐三藏法师玄奘]                     │
│ [鸠摩罗什] [实叉难陀]                │
├─────────────────────────────────────┤
│ 阅读状态                            │
│ [全部] [未读] [进行中] [已完成]      │
├─────────────────────────────────────┤
│        [重置]          [应用]       │
└─────────────────────────────────────┘
```

#### 开发任务
- [ ] 提取经文分类数据
- [ ] 提取译者数据
- [ ] 实现分类筛选逻辑
- [ ] 实现译者筛选逻辑
- [ ] 实现阅读状态筛选
- [ ] 实现筛选条件计数

---

### 3.4 排序功能 ⭐⭐⭐⭐

#### 功能描述
- **按名称排序**：A-Z或Z-A
- **按进度排序**：未读优先或已读优先
- **按最近阅读**：最近阅读的优先
- **排序方向切换**：升序/降序

#### UI 设计

**排序按钮循环切换**：
```
[最近 ↓] → [名称 ↓] → [进度 ↓] → [最近 ↑] → ...
```

#### 开发任务
- [ ] 实现排序逻辑
- [ ] 实现排序方向切换
- [ ] 实现排序标签显示

---

### 3.5 最近阅读功能 ⭐⭐⭐⭐

#### 功能描述
- **顶部横向滚动**：显示最近5部阅读的经文
- **阅读进度**：显示每部经文的阅读进度
- **快速继续**：点击直接跳转继续阅读
- **"查看全部"**：查看所有有进度的经文

#### UI 设计

```
最近阅读                    [查看全部]
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 📖   │ │ 💎   │ │ 🎭   │ │ 🌟   │ │ 🌸   │
│ 心经 │ │ 金刚 │ │ 楞伽 │ │ 华严 │ │ 药师 │
│ 35%  │ │ 12%  │ │ 5%   │ │ 0%   │ │ 0%   │
│ ━━━  │ │ █━   │ │ ▍    │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

#### 开发任务
- [ ] 扩展经文数据，添加 lastReadTime 字段
- [ ] 实现最近阅读横向滚动
- [ ] 实现阅读进度显示
- [ ] 实现"查看全部"功能

---

### 3.6 收藏功能 ⭐⭐⭐

#### 功能描述
- **添加收藏**：点击星标收藏经文
- **收藏列表**：在书架顶部显示收藏的经文
- **快速访问**：收藏的经文优先显示

#### UI 设计

**收藏标记**：
```
列表视图：
📖 心经              ⭐ ← 点击收藏
📖 金刚经
💎 楞伽经           ⭐ ← 已收藏
```

#### 开发任务
- [ ] 实现收藏/取消收藏
- [ ] 保存收藏列表到本地存储
- [ ] 创建收藏列表视图（可选）

---

### 3.7 阅读统计卡片 ⭐⭐⭐

#### 功能描述
- **首页统计**：显示阅读数据
- **阅读时长**：今日/累计
- **阅读经文数**：已读经文数量
- **连续阅读天数**：激励用户

#### UI 设计

```
┌─────────────────────────────────────┐
│          我的阅读                   │
├─────────────────────────────────────┤
│  📊 今日阅读  1小时30分钟           │
│  📚 累计阅读  48小时                 │
│  📖 已读经文  12部                   │
│  🔥 连续阅读  7天                    │
└─────────────────────────────────────┘
```

#### 开发任务
- [ ] 创建统计组件
- [ ] 实现数据计算逻辑
- [ ] 集成到书架页面

---

## 4. 布局与交互设计

### 4.1 响应式策略

| 设备 | 默认视图 | 推荐视图 | 布局特点 |
|------|---------|---------|---------|
| 📱 手机竖屏 | 列表 | 列表 | 单列，信息紧凑 |
| 📱 手机横屏 | 网格 | 网格 | 2列，平衡信息 |
| 💻 平板竖屏 | 网格 | 网格 | 2-3列，信息适中 |
| 💻 平板横屏 | 网格 | 网格 | 3-4列，信息丰富 |
| 🖥️ PC端 | 网格 | 网格 | 4-5列，信息全面 |

### 4.2 交互细节

1. **快速操作**：
   - 长按经文卡片 → 显示快捷菜单（收藏、分享、删除）
   - 双击经文卡片 → 直接打开
   - 左滑经文卡片 → 添加到收藏

2. **动画效果**：
   - 视图切换：淡入淡出
   - 筛选结果更新：卡片渐变进入
   - 点击反馈：轻微缩放

3. **加载状态**：
   - 骨架屏占位
   - 分批加载（首屏优先）

---

## 5. 实施计划

### 阶段一：基础优化（1-2天）

| 任务 | 优先级 | 预估时间 |
|------|--------|----------|
| 列表/网格视图切换 | P0 | 2-3h |
| 增强搜索功能 | P0 | 3-4h |

**总预估时间**: 5-7小时

---

### 阶段二：筛选与排序（1-2天）

| 任务 | 优先级 | 预估时间 |
|------|--------|----------|
| 分类筛选功能 | P1 | 4-5h |
| 排序功能 | P1 | 2-3h |
| 最近阅读功能 | P1 | 2-3h |

**总预估时间**: 8-11小时

---

### 阶段三：增强功能（0.5-1天）

| 任务 | 优先级 | 预估时间 |
|------|--------|----------|
| 收藏功能 | P2 | 2-3h |
| 阅读统计卡片 | P2 | 2-3h |

**总预估时间**: 4-6小时

---

## 总时间预估

| 阶段 | 时间 | 累计 |
|------|------|------|
| 阶段一：基础优化 | 5-7h | 5-7h |
| 阶段二：筛选与排序 | 8-11h | 13-18h |
| 阶段三：增强功能 | 4-6h | 17-24h |

**总计**: 17-24小时（约2-3个工作日）

---

## 附录：数据结构建议

### 经文数据扩展

```javascript
// sutras.js 数据结构
{
  id: 'xin-jing',
  title: '心经',
  fullName: '般若波罗蜜多心经',
  cover: '📖',
  category: '密宗',
  translator: '唐三藏法师玄奘译',
  chapters: [...],
  // 新增字段
  progress: 35,              // 阅读进度 0-100
  lastReadTime: 1714147200000, // 最后阅读时间戳
  lastReadChapter: 0,        // 最后阅读章节
  isFavorite: false,         // 是否收藏
  readCount: 15,             // 阅读次数
  totalReadTime: 3600        // 累计阅读时长（秒）
}
```

### 分类数据建议

```javascript
// categories.js
export const categories = [
  { id: 'bore', name: '般若', icon: '💎' },
  { id: 'jingzong', name: '密宗', icon: '🎭' },
  { id: 'jingtu', name: '净土', icon: '🌸' },
  { id: 'huayan', name: '华严', icon: '🌟' },
  { id: 'fahua', name: '法华', icon: '🌺' },
  { id: 'niepan', name: '涅槃', icon: '🔥' },
  { id: 'weishi', name: '唯识', icon: '🧠' },
  { id: 'chanzong', name: '禅宗', icon: '☀️' }
]
```

---

## 结论

书架页面的优化应分阶段进行：

1. **阶段一（必须）**：列表/网格切换 + 增强搜索
   - 解决最核心的浏览和查找问题
   - 预计5-7小时

2. **阶段二（重要）**：筛选 + 排序 + 最近阅读
   - 提升查找效率和使用体验
   - 预计8-11小时

3. **阶段三（增强）**：收藏 + 统计
   - 增加用户粘性和激励
   - 预计4-6小时

**总投入**: 17-24小时（2-3天）

**建议**：先实现阶段一，快速解决经文多时难以查找的核心痛点。
