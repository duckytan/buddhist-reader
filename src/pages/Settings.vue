<template>
  <div class="settings-page">
    <header class="settings-page__header">
      <h1 class="settings-page__title">设置</h1>
    </header>

    <section class="settings-page__section">
      <h2 class="settings-page__section-title">主题外观</h2>
      <div class="settings-page__theme-row">
        <button
          v-for="t in settingsStore.themes"
          :key="t"
          :class="['settings-page__theme-btn', { active: settingsStore.theme === t }]"
          @click="settingsStore.setTheme(t)"
        >
          {{ themeLabel(t) }}
        </button>
      </div>
    </section>

    <section class="settings-page__section">
      <h2 class="settings-page__section-title">阅读设置</h2>
      <div class="settings-page__sub-section">
        <label class="settings-page__sub-label">字号</label>
        <div class="settings-page__row">
          <button
            v-for="(size, i) in settingsStore.fontSizes"
            :key="i"
            :class="['settings-page__size-btn', { active: settingsStore.fontSizeIndex === i }]"
            @click="settingsStore.setFontSize(i)"
          >
            {{ fontSizeLabel(i) }}
          </button>
        </div>
      </div>
      <div class="settings-page__sub-section">
        <label class="settings-page__sub-label">行距</label>
        <div class="settings-page__row">
          <button
            v-for="(h, i) in settingsStore.lineHeights"
            :key="i"
            :class="['settings-page__size-btn', { active: settingsStore.lineHeightIndex === i }]"
            @click="settingsStore.setLineHeight(i)"
          >
            {{ lineHeightLabel(i) }}
          </button>
        </div>
      </div>
    </section>

    <section class="settings-page__section">
      <h2 class="settings-page__section-title">词典管理</h2>
      <div
        v-for="dict in dictManifest"
        :key="dict.name"
        class="settings-page__dict-item"
      >
        <label class="settings-page__dict-toggle">
          <input
            type="checkbox"
            :checked="dictStore.isDictEnabled(dict.key)"
            @change="dictStore.toggleDict(dict.key)"
          />
          <span class="settings-page__dict-name">{{ dict.title }}</span>
        </label>
        <span class="settings-page__dict-count">{{ dict.entryCount }} 条</span>
      </div>
    </section>

    <section class="settings-page__section">
      <h2 class="settings-page__section-title">数据管理</h2>
      <div class="settings-page__data-row">
        <button class="settings-page__data-btn" @click="exportNotes">
          导出笔记（JSON）
        </button>
        <button class="settings-page__data-btn settings-page__data-btn--warn" @click="clearCache">
          清除缓存
        </button>
      </div>
    </section>

    <section class="settings-page__section">
      <h2 class="settings-page__section-title">关于</h2>
      <div class="settings-page__about">
        <p>佛经阅读器 v3.1</p>
        <p>禅意设计 · 点击即查 · 离线可用</p>
        <a
          href="https://github.com/duckytan/buddhist-reader"
          target="_blank"
          rel="noopener"
          class="settings-page__github-link"
        >
          GitHub &nearr;
        </a>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useDictStore } from '../stores/dict'
import { useNotesStore } from '../stores/notes'

defineOptions({ name: 'Settings' })

const settingsStore = useSettingsStore()
const dictStore = useDictStore()
const notesStore = useNotesStore()
const dictManifest = ref([])

const fontSizeLabels = ['小', '中', '大', '特大']
const lineHeightLabels = ['紧凑', '舒适', '宽松']
const themeLabels = { 'paper': '宣纸', 'night': '墨夜', 'eye-care': '护眼' }

function fontSizeLabel(i) { return fontSizeLabels[i] }
function lineHeightLabel(i) { return lineHeightLabels[i] }
function themeLabel(t) { return themeLabels[t] || t }

function exportNotes() {
  const allNotes = notesStore.getAllNotes()
  const data = JSON.stringify(allNotes, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `buddhist-reader-notes-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function clearCache() {
  if (confirm('确定清除所有缓存？此操作将删除阅读进度、笔记、书签和阅读时长数据。')) {
    localStorage.clear()
    window.location.reload()
  }
}

onMounted(() => {
  fetch(`${import.meta.env.BASE_URL}dicts/manifest.json`)
    .then(r => r.json())
    .then(data => { dictManifest.value = data })
    .catch(e => { console.error('Failed to load dict manifest:', e) })
})
</script>

<style scoped>
.settings-page {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-lg);
}
.settings-page__header { text-align: center; padding: var(--spacing-lg) 0 var(--spacing-md); }
.settings-page__title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
}
.settings-page__section {
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-hairline);
}
.settings-page__section-title {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-md);
  font-weight: var(--weight-medium);
}
.settings-page__theme-row { display: flex; gap: var(--spacing-sm); }
.settings-page__theme-btn {
  flex: 1;
  padding: var(--spacing-sm);
  border-radius: var(--radius-container);
  font-size: var(--text-body);
  color: var(--color-ink-muted);
  background: var(--color-surface);
  transition: color 0.2s, background 0.2s;
  border: 1px solid transparent;
  cursor: pointer;
}
.settings-page__theme-btn.active {
  color: var(--color-canvas);
  background: var(--color-accent);
}
.settings-page__sub-section { margin-bottom: var(--spacing-md); }
.settings-page__sub-label {
  display: block;
  font-size: var(--text-body-sm);
  color: var(--color-ink);
  margin-bottom: var(--spacing-sm);
}
.settings-page__row { display: flex; gap: var(--spacing-sm); }
.settings-page__size-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  background: var(--color-surface);
  transition: color 0.2s, background 0.2s;
  cursor: pointer;
}
.settings-page__size-btn.active {
  color: var(--color-canvas);
  background: var(--color-accent);
}
.settings-page__dict-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
}
.settings-page__dict-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
}
.settings-page__dict-name { font-size: var(--text-body-sm); }
.settings-page__dict-count {
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
}
.settings-page__data-row { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.settings-page__data-btn {
  width: 100%;
  padding: var(--spacing-sm);
  border-radius: var(--radius-container);
  font-size: var(--text-body-sm);
  color: var(--color-ink);
  background: var(--color-surface);
  transition: background 0.2s;
  cursor: pointer;
}
.settings-page__data-btn:hover { background: var(--color-hairline); }
.settings-page__data-btn--warn { color: var(--color-error); }
.settings-page__about {
  text-align: center;
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}
.settings-page__about p { margin-bottom: var(--spacing-xs); }
.settings-page__github-link {
  display: inline-block;
  margin-top: var(--spacing-sm);
  color: var(--color-accent);
  text-decoration: none;
}
</style>
