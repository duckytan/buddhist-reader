<template>
  <div class="reader-content" :style="{ fontSize: `${fontSize}px` }">
    <div
      v-for="(chapter, index) in sutra?.chapters || []"
      :key="index"
      class="chapter"
      :data-chapter-index="index"
    >
      <div class="chapter-title">
        <h2>{{ chapter.title }}</h2>
      </div>

      <div
        class="content-text"
        v-html="formatChapterContent(chapter.content)"
        @click="handleContentClick"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { buildTrie, findMatches, removeOverlaps } from '@/utils/trie'
import { addPinyinAnnotation } from '@/utils/pronunciation'
import { dictionary } from '@/data/dictionary'
import { useSettingsStore } from '@/stores/settings'
import { useDictionariesStore } from '@/stores/dictionaries'
import { useIgnoredTermsStore } from '@/stores/ignoredTerms'

const props = defineProps({
  sutra: {
    type: Object,
    required: true
  },
  showPinyin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['term-click'])

const settingsStore = useSettingsStore()
const dictionariesStore = useDictionariesStore()
const ignoredTermsStore = useIgnoredTermsStore()

const fontSize = computed(() => settingsStore.fontSize)

// 外部词典词条（异步加载）
const externalEntries = ref([])
const isLoadingExternal = ref(false)

// 内置词典的 Trie（每次渲染时重建，因为词典是静态的）
const internalTrie = computed(() => buildTrie(dictionary))

// 外部词典的 Trie（从异步加载的词条构建）
const externalTrie = computed(() => {
  if (externalEntries.value.length === 0) return null
  return buildTrie(externalEntries.value)
})

// 加载外部词典词条
async function loadExternalDictEntries() {
  if (dictionariesStore.enabledCount === 0) {
    externalEntries.value = []
    return
  }

  isLoadingExternal.value = true
  try {
    const entries = await dictionariesStore.getAllEnabledDictEntries()
    externalEntries.value = entries
  } catch (e) {
    console.warn('Failed to load external dict entries:', e)
    externalEntries.value = []
  } finally {
    isLoadingExternal.value = false
  }
}

// 监听词典切换，重新加载词条
watch(
  () => dictionariesStore.enabledDictIds,
  () => {
    // 清除缓存以确保重新加载
    dictionariesStore.clearDictEntriesCache()
    loadExternalDictEntries()
  },
  { deep: true }
)

const formatChapterContent = (content) => {
  if (!content) return ''

  let formatted = content

  // 1. 添加拼音标注
  if (props.showPinyin) {
    formatted = addPinyinAnnotation(formatted)
  }

  // 2. 收集所有匹配
  const allMatches = []

  // 内置词典匹配
  if (internalTrie.value) {
    const internalMatches = findMatches(internalTrie.value, formatted)
    for (const m of internalMatches) {
      allMatches.push({
        ...m,
        _source: 'builtin',
        _dictId: '__builtin__'
      })
    }
  }

  // 外部词典匹配（MDX）
  if (externalTrie.value) {
    const externalMatches = findMatches(externalTrie.value, formatted)
    for (const m of externalMatches) {
      allMatches.push({
        ...m,
        _source: 'external',
        _dictId: m._dictId || '__external__'
      })
    }
  }

  // 3. 去重（最长匹配优先）
  const uniqueMatches = removeOverlapsWithSource(allMatches)

  // 4. 过滤忽略的词条
  const filteredMatches = uniqueMatches.filter(match => {
    return !ignoredTermsStore.isIgnored(match.term)
  })

  // 5. 从后往前替换，避免索引问题
  filteredMatches.sort((a, b) => b.start - a.start)

  for (const match of filteredMatches) {
    const before = formatted.substring(0, match.start)
    const after = formatted.substring(match.end)
    const sources = match._dictId
    const highlight = `<span class="dict-term" data-term="${match.term}" data-source="${sources}">${match.term}</span>`
    formatted = before + highlight + after
  }

  return formatted
}

/**
 * 带来源去重的 removeOverlaps
 */
function removeOverlapsWithSource(matches) {
  if (matches.length === 0) return []

  // 按起始位置排序，起始相同则按长度降序
  matches.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start
    }
    return (b.end - b.start) - (a.end - a.start)
  })

  const result = []
  let lastEnd = -1

  for (const match of matches) {
    if (match.start >= lastEnd) {
      result.push(match)
      lastEnd = match.end
    }
    // 重叠的被跳过（因为更长的已在前面）
  }

  return result
}

const handleContentClick = (event) => {
  const target = event.target
  if (target.classList.contains('dict-term')) {
    const term = target.dataset.term
    const source = target.dataset.source
    const rect = target.getBoundingClientRect()
    emit('term-click', term, rect.left, rect.top)
  }
}

onMounted(async () => {
  // 初始化预置词典
  if (!dictionariesStore.isInitialized) {
    await dictionariesStore.initPresetDicts()
  }
  // 加载外部词典词条
  await loadExternalDictEntries()
})
</script>

<style scoped lang="scss">
.reader-content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4);
  line-height: var(--line-height-loose);
}

.chapter {
  margin-bottom: var(--space-8);

  &:last-child {
    margin-bottom: 0;
  }
}

.chapter-title {
  text-align: center;
  margin-bottom: var(--space-6);
  padding-top: var(--space-6);

  h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
}

.content-text {
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  text-align: justify;

  :deep(.dict-term) {
    background-color: var(--highlight-bg);
    border-radius: var(--radius-sm);
    padding: 2px 4px;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background-color: #FFE082;
      box-shadow: var(--shadow-sm);
    }
  }

  :deep(ruby) {
    ruby-align: center;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    vertical-align: text-bottom;
    margin: 0 2px;

    rt {
      font-size: 0.6em;
      color: var(--text-secondary);
      line-height: 1.2;
    }
  }
}
</style>
