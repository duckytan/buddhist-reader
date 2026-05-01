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
          <!-- 多个词典的释义 -->
          <div class="dict-entries">
            <!-- 内置词典释义 -->
            <div v-if="internalDef" class="dict-entry source-builtin">
              <div class="source-badge builtin">
                <span class="badge-icon">📖</span>
                <span class="badge-text">内置词典</span>
              </div>
              <h3 class="term-title">{{ internalDef.term }}</h3>
              <div class="term-pinyin" v-if="internalDef.pinyin">
                <span class="pinyin">{{ internalDef.pinyin }}</span>
                <span class="sanskrit" v-if="internalDef.sanskrit">
                  {{ internalDef.sanskrit }}
                </span>
              </div>
              <p class="term-definition">{{ internalDef.definition }}</p>
              <div class="term-category" v-if="internalDef.category">
                <span class="category-tag">{{ internalDef.category }}</span>
              </div>
            </div>

            <!-- MDX 词典释义（可能有多个） -->
            <div
              v-for="(def, index) in externalDefs"
              :key="def.dictId + '-' + index"
              class="dict-entry source-external"
            >
              <div class="source-badge external">
                <span class="badge-icon">📚</span>
                <span class="badge-text">{{ def.dictName }}</span>
              </div>
              <div
                v-if="def.isHtml"
                class="term-definition-html"
                v-html="def.definition"
              />
              <p v-else class="term-definition">{{ def.definition }}</p>
            </div>

            <!-- 无释义提示 -->
            <div v-if="!internalDef && externalDefs.length === 0" class="no-definition">
              <span class="no-def-icon">🔍</span>
              <p>暂无释义</p>
              <p class="no-def-hint">可以在词典设置中添加更多词典</p>
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { dictionary } from '@/data/dictionary'
import { useDictionariesStore } from '@/stores/dictionaries'

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
const dictionariesStore = useDictionariesStore()

// 内置词典释义
const internalDef = computed(() => {
  return dictionary.find(d => d.term === props.term) || null
})

// 外部词典释义（从 store 的 allEntries 中查找）
const externalDefs = computed(() => {
  const entries = dictionariesStore.allEntries.filter(e => 
    e.term === props.term && e._dictId !== 'builtin'
  )
  
  // 转换为显示格式
  return entries.map(entry => ({
    dictName: entry._dictName || '佛教词典合集',
    dictId: entry._dictId,
    definition: entry.definition,
    isHtml: false
  }))
})

// 设备类型
const deviceClass = computed(() => {
  if (width.value < 768) return 'mobile'
  if (width.value < 1024) return 'tablet'
  return 'desktop'
})

// 弹窗位置
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

  // Mobile: bottom drawer
  return {}
})

// ESC 键关闭
const handleEscape = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
})
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
    max-height: 60vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  &.tablet {
    width: 320px;
    max-height: 70vh;
    padding: var(--space-4);
    position: absolute;
  }

  &.desktop {
    width: 400px;
    max-height: 80vh;
    padding: var(--space-6);
    position: fixed;
  }
}

.dict-entries {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dict-entry {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background-color: var(--bg-page);

  &.source-builtin {
    background-color: rgba(255, 107, 53, 0.08);
    border-left: 3px solid var(--primary-color);
  }

  &.source-external {
    background-color: var(--bg-page);
    border-left: 3px solid #666;
  }
}

.source-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;

  .badge-icon {
    font-size: 12px;
  }

  &.builtin {
    background-color: var(--primary-color);
    color: white;
  }

  &.external {
    background-color: #666;
    color: white;
  }
}

.term-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  font-family: var(--font-heading);
}

.term-pinyin {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;

  .pinyin {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-family: var(--font-sanskrit);
  }

  .sanskrit {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    font-family: var(--font-sanskrit);
    padding: 2px 8px;
    background-color: rgba(255, 255, 255, 0.6);
    border-radius: var(--radius-full);
  }
}

.term-definition {
  font-size: var(--font-size-base);
  line-height: var(--line-height-loose);
  color: var(--text-primary);
}

.term-definition-html {
  font-size: var(--font-size-base);
  line-height: var(--line-height-loose);
  color: var(--text-primary);

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-sm);
    margin: var(--space-2) 0;
  }

  :deep(audio) {
    width: 100%;
    margin: var(--space-2) 0;
  }

  :deep(a) {
    color: var(--primary-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.term-category {
  margin-top: var(--space-2);

  .category-tag {
    display: inline-block;
    padding: 2px 8px;
    background-color: rgba(255, 255, 255, 0.6);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
    border-radius: var(--radius-full);
  }
}

.no-definition {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-tertiary);

  .no-def-icon {
    font-size: 32px;
    display: block;
    margin-bottom: var(--space-2);
  }

  p {
    font-size: var(--font-size-sm);
  }

  .no-def-hint {
    margin-top: var(--space-1);
    font-size: var(--font-size-xs);
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
  background-color: var(--bg-card);
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
