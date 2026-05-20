<template>
  <div class="settings-page">
    <h1>设置</h1>
    <p class="settings-page__placeholder">设置功能开发中...</p>
  </div>
</template>

<script setup>
defineOptions({ name: 'Settings' })
</script>

<style scoped>
.settings-page {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
  text-align: center;
}
.settings-page__placeholder {
  color: var(--color-ink-muted);
  margin-top: var(--spacing-xl);
}
</style>
