<template>
  <div
    class="reader"
    :data-theme="theme"
    :style="cssVars"
    @mouseup="captureSelection"
    @touchend="captureSelection"
  >
    <ReaderHeader
      :title="sutra?.title ?? '阅读'"
      @back="onBack"
      @toc="openPanel('toc')"
      @search="openPanel('search')"
      @notes="openPanel('notes')"
      @dicts="openPanel('dicts')"
      @settings="openPanel('settings')"
    />

    <LoadingState
      v-if="status === 'loading'"
      text="正在载入经文…"
    />
    <ErrorState
      v-else-if="status === 'error'"
      :message="error ?? '加载失败'"
      @retry="retry"
    />
    <EmptyState
      v-else-if="!sutra"
      text="未找到经文"
    />
    <template v-else>
      <ReaderContent
        :sutra="sutra"
        :terms="terms"
        :initial-progress="restored"
        :search-hits="searchHits"
        :search-keyword="searchKeyword"
        @progress="onProgress"
        @chapter-terms="onChapterTerms"
      />
      <ReaderProgress
        :percent="percent"
        :chapter-idx="chapterIdx"
        :chapter-count="sutra.chapters.length"
      />
    </template>

    <ReaderToc
      :open="panel === 'toc'"
      :chapters="chapterTitles"
      :current-chapter-idx="chapterIdx"
      @close="closePanel"
      @jump="onJumpChapter"
    />
    <ReaderSearch
      :open="panel === 'search'"
      :hits="searchHits"
      @close="closePanel"
      @search="onSearch"
      @jump="onJumpHit"
    />
    <ReaderNotes
      :open="panel === 'notes'"
      :notes="sutraNotes"
      :selection="selected"
      @close="closePanel"
      @jump="onJumpNote"
      @add="onAddNote"
      @clear-selection="clearSelection"
    />
    <ReaderSettings
      :open="panel === 'settings'"
      @close="closePanel"
    />
    <ReaderDictSelector
      :open="panel === 'dicts'"
      @close="closePanel"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 阅读器视图（方案 §8.1 打开加载 + §8.3 经内搜索定位 + §6.7 主题）。
 *
 * 编排（views 只编排；业务逻辑在 composables/services）：
 * 1. `loadSutra`（8s 超时+1 重试）→ 三态；
 * 2. `restore(sutraId)` → `ReaderContent` 于 `nextTick` 后**语义锚点**定位；
 * 3. 词典索引懒加载 → 术语词表 → Trie；**监听 dict store 启用列表变化即时重建**
 *    （§5 M8：关闭词典即时生效）；
 * 4. 章节变化 → `prefetchForChapter`（§4.4，静默）；
 * 5. 面板（目录/搜索/笔记/设置/词典）为 `position: fixed` 覆盖层——**不引起重排**，
 *    故「关闭面板 → nextTick → scrollToAnchor」精确且稳定（§8.3 / 隐性知识 §1.2）。
 *
 * 主题与字号/行距经 `useReaderSettings` 以 `data-theme` + CSS 变量**声明式**绑定到
 * 根元素——store 不产生 DOM 副作用（§6.8），本文件亦不直接访问 `document`（§11）。
 */

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ReaderContent from '@/components/reader/ReaderContent.vue'
import ReaderDictSelector from '@/components/reader/ReaderDictSelector.vue'
import ReaderHeader from '@/components/reader/ReaderHeader.vue'
import ReaderNotes from '@/components/reader/ReaderNotes.vue'
import ReaderProgress from '@/components/reader/ReaderProgress.vue'
import ReaderSearch from '@/components/reader/ReaderSearch.vue'
import ReaderSettings from '@/components/reader/ReaderSettings.vue'
import ReaderToc from '@/components/reader/ReaderToc.vue'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { useReadingProgress } from '@/composables/useReadingProgress'
import type { ProgressUpdate } from '@/composables/useReadingProgress'
import { useSearch } from '@/composables/useSearch'
import type { SearchHit } from '@/composables/useSearch'
import { useSelection } from '@/composables/useSelection'
import { useSutraLoader } from '@/composables/useSutraLoader'
import { dictService } from '@/services/dictService'
import { useDictStore } from '@/stores/dict'
import { useNotesStore } from '@/stores/notes'
import type { Note, NoteAnchor } from '@/types/note'
import type { ReadingProgress } from '@/types/reader'
import { makeGlobalId, parseGlobalId, scrollToAnchor } from '@/utils/anchor'
import type { ScrollAnchor } from '@/utils/anchor'
import { logger } from '@/utils/logger'

/** 面板名（UI 状态；§6.8 禁止放入 store） */
type PanelName = 'toc' | 'search' | 'notes' | 'settings' | 'dicts'

const route = useRoute()
const router = useRouter()

const sutraId = computed<string>(() => String(route.params.id ?? ''))

const { sutra, status, error, load, retry } = useSutraLoader()
const { restore, record } = useReadingProgress()
const { hits: searchHits, keyword: searchKeyword, search: runSearch, clear: clearSearch } = useSearch(sutra)
const { selection: selected, capture: captureSelection, clear: clearSelection } = useSelection()
const { theme, cssVars } = useReaderSettings()
const dictStore = useDictStore()
const notesStore = useNotesStore()

/** 启用术语词表（词典索引就绪后填充；空则不启用高亮） */
const terms = ref<string[]>([])
/** 待恢复进度 */
const restored = ref<ReadingProgress | null>(null)
const percent = ref(0)
const chapterIdx = ref(0)
const panel = ref<PanelName | null>(null)

const chapterTitles = computed<string[]>(() => sutra.value?.chapters.map((chapter) => chapter.title) ?? [])
const sutraNotes = computed<Note[]>(() => (sutraId.value ? notesStore.bySutra(sutraId.value) : []))

async function open(): Promise<void> {
  const id = sutraId.value
  terms.value = []
  restored.value = null
  percent.value = 0
  chapterIdx.value = 0
  closePanel()
  clearSearch()
  clearSelection()

  await load(id)
  if (status.value !== 'ready' || !sutra.value) return

  notesStore.load()

  const saved = restore(id)
  restored.value = saved
  percent.value = saved?.percent ?? 0
  chapterIdx.value = saved?.chapterIdx ?? 0

  await loadDictionary()
}

/** 懒加载词典索引并取启用词表（失败不阻塞阅读，§4.4 弱项降级） */
async function loadDictionary(): Promise<void> {
  try {
    await dictStore.loadIndex()
    refreshTerms()
  } catch (err) {
    logger.warn('词典索引加载失败，术语高亮暂不可用', err)
  }
}

function refreshTerms(): void {
  terms.value = dictService.getEnabledTerms()
}

// §5 M8：词典开关即时生效——启用列表变化即重算词表（Trie 随之重建）
watch(
  () => dictStore.enabledIds,
  () => {
    if (dictStore.indexLoaded) refreshTerms()
  }
)

function openPanel(name: PanelName): void {
  panel.value = name
}

function closePanel(): void {
  panel.value = null
}

async function scrollToTarget(anchor: ScrollAnchor): Promise<void> {
  await nextTick()
  scrollToAnchor(anchor)
}

function onBack(): void {
  void router.push({ name: 'bookshelf' })
}

function onSearch(keyword: string): void {
  runSearch(keyword)
}

function onProgress(update: ProgressUpdate): void {
  percent.value = update.percent
  chapterIdx.value = update.chapterIdx
  record(sutraId.value, update)
}

/** §4.4 章节级预取（静默；prefetchForChapter 内部 allSettled 不抛） */
function onChapterTerms(chapterTerms: string[]): void {
  if (chapterTerms.length === 0) return
  void dictService.prefetchForChapter(chapterTerms)
}

/** 目录跳转：关面板（fixed 不重排）→ nextTick → 语义锚点定位章节起始 */
function onJumpChapter(index: number): void {
  closePanel()
  void scrollToTarget({ globalId: makeGlobalId(sutraId.value, index, 0), offset: null })
}

/** 搜索结果跳转：定位到命中段内 `[data-off][data-hit]`（§8.3 精确跳转） */
function onJumpHit(hit: SearchHit): void {
  closePanel()
  void scrollToTarget({ globalId: hit.globalId, offset: hit.paraOffset })
}

/** 笔记跳转：由 `NoteAnchor` 还原 globalId 后精确定位 */
function onJumpNote(note: Note): void {
  closePanel()
  const anchor = note.anchor
  if (!anchor) {
    void scrollToTarget({ globalId: makeGlobalId(note.sutraId, 0, 0), offset: null })
    return
  }
  const paraIdx = paraIdxOf(anchor.chapterIdx, anchor.paraId)
  void scrollToTarget({ globalId: makeGlobalId(note.sutraId, anchor.chapterIdx, paraIdx), offset: anchor.offset })
}

/** 由选区添加笔记：把 `{ globalId, offset }` 换算为 `NoteAnchor{ chapterIdx, paraId, offset }` */
function onAddNote(payload: { quote: string; text: string; globalId: string; offset: number }): void {
  const anchor = toNoteAnchor(payload.globalId, payload.offset)
  notesStore.add({ sutraId: sutraId.value, quote: payload.quote, text: payload.text, anchor })
  clearSelection()
}

function toNoteAnchor(globalId: string, offset: number): NoteAnchor | null {
  const parsed = parseGlobalId(globalId)
  if (!parsed) return null
  const paragraph = sutra.value?.chapters[parsed.chapterIdx]?.paragraphs[parsed.paraIdx]
  return { chapterIdx: parsed.chapterIdx, paraId: paragraph?.id ?? '', offset }
}

function paraIdxOf(chapterIdxValue: number, paraId: string): number {
  const chapter = sutra.value?.chapters[chapterIdxValue]
  if (!chapter) return 0
  const index = chapter.paragraphs.findIndex((paragraph) => paragraph.id === paraId)
  return index >= 0 ? index : 0
}

onMounted(() => {
  void open()
})

watch(sutraId, () => {
  void open()
})
</script>

<style scoped>
.reader {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--color-canvas);
  color: var(--color-ink);
}
</style>
