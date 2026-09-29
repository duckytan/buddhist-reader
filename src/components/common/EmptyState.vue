<template>
  <div class="state state--empty">
    <p class="state__text">
      {{ text }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 空态提示文案 */
  text?: string
}

withDefaults(defineProps<Props>(), {
  text: '暂无内容'
})
</script>

<style scoped>
.state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xxl) var(--spacing-lg);
  color: var(--color-ink-subtle);
  text-align: center;
}

.state__text {
  font-size: var(--text-body-sm);
}
</style>
