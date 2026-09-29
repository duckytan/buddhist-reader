<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        书架
      </h1>
      <p class="view__subtitle">
        般若佛经阅读器 · v{{ version }}
      </p>
    </header>

    <p class="view__placeholder">
      占位视图 — 30 部经书列表、分类筛选与三态（加载/空/错误）在 M2 里程碑实现。
    </p>
  </section>
</template>

<script setup lang="ts">
/** 应用版本号（由 vite `define` 注入）。 */
const version = __APP_VERSION__
</script>

<style scoped>
.view {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.view__header {
  margin-bottom: var(--spacing-lg);
}

.view__title {
  font-size: var(--text-h1);
}

.view__subtitle {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}

.view__placeholder {
  color: var(--color-ink-subtle);
  font-size: var(--text-body-sm);
}
</style>
