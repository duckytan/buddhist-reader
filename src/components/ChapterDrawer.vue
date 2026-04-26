<template>
  <van-drawer
    v-model:show="showDrawer"
    :lock-scroll="true"
    position="left"
    :style="{ width: isMobile ? '80%' : '320px' }"
    class="chapter-drawer"
  >
    <div class="drawer-header">
      <h3 class="drawer-title">目录</h3>
      <button class="close-btn" @click="showDrawer = false">×</button>
    </div>
    
    <div class="drawer-content">
      <div class="current-chapter">
        <span class="label">当前章节</span>
        <span class="chapter-name">{{ currentChapterName }}</span>
      </div>
      
      <div class="chapter-list">
        <div
          v-for="(chapter, index) in chapters"
          :key="index"
          class="chapter-item"
          :class="{ active: index === currentChapterIndex }"
          @click="handleChapterClick(index)"
        >
          <span class="chapter-index">{{ index + 1 }}</span>
          <span class="chapter-title">{{ chapter.title }}</span>
        </div>
      </div>
    </div>
  </van-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  chapters: {
    type: Array,
    default: () => []
  },
  currentChapterIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'chapter-change'])

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

const showDrawer = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const currentChapterName = computed(() => {
  if (props.chapters[props.currentChapterIndex]) {
    return props.chapters[props.currentChapterIndex].title
  }
  return ''
})

const handleChapterClick = (index) => {
  emit('chapter-change', index)
  showDrawer.value = false
}
</script>

<style scoped lang="scss">
.chapter-drawer {
  background-color: var(--bg-page);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-card);

  .drawer-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .close-btn {
    font-size: 32px;
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--text-primary);
    }
  }
}

.drawer-content {
  padding: var(--space-4);
}

.current-chapter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background-color: var(--highlight-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);

  .label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .chapter-name {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
    text-align: right;
  }
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--bg-card);
  }

  &.active {
    background-color: var(--highlight-bg);
    
    .chapter-index {
      color: var(--primary-color);
      font-weight: var(--font-weight-semibold);
    }
    
    .chapter-title {
      color: var(--primary-color);
      font-weight: var(--font-weight-semibold);
    }
  }

  .chapter-index {
    font-size: var(--font-size-sm);
    color: var(--text-hint);
    min-width: 24px;
  }

  .chapter-title {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    line-height: var(--line-height-base);
  }
}
</style>
