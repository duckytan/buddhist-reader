<template>
  <div class="reader">
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
      </div>
    </main>

    <ReaderTOC v-if="readerStore.showToc" />
    <DictPopup v-if="readerStore.selectedTerm" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReaderStore } from '@/stores/reader'
import ReaderHeader from '@/components/reader/ReaderHeader.vue'
import ReaderContent from '@/components/reader/ReaderContent.vue'
import ReaderTOC from '@/components/reader/ReaderTOC.vue'
import DictPopup from '@/components/dict/DictPopup.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const readerStore = useReaderStore()

onMounted(async () => {
  const sutraId = parseInt(route.params.sutraId)
  if (sutraId) {
    await readerStore.loadSutra(sutraId)
  }
})

onUnmounted(() => {
  readerStore.saveProgress()
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
  justify-content: center;
}

.reader-content {
  width: 100%;
  max-width: var(--max-reading-width);
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
