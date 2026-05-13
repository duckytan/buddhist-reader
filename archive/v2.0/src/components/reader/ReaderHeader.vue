<template>
  <header class="reader-header">
    <button class="header-btn" @click="router.push('/')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>

    <h1 class="header-title">{{ readerStore.currentChapterTitle }}</h1>

    <div class="header-actions">
      <button class="header-btn" @click="readerStore.toggleToc()" :class="{ active: readerStore.showToc }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
      <button class="header-btn" @click="readerStore.toggleSettings()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useReaderStore } from '@/stores/reader'

const router = useRouter()
const readerStore = useReaderStore()
</script>

<style scoped>
.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-title {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  text-align: center;
  flex: 1;
  margin: 0 var(--spacing-sm);
}

.header-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.header-btn {
  width: var(--touch-target);
  height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--color-ink);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: var(--color-surface);
  color: var(--color-accent);
}

.header-btn.active {
  color: var(--color-accent);
  background: var(--color-surface);
}
</style>
