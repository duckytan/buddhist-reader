<template>
  <BaseSheet
    :open="open"
    :title="term"
    @close="emit('close')"
  >
    <LoadingState
      v-if="loading"
      text="正在查词…"
    />
    <template v-else-if="hits.length > 0">
      <DictEntryCard
        v-for="(hit, index) in hits"
        :key="`${hit.dictId}-${index}`"
        :hit="hit"
      />
    </template>
    <EmptyState
      v-else-if="hint"
      :text="hint"
    />
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 阅读器内查词弹窗（方案 §9 T08 / §8.3 / §4.9）。
 *
 * - 多词典结果**并行、先返回先展示**：`useDictLookup` 经 `dictService.lookup` 的
 *   `onResult` 渐进回调逐条刷新 `hits`；
 * - **区分**「查无此词」（`empty`）与「该词释义需联网获取」（`offline`）两种空结果
 *   文案（§4.9：未缓存词 + 无网络不得渲染成「加载失败」）；
 * - 自持 `useDictLookup` 实例（异步 UI 态属 composable，§6.8），随 `open`/`term` 变化查词。
 */

import { watch } from 'vue'

import BaseSheet from '@/components/common/BaseSheet.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import DictEntryCard from '@/components/dict/DictEntryCard.vue'
import { useDictLookup } from '@/composables/useDictLookup'

interface Props {
  /** 是否展开 */
  open: boolean
  /** 待查词头 */
  term: string
}

const props = defineProps<Props>()

const emit = defineEmits<{ close: [] }>()

const { loading, hits, hint, lookup, clear } = useDictLookup()

// 展开且有词头 → 查词；收起 → 清空。（收起时 getter 归 '' 亦使「再次点击同词」可重触发）
watch(
  () => (props.open ? props.term : ''),
  (term) => {
    if (term.trim().length > 0) void lookup(term)
    else clear()
  },
  { immediate: true }
)
</script>
