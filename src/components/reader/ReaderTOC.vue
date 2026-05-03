<template>
  <aside class="reader-toc">
    <div class="toc-header">
      <h3>目录</h3>
      <button class="toc-close" @click="readerStore.closePanels()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <nav class="toc-list">
      <template v-if="readerStore.currentSutra">
        <button
          v-for="i in readerStore.totalChapters"
          :key="i"
          :class="['toc-item', { active: readerStore.currentChapter === i }]"
          @click="selectChapter(i)"
        >
          <span v-if="readerStore.totalChapters === 1">{{ readerStore.currentSutra.title }}</span>
          <span v-else>第{{ i }}章</span>
        </button>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { useReaderStore } from '@/stores/reader'

const readerStore = useReaderStore()

async function selectChapter(index) {
  await readerStore.loadChapter(index)
  readerStore.closePanels()
}
</script>

<style scoped>
.reader-toc {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  max-width: 80vw;
  height: 100vh;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-hairline);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-hairline);
}

.toc-header h3 {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
}

.toc-close {
  width: var(--touch-target);
  height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  background: transparent;
  cursor: pointer;
}

.toc-close:hover {
  background: var(--color-surface);
  color: var(--color-ink);
}

.toc-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.toc-item {
  width: 100%;
  padding: var(--spacing-md);
  text-align: left;
  border-radius: var(--radius-container);
  font-size: var(--text-body);
  color: var(--color-ink);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toc-item:hover {
  background: var(--color-surface);
}

.toc-item.active {
  color: var(--color-accent);
  background: var(--color-surface);
  font-weight: var(--weight-medium);
}
</style>
