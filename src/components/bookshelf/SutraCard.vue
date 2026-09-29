<template>
  <button
    type="button"
    class="sutra-card"
    :aria-label="`打开《${sutra.title}》`"
    @click="emit('open', sutra)"
  >
    <span class="sutra-card__head">
      <span class="sutra-card__title">{{ sutra.title }}</span>
      <span
        class="sutra-card__tag"
        :class="`sutra-card__tag--${sutra.category}`"
      >{{ categoryLabel }}</span>
    </span>

    <span class="sutra-card__author">{{ sutra.author }}</span>

    <span class="sutra-card__desc">{{ sutra.description }}</span>

    <span class="sutra-card__stats">{{ sutra.chapterCount }} 章 · {{ sutra.totalChars }} 字</span>
  </button>
</template>

<script setup lang="ts">
/**
 * 经书卡片（方案 §9 T09 / §8.1 书架入口）。
 *
 * 纯展示组件：只接收 `SutraMeta` 并 `emit('open')`，**不做路由跳转、不读 store**
 * （跳转由 `BookshelfView` 编排，守 §2.1「视图编排、组件展示」）。
 * 分类标签配色来自 `tokens.css` 的 `--tag-<category>-*` 令牌（无硬编码色值）。
 */

import { computed } from 'vue'

import type { SutraCategory, SutraMeta } from '@/types/sutra'

interface Props {
  /** 经书元信息（书架清单元素） */
  sutra: SutraMeta
}

const props = defineProps<Props>()

const emit = defineEmits<{ open: [sutra: SutraMeta] }>()

/** 分类中文名（§7 `SutraCategory` 六值） */
const CATEGORY_LABELS: Readonly<Record<SutraCategory, string>> = {
  prajna: '般若',
  yogacara: '唯识',
  chan: '禅宗',
  mantra: '密咒',
  general: '综合',
  biography: '传记'
}

const categoryLabel = computed<string>(() => CATEGORY_LABELS[props.sutra.category] ?? '综合')
</script>

<style scoped>
.sutra-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--card-padding);
  background: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  color: var(--color-ink);
  text-align: left;
}

.sutra-card:hover {
  background: var(--card-hover-bg);
  border: var(--card-hover-border);
}

.sutra-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.sutra-card__title {
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-size: var(--text-h3);
}

.sutra-card__tag {
  flex: 0 0 auto;
  padding: var(--tag-padding);
  border-radius: var(--tag-radius);
  font-size: var(--text-caption);
}

.sutra-card__tag--prajna {
  background: var(--tag-prajna-bg);
  color: var(--tag-prajna-text);
}

.sutra-card__tag--yogacara {
  background: var(--tag-yogacara-bg);
  color: var(--tag-yogacara-text);
}

.sutra-card__tag--chan {
  background: var(--tag-chan-bg);
  color: var(--tag-chan-text);
}

.sutra-card__tag--mantra {
  background: var(--tag-mantra-bg);
  color: var(--tag-mantra-text);
}

.sutra-card__tag--general {
  background: var(--tag-general-bg);
  color: var(--tag-general-text);
}

.sutra-card__tag--biography {
  background: var(--tag-biography-bg);
  color: var(--tag-biography-text);
}

.sutra-card__author {
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}

.sutra-card__desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.sutra-card__stats {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink-subtle);
  font-size: var(--text-caption);
}
</style>
