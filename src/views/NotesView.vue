<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        笔记
      </h1>
      <p class="view__subtitle">
        跨经书聚合 · 关键词搜索 · 按经书筛选
      </p>
    </header>

    <input
      v-model="keyword"
      type="search"
      class="notes__search"
      placeholder="搜索笔记内容"
      aria-label="搜索笔记"
    >

    <div
      v-if="sutraOptions.length > 0"
      class="notes__filters"
      role="group"
      aria-label="按经书筛选"
    >
      <button
        type="button"
        class="notes__filter"
        :class="{ 'notes__filter--active': sutraFilter === 'all' }"
        :aria-pressed="sutraFilter === 'all'"
        @click="sutraFilter = 'all'"
      >
        全部
      </button>
      <button
        v-for="option in sutraOptions"
        :key="option.id"
        type="button"
        class="notes__filter"
        :class="{ 'notes__filter--active': sutraFilter === option.id }"
        :aria-pressed="sutraFilter === option.id"
        @click="sutraFilter = option.id"
      >
        {{ option.title }}
      </button>
    </div>

    <EmptyState
      v-if="notesStore.notes.length === 0"
      text="暂无笔记，阅读时划选正文即可添加"
    />
    <EmptyState
      v-else-if="filtered.length === 0"
      text="无匹配笔记"
    />
    <ul
      v-else
      class="notes__list"
    >
      <li
        v-for="note in filtered"
        :key="note.id"
        class="notes__item"
      >
        <button
          type="button"
          class="notes__entry"
          :aria-label="`跳转到《${titleOf(note.sutraId)}》中的笔记`"
          @click="jump(note)"
        >
          <span class="notes__source">{{ titleOf(note.sutraId) }}</span>
          <span
            v-if="note.quote"
            class="notes__quote"
          >{{ note.quote }}</span>
          <span class="notes__text">{{ note.text }}</span>
        </button>
        <button
          type="button"
          class="notes__remove"
          aria-label="删除笔记"
          @click="remove(note.id)"
        >
          删除
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * 笔记视图（方案 §9 T09 / §6.3）——路由 `/notes`（Tab）。
 *
 * 职责：跨经书笔记汇总、关键词搜索、按经书筛选、**点击跳转到源锚点**（修旧版
 * 「笔记跳转不生效」缺陷）。
 *
 * 跳转口径：笔记携带**语义锚点** `NoteAnchor{ chapterIdx, paraId, offset }`，经
 * `encodeJumpQuery` 编入路由 query → `ReaderView` 解码后走**语义锚点路径**
 * （`scrollToAnchor`）。与书签的**像素路径**共用同一跳转入口（`utils/readerJump`），
 * 但**不混用**定位机制。
 *
 * 标题解析：经 `sutraStore`（→ `sutraService`）提供，不在 `notes` store 内解析
 * （§6.8），亦不在本视图直连 `@/services`。
 */

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import { useNotesStore } from '@/stores/notes'
import { useSutraStore } from '@/stores/sutra'
import type { Note } from '@/types/note'
import { encodeJumpQuery } from '@/utils/readerJump'

const router = useRouter()
const notesStore = useNotesStore()
const sutraStore = useSutraStore()

const keyword = ref('')
const sutraFilter = ref<string>('all')

/** `sutraId` → 标题（经 sutraStore 的清单解析） */
function titleOf(sutraId: string): string {
  const meta = sutraStore.manifest.find((item) => item.filename === sutraId)
  return meta?.title ?? sutraId
}

/** 有笔记的经书选项（按标题） */
const sutraOptions = computed<Array<{ id: string; title: string }>>(() => {
  const ids = new Set<string>()
  for (const note of notesStore.notes) ids.add(note.sutraId)
  return [...ids].map((id) => ({ id, title: titleOf(id) }))
})

/** 关键词 + 经书筛选后的笔记 */
const filtered = computed<Note[]>(() => {
  const kw = keyword.value.trim()
  return notesStore.notes.filter((note) => {
    if (sutraFilter.value !== 'all' && note.sutraId !== sutraFilter.value) return false
    if (!kw) return true
    return note.text.includes(kw) || note.quote.includes(kw)
  })
})

/** 跳转到笔记源锚点（无锚点时定位到经书开头） */
function jump(note: Note): void {
  const anchor = note.anchor ?? { chapterIdx: 0, paraId: '', offset: 0 }
  void router.push({
    name: 'reader',
    params: { id: note.sutraId },
    query: encodeJumpQuery({ sutraId: note.sutraId, anchor })
  })
}

function remove(id: string): void {
  notesStore.remove(id)
}

onMounted(() => {
  notesStore.load()
  void sutraStore.loadManifest()
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

.notes__search {
  width: 100%;
  height: var(--input-height);
  padding: 0 var(--spacing-md);
  background: var(--input-bg);
  border: var(--input-border);
  border-radius: var(--input-radius);
  color: var(--input-text);
  font-size: var(--text-body-sm);
}

.notes__search:focus {
  border: var(--input-focus-border);
  outline: none;
}

.notes__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin: var(--spacing-md) 0 var(--spacing-lg);
}

.notes__filter {
  min-height: var(--button-height);
  padding: 0 var(--spacing-lg);
  background: var(--tag-bg);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  color: var(--tag-text);
  font-size: var(--text-body-sm);
}

.notes__filter--active {
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
  font-weight: var(--weight-medium);
}

.notes__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notes__item {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--color-hairline);
}

.notes__entry {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-xxs);
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  text-align: left;
}

.notes__source {
  color: var(--color-accent-deep);
  font-size: var(--text-caption);
}

.notes__quote {
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}

.notes__text {
  color: var(--color-ink);
  font-size: var(--text-body-sm);
}

.notes__remove {
  flex: 0 0 auto;
  align-self: center;
  min-height: var(--button-height);
  padding: 0 var(--spacing-sm);
  color: var(--color-error);
  font-size: var(--text-caption);
}
</style>
