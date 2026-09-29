<template>
  <div
    class="state state--error"
    role="alert"
  >
    <p class="state__text">
      {{ message }}
    </p>

    <button
      v-if="retryable"
      type="button"
      class="state__action"
      @click="emit('retry')"
    >
      重试
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 错误提示文案 */
  message?: string
  /** 是否展示重试按钮 */
  retryable?: boolean
}

withDefaults(defineProps<Props>(), {
  message: '加载失败，请稍后重试',
  retryable: true
})

const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xxl) var(--spacing-lg);
  color: var(--color-error);
  text-align: center;
}

.state__text {
  font-size: var(--text-body-sm);
}

.state__action {
  min-height: var(--button-height);
  padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-pill);
  color: var(--color-accent);
  font-size: var(--text-body-sm);
}
</style>
