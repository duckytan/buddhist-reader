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
        :key="refreshKey"
        v-html="formatChapterContent(chapter.content)"
        @click="handleContentClick"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, shallowRef } from 'vue'
import { buildTrie, findMatches, removeOverlaps } from '@/utils/trie'
import { addPinyinAnnotation } from '@/utils/pronunciation'
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

// Trie 树（响应式）
const trie = shallowRef(null)

// 重建 Trie 树
function rebuildTrie() {
  const entries = dictionariesStore.allEntries
  if (entries.length > 0) {
    trie.value = buildTrie(entries)
    console.log(`[Trie] Built with ${entries.length} entries`)
  }
}

// 监听词典加载完成
watch(
  () => dictionariesStore.externalDictLoaded,
  () => {
    rebuildTrie()
    refreshKey.value++
  }
)

// 用于强制重新渲染
const refreshKey = ref(0)

const formatChapterContent = (content) => {
  if (!content) return ''

  let formatted = content

  // 1. 添加拼音标注
  if (props.showPinyin) {
    formatted = addPinyinAnnotation(formatted)
  }

  // 2. 词典高亮匹配
  if (trie.value) {
    const matches = findMatches(trie.value, formatted)
    const uniqueMatches = removeOverlaps(matches)

    // 3. 过滤忽略的词条
    const filteredMatches = uniqueMatches.filter(match => {
      return !ignoredTermsStore.isIgnored(match.term)
    })

    // 4. 从后往前替换，避免索引问题
    filteredMatches.sort((a, b) => b.start - a.start)

    for (const match of filteredMatches) {
      const before = formatted.substring(0, match.start)
      const after = formatted.substring(match.end)
      const sources = match._dictId || '__builtin__'
      const highlight = `<span class="dict-term" data-term="${match.term}" data-source="${sources}">${match.term}</span>`
      formatted = before + highlight + after
    }
  }

  return formatted
}

const handleContentClick = (event) => {
  const target = event.target
  if (target.classList.contains('dict-term')) {
    const term = target.dataset.term
    const source = target.dataset.source
    const rect = target.getBoundingClientRect()
    emit('term-click', term, rect.left, rect.top, source)
  }
}

onMounted(async () => {
  // 初始化词典
  await dictionariesStore.initPresetDicts()
  // 构建 Trie
  rebuildTrie()
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
