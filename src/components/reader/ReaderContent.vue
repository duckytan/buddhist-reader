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
      <p class="reader-content__text">
        <template
          v-for="(seg, si) in getSegments(chapter.content)"
          :key="si"
        >
          <span
            v-if="seg.type === 'term'"
            class="dict-highlight"
            data-term="{{ seg.content }}"
            @click.stop="onTermClick(seg.content)"
          >{{ seg.content }}</span>
          <span v-else>{{ seg.content }}</span>
        </template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
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

function scrollTo(position) {
  nextTick(() => { if (contentRef.value) contentRef.value.scrollTop = position })
}

function scrollToChapter(idx) {
  nextTick(() => {
    const el = document.getElementById(`chapter-${idx}`)
    if (el && contentRef.value) contentRef.value.scrollTop = el.offsetTop - contentRef.value.offsetTop
  })
}

onMounted(() => { if (props.initialPosition > 0) scrollTo(props.initialPosition) })
watch(() => props.chapters, () => {
  if (props.initialPosition > 0) scrollTo(props.initialPosition)
})

const refreshKey = ref(0)
watch(() => dictStore.enabledDicts, () => {
  refreshKey.value++
}, { deep: true })

defineExpose({ scrollTo, scrollToChapter })
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