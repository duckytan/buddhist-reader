<template>
  <BaseSheet
    :open="open"
    title="目录"
    @close="emit('close')"
  >
    <!-- 多章节经：章节分组（§5 M9） -->
    <ol
      v-if="chapters.length > 1"
      class="toc"
    >
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

    <!-- 单章节经：段落列表（§5 M9 —— 段落无标题，用开头摘录作标签） -->
    <ol
      v-else-if="chapters.length === 1"
      class="toc toc--paragraphs"
    >
      <li
        v-for="(label, index) in paragraphLabels"
        :key="index"
        class="toc__item"
      >
        <button
          type="button"
          class="toc__button toc__button--paragraph"
          @click="emit('jumpParagraph', index)"
        >
          <span class="toc__ordinal">{{ index + 1 }}</span>
          <span class="toc__excerpt">{{ label }}</span>
        </button>
      </li>
    </ol>
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 目录（方案 §8.3 语义锚点跳转 + §5 M9）：
 * - **多章节经**：章节列表 → `emit('jump', chapterIdx)`；
 * - **单章节经**：段落列表（段落无标题，用开头摘录作标签）→ `emit('jumpParagraph', paraIdx)`。
 *
 * 二者均由 `ReaderView` 关闭面板后经**同一条语义锚点路径**（`applyJump` → `anchor`
 * 分支 → `scrollToAnchor`）精确定位——组件自身不触碰 DOM。
 */

import BaseSheet from '@/components/common/BaseSheet.vue'

interface Props {
  /** 是否展开 */
  open: boolean
  /** 章节标题列表 */
  chapters: string[]
  /** 当前章节索引（高亮） */
  currentChapterIdx?: number
  /** 单章节经的段落摘录标签（与首章 `paragraphs` 一一对应） */
  paragraphLabels?: string[]
}

withDefaults(defineProps<Props>(), {
  currentChapterIdx: 0,
  paragraphLabels: () => []
})

const emit = defineEmits<{
  close: []
  jump: [chapterIdx: number]
  jumpParagraph: [paraIdx: number]
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

.toc__button--paragraph {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.toc__ordinal {
  flex: none;
  min-width: 1.5em;
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.toc__excerpt {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
