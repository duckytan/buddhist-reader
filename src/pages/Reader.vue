<template>
  <div class="reader">
    <header class="reader-header">
      <button class="back-btn" @click="handleBack">
        ←
      </button>
      <h1 class="title">{{ currentSutra?.fullName }}</h1>
      <div class="header-actions">
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
      <div class="reader-content">
        <ReaderContent
          :sutra="currentSutra"
          :show-pinyin="showPinyin"
          @term-click="handleTermClick"
        />
      </div>

      <div class="reader-footer">
        <AudioPlayer
          :text="currentSutra?.chapters[0]?.content"
        />
      </div>

      <DictionaryPopup
        v-if="selectedTerm"
        :term="selectedTerm"
        :position="popupPosition"
        @close="handleClosePopup"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sutras } from '@/data/sutras'
import { createDynamicSutra } from '@/utils/sutra-loader'
import ReaderContent from '@/components/ReaderContent.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import DictionaryPopup from '@/components/DictionaryPopup.vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

const currentSutra = ref(null)
const loading = ref(true)
const error = ref(null)

const showPinyin = computed(() => settingsStore.showPinyin)

const selectedTerm = ref(null)
const popupPosition = ref({ x: 0, y: 0 })

// 动态经文配置（可从后端或配置文件加载）
const dynamicSutraConfigs = {
  'xin-jing-dynamic': {
    id: 'xin-jing-dynamic',
    title: '心经 (动态)',
    fullName: '《般若波罗蜜多心经》',
    translator: '唐三藏法师玄奘译',
    cover: '📖',
    description: '般若经类中最短的一部，共260字，是大乘佛教的核心经典之一',
    wordCount: 260,
    chapters: [{ title: '全文', url: '/sutras/xin-jing.txt' }]
  }
}

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

const handleBack = () => {
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
}

.reader-footer {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: var(--space-4);
  position: sticky;
  bottom: 0;
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
