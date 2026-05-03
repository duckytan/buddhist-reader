<template>
  <div class="reader" @scroll="handleScroll">
    <ReaderHeader />

    <main class="reader-main">
      <div v-if="readerStore.loading" class="reader-loading">
        <LoadingSpinner />
      </div>

      <div v-else-if="readerStore.error" class="reader-error">
        <p>{{ readerStore.error }}</p>
        <button @click="router.push('/')" class="back-btn">返回书架</button>
      </div>

      <div v-else class="reader-content">
        <ReaderContent />
        <ReaderProgress />
      </div>
    </main>

    <ReaderTOC v-if="readerStore.showToc" />
    <ReaderPagination />
    <DictPopup v-if="readerStore.selectedTerm" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReaderStore } from '@/stores/reader'
import { useStatsStore } from '@/stores/stats'
import ReaderHeader from '@/components/reader/ReaderHeader.vue'
import ReaderContent from '@/components/reader/ReaderContent.vue'
import ReaderProgress from '@/components/reader/ReaderProgress.vue'
import ReaderPagination from '@/components/reader/ReaderPagination.vue'
import ReaderTOC from '@/components/reader/ReaderTOC.vue'
import DictPopup from '@/components/dict/DictPopup.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const readerStore = useReaderStore()
const statsStore = useStatsStore()

let readingStartTime = Date.now()
let saveTimer = null

function handleScroll() {
  readerStore.scrollPosition = document.documentElement.scrollTop
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  if (docHeight > 0) {
    readerStore.readPercentage = Math.min(100, (document.documentElement.scrollTop / docHeight) * 100)
  }

  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    readerStore.saveProgress()
  }, 1000)
}

onMounted(async () => {
  readingStartTime = Date.now()
  const sutraId = parseInt(route.params.sutraId)
  if (sutraId) {
    await readerStore.loadSutra(sutraId)
  }
})

onUnmounted(() => {
  clearTimeout(saveTimer)
  readerStore.saveProgress()

  const readingTime = Math.round((Date.now() - readingStartTime) / 1000)
  if (readingTime > 10 && readerStore.currentSutra) {
    statsStore.recordRead(readerStore.content.length, readingTime)
  }
})
</script>

<style scoped>
.reader {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.reader-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reader-content {
  width: 100%;
  max-width: var(--max-reading-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.reader-loading,
.reader-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: var(--color-ink-muted);
}

.back-btn {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-lg);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-canvas);
  font-size: var(--text-body-sm);
  cursor: pointer;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: var(--color-accent-deep);
}
</style>
