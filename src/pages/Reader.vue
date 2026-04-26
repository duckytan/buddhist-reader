<template>
  <div class="reader">
    <header class="reader-header">
      <button class="back-btn" @click="handleBack">
        ←
      </button>
      <h1 class="title">{{ currentSutra?.fullName }}</h1>
      <div class="header-actions">
        <button class="chapter-btn" @click="showChapterDrawer = true">
          ☷
        </button>
        <ThemeToggle />
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">📖</div>
      <p>正在加载经文...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="loadSutra">重试</button>
    </div>

    <!-- 正常状态 -->
    <template v-else>
      <div 
        ref="contentRef"
        class="reader-content"
        @scroll="handleScroll"
      >
        <ReaderContent
          :sutra="currentSutra"
          :show-pinyin="showPinyin"
          @term-click="handleTermClick"
        />
      </div>

      <!-- 进度跳转控制 -->
      <div class="jump-section">
        <JumpControl
          v-model="scrollPercent"
          @jump="handleJump"
        />
      </div>

      <div class="reader-footer">
        <AudioPlayer
          :text="currentSutra?.chapters[currentChapterIndex]?.content"
        />
      </div>

      <DictionaryPopup
        v-if="selectedTerm"
        :term="selectedTerm"
        :position="popupPosition"
        @close="handleClosePopup"
      />

      <!-- 章节导航抽屉 -->
      <ChapterDrawer
        v-model="showChapterDrawer"
        :chapters="currentSutra?.chapters || []"
        :current-chapter-index="currentChapterIndex"
        @chapter-change="handleChapterChange"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sutras } from '@/data/sutras'
import { dynamicSutras } from '@/data/sutras-config'
import { createDynamicSutra } from '@/utils/sutra-loader'
import ReaderContent from '@/components/ReaderContent.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import DictionaryPopup from '@/components/DictionaryPopup.vue'
import ChapterDrawer from '@/components/ChapterDrawer.vue'
import JumpControl from '@/components/JumpControl.vue'
import { useSettingsStore } from '@/stores/settings'
import { useProgressStore } from '@/stores/progress'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const progressStore = useProgressStore()

const currentSutra = ref(null)
const loading = ref(true)
const error = ref(null)

const showPinyin = computed(() => settingsStore.showPinyin)

const selectedTerm = ref(null)
const popupPosition = ref({ x: 0, y: 0 })

const contentRef = ref(null)
const scrollPercent = ref(0)
const currentChapterIndex = ref(0)
const showChapterDrawer = ref(false)
const savedProgress = ref(null)

let scrollTimeout = null

// 将动态经文配置转换为对象，方便按 ID 查找
const dynamicSutraConfigs = {}
dynamicSutras.forEach(sutra => {
  dynamicSutraConfigs[sutra.id] = sutra
})

const loadSutra = async () => {
  loading.value = true
  error.value = null
  
  try {
    // 首先尝试从静态数据中查找
    let sutra = sutras.find(s => s.id === route.params.id)
    
    // 如果静态数据中没有，尝试动态加载
    if (!sutra) {
      const config = dynamicSutraConfigs[route.params.id]
      if (config) {
        sutra = await createDynamicSutra(config)
      }
    }
    
    if (sutra) {
      currentSutra.value = sutra
      
      // 加载阅读进度
      const progress = progressStore.getProgress(route.params.id)
      savedProgress.value = progress
      
      currentChapterIndex.value = progress.chapterIndex || 0
      scrollPercent.value = progress.percentage || 0
      
      // 等待DOM更新后恢复滚动位置
      await nextTick()
      if (progress.scrollPosition && contentRef.value) {
        contentRef.value.scrollTop = progress.scrollPosition
      }
    } else {
      error.value = '经文未找到'
    }
  } catch (err) {
    error.value = err.message || '加载经文失败'
    console.error('Failed to load sutra:', err)
  } finally {
    loading.value = false
  }
}

const handleScroll = () => {
  if (!contentRef.value) return
  
  // 节流处理，避免频繁保存
  if (scrollTimeout) clearTimeout(scrollTimeout)
  
  scrollTimeout = setTimeout(() => {
    const scrollTop = contentRef.value.scrollTop
    const scrollHeight = contentRef.value.scrollHeight
    const clientHeight = contentRef.value.clientHeight
    
    // 计算滚动百分比
    const percent = (scrollTop / (scrollHeight - clientHeight)) * 100
    scrollPercent.value = Math.min(100, Math.max(0, percent))
    
    // 保存进度
    saveReadingProgress()
  }, 300)
}

const saveReadingProgress = () => {
  if (!contentRef.value || !currentSutra.value) return
  
  progressStore.saveProgress(currentSutra.value.id, {
    percentage: scrollPercent.value,
    chapterIndex: currentChapterIndex.value,
    scrollPosition: contentRef.value.scrollTop
  })
}

const handleJump = (percent) => {
  if (!contentRef.value) return
  
  const scrollHeight = contentRef.value.scrollHeight
  const clientHeight = contentRef.value.clientHeight
  const targetScroll = (percent / 100) * (scrollHeight - clientHeight)
  
  contentRef.value.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  })
}

const handleChapterChange = (index) => {
  currentChapterIndex.value = index
  
  // 滚动到对应章节
  const chapterElements = contentRef.value?.querySelectorAll('.chapter')
  if (chapterElements && chapterElements[index]) {
    chapterElements[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
  saveReadingProgress()
}

const handleBack = () => {
  saveReadingProgress()
  router.back()
}

const handleTermClick = (term, x, y) => {
  selectedTerm.value = term
  popupPosition.value = { x, y }
}

const handleClosePopup = () => {
  selectedTerm.value = null
}

onMounted(() => {
  loadSutra()
})

onBeforeUnmount(() => {
  // 组件卸载前保存进度
  saveReadingProgress()
  if (scrollTimeout) clearTimeout(scrollTimeout)
})
</script>

<style scoped lang="scss">
.reader {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;

  .back-btn {
    font-size: var(--font-size-2xl);
    padding: var(--space-2);
    color: var(--text-primary);
  }

  .title {
    flex: 1;
    text-align: center;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    padding: 0 var(--space-4);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  scroll-behavior: smooth;
}

.jump-section {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: var(--space-3) var(--space-4);
}

.reader-footer {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: var(--space-4);
  position: sticky;
  bottom: 0;
  z-index: 9;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: var(--space-8);
  text-align: center;
}

.loading-spinner {
  font-size: 48px;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: var(--text-hint);
  margin-bottom: var(--space-4);
}

.retry-btn {
  padding: var(--space-3) var(--space-6);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: #e55a2b;
  }
}

</style>
