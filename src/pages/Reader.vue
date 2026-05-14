<template>
  <div
    class="reader-page"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <div
      v-if="loader.loading.value"
      class="reader-page__loading"
    >
      <p class="reader-page__loading-text">
        加载中...
      </p>
    </div>

    <div
      v-else-if="loader.error.value"
      class="reader-page__error"
    >
      <p>加载失败: {{ loader.error.value }}</p>
      <button
        class="reader-page__retry"
        @click="loader.retry(filename)"
      >
        重试
      </button>
    </div>

    <template v-else-if="sutraStore.currentSutra">
      <ReaderHeader :title="sutraStore.currentSutra.title" />
      <ReaderContent
        ref="contentRef"
        :chapters="sutraStore.currentSutra.chapters"
        :initial-position="progress.savedPosition.value"
        @progress="onProgress"
        @term-click="onTermClick"
      />
      <ReaderProgress :percent="progressPercent" />
      <ReaderTOC
        :chapters="sutraStore.currentSutra.chapters"
        @jump="onJumpChapter"
      />
      <DictPopup
        :visible="showDictPopup"
        :term="lookupTerm"
        :results="lookupResults"
        :loading="lookupLoading"
        @close="showDictPopup = false"
      />
      <div
        v-if="showSelectionBtn"
        class="reader-page__selection-btn"
        @click="lookupSelection"
      >
        查释义
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSutraStore } from '../stores/sutra'
import { useReaderStore } from '../stores/reader'
import { useDictStore } from '../stores/dict'
import { useSutraLoader } from '../composables/useSutraLoader'
import { useReadingProgress } from '../composables/useReadingProgress'
import { useDictLoader } from '../composables/useDictLoader'
import ReaderHeader from '../components/reader/ReaderHeader.vue'
import ReaderContent from '../components/reader/ReaderContent.vue'
import ReaderProgress from '../components/reader/ReaderProgress.vue'
import ReaderTOC from '../components/reader/ReaderTOC.vue'
import DictPopup from '../components/dict/DictPopup.vue'

const route = useRoute()
const sutraStore = useSutraStore()
const readerStore = useReaderStore()
const dictStore = useDictStore()
const loader = useSutraLoader()
const dictLoader = useDictLoader()
const contentRef = ref(null)
const progressPercent = ref(0)

const filename = computed(() => decodeURIComponent(route.params.id))
const progress = useReadingProgress(filename.value)

const showDictPopup = ref(false)
const lookupTerm = ref('')
const lookupResults = ref([])
const lookupLoading = ref(false)

const showSelectionBtn = ref(false)
let touchTimer = null

async function onTermClick(term) {
  lookupTerm.value = term
  lookupLoading.value = true
  showDictPopup.value = true

  const dictIds = dictStore.getDictIdsForTerm(term)
  try {
    const resp = await fetch('/dicts/manifest.json')
    const manifest = await resp.json()
    lookupResults.value = await dictLoader.lookupTerm(term, dictIds, manifest)
  } catch {
    lookupResults.value = []
  } finally {
    lookupLoading.value = false
  }
}

function onTouchStart() {
  touchTimer = setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      showSelectionBtn.value = true
    }
  }, 500)
}

function onTouchEnd() {
  clearTimeout(touchTimer)
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      showSelectionBtn.value = true
    } else {
      showSelectionBtn.value = false
    }
  }, 300)
}

function lookupSelection() {
  const text = window.getSelection().toString().trim()
  if (text) onTermClick(text)
  showSelectionBtn.value = false
  window.getSelection().removeAllRanges()
}

function onProgress(percent) {
  progressPercent.value = percent
  progress.save(readerStore.scrollPosition, percent)
}

function onJumpChapter(idx) {
  if (contentRef.value) contentRef.value.scrollToChapter(idx)
}

onMounted(() => {
  readerStore.reset()
  progress.restore()
  loader.load(filename.value)
})

onUnmounted(() => {
  progress.save(readerStore.scrollPosition, progressPercent.value)
  dictStore.clearCache()
  dictLoader.clearCache()
})
</script>

<style scoped>
.reader-page {
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh;
  background: var(--color-canvas);
}
.reader-page__loading,
.reader-page__error {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  flex: 1; color: var(--color-ink-muted);
}
.reader-page__error { color: var(--color-error); }
.reader-page__retry {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-canvas);
  border-radius: var(--radius-pill);
}
.reader-page__selection-btn {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-canvas);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  z-index: 25;
}
</style>