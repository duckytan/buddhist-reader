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

      <!-- 底部工具栏 -->
      <div class="reader-footer">
        <div class="footer-toolbar">
          <!-- 进度条 -->
          <div class="progress-bar-container">
            <div class="progress-bar" @click="handleProgressBarClick">
              <div class="progress-fill" :style="{ width: `${scrollPercent}%` }"></div>
              <div class="progress-handle" :style="{ left: `${scrollPercent}%` }"></div>
            </div>
            <span class="progress-text">{{ Math.round(scrollPercent) }}%</span>
          </div>
          
          <!-- 工具按钮 -->
          <div class="toolbar-buttons">
            <button class="toolbar-btn" @click="showJumpDialog = true" title="跳转到">
              ↗
            </button>
            <button class="toolbar-btn" @click="showChapterDrawer = true" title="目录">
              ☷
            </button>
          </div>
        </div>
        
        <!-- 音频播放器 -->
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

      <!-- 跳转对话框 -->
      <van-dialog
        v-model:show="showJumpDialog"
        title="跳转到"
        show-cancel-button
        @confirm="handleJumpConfirm"
      >
        <div class="jump-dialog-content">
          <div class="jump-input-row">
            <input
              v-model="jumpInputValue"
              type="number"
              min="0"
              max="100"
              class="jump-input"
              placeholder="0-100"
            />
            <span class="jump-unit">%</span>
          </div>
          <div class="quick-jump-buttons">
            <button
              v-for="percent in [25, 50, 75]"
              :key="percent"
              class="quick-jump-btn"
              @click="jumpInputValue = percent"
            >
              {{ percent }}%
            </button>
          </div>
        </div>
      </van-dialog>
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
const showJumpDialog = ref(false)
const jumpInputValue = ref(0)
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

const handleProgressBarClick = (e) => {
  if (!contentRef.value) return
  
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = ((e.clientX - rect.left) / rect.width) * 100
  const clampedPercent = Math.max(0, Math.min(100, percent))
  
  handleJump(clampedPercent)
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

const handleJumpConfirm = () => {
  let percent = parseInt(jumpInputValue.value)
  if (isNaN(percent)) percent = 0
  percent = Math.max(0, Math.min(100, percent))
  
  handleJump(percent)
  showJumpDialog.value = false
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

.reader-footer {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: var(--space-3) var(--space-4);
  position: sticky;
  bottom: 0;
  z-index: 9;
}

.footer-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.progress-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--divider-color);
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background-color: var(--primary-color);
  border: 2px solid var(--bg-card);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
  pointer-events: none;
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

.toolbar-buttons {
  display: flex;
  gap: var(--space-2);
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-page);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.jump-dialog-content {
  padding: var(--space-4);
}

.jump-input-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.jump-input {
  width: 100px;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xl);
  text-align: center;
  background-color: var(--bg-page);
  color: var(--text-primary);

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
}

.jump-unit {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
}

.quick-jump-buttons {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
}

.quick-jump-btn {
  padding: var(--space-2) var(--space-4);
  background-color: var(--bg-page);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
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
