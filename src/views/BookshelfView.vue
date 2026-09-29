<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        书架
      </h1>
      <p class="view__subtitle">
        般若佛经阅读器 · 共 {{ sutraStore.manifest.length }} 部
      </p>
    </header>

    <div
      class="bookshelf__filters"
      role="group"
      aria-label="分类筛选"
    >
      <button
        v-for="option in categories"
        :key="option.value"
        type="button"
        class="bookshelf__filter"
        :class="{ 'bookshelf__filter--active': sutraStore.category === option.value }"
        :aria-pressed="sutraStore.category === option.value"
        @click="sutraStore.setCategory(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <LoadingState
      v-if="status === 'loading'"
      text="正在载入书架…"
    />
    <ErrorState
      v-else-if="status === 'error'"
      :message="error"
      @retry="load"
    />
    <EmptyState
      v-else-if="sutraStore.filtered.length === 0"
      text="该分类下暂无经书"
    />
    <ul
      v-else
      class="bookshelf__list"
    >
      <li
        v-for="meta in sutraStore.filtered"
        :key="meta.filename"
        class="bookshelf__item"
      >
        <SutraCard
          :sutra="meta"
          @open="openSutra"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * 书架视图（方案 §9 T09 / §8.1）——路由 `/`（Tab）。
 *
 * 编排（views 只编排；状态在 store）：
 * 1. `sutraStore.loadManifest()` → 三态（加载 / 空 / 错误）；
 * 2. 分类筛选由 `sutraStore.setCategory`（`filtered` 派生）；
 * 3. 点击卡片 → `router.push('/read/:id')`（`id` = `SutraMeta.filename`）。
 *
 * 标题解析由 `sutraStore` 承载（不在此直连 `@/services`），守 §2.1 依赖方向。
 */

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import SutraCard from '@/components/bookshelf/SutraCard.vue'
import { useSutraStore } from '@/stores/sutra'
import type { CategoryFilter } from '@/stores/sutra'
import type { SutraMeta } from '@/types/sutra'

/** 视图异步态（UI 状态不入 store，§6.8） */
type LoadStatus = 'loading' | 'ready' | 'error'

const router = useRouter()
const sutraStore = useSutraStore()

const status = ref<LoadStatus>('loading')
const error = ref('')

const categories: ReadonlyArray<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'prajna', label: '般若' },
  { value: 'yogacara', label: '唯识' },
  { value: 'chan', label: '禅宗' },
  { value: 'mantra', label: '密咒' },
  { value: 'general', label: '综合' },
  { value: 'biography', label: '传记' }
]

async function load(): Promise<void> {
  status.value = 'loading'
  try {
    await sutraStore.loadManifest()
    status.value = 'ready'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '书架加载失败'
    status.value = 'error'
  }
}

function openSutra(meta: SutraMeta): void {
  void router.push({ name: 'reader', params: { id: meta.filename } })
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.view {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.view__header {
  margin-bottom: var(--spacing-lg);
}

.view__title {
  font-size: var(--text-h1);
}

.view__subtitle {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}

.bookshelf__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.bookshelf__filter {
  min-height: var(--button-height);
  padding: 0 var(--spacing-lg);
  background: var(--tag-bg);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  color: var(--tag-text);
  font-size: var(--text-body-sm);
}

.bookshelf__filter--active {
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
  font-weight: var(--weight-medium);
}

.bookshelf__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bookshelf__item {
  display: flex;
}
</style>
