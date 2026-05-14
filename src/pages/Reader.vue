<template>
  <div class="reader-page">
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
      />
      <ReaderProgress :percent="progressPercent" />
      <ReaderTOC
        :chapters="sutraStore.currentSutra.chapters"
        @jump="onJumpChapter"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSutraStore } from '../stores/sutra'
import { useReaderStore } from '../stores/reader'
import { useSutraLoader } from '../composables/useSutraLoader'
import { useReadingProgress } from '../composables/useReadingProgress'
import ReaderHeader from '../components/reader/ReaderHeader.vue'
import ReaderContent from '../components/reader/ReaderContent.vue'
import ReaderProgress from '../components/reader/ReaderProgress.vue'
import ReaderTOC from '../components/reader/ReaderTOC.vue'

const route = useRoute()
const sutraStore = useSutraStore()
const readerStore = useReaderStore()
const loader = useSutraLoader()
const contentRef = ref(null)
const progressPercent = ref(0)

const filename = computed(() => decodeURIComponent(route.params.id))

const progress = useReadingProgress(filename.value)

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
})
</script>

<style scoped>
.reader-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--color-canvas);
}
.reader-page__loading,
.reader-page__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-ink-muted);
}
.reader-page__error {
  color: var(--color-error);
}
.reader-page__retry {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-canvas);
  border-radius: var(--radius-pill);
}
</style>