<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="term" class="popup-overlay" @click="$emit('close')">
        <div
          class="popup-content"
          :class="deviceClass"
          :style="popupStyle"
          @click.stop
        >
          <div class="dict-entry">
            <h3 class="term-title">{{ dictData.term }}</h3>

            <div class="term-pinyin">
              <span class="pinyin">{{ dictData.pinyin }}</span>
              <span class="sanskrit" v-if="dictData.sanskrit">
                {{ dictData.sanskrit }}
              </span>
            </div>

            <p class="term-definition">
              {{ dictData.definition }}
            </p>

            <div class="term-category" v-if="dictData.category">
              <span class="category-tag">{{ dictData.category }}</span>
            </div>
          </div>

          <button class="close-btn" @click="$emit('close')">
            ×
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { dictionary } from '@/data/dictionary'

const props = defineProps({
  term: {
    type: String,
    required: true
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['close'])

const { width } = useWindowSize()

const dictData = computed(() => {
  return dictionary.find(d => d.term === props.term) || {
    term: props.term,
    pinyin: '',
    sanskrit: '',
    definition: '暂无释义',
    category: ''
  }
})

const deviceClass = computed(() => {
  if (width.value < 768) return 'mobile'
  if (width.value < 1024) return 'tablet'
  return 'desktop'
})

const popupStyle = computed(() => {
  if (width.value >= 1024) {
    return {
      right: '0',
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }

  if (width.value >= 768) {
    const x = Math.min(props.position.x, window.innerWidth - 340)
    return {
      left: `${x}px`,
      top: `${props.position.y}px`
    }
  }

  // Mobile: bottom drawer, no specific positioning
  return {}
})

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
})

const handleEscape = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<style scoped lang="scss">
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.popup-content {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  position: relative;
  max-height: 80vh;
  overflow-y: auto;

  &.mobile {
    width: 100%;
    height: 60vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  &.tablet {
    width: 320px;
    padding: var(--space-4);
    position: absolute;
  }

  &.desktop {
    width: 400px;
    padding: var(--space-6);
    position: fixed;
  }
}

.dict-entry {
  padding: var(--space-4);

  .term-title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-3);
    font-family: var(--font-heading);
  }

  .term-pinyin {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;

    .pinyin {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      font-family: var(--font-sanskrit);
    }

    .sanskrit {
      font-size: var(--font-size-sm);
      color: var(--text-hint);
      font-family: var(--font-sanskrit);
      padding: 2px 8px;
      background-color: var(--highlight-bg);
      border-radius: var(--radius-full);
    }
  }

  .term-definition {
    font-size: var(--font-size-base);
    line-height: var(--line-height-loose);
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  }

  .term-category {
    .category-tag {
      display: inline-block;
      padding: 4px 12px;
      background-color: var(--highlight-bg);
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      border-radius: var(--radius-full);
    }
  }
}

.close-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  background-color: var(--bg-page);
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--highlight-bg);
    color: var(--text-primary);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;

  .popup-content.mobile {
    transition: transform 0.3s ease;
  }
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;

  .popup-content.mobile {
    transform: translateY(100%);
  }
}
</style>
