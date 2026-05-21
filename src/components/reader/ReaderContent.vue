<template>
  <div
    ref="contentRef"
    class="reader-content"
    @scroll="onScroll"
  >
    <div
      v-for="(chapter, idx) in chapters"
      :id="`chapter-${idx}`"
      :key="idx"
      class="reader-content__chapter"
    >
      <h3
        v-if="chapters.length > 1"
        class="reader-content__chapter-title"
      >
        {{ chapter.title }}
      </h3>
      <div
        v-for="para in chapter.paragraphs"
        :id="`para-${para.id}`"
        :key="para.id"
        class="reader-content__paragraph"
      >
        <p class="reader-content__text">
          <template
            v-for="(seg, si) in getSegments(para.text)"
            :key="si"
          >
            <span
              v-if="seg.type === 'term'"
              class="dict-highlight"
              :data-term="seg.content"
              @click.stop="onTermClick(seg.content)"
            >{{ seg.content }}</span>
            <span v-else>{{ seg.content }}</span>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted, onMounted, watch } from 'vue'
import { useReaderStore } from '../../stores/reader'
import { useHighlighter } from '../../composables/useHighlighter'
import { useDictStore } from '../../stores/dict'

const props = defineProps({
  chapters: { type: Array, default: () => [] },
  initialPosition: { type: Number, default: 0 }
})

const emit = defineEmits(['scroll', 'progress', 'termClick'])
const contentRef = ref(null)
const readerStore = useReaderStore()
const dictStore = useDictStore()
const { highlight } = useHighlighter(dictStore.enabledTerms)

let throttleTimer = null

function getSegments(content) {
  if (!content) return []
  const result = highlight(content) || [{ type: 'text', content }]
  return result
}

function onTermClick(term) {
  emit('termClick', term)
}

function onScroll() {
  if (throttleTimer) return
  throttleTimer = setTimeout(() => {
    throttleTimer = null
    const el = contentRef.value
    if (!el) return
    const position = el.scrollTop
    const maxScroll = el.scrollHeight - el.clientHeight
    const percent = maxScroll > 0 ? Math.round((position / maxScroll) * 100) : 0
    readerStore.setScrollPosition(position)
    emit('scroll', { position, percent })
    emit('progress', percent)
  }, 100)
}

function getScrollTop(el) {
  if (!el || !contentRef.value) return 0
  const elRect = el.getBoundingClientRect()
  const containerRect = contentRef.value.getBoundingClientRect()
  return contentRef.value.scrollTop + (elRect.top - containerRect.top)
}

function scrollTo(position) {
  nextTick(() => { if (contentRef.value) contentRef.value.scrollTop = position })
}

function scrollToChapter(idx) {
  nextTick(() => {
    const el = document.getElementById(`chapter-${idx}`)
    if (el && contentRef.value) contentRef.value.scrollTop = getScrollTop(el) - 20
  })
}

function scrollToPara(chapterIdx, paraId, matchOffset) {
  requestAnimationFrame(() => {
    const el = document.getElementById(`para-${paraId}`)
    if (!el || !contentRef.value) {
      console.log('[ReaderContent] scrollToPara FAILED: el=', !!el, 'content=', !!contentRef.value)
      return
    }

    // Step 1: Native scrollIntoView for paragraph — most reliable
    el.scrollIntoView({ block: 'start' })

    if (matchOffset == null) {
      console.log('[ReaderContent] scrollToPara to para:', paraId, 'scrollTop:', contentRef.value.scrollTop)
      return
    }

    // Step 2: Fine-tune to exact keyword position
    requestAnimationFrame(() => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node
      let charCount = 0
      let found = false

      while ((node = walker.nextNode())) {
        const nodeLen = node.textContent.length
        if (charCount + nodeLen > matchOffset) {
          const offsetInNode = matchOffset - charCount
          const range = document.createRange()
          range.setStart(node, offsetInNode)
          range.setEnd(node, offsetInNode)
          range.collapse(true)

          const rangeRect = range.getBoundingClientRect()
          const containerRect = contentRef.value.getBoundingClientRect()
          const adjustment = rangeRect.top - containerRect.top - 100

          contentRef.value.scrollTop = contentRef.value.scrollTop + adjustment
          found = true
          console.log('[ReaderContent] scrollToPara fine-tuned: matchOffset=', matchOffset, 'adjustment=', adjustment.toFixed(0), 'scrollTop:', contentRef.value.scrollTop.toFixed(0))
          break
        }
        charCount += nodeLen
      }

      if (!found) {
        console.log('[ReaderContent] scrollToPara matchOffset NOT FOUND: matchOffset=', matchOffset, 'totalChars=', charCount)
      }
    })
  })
}

defineExpose({ scrollTo, scrollToChapter, scrollToPara })

onMounted(() => {
  console.log('[ReaderContent] mounted, initialPosition:', props.initialPosition, 'chapters:', props.chapters.length)
})

watch(() => props.chapters.length, () => {
  if (props.initialPosition > 0 && contentRef.value) {
    nextTick(() => {
      console.log('[ReaderContent] chapters loaded, restoring scroll to', props.initialPosition)
      if (contentRef.value) contentRef.value.scrollTop = props.initialPosition
    })
  }
})

watch(() => props.initialPosition, (newPos) => {
  if (newPos > 0 && contentRef.value) {
    console.log('[ReaderContent] initialPosition changed to', newPos)
    contentRef.value.scrollTop = newPos
  }
})

onUnmounted(() => { if (throttleTimer) { clearTimeout(throttleTimer); throttleTimer = null } })
</script>

<style scoped>
.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--reading-padding);
  max-width: var(--max-reading-width);
  margin: 0 auto;
  -webkit-overflow-scrolling: touch;
}
.reader-content__chapter { margin-bottom: var(--spacing-xxl); }
.reader-content__chapter-title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-hairline);
}
.reader-content__paragraph {
  margin-bottom: var(--spacing-md);
  text-indent: 2em;
}
.reader-content__text {
  font-family: var(--font-serif);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  color: var(--color-ink);
  white-space: pre-wrap;
  word-break: break-all;
}
.dict-highlight {
  color: var(--color-accent);
  cursor: pointer;
  border-bottom: 1px solid var(--color-accent-light);
  transition: background 0.2s;
}
.dict-highlight:hover {
  background: var(--color-surface);
}
@media (max-width: 480px) {
  .reader-content { padding: var(--spacing-md); }
}
</style>