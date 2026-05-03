<template>
  <div class="reader-progress">
    <div class="progress-info">
      <span class="chapter-label">{{ readerStore.currentChapter }}/{{ readerStore.totalChapters }}</span>
      <span class="percentage-label">{{ Math.round(readerStore.readPercentage) }}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${readerStore.readPercentage}%` }" />
    </div>
  </div>
</template>

<script setup>
import { useReaderStore } from '@/stores/reader'

const readerStore = useReaderStore()
</script>

<style scoped>
.reader-progress {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-surface);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-xxs);
}

.progress-bar {
  height: 4px;
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}
</style>
