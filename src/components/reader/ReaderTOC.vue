<template>
  <Transition name="slide">
    <div
      v-if="readerStore.showTOC"
      class="reader-toc"
    >
      <div
        class="reader-toc__overlay"
        @click="readerStore.showTOC = false"
      />
      <div class="reader-toc__panel">
        <header class="reader-toc__header">
          <h3 class="reader-toc__title">
            目录
          </h3>
          <button
            class="reader-toc__close"
            @click="readerStore.showTOC = false"
          >
            &#10005;
          </button>
        </header>
        <ul class="reader-toc__list">
          <li
            v-for="(chapter, cidx) in chapters"
            :key="cidx"
            class="reader-toc__chapter-group"
          >
            <h4
              v-if="chapters.length > 1"
              class="reader-toc__chapter-title"
            >
              {{ chapter.title }}
            </h4>
            <ul class="reader-toc__paragraph-list">
              <li
                v-for="para in chapter.paragraphs"
                :key="para.id"
                class="reader-toc__item"
                @click="jumpToPara(cidx, para.id)"
              >
                <span class="reader-toc__para-num">{{ para.id }}</span>
                <span class="reader-toc__para-preview">{{ para.text.substring(0, 30) }}...</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useReaderStore } from '../../stores/reader'

defineProps({
  chapters: { type: Array, default: () => [] }
})

const emit = defineEmits(['jump', 'jumpPara'])
const readerStore = useReaderStore()

function jumpToPara(chapterIdx, paraId) {
  emit('jumpPara', chapterIdx, paraId)
  readerStore.showTOC = false
}
</script>

<style scoped>
.reader-toc {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
}
.reader-toc__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
}
.reader-toc__panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-hairline);
  overflow-y: auto;
}
.reader-toc__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-hairline);
}
.reader-toc__title {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
}
.reader-toc__close {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-body-lg);
  color: var(--color-ink-muted);
}
.reader-toc__list {
  padding: var(--spacing-md);
}
.reader-toc__chapter-group {
  margin-bottom: var(--spacing-lg);
}
.reader-toc__chapter-title {
  font-family: var(--font-serif);
  font-size: var(--text-h4);
  color: var(--color-ink-muted);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-hairline);
}
.reader-toc__paragraph-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.reader-toc__item {
  padding: var(--spacing-xs) var(--spacing-md);
  font-family: var(--font-serif);
  font-size: var(--text-body-sm);
  cursor: pointer;
  border-radius: var(--radius-container);
  transition: background 0.2s;
  display: flex;
  gap: var(--spacing-sm);
  align-items: baseline;
}
.reader-toc__item:hover {
  background: var(--color-surface);
}
.reader-toc__para-num {
  color: var(--color-accent);
  font-weight: 600;
  flex-shrink: 0;
  width: 32px;
}
.reader-toc__para-preview {
  color: var(--color-ink);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slide-enter-active, .slide-leave-active { transition: opacity 0.3s; }
.slide-enter-from, .slide-leave-to { opacity: 0; }
@media (max-width: 480px) {
  .reader-toc__panel { width: 240px; }
}
</style>