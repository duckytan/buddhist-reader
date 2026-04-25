<template>
  <div class="reader-content" :style="{ fontSize: `${fontSize}px` }">
    <div class="chapter-title">
      <h2>{{ sutra?.chapters[0]?.title }}</h2>
    </div>

    <div
      class="content-text"
      v-html="formattedContent"
      @click="handleContentClick"
    ></div>
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

const formattedContent = computed(() => {
  if (!props.sutra?.chapters[0]?.content) return ''

  let content = props.sutra.chapters[0].content

  // 添加拼音标注
  if (props.showPinyin) {
    content = addPinyinAnnotation(content)
  }

  // 词典高亮
  if (trie.value) {
    const matches = findMatches(trie.value, content)
    const uniqueMatches = removeOverlaps(matches)

    // 按位置从后往前替换，避免索引变化
    uniqueMatches.reverse().forEach(match => {
      const term = dictionary.find(d => d.term === match.term)
      if (term) {
        const before = content.substring(0, match.start)
        const after = content.substring(match.end)
        const highlight = `<span class="dict-term" data-term="${match.term}">${match.term}</span>`
        content = before + highlight + after
      }
    })
  }

  return content
})

const handleContentClick = (event) => {
  const target = event.target
  if (target.classList.contains('dict-term')) {
    const term = target.dataset.term
    const rect = target.getBoundingClientRect()
    emit('term-click', term, rect.left, rect.top)
  }
}

const saveProgress = () => {
  if (props.sutra?.id) {
    progressStore.saveProgress(props.sutra.id, 100) // MVP: 简化处理，标记为已阅读
  }
}

onMounted(() => {
  // 构建 Trie 树
  trie.value = buildTrie(dictionary)
  saveProgress()
})

// 监听内容变化，自动保存进度
watch(() => props.sutra?.id, () => {
  saveProgress()
}, { immediate: true })
</script>

<style scoped lang="scss">
.reader-content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4);
  line-height: var(--line-height-loose);
}

.chapter-title {
  text-align: center;
  margin-bottom: var(--space-6);

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
