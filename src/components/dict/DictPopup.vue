<template>
  <div class="dict-popup" v-if="readerStore.selectedTerm">
    <div class="dict-popup-content">
      <div class="dict-popup-header">
        <h3 class="dict-popup-term">{{ readerStore.selectedTerm }}</h3>
        <button class="dict-popup-close" @click="readerStore.clearSelectedTerm()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="readerStore.dictResults.length === 0" class="dict-popup-empty">
        <p>未找到释义</p>
      </div>

      <div v-else class="dict-popup-results">
        <div
          v-for="(result, index) in readerStore.dictResults"
          :key="`${result.dictId}-${result.term}`"
          :class="['dict-popup-entry', { 'entry-first': index === 0 }]"
        >
          <span class="dict-popup-source">{{ result.dictName }}</span>
          <div class="dict-popup-def" v-html="renderMarkdown(result.definition)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useReaderStore } from '@/stores/reader'
import renderer from '@/engine/markdownRenderer.js'

const readerStore = useReaderStore()

function renderMarkdown(text) {
  if (!text) return ''
  return renderer.render(text)
}
</script>

<style scoped>
.dict-popup {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 480px;
  max-height: 60vh;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-container);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 300;
  overflow: hidden;
}

.dict-popup-content {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
}

.dict-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-hairline);
}

.dict-popup-term {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.dict-popup-close {
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

.dict-popup-close:hover {
  background: var(--color-surface);
  color: var(--color-ink);
}

.dict-popup-results {
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg);
}

.dict-popup-entry {
  padding: var(--spacing-md) 0;
}

.dict-popup-entry + .dict-popup-entry {
  border-top: 1px solid var(--color-hairline);
}

.dict-popup-source {
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
  margin-bottom: var(--spacing-xs);
  display: block;
}

.dict-popup-def {
  font-size: var(--text-body-sm);
  line-height: 1.6;
  color: var(--color-ink);
}

.dict-popup-def :deep(p) {
  margin-bottom: var(--spacing-sm);
}

.dict-popup-def :deep(p:last-child) {
  margin-bottom: 0;
}

.dict-popup-empty {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-ink-muted);
}
</style>
