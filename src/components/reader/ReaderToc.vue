<template>
  <BaseSheet
    :open="open"
    title="目录"
    @close="emit('close')"
  >
    <ol class="toc">
      <li
        v-for="(chapter, index) in chapters"
        :key="index"
        class="toc__item"
      >
        <button
          type="button"
          class="toc__button"
          :class="{ 'toc__button--active': index === currentChapterIdx }"
          :aria-current="index === currentChapterIdx ? 'true' : undefined"
          @click="emit('jump', index)"
        >
          {{ chapter }}
        </button>
      </li>
    </ol>
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 目录（方案 §8.3 语义锚点跳转）：章节列表 → `emit('jump', chapterIdx)`，
 * 由 `ReaderView` 关闭面板后经 `scrollToAnchor` 精确定位。
 */

import BaseSheet from '@/components/common/BaseSheet.vue'

interface Props {
  /** 是否展开 */
  open: boolean
  /** 章节标题列表 */
  chapters: string[]
  /** 当前章节索引（高亮） */
  currentChapterIdx?: number
}

withDefaults(defineProps<Props>(), {
  currentChapterIdx: 0
})

const emit = defineEmits<{
  close: []
  jump: [chapterIdx: number]
}>()
</script>

<style scoped>
.toc {
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc__item {
  border-bottom: 1px solid var(--color-hairline);
}

.toc__item:last-child {
  border-bottom: none;
}

.toc__button {
  display: block;
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  color: var(--color-ink);
  font-size: var(--text-body);
  text-align: left;
}

.toc__button--active {
  color: var(--color-accent-deep);
  font-weight: var(--weight-medium);
}
</style>
