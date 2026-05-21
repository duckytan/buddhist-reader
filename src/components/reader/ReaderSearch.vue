<template>
  <Transition name="slide-up">
    <div
      v-if="visible"
      class="reader-search"
    >
      <div
        class="reader-search__overlay"
        @click="$emit('close')"
      />
      <div class="reader-search__panel">
        <header class="reader-search__header">
          <input
            v-model="keyword"
            class="reader-search__input"
            type="text"
            placeholder="搜索经文..."
            @input="onSearch"
          >
          <button
            class="reader-search__close"
            @click="$emit('close')"
          >
            &#10005;
          </button>
        </header>
        <ul
          v-if="results.length > 0"
          class="reader-search__results"
        >
          <li
            v-for="(r, i) in results"
            :key="i"
            class="reader-search__result"
            @click="onJump(r)"
          >
            <span
              class="reader-search__context"
              v-html="highlightKeyword(r.context)"
            />
          </li>
        </ul>
        <div
          v-else-if="keyword && searched"
          class="reader-search__empty"
        >
          未找到结果
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  chapters: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'jump', 'keywordChange'])
const keyword = ref('')
const results = ref([])
const searched = ref(false)

function onSearch() {
  if (!keyword.value || keyword.value.length < 2) {
    results.value = []
    searched.value = false
    emit('keywordChange', '')
    return
  }
  emit('keywordChange', keyword.value)
  const kw = keyword.value
  const found = []
  for (let cidx = 0; cidx < props.chapters.length; cidx++) {
    const chapter = props.chapters[cidx]
    const paragraphs = chapter.paragraphs || []
    for (const para of paragraphs) {
      const text = para.text
      if (!text) continue
      let pos = 0
      while (true) {
        const idx = text.indexOf(kw, pos)
        if (idx === -1) break
        const start = Math.max(0, idx - 20)
        const end = Math.min(text.length, idx + kw.length + 20)
        found.push({ chapterIdx: cidx, paraId: para.id, paraOffset: idx, context: text.slice(start, end) })
        pos = idx + 1
        if (found.length >= 50) break
      }
      if (found.length >= 50) break
    }
    if (found.length >= 50) break
  }
  results.value = found
  searched.value = true
}

function onJump(r) {
  emit('jump', r.chapterIdx, r.paraId, r.paraOffset)
  emit('close')
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
}

function highlightKeyword(context) {
  if (!keyword.value || !context) return escapeHtml(context)
  const kw = escapeHtml(keyword.value)
  const escaped = escapeHtml(context)
  const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="reader-search__highlight">$1</mark>')
}
</script>

<style scoped>
.reader-search { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; }
.reader-search__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.2); }
.reader-search__panel {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
  border-radius: var(--radius-container) var(--radius-container) 0 0;
  max-height: 60vh; overflow-y: auto;
}
.reader-search__header {
  display: flex; align-items: center; padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-hairline);
}
.reader-search__input {
  flex: 1; padding: var(--spacing-xs) var(--spacing-md);
  border: var(--input-border); border-radius: var(--input-radius);
  background: var(--input-bg); color: var(--input-text);
}
.reader-search__close {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center; color: var(--color-ink-muted);
}
.reader-search__results { padding: var(--spacing-md); }
.reader-search__result {
  padding: var(--spacing-sm); font-size: var(--text-body-sm);
  cursor: pointer; border-radius: var(--radius-container);
  transition: background 0.2s;
}
.reader-search__result:hover { background: var(--color-surface); }
.reader-search__context { color: var(--color-ink); line-height: var(--leading-sm); }
.reader-search__context :deep(mark) {
  background: #fff3cd;
  color: #2c2c2c;
  border-radius: 2px;
  padding: 0 2px;
}
.reader-search__empty { text-align: center; padding: var(--spacing-xxl); color: var(--color-ink-muted); }
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s, transform 0.3s; }
.slide-up-enter-from { opacity: 0; transform: translateY(100%); }
.slide-up-leave-to { opacity: 0; transform: translateY(100%); }
</style>