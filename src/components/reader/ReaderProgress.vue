<template>
  <div class="reader-progress">
    <div class="reader-progress__bar">
      <div
        class="reader-progress__fill"
        :style="{ width: percent + '%' }"
      />
    </div>
    <span class="reader-progress__label">{{ percent }}%</span>
  </div>
</template>

<script setup>
defineProps({ percent: { type: Number, default: 0 } })
</script>

<style scoped>
.reader-progress {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
}
.reader-progress__bar {
  flex: 1;
  height: 3px;
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
}
.reader-progress__fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
  transition: width 0.3s;
}
.reader-progress__label {
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
  margin-left: var(--spacing-sm);
  min-width: 30px;
  text-align: right;
}
</style>