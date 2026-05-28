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
            v-for="(seg, si) in getSegments(para.text, props.searchKeyword)"
            :key="si"
          >
            <span
              v-if="seg.type === 'term'"
              class="dict-highlight"
              :data-term="seg.content"
              @click.stop="onTermClick(seg.content)"
            >{{ seg.content }}</span>
            <span
              v-else-if="seg.type === 'search'"
              class="search-highlight"
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
  initialPosition: { type: Number, default: 0 },
  searchKeyword: { type: String, default: '' }
})

const emit = defineEmits(['scroll', 'progress', 'termClick'])
const contentRef = ref(null)
const readerStore = useReaderStore()
const dictStore = useDictStore()
const { highlight } = useHighlighter(dictStore.enabledTerms)

let throttleTimer = null

function getSegments(content, kw) {
  if (!content) return []
  let result = highlight(content) || [{ type: 'text', content }]
  
  console.log('[ReaderContent] getSegments - kw param:', kw, 'type:', typeof kw, 'length:', kw?.length, 'content preview:', content?.slice(0, 50))
  
  if (kw && kw.length >= 2) {
    console.log('[ReaderContent] calling insertSearchHighlights with kw:', kw)
    result = insertSearchHighlights(result, kw)
    const searchCount = result.filter(s => s.type === 'search').length
    console.log('[ReaderContent] insertSearchHighlights done - result segments:', result.length, 'search highlights:', searchCount)
    if (searchCount > 0) {
      console.log('[ReaderContent] search segments:', result.filter(s => s.type === 'search'))
    }
  }
  
  return result
}

function insertSearchHighlights(segments, keyword) {
  if (!keyword || keyword.length < 2) return segments
  
  const out = []
  const kwLower = keyword.toLowerCase()
  
  for (const seg of segments) {
    if (seg.type === 'term') {
      const text = seg.content
      const lower = text.toLowerCase()
      if (lower.includes(kwLower)) {
        let lastIdx = 0
        let pos = lower.indexOf(kwLower, lastIdx)
        while (pos !== -1) {
          if (pos > lastIdx) {
            out.push({ type: 'term', content: text.slice(lastIdx, pos) })
          }
          out.push({ type: 'search', content: text.slice(pos, pos + keyword.length) })
          lastIdx = pos + keyword.length
          pos = lower.indexOf(kwLower, lastIdx)
        }
        if (lastIdx < text.length) {
          out.push({ type: 'term', content: text.slice(lastIdx) })
        }
      } else {
        out.push(seg)
      }
      continue
    }
    
    const text = seg.content
    const lower = text.toLowerCase()
    let lastIdx = 0
    let pos = lower.indexOf(kwLower, lastIdx)
    
    if (pos === -1) {
      out.push(seg)
      continue
    }
    
    while (pos !== -1) {
      if (pos > lastIdx) {
        out.push({ type: 'text', content: text.slice(lastIdx, pos) })
      }
      out.push({ type: 'search', content: text.slice(pos, pos + keyword.length) })
      lastIdx = pos + keyword.length
      pos = lower.indexOf(kwLower, lastIdx)
    }
    
    if (lastIdx < text.length) {
      out.push({ type: 'text', content: text.slice(lastIdx) })
    }
  }
  
  return out
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
    if (!el) {
      console.log('[ReaderContent] scrollToChapter - element not found for idx:', idx)
      return
    }
    if (!contentRef.value) return
    const scrollTop = getScrollTop(el) - 20
    console.log('[ReaderContent] scrollToChapter - idx:', idx, 'element top:', el.getBoundingClientRect().top, 'container top:', contentRef.value.getBoundingClientRect().top, 'target scrollTop:', scrollTop)
    contentRef.value.scrollTop = scrollTop
    console.log('[ReaderContent] scrollToChapter - actual scrollTop after:', contentRef.value.scrollTop)
  })
}

function scrollToPara(chapterIdx, paraId) {
  nextTick(() => {
    const paraEl = document.getElementById(`para-${paraId}`)
    console.log('[ReaderContent] scrollToPara - chapterIdx:', chapterIdx, 'paraId:', paraId, 'element found:', !!paraEl)
    if (!paraEl) {
      console.log('[ReaderContent] scrollToPara - element not found for paraId:', paraId)
      return
    }
    if (!contentRef.value) return
    
    let targetEl = paraEl
    const searchHighlight = paraEl.querySelector('.search-highlight')
    if (searchHighlight) {
      console.log('[ReaderContent] scrollToPara - found search-highlight in paragraph, using it as target')
      targetEl = searchHighlight
    }
    
    console.log('[ReaderContent] scrollToPara - target element:', targetEl.tagName, targetEl.className, targetEl.textContent?.slice(0, 30))
    console.log('[ReaderContent] scrollToPara - element rect:', targetEl.getBoundingClientRect())
    console.log('[ReaderContent] scrollToPara - container rect:', contentRef.value.getBoundingClientRect())
    const scrollTop = getScrollTop(targetEl) - 40
    console.log('[ReaderContent] scrollToPara - computed scrollTop:', scrollTop)
    contentRef.value.scrollTop = scrollTop
    console.log('[ReaderContent] scrollToPara - actual scrollTop after:', contentRef.value.scrollTop)
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
.search-highlight {
  background: #fbbf24;
  color: var(--color-ink);
  border-radius: 2px;
  padding: 0 1px;
}
.dict-highlight:hover {
  background: var(--color-surface);
}
@media (max-width: 480px) {
  .reader-content { padding: var(--spacing-md); }
}
</style>