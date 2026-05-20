<template>
  <header class="reader-header">
    <button
      class="reader-header__back"
      @click="$emit('goBack')"
    >
      <span class="reader-header__icon">&#8592;</span>
    </button>
    <h2 class="reader-header__title">
      {{ title }}
    </h2>
    <button
      class="reader-header__btn"
      @click="$emit('toggleSearch')"
    >
      <span class="reader-header__icon">&#128269;</span>
    </button>
    <button
      class="reader-header__btn"
      @click="$emit('addNote')"
    >
      <span class="reader-header__icon">&#9998;</span>
    </button>
    <button
      class="reader-header__btn"
      @click="$emit('addBookmark')"
    >
      <span class="reader-header__icon">&#9734;</span>
    </button>
    <button
      class="reader-header__btn"
      @click="$emit('toggleTOC')"
    >
      <span class="reader-header__icon">&#9776;</span>
    </button>
    <button
      class="reader-header__btn"
      @click="$emit('toggleDictSelector')"
    >
      <span class="reader-header__icon">&#128214;</span>
    </button>
    <button
      class="reader-header__btn"
      @click="$emit('toggleSettings')"
    >
      <span class="reader-header__icon">&#9881;</span>
    </button>
  </header>
</template>

<script setup>
defineProps({ title: { type: String, default: '' } })
defineEmits(['toggleSearch', 'addBookmark', 'addNote', 'toggleTOC', 'toggleSettings', 'toggleDictSelector', 'goBack'])
</script>

<style scoped>
.reader-header {
  display: flex; align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  position: sticky; top: 0; z-index: 10;
}
.reader-header__back {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
}
.reader-header__title {
  flex: 1; font-family: var(--font-serif); font-size: var(--text-h3);
  text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.reader-header__btn {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
}
.reader-header__icon { font-size: var(--text-body-lg); color: var(--color-ink-muted); }
</style>