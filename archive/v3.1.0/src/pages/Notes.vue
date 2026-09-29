<template>
  <div class="notes-page">
    <header class="notes-page__header">
      <h1 class="notes-page__title">
        笔记汇总
      </h1>
    </header>

    <div class="notes-page__input-wrap">
      <input
        v-model="searchQuery"
        type="text"
        class="notes-page__input"
        placeholder="搜索笔记..."
        autocomplete="off"
      >
    </div>

    <nav class="notes-page__filter">
      <button
        v-for="sutra in sutraOptions"
        :key="sutra.id"
        :class="['notes-page__filter-btn', { 'notes-page__filter-btn--active': activeSutraId === sutra.id }]"
        @click="activeSutraId = sutra.id"
      >
        {{ sutra.label }}
      </button>
    </nav>

    <div
      v-if="displayedNotes.length === 0"
      class="notes-page__empty"
    >
      <p>{{ searchQuery ? '未找到匹配的笔记' : '暂无笔记' }}</p>
    </div>

    <div
      v-else
      class="notes-page__list"
    >
      <div
        v-for="note in displayedNotes"
        :key="note.id"
        class="notes-page__item"
      >
        <p class="notes-page__sutra">
          {{ note.sutraTitle }}
        </p>
        <p class="notes-page__quote">
          "{{ note.quote }}"
        </p>
        <p class="notes-page__text">
          {{ note.text }}
        </p>
        <div class="notes-page__footer">
          <span class="notes-page__time">{{ formatTime(note.time) }}</span>
          <button
            class="notes-page__jump-btn"
            @click="jumpToReader(note)"
          >
            &rarr; 跳转
          </button>
        </div>
        <div
          v-if="editingId === note.id"
          class="notes-page__edit"
        >
          <textarea
            v-model="editText"
            class="notes-page__edit-input"
            rows="3"
          />
          <div class="notes-page__edit-actions">
            <button
              class="notes-page__edit-cancel"
              @click="editingId = null"
            >
              取消
            </button>
            <button
              class="notes-page__edit-save"
              @click="saveEdit(note)"
            >
              保存
            </button>
          </div>
        </div>
        <button
          class="notes-page__delete-btn"
          @click="confirmDelete(note)"
        >
          &times;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import { useSutraStore } from '../stores/sutra'

defineOptions({ name: 'Notes' })
console.log('[Notes] script setup executed')

const router = useRouter()
const notesStore = useNotesStore()
const sutraStore = useSutraStore()

const searchQuery = ref('')
const activeSutraId = ref('all')
const editingId = ref(null)
const editText = ref('')

const sutraOptions = computed(() => {
  const options = [{ id: 'all', label: '全部' }]
  const allNotes = notesStore.getAllNotes()
  const seen = new Set()
  for (const note of allNotes) {
    if (!seen.has(note.sutraId)) {
      seen.add(note.sutraId)
      const sutra = sutraStore.sutraList.find(s => s.filename === note.sutraId)
      options.push({ id: note.sutraId, label: sutra ? sutra.title : note.sutraId })
    }
  }
  return options
})

const displayedNotes = computed(() => {
  let notes = notesStore.searchNotes(searchQuery.value)
  if (activeSutraId.value !== 'all') {
    notes = notes.filter(n => n.sutraId === activeSutraId.value)
  }
  for (const note of notes) {
    const sutra = sutraStore.sutraList.find(s => s.filename === note.sutraId)
    note.sutraTitle = sutra ? sutra.title : note.sutraId
  }
  return notes
})

function formatTime(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function jumpToReader(note) {
  router.push({
    path: `/reader/${encodeURIComponent(note.sutraId)}`,
    query: { from: '#/notes' }
  })
}

function confirmDelete(note) {
  if (confirm('确定删除这条笔记？')) {
    notesStore.deleteNote(note.sutraId, note.id)
    if (editingId.value === note.id) editingId.value = null
  }
}

function saveEdit(note) {
  if (editText.value.trim()) {
    notesStore.updateNote(note.sutraId, note.id, editText.value)
  }
  editingId.value = null
  editText.value = ''
}

onMounted(() => {
  sutraStore.fetchManifest()
  notesStore.getAllNotes()
})
</script>

<style scoped>
.notes-page {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}
.notes-page__header { text-align: center; padding: var(--spacing-lg) 0; }
.notes-page__title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
}
.notes-page__input-wrap { margin-bottom: var(--spacing-md); }
.notes-page__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  font-size: var(--text-body);
  background: var(--color-canvas);
  transition: border-color 0.2s;
}
.notes-page__input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.notes-page__filter {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) 0 var(--spacing-md);
  flex-wrap: wrap;
  justify-content: center;
}
.notes-page__filter-btn {
  padding: var(--spacing-xxs) var(--spacing-sm);
  border-radius: var(--radius-pill);
  font-size: var(--text-caption);
  color: var(--color-ink-muted);
  background: var(--tag-bg);
  transition: color 0.2s, background 0.2s;
  border: none;
  cursor: pointer;
}
.notes-page__filter-btn--active {
  color: var(--color-canvas);
  background: var(--color-accent);
}
.notes-page__empty {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--color-ink-muted);
}
.notes-page__list { padding-top: var(--spacing-sm); }
.notes-page__item {
  position: relative;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-container);
}
.notes-page__sutra {
  font-size: var(--text-caption);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-xs);
}
.notes-page__quote {
  font-family: var(--font-serif);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-xs);
  white-space: pre-wrap;
}
.notes-page__text {
  font-size: var(--text-body-sm);
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}
.notes-page__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.notes-page__time {
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
}
.notes-page__jump-btn {
  padding: var(--spacing-xxs) var(--spacing-sm);
  font-size: var(--text-caption);
  color: var(--color-accent);
  background: none;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.notes-page__delete-btn {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-body);
  color: var(--color-ink-subtle);
  background: none;
  border: none;
  cursor: pointer;
}
.notes-page__edit {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-hairline);
}
.notes-page__edit-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-container);
  font-size: var(--text-body-sm);
  resize: vertical;
}
.notes-page__edit-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.notes-page__edit-cancel, .notes-page__edit-save {
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  cursor: pointer;
  border: none;
}
.notes-page__edit-cancel { color: var(--color-ink-muted); background: var(--color-surface); }
.notes-page__edit-save { color: var(--color-canvas); background: var(--color-accent); }
</style>
