<template>
  <div
    class="reader-progress"
    role="progressbar"
    aria-label="阅读进度"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
  >
    <div class="reader-progress__track">
      <div
        class="reader-progress__bar"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <p class="reader-progress__label">
      {{ percent }}% · 第 {{ chapterIdx + 1 }} / {{ chapterCount }} 章
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * 阅读进度条（方案 §6.3）——纯展示：接收百分比与章节位置，无业务逻辑。
 */

interface Props {
  /** 0–100 百分比 */
  percent: number
  /** 当前章节索引（0-based） */
  chapterIdx: number
  /** 章节总数 */
  chapterCount: number
}

defineProps<Props>()
</script>

<style scoped>
.reader-progress {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  padding: var(--spacing-xs) var(--spacing-lg);
  background: var(--color-surface);
  border-top: 1px solid var(--color-hairline);
}

.reader-progress__track {
  height: 3px;
  overflow: hidden;
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
}

.reader-progress__bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
  transition: width 0.2s ease;
}

.reader-progress__label {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink-muted);
  font-size: var(--text-caption);
  text-align: center;
}
</style>
