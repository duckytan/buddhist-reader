<template>
  <BaseSheet
    :open="open"
    title="笔记"
    @close="emit('close')"
  >
    <div class="notes">
      <div
        v-if="selection"
        class="notes__compose"
      >
        <blockquote class="notes__quote">
          {{ selection.text }}
        </blockquote>
        <textarea
          v-model="draft"
          class="notes__input"
          aria-label="笔记内容"
          rows="3"
          placeholder="写点什么…"
        />
        <div class="notes__compose-actions">
          <button
            type="button"
            class="notes__btn"
            :disabled="!canSave"
            @click="save"
          >
            保存笔记
          </button>
          <button
            type="button"
            class="notes__btn notes__btn--ghost"
            @click="emit('clearSelection')"
          >
            取消
          </button>
        </div>
      </div>
      <p
        v-else
        class="notes__hint"
      >
        划选正文中的文字即可添加笔记
      </p>

      <ul
        v-if="notes.length > 0"
        class="notes__list"
      >
        <li
          v-for="note in notes"
          :key="note.id"
          class="notes__item"
        >
          <button
            type="button"
            class="notes__entry"
            @click="emit('jump', note)"
          >
            <span class="notes__entry-quote">{{ note.quote }}</span>
            <span class="notes__entry-text">{{ note.text }}</span>
          </button>
        </li>
      </ul>
      <p
        v-else
        class="notes__hint"
      >
        暂无笔记
      </p>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 阅读内笔记面板（方案 §6.3 / §8.3）。
 *
 * 范围：**当前经书的笔记列表 + 跳转**，以及「由选区添加笔记」（配合 `useSelection`）。
 * 完整笔记 CRUD 页面（`NotesView`）归 **T09**——此处不越界。
 * 锚点由 ReaderView 用 `parseGlobalId` + 经书模型换算为 `NoteAnchor`。
 */

import { computed, ref } from 'vue'

import BaseSheet from '@/components/common/BaseSheet.vue'
import type { SelectionInfo } from '@/composables/useSelection'
import type { Note } from '@/types/note'

interface Props {
  /** 是否展开 */
  open: boolean
  /** 当前经书的笔记 */
  notes: Note[]
  /** 当前选区（无则 null） */
  selection: SelectionInfo | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  jump: [note: Note]
  add: [payload: { quote: string; text: string; globalId: string; offset: number }]
  clearSelection: []
}>()

const draft = ref('')
const canSave = computed<boolean>(() => Boolean(props.selection) && draft.value.trim().length > 0)

function save(): void {
  const current = props.selection
  if (!current || draft.value.trim().length === 0) return
  emit('add', {
    quote: current.text,
    text: draft.value.trim(),
    globalId: current.globalId,
    offset: current.offset
  })
  draft.value = ''
}
</script>

<style scoped>
.notes__compose {
  margin-bottom: var(--spacing-lg);
}

.notes__quote {
  margin: 0 0 var(--spacing-sm);
  padding-left: var(--spacing-sm);
  color: var(--color-ink-muted);
  border-left: 3px solid var(--color-accent-light);
  font-size: var(--text-body-sm);
}

.notes__input {
  width: 100%;
  padding: var(--spacing-sm);
  background: var(--input-bg);
  border: var(--input-border);
  border-radius: var(--radius-container);
  color: var(--input-text);
  font-family: var(--font-sans);
  font-size: var(--text-body-sm);
  resize: vertical;
}

.notes__compose-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.notes__btn {
  min-height: var(--button-height);
  padding: 0 var(--spacing-lg);
  background: var(--btn-primary-bg);
  border-radius: var(--radius-pill);
  color: var(--btn-primary-text);
  font-size: var(--text-body-sm);
}

.notes__btn:disabled {
  opacity: 0.5;
}

.notes__btn--ghost {
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-text);
}

.notes__hint {
  color: var(--color-ink-subtle);
  font-size: var(--text-body-sm);
  text-align: center;
}

.notes__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notes__item {
  border-top: 1px solid var(--color-hairline);
}

.notes__entry {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  text-align: left;
}

.notes__entry-quote {
  color: var(--color-ink-muted);
  font-size: var(--text-caption);
}

.notes__entry-text {
  color: var(--color-ink);
  font-size: var(--text-body-sm);
}
</style>
