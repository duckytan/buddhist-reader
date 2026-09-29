<template>
  <div
    ref="scrollEl"
    class="reader-content"
    @scroll="onScroll"
  >
    <section
      v-for="(chapter, chapterIndex) in sutra.chapters"
      :key="chapterIndex"
      :ref="(el) => setChapterRef(el, chapterIndex)"
      class="reader-content__chapter"
    >
      <h2
        v-if="chapter.title"
        class="reader-content__chapter-title"
      >
        {{ chapter.title }}
      </h2>
      <ParagraphBlock
        v-for="paragraph in chapter.paragraphs"
        :key="paragraph.globalId"
        :paragraph="paragraph"
        :segments="segmentMap.get(paragraph.globalId) ?? null"
        @term-click="emit('termClick', $event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
/* global HTMLElement, Element */
/**
 * 正文渲染（方案 §6.1 / §8.1）。
 *
 * 职责：
 * - 作为**滚动容器**渲染全部章节/段落（`ParagraphBlock`）；
 * - 用 `useHighlighter` 计算每段高亮分段（`Segment`，携带 `off`）；
 * - 滚动时计算「活动章节 + 像素位置 + 百分比」并 `emit('progress')`；
 * - 活动章节变化时 `emit('chapterTerms')`（供 ReaderView 做 §4.4 章节级预取）；
 * - `scrollToProgress` 用**语义锚点**（`scrollToAnchor`）恢复定位——DOM 访问全部
 *   经 `utils/anchor.ts`（§11 唯一白名单）。
 *
 * 性能：分段为 `computed` 一次性构建（词表/Trie 变化才重建）；「分块惰性构建」按
 * 方案 §6.2 决策延后，当前不做。
 */

import { computed, nextTick, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'

import ParagraphBlock from '@/components/reader/ParagraphBlock.vue'
import { useHighlighter } from '@/composables/useHighlighter'
import type { ProgressUpdate } from '@/composables/useReadingProgress'
import type { SearchHit } from '@/composables/useSearch'
import type { Segment, SegmentType } from '@/types/highlight'
import type { ReadingProgress } from '@/types/reader'
import type { Sutra } from '@/types/sutra'
import { makeGlobalId, scrollToAnchor, setScrollTop } from '@/utils/anchor'

interface Props {
  /** 当前经书（含派生 globalId 的章节） */
  sutra: Sutra
  /** 启用术语词表（用于高亮；空则无高亮） */
  terms?: string[]
  /** 待恢复的进度（就绪后按语义锚点定位） */
  initialProgress?: ReadingProgress | null
  /** 当前经内搜索命中（叠加为 `search` 分段，供精确定位） */
  searchHits?: SearchHit[]
  /** 当前搜索关键词（用于确定命中长度） */
  searchKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  terms: () => [],
  initialProgress: null,
  searchHits: () => [],
  searchKeyword: ''
})

const emit = defineEmits<{
  progress: [update: ProgressUpdate]
  chapterTerms: [terms: string[]]
  termClick: [term: string]
}>()

/**
 * 活动章节判定阈值（px）：章节顶部进入容器可视区上沿下方 96px 内，即视为当前章节。
 * **与 `--reader-header-height` 无派生关系**——这是独立 UX 阈值，调整顶栏高度不应改此值。
 */
const ACTIVE_CHAPTER_OFFSET = 96

const scrollEl = ref<HTMLElement | null>(null)
const chapterEls = ref<HTMLElement[]>([])
const activeChapter = ref(0)

/** 词表（响应式）；Trie 由 useHighlighter 按词表引用 memo 构建 */
const termsRef = computed<string[]>(() => props.terms)
const { highlight } = useHighlighter(termsRef)

/** 搜索命中：globalId → 命中偏移列表 */
const searchOffsets = computed<Map<string, number[]>>(() => {
  const map = new Map<string, number[]>()
  for (const hit of props.searchHits) {
    const list = map.get(hit.globalId)
    if (list) list.push(hit.paraOffset)
    else map.set(hit.globalId, [hit.paraOffset])
  }
  return map
})

/**
 * 把搜索命中叠加到基础分段：命中范围标为 `search`（携带 `data-off`/`data-search`），
 * 供 §8.3 点击结果后 `scrollToAnchor` 精确命中 `[data-off][data-search]`。
 *
 * - **F-2**：每个命中**各自成段**（命中起/止为强制断点，禁止跨命中合并）——否则
 *   相邻命中（如「般若般若」搜「般若」）会塌成单段、仅首个 `data-off` 存在，其余降级整段。
 * - **N-4**：`keywordLength <= 0`（`searchHits` 非空但 `searchKeyword` 为空）时不产生任何
 *   `search` 段，直接返回 base，杜绝「`[data-off][data-search]` 误匹配同位置 `term` 段」。
 */
function applySearch(
  text: string,
  base: Segment[] | null,
  offsets: number[],
  keywordLength: number
): Segment[] | null {
  if (keywordLength <= 0) return base

  const types: SegmentType[] = new Array<SegmentType>(text.length).fill('text')
  if (base) {
    for (const segment of base) {
      for (let i = segment.off; i < segment.off + segment.content.length; i += 1) {
        types[i] = segment.type
      }
    }
  }
  const boundaries = new Set<number>()
  for (const offset of offsets) {
    const end = Math.min(offset + keywordLength, text.length)
    boundaries.add(offset)
    boundaries.add(end)
    for (let i = offset; i < end; i += 1) types[i] = 'search'
  }
  const merged: Segment[] = []
  let i = 0
  while (i < text.length) {
    const type = types[i] ?? 'text'
    let j = i + 1
    while (j < text.length && types[j] === type && !boundaries.has(j)) j += 1
    merged.push({ type, content: text.slice(i, j), off: i })
    i = j
  }
  return merged
}

/** 全部段落 → 高亮分段（无命中且无搜索命中为 null） */
const segmentMap = computed<Map<string, Segment[] | null>>(() => {
  const map = new Map<string, Segment[] | null>()
  const offsets = searchOffsets.value
  const keywordLength = props.searchKeyword.length
  for (const chapter of props.sutra.chapters) {
    for (const paragraph of chapter.paragraphs) {
      const base = highlight(paragraph.text)
      const hits = offsets.get(paragraph.globalId)
      map.set(
        paragraph.globalId,
        hits && hits.length > 0
          ? applySearch(paragraph.text, base, hits, keywordLength)
          : base
      )
    }
  }
  return map
})

/** 当前章节命中的术语（供 §4.4 章节级预取） */
const matchedTerms = computed<string[]>(() => {
  const chapter = props.sutra.chapters[activeChapter.value]
  if (!chapter) return []
  const found = new Set<string>()
  for (const paragraph of chapter.paragraphs) {
    const segments = segmentMap.value.get(paragraph.globalId)
    if (!segments) continue
    for (const segment of segments) {
      if (segment.type === 'term') found.add(segment.content)
    }
  }
  return [...found]
})

/** 收集章节 DOM 引用（函数 ref，用于计算活动章节；无 document 访问） */
function setChapterRef(el: Element | ComponentPublicInstance | null, index: number): void {
  // 用结构判定（`'offsetTop' in el`）而非 `instanceof HTMLElement`：
  // `.vue` 文件未注入浏览器全局，`instanceof` 会触发 `no-undef`（§11 亦不鼓励直连 DOM 构造器）
  if (el && 'offsetTop' in el) chapterEls.value[index] = el as HTMLElement
}

function onScroll(): void {
  const container = scrollEl.value
  if (!container) return
  const top = container.scrollTop

  let chapterIdx = 0
  for (let i = 0; i < chapterEls.value.length; i += 1) {
    const el = chapterEls.value[i]
    if (el && el.offsetTop <= top + ACTIVE_CHAPTER_OFFSET) chapterIdx = i
  }
  activeChapter.value = chapterIdx

  const maxScroll = container.scrollHeight - container.clientHeight
  const percent = maxScroll > 0 ? Math.round((top / maxScroll) * 100) : 0
  emit('progress', { chapterIdx, position: top, percent })
}

/** 进度恢复：语义锚点定位到章节起始，再按像素位置精确还原 */
function scrollToProgress(chapterIdx: number, position: number): void {
  const globalId = makeGlobalId(props.sutra.filename, chapterIdx, 0)
  scrollToAnchor({ globalId, offset: null })
  const container = scrollEl.value
  if (container && position > 0) setScrollTop(container, position)
  activeChapter.value = chapterIdx
}

// 书签回看（§6.5）：书签是 `{chapterIdx, position}` **像素定位**，须走本函数
// （章节语义锚点 + `setScrollTop` 像素还原）——**不得**与搜索的段内偏移路径
// （`scrollToAnchor({offset})`）混用，否则会系统性偏移。暴露给 ReaderView 调用。
defineExpose({ scrollToProgress })

watch(matchedTerms, (terms) => emit('chapterTerms', terms))

watch(
  () => props.initialProgress,
  async (saved) => {
    if (!saved) return
    await nextTick() // 等段落 DOM 就绪后再定位（§8.1）
    scrollToProgress(saved.chapterIdx, saved.position)
  },
  { immediate: true }
)
</script>

<style scoped>
.reader-content {
  position: relative; /* 使章节 offsetTop 相对本容器，便于活动章节计算 */
  height: 100%;
  overflow-y: auto;
  /* 顶栏为覆盖层：预留其高度 + 呼吸位（与 .para 的 scroll-margin-top 同源） */
  padding: calc(var(--reader-header-height) + var(--spacing-xs)) var(--reading-padding) var(--spacing-section);
  -webkit-overflow-scrolling: touch;
}

.reader-content__chapter {
  max-width: var(--max-reading-width);
  margin: 0 auto;
}

.reader-content__chapter-title {
  margin: var(--spacing-lg) 0 var(--spacing-md);
  color: var(--color-accent-deep);
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  text-align: center;
}
</style>
