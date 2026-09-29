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
      @bookmarks="openPanel('bookmarks')"
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
        ref="contentRef"
        :sutra="sutra"
        :terms="terms"
        :initial-progress="restored"
        :search-hits="searchHits"
        :search-keyword="searchKeyword"
        @progress="onProgress"
        @chapter-terms="onChapterTerms"
        @term-click="onTermClick"
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
      :paragraph-labels="paragraphLabels"
      @close="closePanel"
      @jump="onJumpChapter"
      @jump-paragraph="onJumpParagraph"
    />
    <ReaderSearch
      :open="panel === 'search'"
      :hits="searchHits"
      @close="closePanel"
      @search="onSearch"
      @jump="onJumpHit"
    />
    <ReaderBookmarks
      :open="panel === 'bookmarks'"
      :bookmarks="currentBookmarks"
      :can-add="Boolean(sutra)"
      @close="closePanel"
      @add="onAddBookmark"
      @jump="onJumpBookmark"
      @remove="onRemoveBookmark"
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

    <DictPopup
      :open="popupOpen"
      :term="popupTerm"
      @close="closePopup"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 阅读器视图（方案 §8.1 打开加载 + §8.3 经内搜索定位 + §6.5 书签闭环 + §6.7 主题）。
 *
 * 编排（views 只编排；业务逻辑在 composables/services）：
 * 1. `loadSutra`（8s 超时+1 重试）→ 三态；
 * 2. `restore(sutraId)` → `ReaderContent` 于 `nextTick` 后**语义锚点**定位；
 * 3. 词典索引懒加载 → 术语词表 → Trie；**监听 dict store 启用列表变化即时重建**
 *    （§5 M8：关闭词典即时生效）；
 * 4. 章节变化 → `prefetchForChapter`（§4.4，静默）；
 * 5. 面板（目录/搜索/书签/笔记/设置/词典）为 `position: fixed` 覆盖层——**不引起重排**，
 *    故「关闭面板 → nextTick → 定位」精确且稳定（§8.3 / 隐性知识 §1.2）。
 *
 * **书签闭环（§6.5）**：添加（记当前 `chapterIdx` + 像素 `position`）→ 列表 →
 * 回看（走 `ReaderContent.scrollToProgress` **像素路径**，与搜索/笔记的段内偏移路径
 * **不混用**）。持久化经 `reader` store → `bookmarkService`（D-1 归位）。
 *
 * **跳转单一入口**：`applyJump(target)` 统一派发——`anchor` 走语义锚点路径、`chapterIdx`
 * +`position` 走像素路径。跨视图跳转（笔记页）经路由 query 送达，`open()` 解码后应用。
 *
 * 主题与字号/行距经 `useReaderSettings` 以 `data-theme` + CSS 变量**声明式**绑定到
 * 根元素——store 不产生 DOM 副作用（§6.8），本文件亦不直接访问 `document`（§11）。
 */

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import DictPopup from '@/components/dict/DictPopup.vue'
import ReaderBookmarks from '@/components/reader/ReaderBookmarks.vue'
import ReaderContent from '@/components/reader/ReaderContent.vue'
import ReaderDictSelector from '@/components/reader/ReaderDictSelector.vue'
import ReaderHeader from '@/components/reader/ReaderHeader.vue'
import ReaderNotes from '@/components/reader/ReaderNotes.vue'
import ReaderProgress from '@/components/reader/ReaderProgress.vue'
import ReaderSearch from '@/components/reader/ReaderSearch.vue'
import ReaderSettings from '@/components/reader/ReaderSettings.vue'
import ReaderToc from '@/components/reader/ReaderToc.vue'
import { useDictLookup } from '@/composables/useDictLookup'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { useReadingProgress } from '@/composables/useReadingProgress'
import type { ProgressUpdate } from '@/composables/useReadingProgress'
import { useSearch } from '@/composables/useSearch'
import type { SearchHit } from '@/composables/useSearch'
import { useSelection } from '@/composables/useSelection'
import { useSutraLoader } from '@/composables/useSutraLoader'
import { useDictStore } from '@/stores/dict'
import { useNotesStore } from '@/stores/notes'
import { useReaderStore } from '@/stores/reader'
import type { Note, NoteAnchor } from '@/types/note'
import type { Bookmark, ReadingProgress } from '@/types/reader'
import { makeGlobalId, parseGlobalId, scrollToAnchor } from '@/utils/anchor'
import type { ScrollAnchor } from '@/utils/anchor'
import { decodeJumpQuery, JUMP_QUERY_KEYS } from '@/utils/readerJump'
import type { ReaderJumpTarget } from '@/utils/readerJump'
import { excerpt } from '@/utils/text'

/** 面板名（UI 状态；§6.8 禁止放入 store） */
type PanelName = 'toc' | 'search' | 'bookmarks' | 'notes' | 'settings' | 'dicts'

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
const readerStore = useReaderStore()
// N-1：词典领域调用（loadIndex/getEnabledTerms/prefetchForChapter）归位于 composable，
// 视图不再直连词典服务层（services），由 useDictLookup 承担。
const { terms, loadDictionary, refreshTerms, prefetchForChapter } = useDictLookup()

/** 正文滚动容器引用（书签回看走其 `scrollToProgress` 像素路径） */
const contentRef = ref<InstanceType<typeof ReaderContent> | null>(null)

/** 待恢复进度 */
const restored = ref<ReadingProgress | null>(null)
const percent = ref(0)
const chapterIdx = ref(0)
/** 当前章节内像素位置（书签记录用） */
const position = ref(0)
const panel = ref<PanelName | null>(null)
/** 查词弹窗开关（与面板互不干扰） */
const popupOpen = ref(false)
/** 待查词头 */
const popupTerm = ref('')

const chapterTitles = computed<string[]>(() => sutra.value?.chapters.map((chapter) => chapter.title) ?? [])
/** 单章节经的段落摘录标签（§5 M9：段落无标题，用开头摘录） */
const paragraphLabels = computed<string[]>(() => {
  const chapter = sutra.value?.chapters[0]
  if (!chapter) return []
  return chapter.paragraphs.map((paragraph) => excerpt(paragraph.text))
})
const sutraNotes = computed<Note[]>(() => (sutraId.value ? notesStore.bySutra(sutraId.value) : []))
const currentBookmarks = computed<Bookmark[]>(() => readerStore.currentBookmarks)

async function open(): Promise<void> {
  const id = sutraId.value
  terms.value = []
  restored.value = null
  percent.value = 0
  chapterIdx.value = 0
  position.value = 0
  closePanel()
  clearSearch()
  clearSelection()

  await load(id)
  if (status.value !== 'ready' || !sutra.value) return

  notesStore.load()
  readerStore.setCurrent(id)
  readerStore.loadBookmarks()

  // 跨视图跳转（笔记页经路由 query 送达）：有目标则不恢复进度，改由 applyJump 定位
  const jump = decodeJumpQuery((route.query ?? {}) as Record<string, unknown>, id)

  const saved = restore(id)
  percent.value = saved?.percent ?? 0
  if (jump) {
    restored.value = null
  } else {
    restored.value = saved
    chapterIdx.value = saved?.chapterIdx ?? 0
    position.value = saved?.position ?? 0
  }

  await loadDictionary()

  if (jump) {
    await applyJump(jump)
    clearJumpQuery()
  }
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

/**
 * 跳转单一入口（§6.5 / §8.3）——笔记与书签共用，按定位路径分派：
 * - `anchor`（笔记）：语义锚点路径 `scrollToAnchor`（`paraId` 经经书模型换算 `globalId`）；
 * - `chapterIdx`+`position`（书签）：像素路径 `ReaderContent.scrollToProgress`。
 */
async function applyJump(target: ReaderJumpTarget): Promise<void> {
  await nextTick()
  if (target.anchor) {
    const paraIdx = paraIdxOf(target.anchor.chapterIdx, target.anchor.paraId)
    scrollToAnchor({
      globalId: makeGlobalId(target.sutraId, target.anchor.chapterIdx, paraIdx),
      offset: target.anchor.offset
    })
    return
  }
  if (typeof target.chapterIdx === 'number' && typeof target.position === 'number') {
    contentRef.value?.scrollToProgress(target.chapterIdx, target.position)
  }
}

/** 消费跳转 query 后从地址栏移除，避免返回/刷新时重复跳转 */
function clearJumpQuery(): void {
  if (typeof router.replace !== 'function') return
  if (!route.query[JUMP_QUERY_KEYS.kind]) return
  void router.replace({ name: 'reader', params: { id: sutraId.value }, query: {} })
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
  position.value = update.position
  record(sutraId.value, update)
}

/** §4.4 章节级预取（静默；prefetchForChapter 内部 allSettled 不抛） */
function onChapterTerms(chapterTerms: string[]): void {
  if (chapterTerms.length === 0) return
  void prefetchForChapter(chapterTerms)
}

/** 点词查义：打开弹窗（DictPopup 自持 useDictLookup，随 term 变化查词） */
function onTermClick(term: string): void {
  popupTerm.value = term
  popupOpen.value = true
}

function closePopup(): void {
  popupOpen.value = false
}

/** 目录跳转：关面板（fixed 不重排）→ nextTick → 语义锚点定位章节起始 */
function onJumpChapter(index: number): void {
  closePanel()
  void scrollToTarget({ globalId: makeGlobalId(sutraId.value, index, 0), offset: null })
}

/**
 * 单章节经：目录段落跳转（§5 M9）。
 *
 * **复用既有语义锚点路径**——产出 `ReaderJumpTarget.anchor`，交由 `applyJump`
 * 的 `anchor` 分支统一换算 `globalId` 并 `scrollToAnchor`；**不新造滚动逻辑**
 * （与笔记跳转同一条路径，避免「每个入口各写一套定位」的旧版病灶）。
 */
function onJumpParagraph(paraIdx: number): void {
  closePanel()
  const paraId = sutra.value?.chapters[0]?.paragraphs[paraIdx]?.id ?? ''
  if (!paraId) return
  void applyJump({
    sutraId: sutraId.value,
    anchor: { chapterIdx: 0, paraId, offset: 0 }
  })
}

/** 搜索结果跳转：定位到命中段内 `[data-off][data-search]`（§8.3 精确跳转） */
function onJumpHit(hit: SearchHit): void {
  closePanel()
  void scrollToTarget({ globalId: hit.globalId, offset: hit.paraOffset })
}

/** 添加书签：记录当前章节 + 像素位置（§6.5） */
function onAddBookmark(): void {
  if (!sutra.value) return
  readerStore.addBookmark({
    sutraId: sutraId.value,
    chapterIdx: chapterIdx.value,
    position: position.value,
    label: chapterTitles.value[chapterIdx.value] ?? ''
  })
}

/** 书签回看：像素路径（§6.5，与笔记的段内锚点路径不混用） */
function onJumpBookmark(bookmark: Bookmark): void {
  closePanel()
  void applyJump({ sutraId: bookmark.sutraId, chapterIdx: bookmark.chapterIdx, position: bookmark.position })
}

/** 删除书签 */
function onRemoveBookmark(id: string): void {
  readerStore.removeBookmark(id)
}

/** 笔记跳转：由 `NoteAnchor` 还原 globalId 后精确定位（语义锚点路径） */
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
