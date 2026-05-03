<template>
  <div class="markdown-renderer" v-html="renderedHtml" />
</template>

<script setup>
import { computed } from 'vue'
import renderer from '@/engine/markdownRenderer.js'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  inline: {
    type: Boolean,
    default: false
  }
})

const renderedHtml = computed(() => {
  if (!props.content) return ''
  return props.inline
    ? renderer.renderInline(props.content)
    : renderer.render(props.content)
})
</script>

<style scoped>
.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3) {
  font-family: var(--font-serif);
  font-weight: var(--weight-semibold);
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.markdown-renderer :deep(h1) { font-size: var(--text-h1); }
.markdown-renderer :deep(h2) { font-size: var(--text-h2); }
.markdown-renderer :deep(h3) { font-size: var(--text-h3); }

.markdown-renderer :deep(p) {
  margin-bottom: var(--spacing-md);
  line-height: var(--leading-body);
}

.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-lg);
}

.markdown-renderer :deep(li) {
  margin-bottom: var(--spacing-xs);
}

.markdown-renderer :deep(strong) {
  font-weight: var(--weight-semibold);
}

.markdown-renderer :deep(em) {
  font-style: italic;
}

.markdown-renderer :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  padding-left: var(--spacing-md);
  margin: var(--spacing-md) 0;
  color: var(--color-ink-muted);
}

.markdown-renderer :deep(code) {
  font-family: var(--font-mono);
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: var(--radius-container);
  font-size: var(--text-body-sm);
}
</style>
