<template>
  <div
    v-if="open"
    class="base-sheet"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="base-sheet__mask"
      @click="emit('close')"
    />

    <section class="base-sheet__panel">
      <header
        v-if="title"
        class="base-sheet__header"
      >
        <h2 class="base-sheet__title">
          {{ title }}
        </h2>
        <button
          type="button"
          class="base-sheet__close"
          aria-label="关闭"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="base-sheet__body">
        <slot />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 是否展开 */
  open: boolean
  /** 面板标题（为空则不渲染头部） */
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: ''
})

const emit = defineEmits<{ close: [] }>()
</script>

<style scoped>
.base-sheet {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
}

.base-sheet__mask {
  position: absolute;
  inset: 0;
  background-color: rgb(0 0 0 / 35%);
}

.base-sheet__panel {
  position: relative;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  background-color: var(--color-canvas);
  border-top-left-radius: var(--radius-container);
  border-top-right-radius: var(--radius-container);
  padding: var(--spacing-lg);
  /* 保留换行（方案 §13 §5.2：pre-wrap） */
  white-space: pre-wrap;
}

.base-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.base-sheet__title {
  font-size: var(--text-h3);
}

.base-sheet__close {
  width: var(--touch-target);
  height: var(--touch-target);
  color: var(--color-ink-muted);
  font-size: var(--text-body-lg);
}
</style>
