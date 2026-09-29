<template>
  <BaseSheet
    :open="open"
    title="经内搜索"
    @close="emit('close')"
  >
    <div class="search">
      <input
        v-model="localKeyword"
        type="search"
        class="search__input"
        aria-label="搜索关键词"
        placeholder="输入关键词（≥2 字）"
      >

      <p
        v-if="localKeyword.trim().length >= minKeywordLength && hits.length === 0"
        class="search__empty"
      >
        无匹配结果
      </p>

      <ul
        v-else-if="hits.length > 0"
        class="search__list"
      >
        <li
          v-for="(hit, index) in hits"
          :key="`${hit.globalId}-${hit.paraOffset}-${index}`"
          class="search__item"
        >
          <button
            type="button"
            class="search__result"
            @click="emit('jump', hit)"
          >
            <span
              v-for="(part, partIndex) in splitContext(hit.context)"
              :key="partIndex"
              :class="{ 'search__mark': part.hit }"
            >{{ part.text }}</span>
          </button>
        </li>
      </ul>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 经内搜索面板（方案 §8.3）。
 *
 * - 输入即时 `emit('search', kw)`（搜索逻辑在 `useSearch`，由 ReaderView 持有）；
 * - 结果点击 `emit('jump', hit)` → ReaderView **先关闭本面板**（`BaseSheet` 为
 *   `position: fixed` 覆盖层，**不引起重排**）→ `nextTick` → `scrollToAnchor`。
 *
 * 「fixed 不重排」是硬要求：旧版搜索定位反复失败，根因即面板退场动画期间布局变化、
 * 读到错误坐标（隐性知识 §1.2）。
 */

import { ref, watch } from 'vue'

import BaseSheet from '@/components/common/BaseSheet.vue'
import type { SearchHit } from '@/composables/useSearch'
import { SEARCH_MIN_KEYWORD } from '@/composables/useSearch'

interface Props {
  /** 是否展开 */
  open: boolean
  /** 命中列表（由 ReaderView 传入） */
  hits: SearchHit[]
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  search: [keyword: string]
  jump: [hit: SearchHit]
}>()

const minKeywordLength = SEARCH_MIN_KEYWORD
const localKeyword = ref('')

watch(localKeyword, (value) => emit('search', value))

/** 把上下文按关键词切成「命中/非命中」片段以便高亮 */
function splitContext(context: string): Array<{ text: string; hit: boolean }> {
  const kw = localKeyword.value.trim()
  if (!kw) return [{ text: context, hit: false }]
  const parts: Array<{ text: string; hit: boolean }> = []
  let from = 0
  while (from < context.length) {
    const index = context.indexOf(kw, from)
    if (index < 0) {
      parts.push({ text: context.slice(from), hit: false })
      break
    }
    if (index > from) parts.push({ text: context.slice(from, index), hit: false })
    parts.push({ text: context.slice(index, index + kw.length), hit: true })
    from = index + kw.length
  }
  return parts.length > 0 ? parts : [{ text: context, hit: false }]
}
</script>

<style scoped>
.search__input {
  width: 100%;
  min-height: var(--input-height);
  padding: 0 var(--spacing-md);
  background: var(--input-bg);
  border: var(--input-border);
  border-radius: var(--input-radius);
  color: var(--input-text);
  font-size: var(--text-body);
}

.search__empty {
  margin-top: var(--spacing-md);
  color: var(--color-ink-subtle);
  font-size: var(--text-body-sm);
  text-align: center;
}

.search__list {
  margin: var(--spacing-md) 0 0;
  padding: 0;
  list-style: none;
}

.search__item {
  border-bottom: 1px solid var(--color-hairline);
}

.search__result {
  display: block;
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  color: var(--color-ink);
  font-size: var(--text-body-sm);
  line-height: var(--leading-sm);
  text-align: left;
}

.search__mark {
  color: var(--color-accent-deep);
  font-weight: var(--weight-medium);
}
</style>
