<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        词典
      </h1>
      <p class="view__subtitle">
        词头三级匹配（完全 &gt; 前缀 &gt; 包含）
      </p>
    </header>

    <input
      v-model="query"
      type="search"
      class="dict-search__input"
      placeholder="输入词头"
      aria-label="搜索词头"
    >

    <LoadingState
      v-if="indexLoading"
      text="正在加载词典索引…"
    />

    <template v-else>
      <ul
        v-if="searchResults.length > 0"
        class="dict-search__results"
      >
        <li
          v-for="term in searchResults"
          :key="term"
          class="dict-search__result"
        >
          <button
            type="button"
            class="dict-search__term"
            :aria-label="`查看「${term}」`"
            @click="onSelect(term)"
          >
            {{ term }}
          </button>
        </li>
      </ul>
      <EmptyState
        v-else-if="hasSearched && !searching"
        text="无匹配词头"
      />

      <div
        v-if="hits.length > 0"
        class="dict-search__detail"
      >
        <DictEntryCard
          v-for="(hit, index) in hits"
          :key="`${hit.dictId}-${index}`"
          :hit="hit"
        />
      </div>
      <LoadingState
        v-else-if="loading"
        text="正在查词…"
      />
      <EmptyState
        v-else-if="hint"
        :text="hint"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * 词典搜索页（方案 §9 T08 / §6.4）——路由 `/dict`（已在 `src/app/router` 注册）。
 *
 * - 词头三级匹配（完全 > 前缀 > 包含）由 `dictService.searchTerms` 提供（不重写）；
 *   因其每次全表扫描 35314 词头，**在 `useDictLookup` 内防抖 200ms**；
 * - 搜索结果点击 → 词条详情（复用 `DictEntryCard`）；
 * - 空结果区分「无匹配词头」与「该词释义需联网获取」（§4.9）。
 */

import { onMounted, ref, watch } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import DictEntryCard from '@/components/dict/DictEntryCard.vue'
import { useDictLookup } from '@/composables/useDictLookup'

const query = ref('')
const hasSearched = ref(false)

const {
  indexLoading,
  loading,
  hits,
  hint,
  searchResults,
  searching,
  loadDictionary,
  lookup,
  clear,
  search
} = useDictLookup()

watch(query, (value) => {
  const keyword = value.trim()
  hasSearched.value = keyword.length > 0
  clear() // 换词即清掉上一个词的详情
  search(value)
})

function onSelect(term: string): void {
  void lookup(term)
}

onMounted(() => {
  void loadDictionary()
})
</script>

<style scoped>
.view {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.view__title {
  font-size: var(--text-h1);
}

.view__subtitle {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}

.dict-search__input {
  width: 100%;
  height: var(--input-height);
  margin-top: var(--spacing-lg);
  padding: 0 var(--spacing-md);
  background: var(--input-bg);
  border: var(--input-border);
  border-radius: var(--input-radius);
  color: var(--input-text);
  font-size: var(--text-body-sm);
}

.dict-search__input:focus {
  border: var(--input-focus-border);
  outline: none;
}

.dict-search__results {
  margin: var(--spacing-md) 0 0;
  padding: 0;
  list-style: none;
}

.dict-search__result {
  border-bottom: 1px solid var(--color-hairline);
}

.dict-search__term {
  display: block;
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-size: var(--text-body);
  text-align: left;
}

.dict-search__term:hover {
  background: var(--card-hover-bg);
}

.dict-search__detail {
  margin-top: var(--spacing-lg);
}
</style>
