<template>
  <div
    ref="pageRef"
    class="reader-page"
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
      <ReaderHeader
        :title="sutraStore.currentSutra.title"
        @toggle-settings="readerStore.showSettings = true"
        @toggle-search="showSearch = true"
        @toggle-t-o-c="readerStore.showTOC = true"
        @add-bookmark="addBookmark"
        @add-note="startNote"
      />
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
      <ReaderSettings
        :visible="readerStore.showSettings"
        @close="readerStore.showSettings = false"
      />
      <ReaderSearch
        :visible="showSearch"
        :content="fullContent"
        @close="showSearch = false"
        @jump="onSearchJump"
      />
      <ReaderNotes
        ref="notesRef"
        :visible="showNotes"
        :sutra-id="filename"
        @close="showNotes = false"
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
        class="reader-page__selection-btns"
      >
        <button
          class="reader-page__action-btn"
          @click="lookupSelection"
        >
          查释义
        </button>
        <button
          class="reader-page__action-btn"
          @click="noteSelection"
        >
          笔记
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useSutraStore } from '../stores/sutra'
import { useReaderStore } from '../stores/reader'
import { useDictStore } from '../stores/dict'
import { useSutraLoader } from '../composables/useSutraLoader'
import { useReadingProgress } from '../composables/useReadingProgress'
import { useDictLoader } from '../composables/useDictLoader'
import { storage } from '../utils/storage'
import ReaderHeader from '../components/reader/ReaderHeader.vue'
import ReaderContent from '../components/reader/ReaderContent.vue'
import ReaderProgress from '../components/reader/ReaderProgress.vue'
import ReaderTOC from '../components/reader/ReaderTOC.vue'
import ReaderSettings from '../components/reader/ReaderSettings.vue'
import ReaderSearch from '../components/reader/ReaderSearch.vue'
import ReaderNotes from '../components/reader/ReaderNotes.vue'
import DictPopup from '../components/dict/DictPopup.vue'

const route = useRoute()
const sutraStore = useSutraStore()
const readerStore = useReaderStore()
const dictStore = useDictStore()
const loader = useSutraLoader()
const dictLoader = useDictLoader()
const contentRef = ref(null)
const notesRef = ref(null)
const pageRef = ref(null)
const progressPercent = ref(0)
const showSearch = ref(false)
const showNotes = ref(false)

const filename = computed(() => decodeURIComponent(route.params.id))
const progress = useReadingProgress(filename.value)

const fullContent = computed(() => {
  if (!sutraStore.currentSutra) return ''
  return sutraStore.currentSutra.chapters.map(c => c.content).join('\n')
})

const showDictPopup = ref(false)
const lookupTerm = ref('')
const lookupResults = ref([])
const lookupLoading = ref(false)
const showSelectionBtn = ref(false)
let touchTimer = null
let readingTimer = null

async function onTermClick(term) {
  lookupTerm.value = term
  lookupLoading.value = true
  showDictPopup.value = true
  const dictIds = dictStore.getDictIdsForTerm(term)
  try {
    lookupResults.value = dictLoader.lookupTerm(term, dictIds)
  } catch {
    lookupResults.value = []
  } finally {
    lookupLoading.value = false
  }
}

function onTouchStart() {
  touchTimer = setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) showSelectionBtn.value = true
  }, 500)
}

function onTouchEnd() {
  clearTimeout(touchTimer)
  setTimeout(() => {
    const selection = window.getSelection()
    showSelectionBtn.value = selection && selection.toString().trim().length > 0
  }, 300)
}

function lookupSelection() {
  const text = window.getSelection().toString().trim()
  if (text) onTermClick(text)
  showSelectionBtn.value = false
  window.getSelection().removeAllRanges()
}

function noteSelection() {
  const text = window.getSelection().toString().trim()
  if (text && notesRef.value) {
    showNotes.value = true
    notesRef.value.startAddNote(text)
  }
  showSelectionBtn.value = false
  window.getSelection().removeAllRanges()
}

function startNote() {
  const selection = window.getSelection()
  const text = selection ? selection.toString().trim() : ''
  if (text && notesRef.value) {
    showNotes.value = true
    notesRef.value.startAddNote(text)
  } else {
    showNotes.value = true
  }
}

function onProgress(percent) {
  progressPercent.value = percent
  progress.save(readerStore.scrollPosition, percent)
}

function onJumpChapter(idx) { if (contentRef.value) contentRef.value.scrollToChapter(idx) }
function onSearchJump(position) { if (contentRef.value) contentRef.value.scrollTo(position) }

function addBookmark() {
  const ch = readerStore.currentChapter
  const pos = readerStore.scrollPosition
  const label = `${ch > 0 ? `第${ch + 1}章` : '开头'} - ${progressPercent.value}%`
  readerStore.addBookmark(ch, pos, label)
}

function startReadingTimer() {
  readingTimer = setInterval(() => {
    readerStore.readingTime += 1
  }, 1000)
}

function saveReadingTime() {
  clearInterval(readingTimer)
  const total = storage.getNumber(`reading-time-${filename.value}`, 0) + readerStore.readingTime
  storage.setNumber(`reading-time-${filename.value}`, total)
}

onMounted(() => {
  readerStore.reset()
  progress.restore()
  loader.load(filename.value)
  startReadingTimer()
  nextTick(() => {
    if (pageRef.value) {
      pageRef.value.addEventListener('touchstart', onTouchStart, { passive: true })
      pageRef.value.addEventListener('touchend', onTouchEnd, { passive: true })
    }
  })
})

onUnmounted(() => {
  saveReadingTime()
  progress.save(readerStore.scrollPosition, progressPercent.value)
  dictStore.clearCache()
  dictLoader.clearCache()
  if (pageRef.value) {
    pageRef.value.removeEventListener('touchstart', onTouchStart)
    pageRef.value.removeEventListener('touchend', onTouchEnd)
  }
})
</script>

<style scoped>
.reader-page {
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh;
  background: var(--color-canvas);
}
.reader-page__loading, .reader-page__error {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  flex: 1; color: var(--color-ink-muted);
}
.reader-page__error { color: var(--color-error); }
.reader-page__retry {
  margin-top: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-canvas); border-radius: var(--radius-pill);
}
.reader-page__selection-btns {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  display: flex; gap: var(--spacing-sm); z-index: 25;
}
.reader-page__action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-accent);
  color: var(--color-canvas); border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
}
</style>