<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        词典
      </h1>
      <p class="view__subtitle">
        词头三级匹配（完全 &gt; 前缀 &gt; 包含）
      </p>
    </header>

    <p class="view__placeholder">
      占位视图 — 词典搜索、debounce 300ms、结果上限与空态在 M3 里程碑实现。
    </p>
  </section>
</template>

<style scoped>
.view {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
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
  margin-top: var(--spacing-lg);
  color: var(--color-ink-subtle);
  font-size: var(--text-body-sm);
}
</style>
