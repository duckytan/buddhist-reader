<template>
  <div class="notes-page">
    <h1>笔记</h1>
    <p class="notes-page__placeholder">
      笔记汇总功能开发中...
    </p>
  </div>
</template>

<script setup>
defineOptions({ name: 'Notes' })
</script>

<style scoped>
.notes-page {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
  text-align: center;
}
.notes-page__placeholder {
  color: var(--color-ink-muted);
  margin-top: var(--spacing-xl);
}
</style>
