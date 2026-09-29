<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        阅读器
      </h1>
      <p class="view__subtitle">
        经书 ID：{{ sutraId }}
      </p>
    </header>

    <p class="view__placeholder">
      占位视图 — 连续滚动阅读、术语高亮、语义锚点跳转、进度恢复在 M2 里程碑实现。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/** 当前经书 ID（来自路由参数 `:id`）。 */
const sutraId = computed<string>(() => String(route.params.id ?? ''))
</script>

<style scoped>
.view {
  max-width: var(--max-reading-width);
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
