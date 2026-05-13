<template>
  <div class="dict-manager">
    <header class="dict-header">
      <h1 class="dict-title">词典管理</h1>
      <p class="dict-subtitle">管理你的词典，控制高亮显示</p>
    </header>

    <div class="dict-list">
      <div
        v-for="dict in dictStore.dictionaries"
        :key="dict.id"
        class="dict-item"
      >
        <div class="dict-info">
          <h3 class="dict-name">{{ dict.name }}</h3>
          <p class="dict-meta">
            {{ getTypeLabel(dict.type) }} · {{ dict.entryCount || 0 }}条
          </p>
        </div>
        <label class="dict-toggle">
          <input
            type="checkbox"
            :checked="dictStore.activeDictIds.includes(dict.id)"
            @change="toggleDict(dict.id, $event.target.checked)"
          />
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <div class="dict-import">
      <h3 class="import-title">导入词典</h3>
      <div class="import-actions">
        <input
          type="file"
          ref="fileInput"
          accept=".json,.csv"
          class="import-input"
          @change="handleImport"
        />
        <button class="import-btn" @click="triggerFileInput">
          选择 JSON/CSV 文件
        </button>
      </div>
      <p class="import-hint">支持 .json 和 .csv 格式，单文件大小不超过 5MB</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDictStore } from '@/stores/dict'

const dictStore = useDictStore()
const fileInput = ref(null)

const typeLabels = {
  builtin: '内置',
  json: 'JSON',
  csv: 'CSV',
  mdx: 'MDX'
}

function getTypeLabel(type) {
  return typeLabels[type] || type
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const result = await dictStore.importDictionary(file)
  if (result.success) {
    console.log('词典导入成功:', result.data)
  } else {
    console.error('导入失败:', result.error)
  }

  event.target.value = ''
}

async function toggleDict(dictId, isActive) {
  await dictStore.toggleDictionary(dictId, isActive)
}

onMounted(() => {
  dictStore.loadDictionaries()
})
</script>

<style scoped>
.dict-manager {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.dict-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.dict-title {
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}

.dict-subtitle {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
}

.dict-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xxl);
}

.dict-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-container);
}

.dict-name {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
  margin-bottom: var(--spacing-xxs);
}

.dict-meta {
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
}

.dict-toggle input {
  display: none;
}

.toggle-slider {
  display: block;
  width: 44px;
  height: 24px;
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--color-canvas);
  border-radius: 50%;
  transition: transform 0.2s ease;
}

input:checked + .toggle-slider {
  background: var(--color-accent);
}

input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.dict-import {
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border-radius: var(--radius-container);
  text-align: center;
}

.import-title {
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  margin-bottom: var(--spacing-md);
}

.import-input {
  display: none;
}

.import-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-canvas);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: background 0.2s ease;
}

.import-btn:hover {
  background: var(--color-accent-deep);
}

.import-hint {
  margin-top: var(--spacing-sm);
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
}
</style>
