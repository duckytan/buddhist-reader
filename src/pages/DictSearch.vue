<template>
  <div class="dict-search-page">
    <h1>词典搜索</h1>
    <p class="dict-search-page__placeholder">词典搜索功能开发中...</p>
  </div>
</template>

<script setup>
defineOptions({ name: 'DictSearch' })
</script>

<style scoped>
.dict-search-page {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
  text-align: center;
}
.dict-search-page__placeholder {
  color: var(--color-ink-muted);
  margin-top: var(--spacing-xl);
}
</style>
