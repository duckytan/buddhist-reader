<template>
  <div class="bookshelf-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">我的书架</h1>
        <p class="page-subtitle">共 {{ sutras.length }} 部经典</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索经书..."
            class="search-input"
          />
        </div>
        <button class="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>导入</span>
        </button>
      </div>
    </header>

    <!-- Category Tabs -->
    <nav class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="tab-item"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ cat.label }}
      </button>
    </nav>

    <!-- Sutra Grid -->
    <div class="sutra-grid" :class="gridClass">
      <article
        v-for="sutra in filteredSutras"
        :key="sutra.id"
        class="sutra-card"
        @click="openReader(sutra)"
      >
        <div class="sutra-cover">
          <div class="cover-pattern" :style="{ background: sutra.pattern }">
            <span class="cover-title">{{ sutra.title.slice(0, 2) }}</span>
          </div>
        </div>
        <div class="sutra-info">
          <h3 class="sutra-title">{{ sutra.title }}</h3>
          <p class="sutra-meta">{{ sutra.chapterCount }}品 · {{ sutra.dynasty }}</p>
          <div class="sutra-tags">
            <span
              v-for="tag in sutra.tags.slice(0, 2)"
              :key="tag"
              class="tag"
              :class="'tag-' + tag"
            >
              {{ tagLabels[tag] || tag }}
            </span>
          </div>
        </div>
        <div class="sutra-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: sutra.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ sutra.progress }}%</span>
        </div>
      </article>
    </div>

    <!-- Empty State -->
    <div v-if="filteredSutras.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>暂无经书</h3>
      <p>点击上方「导入」按钮，添加您的第一部经书</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const searchQuery = ref('')
const activeCategory = ref('all')

const categories = [
  { id: 'all', label: '全部' },
  { id: 'prajna', label: '般若部' },
  { id: 'lotus', label: '法华部' },
  { id: 'pure', label: '净土部' },
  { id: 'earth', label: '地藏部' }
]

const tagLabels = {
  wisdom: '智慧',
  compassion: '慈悲',
  meditation: '禅定',
  ritual: '仪轨'
}

const sutras = ref([
  {
    id: 1,
    title: '金刚经',
    chapterCount: 32,
    dynasty: '姚秦',
    tags: ['wisdom', 'meditation'],
    progress: 75,
    pattern: 'linear-gradient(135deg, #f5e6c8 0%, #e8d5a8 100%)'
  },
  {
    id: 2,
    title: '心经',
    chapterCount: 1,
    dynasty: '唐',
    tags: ['wisdom', 'compassion'],
    progress: 100,
    pattern: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
  },
  {
    id: 3,
    title: '法华经',
    chapterCount: 28,
    dynasty: '姚秦',
    tags: ['wisdom'],
    progress: 30,
    pattern: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
  },
  {
    id: 4,
    title: '地藏经',
    chapterCount: 13,
    dynasty: '唐',
    tags: ['compassion', 'ritual'],
    progress: 0,
    pattern: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'
  },
  {
    id: 5,
    title: '阿弥陀经',
    chapterCount: 1,
    dynasty: '姚秦',
    tags: ['wisdom', 'meditation'],
    progress: 50,
    pattern: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
  },
  {
    id: 6,
    title: '普贤行愿品',
    chapterCount: 1,
    dynasty: '唐',
    tags: ['compassion'],
    progress: 20,
    pattern: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)'
  },
  {
    id: 7,
    title: '楞严经',
    chapterCount: 10,
    dynasty: '唐',
    tags: ['wisdom', 'meditation'],
    progress: 0,
    pattern: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)'
  },
  {
    id: 8,
    title: '华严经',
    chapterCount: 60,
    dynasty: '唐',
    tags: ['wisdom'],
    progress: 5,
    pattern: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)'
  }
])

const filteredSutras = computed(() => {
  let result = sutras.value

  if (activeCategory.value !== 'all') {
    const categoryMap = {
      'prajna': 'wisdom',
      'lotus': 'wisdom',
      'pure': 'wisdom',
      'earth': 'compassion'
    }
    const tag = categoryMap[activeCategory.value]
    if (tag) {
      result = result.filter(s => s.tags.includes(tag))
    }
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.dynasty.toLowerCase().includes(query)
    )
  }

  return result
})

const gridClass = computed(() => {
  return 'grid-auto'
})

const openReader = (sutra) => {
  window.location.href = '/reader?id=' + sutra.id
}
</script>

<style scoped>
.bookshelf-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Page Header ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--zen-space-xl);
  gap: var(--zen-space-lg);
  flex-wrap: wrap;
}

.page-title {
  font-family: var(--zen-font-serif);
  font-size: 32px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--zen-ink-muted);
}

.header-actions {
  display: flex;
  gap: var(--zen-space-md);
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--zen-ink-subtle);
}

.search-input {
  width: 240px;
  height: 44px;
  padding: 0 16px 0 44px;
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-interactive);
  background: var(--zen-canvas);
  font-size: 15px;
  color: var(--zen-ink);
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: var(--zen-ink-subtle);
}

.search-input:focus {
  outline: none;
  border-color: var(--zen-accent);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  background: var(--zen-accent);
  color: var(--zen-on-accent);
  border: none;
  border-radius: var(--zen-radius-interactive);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--zen-accent-deep);
}

/* ===== Category Tabs ===== */
.category-tabs {
  display: flex;
  gap: var(--zen-space-xs);
  margin-bottom: var(--zen-space-xl);
  overflow-x: auto;
  padding-bottom: var(--zen-space-xs);
}

.tab-item {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-interactive);
  font-size: 14px;
  color: var(--zen-ink-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-item:hover {
  border-color: var(--zen-accent);
  color: var(--zen-accent);
}

.tab-item.active {
  background: var(--zen-accent);
  border-color: var(--zen-accent);
  color: var(--zen-on-accent);
}

/* ===== Sutra Grid ===== */
.sutra-grid {
  display: grid;
  gap: var(--zen-space-lg);
}

.sutra-grid.grid-auto {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* ===== Sutra Card ===== */
.sutra-card {
  background: var(--zen-canvas);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-container);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sutra-card:hover {
  border-color: var(--zen-hairline-strong);
  transform: translateY(-2px);
}

.sutra-cover {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-pattern {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-title {
  font-family: var(--zen-font-serif);
  font-size: 36px;
  font-weight: 600;
  color: var(--zen-ink);
  opacity: 0.7;
}

.sutra-info {
  padding: var(--zen-space-md);
}

.sutra-title {
  font-family: var(--zen-font-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: 4px;
}

.sutra-meta {
  font-size: 13px;
  color: var(--zen-ink-muted);
  margin-bottom: var(--zen-space-sm);
}

.sutra-tags {
  display: flex;
  gap: var(--zen-space-xs);
  flex-wrap: wrap;
}

.tag {
  padding: 4px 10px;
  border-radius: var(--zen-radius-interactive);
  font-size: 12px;
  font-weight: 500;
}

.tag-wisdom {
  background: var(--zen-highlight-mind);
  color: var(--zen-highlight-text-mind);
}

.tag-compassion {
  background: var(--zen-highlight-commentary);
  color: var(--zen-highlight-text-commentary);
}

.tag-meditation {
  background: var(--zen-highlight-mantra);
  color: var(--zen-highlight-text-mantra);
}

.tag-ritual {
  background: var(--zen-highlight-sutra);
  color: var(--zen-highlight-text-sutra);
}

.sutra-progress {
  display: flex;
  align-items: center;
  gap: var(--zen-space-sm);
  padding: 0 var(--zen-space-md) var(--zen-space-md);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--zen-hairline);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--zen-accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--zen-ink-muted);
  min-width: 36px;
  text-align: right;
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: var(--zen-space-section) var(--zen-space-lg);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--zen-space-md);
}

.empty-state h3 {
  font-size: 18px;
  color: var(--zen-ink);
  margin-bottom: var(--zen-space-xs);
}

.empty-state p {
  font-size: 14px;
  color: var(--zen-ink-muted);
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 1023px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .search-input {
    flex: 1;
    width: auto;
  }

  .sutra-grid.grid-auto {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 767px) {
  .page-title {
    font-size: 24px;
  }

  .btn-primary span {
    display: none;
  }

  .btn-primary {
    width: 44px;
    padding: 0;
    justify-content: center;
  }

  .sutra-grid.grid-auto {
    grid-template-columns: 1fr;
  }

  .category-tabs {
    gap: var(--zen-space-xxs);
  }

  .tab-item {
    padding: 8px 14px;
    font-size: 13px;
  }
}
</style>
