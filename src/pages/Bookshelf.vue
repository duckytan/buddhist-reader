<template>
  <div class="bookshelf">
    <header class="bookshelf-header">
      <h1 class="title">般若佛经阅读器</h1>
      <div class="header-actions">
        <button class="add-btn" @click="handleAddSutra">
          <span>+</span>
          <span>添加经文</span>
        </button>
      </div>
    </header>

    <!-- 搜索栏 -->
    <div class="search-section">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索经书、译者、分类..."
          class="search-input"
          @focus="showSearchHistory = true"
          @blur="handleSearchBlur"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">✕</button>
      </div>
      
      <!-- 搜索历史和建议 -->
      <div v-if="showSearchHistory && !searchQuery" class="search-dropdown">
        <div v-if="searchHistory.length > 0" class="search-section-item">
          <div class="section-title">搜索历史</div>
          <div class="history-tags">
            <span
              v-for="(item, index) in searchHistory"
              :key="index"
              class="history-tag"
              @click="selectSearchItem(item)"
            >
              {{ item }}
            </span>
          </div>
        </div>
        <div v-if="searchSuggestions.length > 0" class="search-section-item">
          <div class="section-title">搜索建议</div>
          <div class="suggestions-list">
            <div
              v-for="(suggestion, index) in searchSuggestions"
              :key="index"
              class="suggestion-item"
              @click="selectSearchItem(suggestion)"
            >
              {{ suggestion }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          ⊞
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          ☷
        </button>
      </div>
      <div class="toolbar-right">
        <span class="result-count">{{ filteredSutras.length }} 部经文</span>
      </div>
    </div>

    <!-- 最近阅读 -->
    <div v-if="recentReadings.length > 0" class="recent-section">
      <div class="section-header">
        <h3 class="section-title">最近阅读</h3>
        <router-link to="/history" class="view-all-link">查看全部</router-link>
      </div>
      <div class="recent-horizontal">
        <div
          v-for="item in recentReadings"
          :key="item.sutraId"
          class="recent-card"
          @click="handleSutraClick(getSutraById(item.sutraId))"
        >
          <div class="recent-icon">{{ getSutraById(item.sutraId)?.cover || '📖' }}</div>
          <div class="recent-info">
            <div class="recent-title">{{ getSutraById(item.sutraId)?.title }}</div>
            <div class="recent-progress">
              <div class="progress-bar-small">
                <div class="progress-fill-small" :style="{ width: `${item.progress}%` }"></div>
              </div>
              <span class="progress-text-small">{{ Math.round(item.progress) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bookshelf-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner">📖</div>
        <p>加载中...</p>
      </div>

      <!-- 网格视图 -->
      <div v-else-if="viewMode === 'grid'" class="sutra-grid">
        <BookCard
          v-for="sutra in filteredSutras"
          :key="sutra.id"
          :sutra="sutra"
          @click="handleSutraClick(sutra)"
        />
      </div>

      <!-- 列表视图 -->
      <div v-else class="sutra-list">
        <BookListItem
          v-for="sutra in filteredSutras"
          :key="sutra.id"
          :sutra="sutra"
          @click="handleSutraClick(sutra)"
          @continue="handleContinueReading(sutra)"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredSutras.length === 0" class="empty-state">
        <p>未找到匹配的经文</p>
        <button class="clear-search-btn" @click="clearSearch">清除搜索</button>
      </div>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item active">
        <span class="nav-icon">📚</span>
        <span class="nav-text">书架</span>
      </router-link>
      <router-link to="/settings" class="nav-item">
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BookCard from '@/components/BookCard.vue'
import BookListItem from '@/components/BookListItem.vue'
import { sutras } from '@/data/sutras'
import { dynamicSutras } from '@/data/sutras-config'
import { createDynamicSutra } from '@/utils/sutra-loader'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const progressStore = useProgressStore()
const loading = ref(false)
const viewMode = ref('grid') // 'grid' | 'list'
const searchQuery = ref('')
const showSearchHistory = ref(false)
const searchHistory = ref([])

// 混合静态和动态经文
const allSutras = ref([])

// 加载搜索历史
const loadSearchHistory = () => {
  try {
    const saved = localStorage.getItem('buddhist-reader-search-history')
    if (saved) {
      searchHistory.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load search history:', error)
  }
}

// 保存搜索历史
const saveSearchHistory = (query) => {
  if (!query || query.trim() === '') return
  
  // 移除已存在的
  searchHistory.value = searchHistory.value.filter(item => item !== query)
  
  // 添加到开头
  searchHistory.value.unshift(query)
  
  // 只保留最近10条
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  
  try {
    localStorage.setItem('buddhist-reader-search-history', JSON.stringify(searchHistory.value))
  } catch (error) {
    console.error('Failed to save search history:', error)
  }
}

// 搜索建议
const searchSuggestions = computed(() => {
  const commonTerms = ['心经', '金刚经', '阿弥陀经', '地藏经', '观音经', '般若', '净土', '密宗']
  
  if (!searchQuery.value) {
    return commonTerms
  }
  
  return commonTerms.filter(term => 
    term.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 过滤后的经文列表
const filteredSutras = computed(() => {
  if (!searchQuery.value) {
    return allSutras.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return allSutras.value.filter(sutra => {
    return (
      sutra.title.toLowerCase().includes(query) ||
      sutra.fullName?.toLowerCase().includes(query) ||
      sutra.translator?.toLowerCase().includes(query) ||
      sutra.description?.toLowerCase().includes(query)
    )
  })
})

// 最近阅读
const recentReadings = computed(() => {
  return progressStore.getRecentReadings(5)
})

// 根据ID获取经文
const getSutraById = (id) => {
  return allSutras.value.find(s => s.id === id)
}

// 动态加载所有配置的经文
const loadAllDynamicSutras = async () => {
  try {
    loading.value = true
    const loadedSutras = []

    // 先添加静态经文
    loadedSutras.push(...sutras)

    // 再加载动态经文
    for (const config of dynamicSutras) {
      try {
        const sutra = await createDynamicSutra(config)
        loadedSutras.push(sutra)
      } catch (error) {
        console.error(`Failed to load sutra ${config.id}:`, error)
      }
    }

    allSutras.value = loadedSutras
  } catch (error) {
    console.error('Failed to load sutras:', error)
  } finally {
    loading.value = false
  }
}

const handleSutraClick = (sutra) => {
  router.push(`/reader/${sutra.id}`)
}

const handleContinueReading = (sutra) => {
  router.push(`/reader/${sutra.id}`)
}

const clearSearch = () => {
  searchQuery.value = ''
  showSearchHistory.value = false
}

const selectSearchItem = (item) => {
  searchQuery.value = item
  saveSearchHistory(item)
  showSearchHistory.value = false
}

const handleSearchBlur = () => {
  // 延迟隐藏，允许点击搜索项
  setTimeout(() => {
    showSearchHistory.value = false
  }, 200)
}

const handleAddSutra = () => {
  // 这里可以添加一个简单的提示
  alert('添加经文功能：\n\n1. 将 TXT 文件放到 public/sutras/ 目录\n2. 在 src/pages/Reader.vue 的 dynamicSutraConfigs 中配置\n3. 刷新页面即可看到新经文\n\n详细说明请查看 docs/DYNAMIC_SUTRA_LOADING.md')
}

onMounted(() => {
  loadSearchHistory()
  loadAllDynamicSutras()
})
</script>

<style scoped lang="scss">
.bookshelf {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.bookshelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-sm);

  .title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: var(--space-3);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    &:hover {
      background-color: #e55a2b;
    }

    span:first-child {
      font-size: 20px;
      font-weight: bold;
    }
  }
}


.search-section {
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  z-index: 100;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  gap: var(--space-2);

  .search-icon {
    font-size: 18px;
    color: var(--text-hint);
  }

  .search-input {
    flex: 1;
    border: none;
    background: none;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    outline: none;

    &::placeholder {
      color: var(--text-hint);
    }
  }

  .clear-btn {
    background: none;
    border: none;
    color: var(--text-hint);
    font-size: 18px;
    cursor: pointer;
    padding: var(--space-1);

    &:hover {
      color: var(--text-secondary);
    }
  }
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  max-height: 400px;
  overflow-y: auto;
}

.search-section-item {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--divider-color);

  &:last-child {
    border-bottom: none;
  }
}

.section-title {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.history-tag {
  padding: var(--space-1) var(--space-3);
  background-color: var(--bg-page);
  color: var(--text-primary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--highlight-bg);
  }
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.suggestion-item {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  color: var(--text-primary);

  &:hover {
    background-color: var(--bg-page);
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-page);
  border-bottom: 1px solid var(--divider-color);
}

.toolbar-left {
  display: flex;
  gap: var(--space-2);
}

.view-toggle-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &.active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  &:hover:not(.active) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.toolbar-right {
  .result-count {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}

.recent-section {
  padding: var(--space-4);
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.view-all-link {
  font-size: var(--font-size-sm);
  color: var(--primary-color);
  text-decoration: none;
}

.recent-horizontal {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-2);

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--divider-color);
    border-radius: var(--radius-full);
  }
}

.recent-card {
  flex-shrink: 0;
  width: 120px;
  padding: var(--space-3);
  background-color: var(--bg-page);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
  }
}

.recent-icon {
  font-size: 32px;
  margin-bottom: var(--space-2);
}

.recent-info {
  .recent-title {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-bottom: var(--space-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.recent-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.progress-bar-small {
  flex: 1;
  height: 3px;
  background-color: var(--divider-color);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill-small {
  height: 100%;
  background-color: var(--primary-color);
}

.progress-text-small {
  font-size: var(--font-size-xs);
  color: var(--text-hint);
  min-width: 30px;
}

.bookshelf-content {
  flex: 1;
  padding: var(--space-4);
  overflow-y: auto;
}

.sutra-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.sutra-list {
  display: flex;
  flex-direction: column;
}

.loading-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  color: var(--text-hint);

  .clear-search-btn {
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-4);
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    &:hover {
      background-color: #e55a2b;
    }
  }
}

.loading-spinner {
  font-size: 48px;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.bottom-nav {
  display: flex;
  justify-content: space-around;
  padding: var(--space-4) 0;
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;

  @media (min-width: 768px) and (max-width: 1023px) {
    position: static;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-secondary);
    text-decoration: none;
    padding: var(--space-2);
    border-radius: var(--radius-md);
    transition: color var(--transition-fast);

    &.active,
    &:hover {
      color: var(--primary-color);
    }

    .nav-icon {
      font-size: 24px;
    }

    .nav-text {
      font-size: var(--font-size-xs);
    }
  }
}
</style>
