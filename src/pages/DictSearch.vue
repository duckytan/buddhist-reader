<template>
  <div class="dict-search">
    <header class="dict-search__header">
      <h1 class="dict-search__title">
        词典搜索
      </h1>
    </header>

    <div class="dict-search__input-wrap">
      <input
        v-model="search.query"
        ref="inputRef"
        type="text"
        class="dict-search__input"
        placeholder="输入关键词搜索佛教词汇释义"
        autocomplete="off"
      />
      <span v-if="search.query" class="dict-search__clear" @click="search.query = ''">&times;</span>
    </div>

    <div class="dict-search__dicts">
      <span class="dict-search__dicts-label">词典来源：</span>
      <label
        v-for="dict in dictStore.allDictIds"
        :key="dict"
        class="dict-search__dict-toggle"
      >
        <input
          type="checkbox"
          :checked="dictStore.isDictEnabled(dict)"
          @change="dictStore.toggleDict(dict)"
        >
        {{ dictName(dict) }}
      </label>
    </div>

    <div
      v-if="search.searching.value"
      class="dict-search__loading"
    >
      搜索中...
    </div>

    <div
      v-else-if="!search.query || !search.query.trim()"
      class="dict-search__empty"
    >
      输入关键词搜索佛教词汇释义
    </div>

    <div
      v-else-if="search.results.length === 0"
      class="dict-search__no-result"
    >
      未找到匹配词条
    </div>

    <div
      v-else
      class="dict-search__results"
    >
      <div
        v-for="item in search.results"
        :key="item.term"
        class="dict-search__term-card"
      >
        <h3 class="dict-search__term-name">
          {{ item.term }}
        </h3>
        <div
          v-for="def in item.definitions"
          :key="def.dictId"
          class="dict-search__definition"
        >
          <div class="dict-search__dict-name">
            {{ dictFullName(def.dictId) }}
          </div>
          <p class="dict-search__definition-text">
            {{ formatDefinition(def.definition) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useDictStore } from '../stores/dict'
import { useDictSearch } from '../composables/useDictSearch'

defineOptions({ name: 'DictSearch' })
console.log('[DictSearch] script setup executed')

const dictStore = useDictStore()
const search = useDictSearch()
const inputRef = ref(null)

const dictNameMap = {
  'dict-1': '当代佛教',
  'dict-2': '新编辞典',
  'dict-3': '百科全书'
}

const dictFullNameMap = {
  'dict-1': '中国当代佛教网辞典',
  'dict-2': '新编佛教辞典',
  'dict-3': '中华佛教百科全书'
}

function dictName(id) { return dictNameMap[id] || id }
function dictFullName(id) { return dictFullNameMap[id] || id }

function formatDefinition(raw) {
  if (typeof raw === 'string') return raw.replace(/[\t\r]+/g, '').trim()
  if (Array.isArray(raw)) return raw.map(d => d.c || '').join('\n').trim()
  return ''
}

onMounted(() => {
  console.log('[DictSearch] mounted')
  nextTick(() => {
    const isMobile = window.innerWidth < 768
    if (!isMobile && inputRef.value) {
      inputRef.value.focus()
      console.log('[DictSearch] input focused')
    }
  })
})
</script>

<style scoped>
.dict-search {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}
.dict-search__header { text-align: center; padding: var(--spacing-lg) 0; }
.dict-search__title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
}
.dict-search__input-wrap {
  position: relative;
  margin-bottom: var(--spacing-md);
}
.dict-search__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-lg);
  padding-right: var(--spacing-xl);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  font-size: var(--text-body);
  background: var(--color-canvas);
  transition: border-color 0.2s;
}
.dict-search__input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.dict-search__clear {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-h3);
  color: var(--color-ink-muted);
  cursor: pointer;
}
.dict-search__dicts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0 var(--spacing-md);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
}
.dict-search__dicts-label { font-weight: var(--weight-medium); }
.dict-search__dict-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xxs);
  cursor: pointer;
}
.dict-search__loading, .dict-search__empty, .dict-search__no-result {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--color-ink-muted);
}
.dict-search__results { padding-top: var(--spacing-sm); }
.dict-search__term-card {
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-hairline);
}
.dict-search__term-name {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  margin-bottom: var(--spacing-sm);
  color: var(--color-accent);
}
.dict-search__definition { margin-bottom: var(--spacing-sm); }
.dict-search__dict-name {
  font-size: var(--text-caption);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-xxs);
}
.dict-search__definition-text {
  font-size: var(--text-body-sm);
  line-height: var(--leading-body);
  color: var(--color-ink);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
