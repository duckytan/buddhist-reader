<template>
  <div class="bookshelf">
    <header class="bookshelf__header">
      <h1 class="bookshelf__title">
        般若佛经阅读器
      </h1>
    </header>

    <nav class="bookshelf__filter">
      <button
        v-for="cat in sutraStore.categories"
        :key="cat.key"
        :class="['bookshelf__filter-btn', { 'bookshelf__filter-btn--active': sutraStore.activeCategory === cat.key }]"
        @click="sutraStore.setCategory(cat.key)"
      >
        {{ cat.label }}
      </button>
    </nav>

    <div
      v-if="sutraStore.loading"
      class="bookshelf__skeleton"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="skeleton-card"
      >
        <div class="skeleton-card__line skeleton-card__line--title" />
        <div class="skeleton-card__line skeleton-card__line--meta" />
        <div class="skeleton-card__line skeleton-card__line--tag" />
      </div>
    </div>

    <div
      v-else-if="sutraStore.error"
      class="bookshelf__error"
    >
      <p>加载失败: {{ sutraStore.error }}</p>
      <button
        class="bookshelf__retry-btn"
        @click="sutraStore.retry()"
      >
        重试
      </button>
    </div>

    <div
      v-else
      class="bookshelf__grid"
    >
      <SutraCard
        v-for="sutra in sutraStore.filteredList"
        :key="sutra.filename"
        :sutra="sutra"
        @click="goToReader"
      />
    </div>

    <div
      v-if="!sutraStore.loading && !sutraStore.error && sutraStore.filteredList.length === 0"
      class="bookshelf__empty"
    >
      <p>暂无经书</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSutraStore } from '../stores/sutra'
import SutraCard from '../components/bookshelf/SutraCard.vue'

const router = useRouter()
const sutraStore = useSutraStore()

onMounted(() => sutraStore.fetchManifest())

function goToReader(sutra) {
  router.push(`/reader/${encodeURIComponent(sutra.filename)}`)
}
</script>

<style scoped>
.bookshelf {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}
.bookshelf__header {
  text-align: center;
  padding: var(--spacing-xl) 0 var(--spacing-lg);
}
.bookshelf__title {
  font-family: var(--font-serif);
  font-size: var(--text-display);
  font-weight: var(--weight-semibold);
}
.bookshelf__filter {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) 0;
  justify-content: center;
  flex-wrap: wrap;
}
.bookshelf__filter-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  background: var(--tag-bg);
  transition: color 0.2s, background 0.2s;
}
.bookshelf__filter-btn--active {
  color: var(--color-canvas);
  background: var(--color-accent);
}
.bookshelf__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-lg);
  padding: var(--spacing-md) 0;
}
.bookshelf__error {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--color-error);
}
.bookshelf__retry-btn {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-canvas);
  border-radius: var(--radius-pill);
}
.bookshelf__empty {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--color-ink-muted);
}
.skeleton-card {
  background: var(--color-surface);
  border-radius: var(--radius-container);
  padding: var(--card-sutra-padding);
}
.skeleton-card__line {
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
  margin-bottom: var(--spacing-sm);
}
.skeleton-card__line--title { width: 60%; height: 20px; }
.skeleton-card__line--meta { width: 40%; height: 14px; }
.skeleton-card__line--tag { width: 30%; height: 24px; }

@media (max-width: 480px) {
  .bookshelf { padding: var(--spacing-sm); }
  .bookshelf__title { font-size: var(--text-h2); }
  .bookshelf__grid { grid-template-columns: 1fr; }
}
</style>