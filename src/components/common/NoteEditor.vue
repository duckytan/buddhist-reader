<template>
  <div class="note-editor" v-if="visible">
    <div class="note-header">
      <h3>笔记</h3>
      <button class="note-close" @click="$emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div class="note-body">
      <textarea
        v-model="noteContent"
        class="note-textarea"
        placeholder="记录你的理解..."
        rows="6"
      />
    </div>

    <div class="note-footer">
      <button class="note-save-btn" @click="saveNote">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  term: {
    type: String,
    default: ''
  },
  initialContent: {
    type: String,
    default: ''
  }
})

defineEmits(['close', 'save'])

const noteContent = ref(props.initialContent)

function saveNote() {
  // TODO: 实现笔记保存逻辑
  console.log('Save note for:', props.term, noteContent.value)
}
</script>

<style scoped>
.note-editor {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 480px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-container);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 300;
  overflow: hidden;
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-hairline);
}

.note-header h3 {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.note-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  background: transparent;
  cursor: pointer;
}

.note-close:hover {
  background: var(--color-surface);
  color: var(--color-ink);
}

.note-body {
  padding: var(--spacing-md) var(--spacing-lg);
}

.note-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-container);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  color: var(--color-ink);
  background: var(--color-surface-soft);
  resize: vertical;
}

.note-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.note-textarea::placeholder {
  color: var(--color-ink-subtle);
}

.note-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}

.note-save-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-canvas);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background 0.2s ease;
}

.note-save-btn:hover {
  background: var(--color-accent-deep);
}
</style>
