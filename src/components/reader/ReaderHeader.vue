<template>
  <header class="reader-header">
    <button
      class="reader-header__back"
      @click="$router.push('/')"
    >
      <span class="reader-header__icon">&#8592;</span>
    </button>
    <h2 class="reader-header__title">
      {{ title }}
    </h2>
    <button
      class="reader-header__btn"
      @click="readerStore.showTOC = !readerStore.showTOC"
    >
      <span class="reader-header__icon">&#9776;</span>
    </button>
    <button
      class="reader-header__btn"
      @click="readerStore.showSettings = !readerStore.showSettings"
    >
      <span class="reader-header__icon">&#9881;</span>
    </button>
  </header>
</template>

<script setup>
import { useReaderStore } from '../../stores/reader'

defineProps({ title: { type: String, default: '' } })
const readerStore = useReaderStore()
</script>

<style scoped>
.reader-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  position: sticky;
  top: 0;
  z-index: 10;
}
.reader-header__back {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
}
.reader-header__title {
  flex: 1;
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reader-header__btn {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
}
.reader-header__icon {
  font-size: var(--text-body-lg);
  color: var(--color-ink-muted);
}
</style>