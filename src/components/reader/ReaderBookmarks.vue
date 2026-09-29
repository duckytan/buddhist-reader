<template>
  <BaseSheet
    :open="open"
    title="书签"
    @close="emit('close')"
  >
    <div class="bookmarks">
      <button
        type="button"
        class="bookmarks__add"
        :disabled="!canAdd"
        @click="emit('add')"
      >
        在此处添加书签
      </button>

      <ul
        v-if="bookmarks.length > 0"
        class="bookmarks__list"
      >
        <li
          v-for="bookmark in bookmarks"
          :key="bookmark.id"
          class="bookmarks__item"
        >
          <button
            type="button"
            class="bookmarks__entry"
            :aria-label="`跳转到书签：${labelOf(bookmark)}`"
            @click="emit('jump', bookmark)"
          >
            <span class="bookmarks__label">{{ labelOf(bookmark) }}</span>
            <span class="bookmarks__meta">{{ metaOf(bookmark) }}</span>
          </button>
          <button
            type="button"
            class="bookmarks__remove"
            aria-label="删除书签"
            @click="emit('remove', bookmark.id)"
          >
            删除
          </button>
        </li>
      </ul>
      <p
        v-else
        class="bookmarks__hint"
      >
        暂无书签
      </p>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 书签面板（方案 §6.5 书签闭环：添加 + 列表 + 回看）。
 *
 * 纯展示 + 事件上抛：`add` / `jump` / `remove` 均由 `ReaderView` 编排
 * （添加取当前滚动位置、跳转走像素路径、删除委托 `reader` store）。
 * 与阅读内 `ReaderNotes` 面板同构（`BaseSheet` + 列表），保持交互一致。
 */

import BaseSheet from '@/components/common/BaseSheet.vue'
import type { Bookmark } from '@/types/reader'

interface Props {
  /** 是否展开 */
  open: boolean
  /** 当前经书的书签（已按创建时间倒序） */
  bookmarks: Bookmark[]
  /** 是否允许添加（经书未就绪时禁止） */
  canAdd?: boolean
}

withDefaults(defineProps<Props>(), {
  canAdd: true
})

const emit = defineEmits<{
  close: []
  add: []
  jump: [bookmark: Bookmark]
  remove: [id: string]
}>()

/** 书签展示名：显式 label 优先，否则回退「第 N 章」 */
function labelOf(bookmark: Bookmark): string {
  if (bookmark.label) return bookmark.label
  return `第 ${bookmark.chapterIdx + 1} 章`
}

/** 次级信息：章节序号 */
function metaOf(bookmark: Bookmark): string {
  return `第 ${bookmark.chapterIdx + 1} 章`
}
</script>

<style scoped>
.bookmarks__add {
  width: 100%;
  min-height: var(--button-height);
  margin-bottom: var(--spacing-md);
  background: var(--btn-primary-bg);
  border-radius: var(--radius-pill);
  color: var(--btn-primary-text);
  font-size: var(--text-body-sm);
}

.bookmarks__add:disabled {
  opacity: 0.5;
}

.bookmarks__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.bookmarks__item {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--color-hairline);
}

.bookmarks__entry {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-xxs);
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  text-align: left;
}

.bookmarks__label {
  color: var(--color-ink);
  font-size: var(--text-body-sm);
}

.bookmarks__meta {
  color: var(--color-ink-subtle);
  font-size: var(--text-caption);
}

.bookmarks__remove {
  flex: 0 0 auto;
  align-self: center;
  min-height: var(--button-height);
  padding: 0 var(--spacing-sm);
  color: var(--color-error);
  font-size: var(--text-caption);
}

.bookmarks__hint {
  color: var(--color-ink-subtle);
  font-size: var(--text-body-sm);
  text-align: center;
}
</style>
