<template>
  <div class="book-card" @click="$emit('click')">
    <div class="book-cover">
      <span class="cover-icon">{{ sutra.cover }}</span>
    </div>
    <div class="book-info">
      <h3 class="book-title">{{ sutra.title }}</h3>
      <p class="book-description">{{ sutra.description }}</p>
      <div class="book-meta">
        <span class="word-count">{{ sutra.wordCount }} 字</span>
        <span class="progress" v-if="readingProgress > 0">
          {{ Math.round(readingProgress) }}%
        </span>
      </div>
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
  box-shadow: var(--shadow-base);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  @include mobile {
    &:active {
      transform: scale(0.98);
    }
  }
}

.book-cover {
  width: 100%;
  aspect-ratio: 3/4;
  background: linear-gradient(135deg, #FFF3CD 0%, #FFE5B4 100%);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);

  .cover-icon {
    font-size: 64px;
  }
}

.book-info {
  .book-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-2);
    line-height: var(--line-height-tight);
  }

  .book-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: var(--line-height-base);
    margin-bottom: var(--space-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-xs);
    color: var(--text-hint);

    .progress {
      background-color: var(--primary-color);
      color: white;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-weight: var(--font-weight-medium);
    }
  }
}
</style>
