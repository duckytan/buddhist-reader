<template>
  <div class="dict-manager-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">词典管理</h1>
        <p class="page-subtitle">管理释义词典，控制高亮显示</p>
      </div>
      <button class="btn-primary" @click="showImport = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>导入词典</span>
      </button>
    </header>

    <!-- Built-in Dict Section -->
    <section class="dict-section">
      <h2 class="section-title">内置词典</h2>
      <div class="dict-list">
        <article class="dict-item built-in">
          <div class="dict-icon">📖</div>
          <div class="dict-info">
            <h3 class="dict-name">佛学常用词典</h3>
            <p class="dict-meta">约 1,200 词条 · 内置</p>
            <div class="dict-tags">
              <span class="tag tag-wisdom">智慧</span>
              <span class="tag tag-compassion">慈悲</span>
            </div>
          </div>
          <div class="dict-actions">
            <label class="switch">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
        </article>
      </div>
    </section>

    <!-- User Dicts Section -->
    <section class="dict-section">
      <h2 class="section-title">我的词典</h2>

      <div class="dict-list">
        <article
          v-for="dict in userDicts"
          :key="dict.id"
          class="dict-item"
          :class="{ expanded: expandedId === dict.id }"
        >
          <div class="dict-main" @click="toggleExpand(dict.id)">
            <div class="dict-icon" :style="{ background: dict.color }">
              {{ dict.name.slice(0, 1) }}
            </div>
            <div class="dict-info">
              <h3 class="dict-name">{{ dict.name }}</h3>
              <p class="dict-meta">{{ dict.count.toLocaleString() }} 词条 · {{ dict.format }}</p>
              <div class="dict-tags">
                <span
                  v-for="tag in dict.tags"
                  :key="tag"
                  class="tag"
                  :class="'tag-' + tag"
                >
                  {{ tagLabels[tag] || tag }}
                </span>
              </div>
            </div>
            <div class="dict-actions" @click.stop>
              <label class="switch">
                <input type="checkbox" v-model="dict.enabled">
                <span class="slider"></span>
              </label>
              <button class="action-btn" @click="editDict(dict)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="action-btn danger" @click="deleteDict(dict)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Expanded Details -->
          <div class="dict-expanded" v-if="expandedId === dict.id">
            <div class="expanded-content">
              <div class="stat-row">
                <div class="stat">
                  <span class="stat-value">{{ dict.count.toLocaleString() }}</span>
                  <span class="stat-label">词条总数</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ dict.matchCount.toLocaleString() }}</span>
                  <span class="stat-label">本文高亮</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ dict.size }}</span>
                  <span class="stat-label">文件大小</span>
                </div>
              </div>
              <div class="color-picker">
                <span class="picker-label">高亮颜色</span>
                <div class="color-options">
                  <button
                    v-for="c in highlightColors"
                    :key="c.value"
                    class="color-option"
                    :class="{ active: dict.highlightColor === c.value }"
                    :style="{ background: c.value }"
                    @click="dict.highlightColor = c.value"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div v-if="userDicts.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>暂无自定义词典</h3>
        <p>导入 MDX、JSON 或 CSV 格式的词典文件</p>
      </div>
    </section>

    <!-- Import Modal -->
    <div class="modal-overlay" v-if="showImport" @click.self="showImport = false">
      <div class="modal">
        <div class="modal-header">
          <h2>导入词典</h2>
          <button class="close-btn" @click="showImport = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="upload-zone">
            <input type="file" id="dict-file" accept=".mdx,.json,.csv" @change="handleFileSelect">
            <label for="dict-file" class="upload-label">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span class="upload-text">点击选择文件或拖拽到此处</span>
              <span class="upload-hint">支持 MDX、JSON、CSV 格式，最大 10MB</span>
            </label>
          </div>

          <div class="format-info">
            <h4>支持格式</h4>
            <div class="format-grid">
              <div class="format-item">
                <span class="format-name">MDX</span>
                <span class="format-desc">MDict 词典格式，高压缩率</span>
              </div>
              <div class="format-item">
                <span class="format-name">JSON</span>
                <span class="format-desc">键值对格式，简单易用</span>
              </div>
              <div class="format-item">
                <span class="format-name">CSV</span>
                <span class="format-desc">表格数据，Excel 可编辑</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showImport = ref(false)
const expandedId = ref(null)

const tagLabels = {
  wisdom: '智慧',
  compassion: '慈悲',
  meditation: '禅定',
  ritual: '仪轨'
}

const highlightColors = [
  { value: '#FFF3CD', label: '暖黄' },
  { value: '#D1ECF1', label: '淡青' },
  { value: '#D4EDDA', label: '淡绿' },
  { value: '#E2D5F1', label: '淡紫' },
  { value: '#FFE4E1', label: '淡粉' },
  { value: '#E0FFF0', label: '薄荷' }
]

const userDicts = ref([
  {
    id: 1,
    name: '法相宗词汇',
    count: 3200,
    format: 'MDX',
    size: '2.4MB',
    enabled: true,
    highlightColor: '#D1ECF1',
    matchCount: 156,
    tags: ['wisdom', 'compassion'],
    color: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
  },
  {
    id: 2,
    name: '禅宗术语典',
    count: 890,
    format: 'JSON',
    size: '480KB',
    enabled: true,
    highlightColor: '#E2D5F1',
    matchCount: 42,
    tags: ['meditation'],
    color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'
  },
  {
    id: 3,
    name: '净土宗文献',
    count: 1500,
    format: 'CSV',
    size: '320KB',
    enabled: false,
    highlightColor: '#D4EDDA',
    matchCount: 0,
    tags: ['ritual'],
    color: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
  }
])

const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    console.log('Selected file:', file.name)
  }
}

const editDict = (dict) => {
  console.log('Edit dict:', dict.name)
}

const deleteDict = (dict) => {
  console.log('Delete dict:', dict.name)
}
</script>

<style scoped>
.dict-manager-page {
  max-width: 900px;
  margin: 0 auto;
}

/* ===== Page Header ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--zen-space-xl);
  gap: var(--zen-space-lg);
  flex-wrap: wrap;
}

.page-title {
  font-family: var(--zen-font-serif);
  font-size: 32px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--zen-ink-muted);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  background: var(--zen-accent);
  color: var(--zen-on-accent);
  border: none;
  border-radius: var(--zen-radius-interactive);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--zen-accent-deep);
}

/* ===== Section ===== */
.dict-section {
  margin-bottom: var(--zen-space-2xl);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: var(--zen-space-md);
  padding-bottom: var(--zen-space-sm);
  border-bottom: 1px solid var(--zen-hairline);
}

/* ===== Dict List ===== */
.dict-list {
  display: flex;
  flex-direction: column;
  gap: var(--zen-space-sm);
}

.dict-item {
  background: var(--zen-canvas);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-container);
  overflow: hidden;
  transition: all 0.2s;
}

.dict-item:hover {
  border-color: var(--zen-hairline-strong);
}

.dict-item.built-in {
  background: var(--zen-surface);
}

.dict-main {
  display: flex;
  align-items: center;
  gap: var(--zen-space-md);
  padding: var(--zen-space-md) var(--zen-space-lg);
  cursor: pointer;
}

.dict-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--zen-radius-container);
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.dict-info {
  flex: 1;
  min-width: 0;
}

.dict-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: 2px;
}

.dict-meta {
  font-size: 13px;
  color: var(--zen-ink-muted);
  margin-bottom: var(--zen-space-xs);
}

.dict-tags {
  display: flex;
  gap: var(--zen-space-xs);
  flex-wrap: wrap;
}

.tag {
  padding: 2px 8px;
  border-radius: var(--zen-radius-interactive);
  font-size: 11px;
  font-weight: 500;
}

.tag-wisdom {
  background: var(--zen-highlight-mind);
  color: var(--zen-highlight-text-mind);
}

.tag-compassion {
  background: var(--zen-highlight-commentary);
  color: var(--zen-highlight-text-commentary);
}

.tag-meditation {
  background: var(--zen-highlight-mantra);
  color: var(--zen-highlight-text-mantra);
}

.tag-ritual {
  background: var(--zen-highlight-sutra);
  color: var(--zen-highlight-text-sutra);
}

.dict-actions {
  display: flex;
  align-items: center;
  gap: var(--zen-space-sm);
}

/* ===== Switch ===== */
.switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--zen-hairline-strong);
  border-radius: 12px;
  transition: 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}

.switch input:checked + .slider {
  background: var(--zen-accent);
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--zen-radius-interactive);
  color: var(--zen-ink-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--zen-surface);
  color: var(--zen-ink);
}

.action-btn.danger:hover {
  background: #fee;
  color: var(--zen-error);
}

/* ===== Expanded Content ===== */
.dict-expanded {
  border-top: 1px solid var(--zen-hairline);
  background: var(--zen-surface);
}

.expanded-content {
  padding: var(--zen-space-lg);
}

.stat-row {
  display: flex;
  gap: var(--zen-space-xl);
  margin-bottom: var(--zen-space-lg);
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--zen-ink);
}

.stat-label {
  font-size: 12px;
  color: var(--zen-ink-muted);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: var(--zen-space-md);
}

.picker-label {
  font-size: 14px;
  color: var(--zen-ink-muted);
}

.color-options {
  display: flex;
  gap: var(--zen-space-xs);
}

.color-option {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--zen-ink);
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: var(--zen-space-2xl);
  background: var(--zen-surface);
  border-radius: var(--zen-radius-container);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--zen-space-md);
}

.empty-state h3 {
  font-size: 16px;
  color: var(--zen-ink);
  margin-bottom: var(--zen-space-xs);
}

.empty-state p {
  font-size: 14px;
  color: var(--zen-ink-muted);
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: var(--zen-space-lg);
}

.modal {
  width: 100%;
  max-width: 480px;
  background: var(--zen-canvas);
  border-radius: var(--zen-radius-container);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--zen-space-lg);
  border-bottom: 1px solid var(--zen-hairline);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--zen-ink);
}

.modal-body {
  padding: var(--zen-space-lg);
}

.upload-zone {
  margin-bottom: var(--zen-space-lg);
}

.upload-zone input {
  display: none;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--zen-space-sm);
  padding: var(--zen-space-2xl);
  border: 2px dashed var(--zen-hairline);
  border-radius: var(--zen-radius-container);
  cursor: pointer;
  transition: all 0.2s;
}

.upload-label:hover {
  border-color: var(--zen-accent);
}

.upload-label svg {
  color: var(--zen-ink-muted);
}

.upload-text {
  font-size: 15px;
  color: var(--zen-ink);
}

.upload-hint {
  font-size: 13px;
  color: var(--zen-ink-muted);
}

.format-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: var(--zen-space-sm);
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--zen-space-sm);
}

.format-item {
  padding: var(--zen-space-sm);
  background: var(--zen-surface);
  border-radius: var(--zen-radius-container);
}

.format-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--zen-accent);
  margin-bottom: 2px;
}

.format-desc {
  font-size: 12px;
  color: var(--zen-ink-muted);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--zen-radius-interactive);
  color: var(--zen-ink-muted);
  cursor: pointer;
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 767px) {
  .page-title {
    font-size: 24px;
  }

  .btn-primary span {
    display: none;
  }

  .btn-primary {
    width: 44px;
    padding: 0;
    justify-content: center;
  }

  .dict-main {
    flex-wrap: wrap;
    padding: var(--zen-space-md);
  }

  .dict-icon {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .dict-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: var(--zen-space-sm);
    padding-top: var(--zen-space-sm);
    border-top: 1px solid var(--zen-hairline);
  }

  .format-grid {
    grid-template-columns: 1fr;
  }
}
</style>
