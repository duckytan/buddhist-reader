<template>
  <article class="dict-entry">
    <header class="dict-entry__head">
      <h3 class="dict-entry__term">
        {{ hit.term }}
      </h3>
      <span class="dict-entry__dict">{{ hit.dictName }}</span>
    </header>
    <p class="dict-entry__definition">
      {{ hit.definition }}
    </p>
  </article>
</template>

<script setup lang="ts">
/**
 * 单词典词条卡片（方案 §9 T08）：词典名 + 词头 + 释义。
 *
 * 纯展示组件（无事件、无业务逻辑），由 `DictPopup` 与 `DictSearchView` 复用。
 */

import type { DictHit } from '@/types/dict'

interface Props {
  /** 单次查词的一条命中 */
  hit: DictHit
}

defineProps<Props>()
</script>

<style scoped>
.dict-entry {
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-hairline);
}

.dict-entry:last-child {
  border-bottom: none;
}

.dict-entry__head {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.dict-entry__term {
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-size: var(--text-body-lg);
}

.dict-entry__dict {
  color: var(--color-ink-subtle);
  font-size: var(--text-caption);
}

.dict-entry__definition {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink);
  font-size: var(--text-body-sm);
  line-height: var(--leading-sm);
  white-space: pre-wrap;
}
</style>
