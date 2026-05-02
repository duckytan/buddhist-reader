<template>
  <div class="book-card" @click="$emit('click')">
    <div class="book-cover">
      <span class="cover-icon">{{ sutra.cover }}</span>
      <div v-if="readingProgress > 0" class="progress-badge">
        {{ Math.round(readingProgress) }}%
      </div>
    </div>
    <div class="book-info">
      <h3 class="book-title">{{ sutra.title }}</h3>
      <div v-if="readingProgress > 0" class="progress-bar">
        <div class="progress-fill" :style="{ width: `${readingProgress}%` }"></div>
      </div>
      <p v-else class="book-hint">未开始阅读</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProgressStore } from '@/stores/progress'

const props = defineProps({
  sutra: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const progressStore = useProgressStore()

const readingProgress = computed(() => {
  return progressStore.getProgress(props.sutra.id)
})
</script>

<style scoped lang="scss">
.book-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  @media (max-width: 767px) {
    &:active {
      transform: scale(0.98);
    }
  }
}

.book-cover {
  width: 100%;
  aspect-ratio: 3/4;
  background: linear-gradient(135deg, #FFF3CD 0%, #FFE5B4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .cover-icon {
    font-size: 48px;
  }

  .progress-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background-color: var(--primary-color);
    color: white;
    padding: 2px 6px;
    border-radius: var(--radius-full);
    font-size: 10px;
    font-weight: 500;
  }
}

.book-info {
  padding: 8px 10px 10px;

  .book-title {
    font-size: 13px;
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    margin: 0 0 6px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .progress-bar {
    width: 100%;
    height: 3px;
    background-color: var(--divider-color);
    border-radius: var(--radius-full);
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background-color: var(--primary-color);
      transition: width var(--transition-base);
    }
  }

  .book-hint {
    font-size: 11px;
    color: var(--text-hint);
    margin: 0;
  }
}
</style>
