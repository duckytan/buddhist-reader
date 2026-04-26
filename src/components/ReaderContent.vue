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
import { useProgressStore } from '@/stores/progress'

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
const progressStore = useProgressStore()

const fontSize = computed(() => settingsStore.fontSize)

const trie = ref(null)

const formatChapterContent = (content) => {
  if (!content) return ''

  let formatted = content

  // 添加拼音标注
  if (props.showPinyin) {
    formatted = addPinyinAnnotation(formatted)
  }

  // 词典高亮
  if (trie.value) {
    const matches = findMatches(trie.value, formatted)
    const uniqueMatches = removeOverlaps(matches)

    // 按位置从后往前替换，避免索引变化
    uniqueMatches.reverse().forEach(match => {
      const term = dictionary.find(d => d.term === match.term)
      if (term) {
        const before = formatted.substring(0, match.start)
        const after = formatted.substring(match.end)
        const highlight = `<span class="dict-term" data-term="${match.term}">${match.term}</span>`
        formatted = before + highlight + after
      }
    })
  }

  return formatted
}

const handleContentClick = (event) => {
  const target = event.target
  if (target.classList.contains('dict-term')) {
    const term = target.dataset.term
    const rect = target.getBoundingClientRect()
    emit('term-click', term, rect.left, rect.top)
  }
}

onMounted(() => {
  // 构建 Trie 树
  trie.value = buildTrie(dictionary)
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
