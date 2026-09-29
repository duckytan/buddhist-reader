<template>
  <div class="reader">
    <LoadingState
      v-if="status === 'loading'"
      text="正在载入经文…"
    />
    <ErrorState
      v-else-if="status === 'error'"
      :message="error ?? '加载失败'"
      @retry="retry"
    />
    <EmptyState
      v-else-if="!sutra"
      text="未找到经文"
    />
    <template v-else>
      <ReaderContent
        :sutra="sutra"
        :terms="terms"
        :initial-progress="restored"
        @progress="onProgress"
        @chapter-terms="onChapterTerms"
      />
      <ReaderProgress
        :percent="percent"
        :chapter-idx="chapterIdx"
        :chapter-count="sutra.chapters.length"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 阅读器视图（方案 §8.1 打开经书加载流程）。
 *
 * 编排（views 只编排，业务逻辑进 composables/services）：
 * 1. `loadSutra`（8s 超时 + 1 重试，经 `utils/async.ts`）→ 三态（loading/error/empty）；
 * 2. `restore(sutraId)` 读进度 → 传给 `ReaderContent`，其 `nextTick` 后用**语义锚点**
 *    `scrollIntoView` 定位；
 * 3. 懒加载词典索引（`loadIndex()` 一次）→ 取启用词表 → 构建 Trie（高亮就绪）；
 * 4. 章节变化时 `prefetchForChapter`（§4.4 章节级预取，静默）。
 *
 * 约束：词典不可用**不阻塞阅读**（§4.4 弱网降级）；DOM 访问全经 `utils/anchor.ts`。
 */

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ReaderContent from '@/components/reader/ReaderContent.vue'
import ReaderProgress from '@/components/reader/ReaderProgress.vue'
import { useReadingProgress } from '@/composables/useReadingProgress'
import type { ProgressUpdate } from '@/composables/useReadingProgress'
import { useSutraLoader } from '@/composables/useSutraLoader'
import { dictService } from '@/services/dictService'
import type { ReadingProgress } from '@/types/reader'
import { logger } from '@/utils/logger'

const route = useRoute()

/** 当前经书 ID（来自路由参数 `:id`，即文件名） */
const sutraId = computed<string>(() => String(route.params.id ?? ''))

const { sutra, status, error, load, retry } = useSutraLoader()
const { restore, record } = useReadingProgress()

/** 启用术语词表（词典索引就绪后填充；空则不启用高亮） */
const terms = ref<string[]>([])
/** 待恢复进度（交给 ReaderContent 定位） */
const restored = ref<ReadingProgress | null>(null)
const percent = ref(0)
const chapterIdx = ref(0)

async function open(): Promise<void> {
  const id = sutraId.value
  terms.value = []
  restored.value = null
  percent.value = 0
  chapterIdx.value = 0

  await load(id)
  if (status.value !== 'ready' || !sutra.value) return

  // §8.1：读进度 → 交由 ReaderContent 于 nextTick 后语义锚点定位
  const saved = restore(id)
  restored.value = saved
  percent.value = saved?.percent ?? 0
  chapterIdx.value = saved?.chapterIdx ?? 0

  await loadDictionary()
}

/** 懒加载词典索引（失败不阻塞阅读） */
async function loadDictionary(): Promise<void> {
  try {
    await dictService.loadIndex()
    terms.value = dictService.getEnabledTerms()
  } catch (err) {
    logger.warn('词典索引加载失败，术语高亮暂不可用', err)
  }
}

function onProgress(update: ProgressUpdate): void {
  percent.value = update.percent
  chapterIdx.value = update.chapterIdx
  record(sutraId.value, update)
}

/** §4.4 章节级预取（静默；prefetchForChapter 内部 allSettled 不抛） */
function onChapterTerms(chapterTerms: string[]): void {
  if (chapterTerms.length === 0) return
  void dictService.prefetchForChapter(chapterTerms)
}

onMounted(() => {
  void open()
})

watch(sutraId, () => {
  void open()
})
</script>

<style scoped>
.reader {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--color-canvas);
}
</style>
