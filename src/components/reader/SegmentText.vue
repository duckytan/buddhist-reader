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
      :data-hit="segment.type === 'term' ? '' : null"
      :data-search="segment.type === 'search' ? '' : null"
      @click="onSegmentClick(segment)"
    >{{ segment.content }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 分段文本（方案 §6.1 ② / §8.3）。
 *
 * **渲染期携带数据坐标**：把 `Segment.off`（数据模型中的字符偏移）写入 `data-off`；
 * `term` 段另标 `data-hit`、`search` 段另标 **`data-search`**（两者**语义独立**，不共用
 * 同一属性）。定位时由 `scrollToAnchor` 直接 `querySelector('[data-off][data-search]')`
 * 取元素——**无需反查 DOM、无 TreeWalker**（§6.1 开篇：旧版 61 行脆弱定位代码的根因）。
 *
 * 口径纪律：`data-hit`/`data-search` 共用同一属性**当前在正常流程下不可达**
 * （`applySearch` 对命中区间强制写 `'search'`，覆盖同位置的 `term`，故命中偏移处不会
 * 有 `term` 段起头）。这是**潜在**歧义、非已发生的 bug——拆分为独立属性以消除该歧义。
 *
 * 交互：点击 `term` 段 → `emit('termClick', term)`，由上层打开查词弹窗（T08 接入）。
 */

import type { Segment } from '@/types/highlight'

interface Props {
  segments: Segment[]
}

defineProps<Props>()

const emit = defineEmits<{ termClick: [term: string] }>()

/** 仅 `term` 段可点查词；`text`/`search` 段点击无副作用。 */
function onSegmentClick(segment: Segment): void {
  if (segment.type === 'term') emit('termClick', segment.content)
}
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
