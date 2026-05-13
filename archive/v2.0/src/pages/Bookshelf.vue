<template>
  <div class="bookshelf">
    <header class="bookshelf-header">
      <h1 class="bookshelf-title">般若佛经阅读器</h1>
      <p class="bookshelf-subtitle">禅意阅读 · 词典查询 · 功德统计</p>
    </header>

    <div class="bookshelf-controls">
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="['category-tab', { active: selectedCategory === cat }]"
          @click="sutraStore.setCategory(cat)"
        >
          {{ getCategoryLabel(cat) }}
        </button>
      </div>
    </div>

    <div v-if="sutraStore.loading" class="bookshelf-loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="filteredSutras.length === 0" class="bookshelf-empty">
      <p>暂无经书</p>
    </div>

    <div v-else class="bookshelf-grid">
      <SutraCard
        v-for="sutra in filteredSutras"
        :key="sutra.id"
        :sutra="sutra"
        @click="openReader(sutra)"
      />
    </div>

    <nav class="bookshelf-nav">
      <router-link to="/dict" class="nav-link">词典管理</router-link>
      <router-link to="/settings" class="nav-link">设置</router-link>
      <router-link to="/stats" class="nav-link">功德</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSutraStore } from '@/stores/sutra'
import SutraCard from '@/components/bookshelf/SutraCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const sutraStore = useSutraStore()

const filteredSutras = computed(() => sutraStore.filteredSutras)
const categories = computed(() => sutraStore.categories)
const selectedCategory = computed(() => sutraStore.selectedCategory)

const categoryLabels = {
  prajna: '般若部',
  yogacara: '唯识部',
  chan: '禅宗部',
  mantra: '密咒部',
  general: '佛学通论',
  biography: '传记',
  custom: '自定义'
}

function getCategoryLabel(cat) {
  return categoryLabels[cat] || cat
}

function openReader(sutra) {
  router.push({ name: 'Reader', params: { sutraId: sutra.id } })
}

onMounted(() => {
  sutraStore.loadSutras()
})
</script>

<style scoped>
.bookshelf {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
  min-height: 100vh;
}

.bookshelf-header {
  text-align: center;
  margin-bottom: var(--spacing-xxl);
}

.bookshelf-title {
  font-family: var(--font-serif);
  font-size: var(--text-display);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}

.bookshelf-subtitle {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
}

.bookshelf-controls {
  margin-bottom: var(--spacing-xl);
}

.category-tabs {
  display: flex;
  gap: var(--spacing-xs);
  justify-content: center;
  flex-wrap: wrap;
}

.category-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-tab:hover {
  color: var(--color-accent);
  border-color: var(--color-accent-light);
}

.category-tab.active {
  color: var(--color-canvas);
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.bookshelf-loading,
.bookshelf-empty {
  text-align: center;
  padding: var(--spacing-xxl) 0;
  color: var(--color-ink-muted);
}

.bookshelf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xxl);
}

@media (max-width: 1023px) {
  .bookshelf-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 479px) {
  .bookshelf-grid {
    grid-template-columns: 1fr;
  }
}

.bookshelf-nav {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-hairline);
}

.nav-link {
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--color-accent);
}
</style>
