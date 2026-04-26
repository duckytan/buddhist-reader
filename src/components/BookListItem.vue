<template>
  <div class="book-list-item" @click="$emit('click')">
    <div class="book-list-content">
      <div class="book-header">
        <div class="book-icon">{{ sutra.cover }}</div>
        <div class="book-main">
          <h3 class="book-title">{{ sutra.title }}</h3>
          <p class="book-fullname">{{ sutra.fullName }}</p>
          <div class="book-tags">
            <span class="tag">{{ getCategory(sutra) }}</span>
            <span class="tag translator">{{ sutra.translator }}</span>
          </div>
        </div>
        <button v-if="readingProgress > 0" class="continue-btn" @click.stop="$emit('continue')">
          继续
        </button>
      </div>
      
      <div v-if="readingProgress > 0" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${readingProgress}%` }"></div>
        </div>
        <span class="progress-text">已读 {{ Math.round(readingProgress) }}%</span>
      </div>
      
      <div class="book-footer">
        <span class="word-count">{{ sutra.wordCount }} 字</span>
        <span class="chapter-count">{{ sutra.chapters?.length || 1 }} 章</span>
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

defineEmits(['click', 'continue'])

const progressStore = useProgressStore()

const readingProgress = computed(() => {
  const progress = progressStore.getProgress(props.sutra.id)
  return progress.percentage || 0
})

const getCategory = (sutra) => {
  // 根据经文名称推断分类
  const name = sutra.fullName || sutra.title
  if (name.includes('般若')) return '般若'
  if (name.includes('密宗') || name.includes('心经')) return '密宗'
  if (name.includes('净土') || name.includes('阿弥陀')) return '净土'
  if (name.includes('华严')) return '华严'
  if (name.includes('法华') || name.includes('莲华')) return '法华'
  if (name.includes('涅槃')) return '涅槃'
  if (name.includes('唯识') || name.includes('楞伽')) return '唯识'
  if (name.includes('禅')) return '禅宗'
  return '其他'
}
</script>

<style scoped lang="scss">
.book-list-item {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-base);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: var(--space-3);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateX(4px);
  }

  &:active {
    transform: scale(0.98);
  }
}

.book-list-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.book-header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.book-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.book-main {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-1) 0;
  line-height: var(--line-height-tight);
}

.book-fullname {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--space-2) 0;
  line-height: var(--line-height-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--highlight-bg);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  line-height: 1.2;

  &.translator {
    background-color: var(--bg-page);
    color: var(--text-secondary);
  }
}

.continue-btn {
  padding: var(--space-2) var(--space-3);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  white-space: nowrap;

  &:hover {
    background-color: #e55a2b;
  }
}

.progress-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background-color: var(--divider-color);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width var(--transition-base);
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 60px;
  text-align: right;
}

.book-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--text-hint);
  padding-top: var(--space-2);
  border-top: 1px solid var(--divider-color);
}
</style>
