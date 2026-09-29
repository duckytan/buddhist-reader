<template>
  <p
    :id="elementId"
    class="para"
    :data-global-id="paragraph.globalId"
  >
    <SegmentText
      v-if="segments"
      :segments="segments"
    />
    <template v-else>{{ paragraph.text }}</template>
  </p>
</template>

<script setup lang="ts">
/**
 * 段落块（方案 §6.1 ①②③）。
 *
 * - ① 段落 DOM id = `toElementId(globalId)`（全局唯一，`globalId` 由 `sutraService`
 *   运行时派生，跨章不重复）；
 * - ② 高亮分段经 `SegmentText` 携带 `data-off`/`data-hit`（无命中则纯文本）；
 * - ③ `scroll-margin-top: var(--reader-header-height)`——滚动定位由 CSS 锚点承担，
 *   **不使用 `getBoundingClientRect` + 魔法偏移**。
 */

import { computed } from 'vue'

import SegmentText from '@/components/reader/SegmentText.vue'
import type { Segment } from '@/types/highlight'
import type { Paragraph } from '@/types/sutra'
import { toElementId } from '@/utils/anchor'

interface Props {
  paragraph: Paragraph
  /** 高亮分段；null 表示无命中（按纯文本渲染） */
  segments?: Segment[] | null
}

const props = withDefaults(defineProps<Props>(), {
  segments: null
})

/** 段落 DOM id（与 `scrollToAnchor` 的 `toElementId` 一致） */
const elementId = computed<string>(() => toElementId(props.paragraph.globalId))
</script>

<style scoped>
.para {
  margin: 0 0 var(--spacing-md);
  color: var(--color-ink);
  font-family: var(--font-serif);
  /* 字号/行距来自阅读设置（useReaderSettings → 根元素 CSS 变量），回退到 token 默认 */
  font-size: var(--reader-font-size, var(--text-body-lg));
  line-height: var(--reader-line-height, var(--leading-body));
  text-align: justify;
  /* §6.1 ③：以 CSS 锚点消除 header 魔法偏移（配合 scrollIntoView({block:'start'})）
     与 .reader-content 的 padding-top 同源，保证「锚定首段 = 初始位置」 */
  scroll-margin-top: calc(var(--reader-header-height) + var(--spacing-xs));
}

.para :deep(.seg--term) {
  cursor: pointer;
}
</style>
