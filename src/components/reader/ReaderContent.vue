<template>
  <div class="reader-content" ref="contentRef">
    <div
      class="sutra-text"
      v-html="highlightedHtml"
      @click="handleClick"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useDictStore } from '@/stores/dict'
import { Highlighter } from '@/engine/highlighter.js'
import { TrieBuilder } from '@/engine/trie/TrieBuilder.js'
import { TrieMatcher } from '@/engine/trie/TrieMatcher.js'
import { builtinDictionary } from '@/data/builtinDictionary.js'

const readerStore = useReaderStore()
const dictStore = useDictStore()
const contentRef = ref(null)
const highlighter = ref(null)

const highlightedHtml = computed(() => readerStore.highlightedHtml)

watch(() => dictStore.activeDictIds, () => {
  rebuildHighlighter()
  applyHighlight()
}, { deep: true })

watch(() => readerStore.content, () => {
  applyHighlight()
})

watch(() => readerStore.currentPage, () => {
  applyHighlight()
})

onMounted(async () => {
  await rebuildHighlighter()
  applyHighlight()
})

async function rebuildHighlighter() {
  const builder = new TrieBuilder()
  const terms = builtinDictionary.map(d => ({
    term: d.term,
    dictId: 0
  }))
  builder.insertBatch(terms)

  const externalDicts = dictStore.externalDictionaries
  for (const dict of externalDicts) {
    if (dict.entries) {
      for (const entry of dict.entries) {
        builder.insertBatch([{
          term: entry.term,
          dictId: dict.id
        }])
      }
    }
  }

  const serialized = builder.serialize()
  const matcher = new TrieMatcher(serialized)
  highlighter.value = new Highlighter(matcher)
}

function applyHighlight() {
  if (!highlighter.value || !readerStore.paginatedContent) return
  readerStore.highlightedHtml = highlighter.value.highlight(
    readerStore.paginatedContent,
    dictStore.activeDictIds
  )

  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = readerStore.scrollPosition
    }
  })
}

function handleClick(event) {
  const target = event.target.closest('.dict-highlight')
  if (target) {
    const term = target.dataset.term
    readerStore.lookupTerm(term)
  }
}
</script>

<style scoped>
.reader-content {
  padding: var(--reading-padding) 0;
  min-height: 50vh;
}

.sutra-text {
  font-family: var(--font-serif);
  font-size: var(--text-body-lg);
  line-height: var(--leading-body);
  color: var(--color-ink);
  text-align: justify;
}

.sutra-text :deep(.dict-highlight) {
  cursor: pointer;
  border-radius: 2px;
  padding: 0 2px;
  transition: background-color 0.2s ease;
}

.sutra-text :deep(.dict-highlight:hover) {
  filter: brightness(0.95);
}
</style>
