<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        笔记
      </h1>
      <p class="view__subtitle">
        跨经书聚合 · 关键词搜索 · 按经书筛选
      </p>
    </header>

    <p class="view__placeholder">
      占位视图 — 笔记汇总、编辑/删除与锚点回看在 M3 里程碑实现。
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
