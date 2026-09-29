<template>
  <div
    class="state state--loading"
    role="status"
    aria-live="polite"
  >
    <span
      class="state__spinner"
      aria-hidden="true"
    />
    <p class="state__text">
      {{ text }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 提示文案 */
  text?: string
}

withDefaults(defineProps<Props>(), {
  text: '加载中…'
})
</script>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xxl) var(--spacing-lg);
  color: var(--color-ink-muted);
  text-align: center;
}

.state__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-hairline-strong);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: state-spin 0.8s linear infinite;
}

.state__text {
  font-size: var(--text-body-sm);
}

@keyframes state-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
