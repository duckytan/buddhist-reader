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
import type { Segment } from '@/types/highlight'
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
}

const props = withDefaults(defineProps<Props>(), {
  terms: () => [],
  initialProgress: null
})

const emit = defineEmits<{
  progress: [update: ProgressUpdate]
  chapterTerms: [terms: string[]]
}>()

/** 活动章节判定阈值（≈ 顶栏高度量级） */
const ACTIVE_CHAPTER_OFFSET = 96

const scrollEl = ref<HTMLElement | null>(null)
const chapterEls = ref<HTMLElement[]>([])
const activeChapter = ref(0)

/** 词表（响应式）；Trie 由 useHighlighter 按词表引用 memo 构建 */
const termsRef = computed<string[]>(() => props.terms)
const { highlight } = useHighlighter(termsRef)

/** 全部段落 → 高亮分段（无命中为 null） */
const segmentMap = computed<Map<string, Segment[] | null>>(() => {
  const map = new Map<string, Segment[] | null>()
  for (const chapter of props.sutra.chapters) {
    for (const paragraph of chapter.paragraphs) {
      map.set(paragraph.globalId, highlight(paragraph.text))
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
  padding: var(--spacing-lg) var(--reading-padding) var(--spacing-section);
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
