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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sutras } from '@/data/sutras'
import ReaderContent from '@/components/ReaderContent.vue'
import AudioPlayer from '@/components/AudioPlayer.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import DictionaryPopup from '@/components/DictionaryPopup.vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

const currentSutra = computed(() => {
  return sutras.find(s => s.id === route.params.id)
})

const showPinyin = computed(() => settingsStore.showPinyin)

const selectedTerm = ref(null)
const popupPosition = ref({ x: 0, y: 0 })

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
  if (!currentSutra.value) {
    router.replace('/')
  }
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
</style>
