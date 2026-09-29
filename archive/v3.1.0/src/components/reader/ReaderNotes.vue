<template>
  <Transition name="slide-up">
    <div
      v-if="visible"
      class="reader-notes"
    >
      <div
        class="reader-notes__overlay"
        @click="$emit('close')"
      />
      <div class="reader-notes__panel">
        <header class="reader-notes__header">
          <h3 class="reader-notes__title">
            笔记
          </h3>
          <button
            class="reader-notes__close"
            @click="$emit('close')"
          >
            &#10005;
          </button>
        </header>

        <div
          v-if="notes.length === 0"
          class="reader-notes__empty"
        >
          选中经文文字后点击"笔记"即可添加批注
        </div>

        <div
          v-else
          class="reader-notes__list"
        >
          <div
            v-for="(note, i) in notes"
            :key="i"
            class="reader-notes__item"
          >
            <p class="reader-notes__quote">
              {{ note.quote }}
            </p>
            <p class="reader-notes__text">
              {{ note.text }}
            </p>
            <span class="reader-notes__time">{{ formatTime(note.time) }}</span>
            <button
              class="reader-notes__delete"
              @click="removeNote(i)"
            >
              &#10005;
            </button>
          </div>
        </div>

        <div
          v-if="addingNote"
          class="reader-notes__add"
        >
          <p class="reader-notes__add-quote">
            "{{ selectedText }}"
          </p>
          <textarea
            v-model="noteInput"
            class="reader-notes__input"
            placeholder="写下你的批注..."
            rows="3"
          />
          <div class="reader-notes__add-actions">
            <button
              class="reader-notes__cancel"
              @click="addingNote = false"
            >
              取消
            </button>
            <button
              class="reader-notes__save"
              @click="saveNote"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useNotesStore } from '../../stores/notes'

const props = defineProps({
  visible: { type: Boolean, default: false },
  sutraId: { type: String, default: '' }
})

defineEmits(['close'])

const notesStore = useNotesStore()
const addingNote = ref(false)
const noteInput = ref('')
const selectedText = ref('')
const notes = ref([])

function loadNotes() {
  notes.value = notesStore.getNotes(props.sutraId)
}

watch(() => props.sutraId, loadNotes, { immediate: true })

function startAddNote(text) {
  selectedText.value = text
  noteInput.value = ''
  addingNote.value = true
}

function saveNote() {
  if (!noteInput.value.trim()) return
  notesStore.addNote(props.sutraId, selectedText.value, noteInput.value)
  loadNotes()
  addingNote.value = false
  noteInput.value = ''
}

function removeNote(index) {
  const note = notes.value[index]
  notesStore.deleteNote(props.sutraId, note.id)
  loadNotes()
}

function formatTime(ts) {
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

defineExpose({ startAddNote })
</script>

<style scoped>
.reader-notes { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; }
.reader-notes__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.2); }
.reader-notes__panel {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
  border-radius: var(--radius-container) var(--radius-container) 0 0;
  max-height: 60vh; overflow-y: auto;
}
.reader-notes__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md); border-bottom: 1px solid var(--color-hairline);
}
.reader-notes__title { font-family: var(--font-serif); font-size: var(--text-h3); }
.reader-notes__close {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center; color: var(--color-ink-muted);
}
.reader-notes__empty { text-align: center; padding: var(--spacing-xxl); color: var(--color-ink-muted); }
.reader-notes__list { padding: var(--spacing-md); }
.reader-notes__item {
  position: relative; padding: var(--spacing-md);
  margin-bottom: var(--spacing-md); background: var(--color-surface);
  border-radius: var(--radius-container);
}
.reader-notes__quote {
  font-family: var(--font-serif); font-size: var(--text-body-sm);
  color: var(--color-ink-muted); margin-bottom: var(--spacing-xs);
  white-space: pre-wrap;
}
.reader-notes__text { font-size: var(--text-body-sm); color: var(--color-ink); margin-bottom: var(--spacing-xs); }
.reader-notes__time { font-size: var(--text-caption); color: var(--color-ink-subtle); }
.reader-notes__delete {
  position: absolute; top: var(--spacing-xs); right: var(--spacing-xs);
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-body-sm); color: var(--color-ink-subtle);
}
.reader-notes__add { padding: var(--spacing-md); border-top: 1px solid var(--color-hairline); }
.reader-notes__add-quote {
  font-family: var(--font-serif); font-size: var(--text-body-sm);
  color: var(--color-accent); margin-bottom: var(--spacing-sm);
}
.reader-notes__input {
  width: 100%; padding: var(--spacing-sm); border: var(--input-border);
  border-radius: var(--radius-container); background: var(--input-bg); color: var(--input-text);
  resize: vertical;
}
.reader-notes__add-actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-sm); }
.reader-notes__cancel, .reader-notes__save {
  padding: var(--spacing-xs) var(--spacing-lg); border-radius: var(--radius-pill);
}
.reader-notes__cancel { color: var(--color-ink-muted); background: var(--color-surface); }
.reader-notes__save { color: var(--color-canvas); background: var(--color-accent); }
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s, transform 0.3s; }
.slide-up-enter-from { opacity: 0; transform: translateY(100%); }
.slide-up-leave-to { opacity: 0; transform: translateY(100%); }
</style>
