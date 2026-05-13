<template>
  <div class="reader-pagination" v-if="readerStore.totalPages > 1">
    <button
      class="page-btn"
      :disabled="readerStore.currentPage <= 1"
      @click="readerStore.prevPage()"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15,18 9,12 15,6" />
      </svg>
    </button>

    <span class="page-indicator">{{ readerStore.pageIndicator }}</span>

    <button
      class="page-btn"
      :disabled="readerStore.currentPage >= readerStore.totalPages"
      @click="readerStore.nextPage()"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9,18 15,12 9,6" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { useReaderStore } from '@/stores/reader'

const readerStore = useReaderStore()
</script>

<style scoped>
.reader-pagination {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.page-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: var(--color-surface);
}

.page-btn:disabled {
  color: var(--color-ink-subtle);
  cursor: not-allowed;
}

.page-indicator {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  min-width: 60px;
  text-align: center;
}
</style>
