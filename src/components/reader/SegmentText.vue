<template>
  <span class="seg-text">
    <span
      v-for="(segment, index) in segments"
      :key="index"
      class="seg"
      :class="{
        'seg--term': segment.type === 'term',
        'seg--search': segment.type === 'search'
      }"
      :data-off="segment.off"
      :data-hit="segment.type === 'text' ? null : ''"
    >{{ segment.content }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 分段文本（方案 §6.1 ②）。
 *
 * **渲染期携带数据坐标**：把 `Segment.off`（数据模型中的字符偏移）写入 `data-off`，
 * 命中段（`term`/`search`）另标 `data-hit`。定位时由 `scrollToAnchor` 直接
 * `querySelector('[data-off][data-hit]')` 取元素——**无需反查 DOM、无 TreeWalker**
 * （§6.1 开篇：旧版 61 行脆弱定位代码的根因）。
 *
 * 纯展示组件：无业务逻辑、无事件（交互由 T08 词典弹窗接入）。
 */

import type { Segment } from '@/types/highlight'

interface Props {
  segments: Segment[]
}

defineProps<Props>()
</script>

<style scoped>
.seg--term {
  color: var(--color-accent-deep);
  border-bottom: 1px dashed var(--color-accent-light);
}

.seg--search {
  background: var(--tag-prajna-bg);
  color: var(--tag-prajna-text);
}
</style>
