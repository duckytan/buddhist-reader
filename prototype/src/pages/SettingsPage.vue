<template>
  <div class="settings-page">
    <!-- Page Header -->
    <header class="page-header">
      <h1 class="page-title">设置</h1>
    </header>

    <!-- Settings Sections -->
    <div class="settings-layout">
      <!-- Main Settings -->
      <main class="settings-main">
        <!-- Appearance -->
        <section class="settings-section">
          <h2 class="section-title">外观</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h3>主题</h3>
                <p>选择应用的外观风格</p>
              </div>
              <div class="theme-options">
                <button
                  v-for="t in themes"
                  :key="t.value"
                  class="theme-option"
                  :class="{ active: currentTheme === t.value }"
                  @click="setTheme(t.value)"
                >
                  <span class="theme-preview" :style="{ background: t.bg }">
                    <span class="theme-text" :style="{ color: t.text }">般</span>
                  </span>
                  <span class="theme-name">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>字体</h3>
                <p>选择经文章节字体</p>
              </div>
              <select class="select-input" v-model="settings.font">
                <option value="serif">宋体（传统）</option>
                <option value="sans">黑体（现代）</option>
                <option value="mix">混排（标题宋体 + 正文黑体）</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Reading -->
        <section class="settings-section">
          <h2 class="section-title">阅读</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h3>正文字号</h3>
                <p>经文正文的字体大小</p>
              </div>
              <div class="slider-control">
                <button class="slider-btn" @click="adjustFontSize(-1)">A-</button>
                <span class="slider-value">{{ settings.fontSize }}px</span>
                <button class="slider-btn" @click="adjustFontSize(1)">A+</button>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>行高</h3>
                <p>经文正文的行间距</p>
              </div>
              <div class="slider-control">
                <button class="slider-btn" @click="adjustLineHeight(-0.1)">-</button>
                <span class="slider-value">{{ settings.lineHeight.toFixed(1) }}</span>
                <button class="slider-btn" @click="adjustLineHeight(0.1)">+</button>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>自动诵读</h3>
                <p>进入阅读页自动播放语音</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.autoTTS">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>高亮动画</h3>
                <p>点击词条时的动画效果</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.highlightAnimation">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Dictionary -->
        <section class="settings-section">
          <h2 class="section-title">词典</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h3>即时查询</h3>
                <p>点击高亮词条立即显示释义</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.instantLookup">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>高亮上限</h3>
                <p>单页最多高亮词条数</p>
              </div>
              <select class="select-input" v-model="settings.highlightLimit">
                <option :value="50">50 个</option>
                <option :value="100">100 个</option>
                <option :value="200">200 个</option>
                <option :value="0">无限制</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Data -->
        <section class="settings-section">
          <h2 class="section-title">数据</h2>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-info">
                <h3>阅读进度</h3>
                <p>自动保存阅读位置</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.saveProgress">
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>笔记同步</h3>
                <p>笔记自动保存到云端</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.syncNotes">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- About -->
        <section class="settings-section">
          <h2 class="section-title">关于</h2>
          <div class="settings-card">
            <div class="about-info">
              <div class="app-icon">般若</div>
              <div class="app-details">
                <h3>般若佛经阅读器</h3>
                <p>版本 2.0.0</p>
                <p class="copyright">Pure frontend, privacy-first</p>
              </div>
            </div>
            <div class="about-links">
              <a href="#" class="link-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
                GitHub
              </a>
              <a href="#" class="link-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                文档
              </a>
              <a href="#" class="link-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                帮助
              </a>
            </div>
          </div>
        </section>
      </main>

      <!-- Sidebar Preview -->
      <aside class="settings-sidebar">
        <div class="preview-card">
          <h3>阅读预览</h3>
          <div class="preview-content" :style="previewStyle">
            <p class="preview-text">
              <template v-for="(seg, i) in previewSegments" :key="i">
                <mark v-if="seg.h" class="preview-highlight">{{ seg.t }}</mark>
                <span v-else>{{ seg.t }}</span>
              </template>
            </p>
          </div>
          <div class="preview-controls">
            <button class="preview-btn" @click="adjustFontSize(-1)">A-</button>
            <button class="preview-btn" @click="adjustFontSize(1)">A+</button>
            <button class="preview-btn" @click="adjustLineHeight(-0.1)">行-</button>
            <button class="preview-btn" @click="adjustLineHeight(0.1)">行+</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const currentTheme = ref('day')

const themes = [
  { value: 'day', label: '日间', bg: '#ffffff', text: '#2c2c2c' },
  { value: 'dark', label: '暗色', bg: '#1a1a1a', text: '#e0e0e0' },
  { value: 'eye-care', label: '护眼', bg: '#f5e6c8', text: '#3c2e1e' }
]

const settings = ref({
  font: 'serif',
  fontSize: 18,
  lineHeight: 1.8,
  autoTTS: false,
  highlightAnimation: true,
  instantLookup: true,
  highlightLimit: 100,
  saveProgress: true,
  syncNotes: false
})

const previewStyle = computed(() => ({
  fontSize: settings.value.fontSize + 'px',
  lineHeight: settings.value.lineHeight,
  fontFamily: settings.value.font === 'serif'
    ? 'var(--zen-font-serif)'
    : settings.value.font === 'sans'
    ? 'var(--zen-font-sans)'
    : 'var(--zen-font-serif)'
}))

const previewSegments = [
  { t: '须菩提，' },
  { t: '闻说是经' },
  { t: '，' },
  { t: '深解义趣' },
  { t: '，涕泪悲泣，合掌恭敬而白佛言：' }
]

const setTheme = (theme) => {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}

const adjustFontSize = (delta) => {
  const newSize = settings.value.fontSize + delta
  if (newSize >= 12 && newSize <= 32) {
    settings.value.fontSize = newSize
  }
}

const adjustLineHeight = (delta) => {
  const newHeight = parseFloat((settings.value.lineHeight + delta).toFixed(1))
  if (newHeight >= 1.2 && newHeight <= 2.5) {
    settings.value.lineHeight = newHeight
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--zen-space-xl);
}

.page-title {
  font-family: var(--zen-font-serif);
  font-size: 32px;
  font-weight: 600;
  color: var(--zen-ink);
}

/* ===== Layout ===== */
.settings-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--zen-space-xl);
  align-items: start;
}

/* ===== Section ===== */
.settings-section {
  margin-bottom: var(--zen-space-xl);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--zen-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--zen-space-sm);
}

/* ===== Card ===== */
.settings-card {
  background: var(--zen-canvas);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-container);
  overflow: hidden;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--zen-space-lg);
  border-bottom: 1px solid var(--zen-hairline);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: 2px;
}

.setting-info p {
  font-size: 13px;
  color: var(--zen-ink-muted);
}

.setting-info {
  flex: 1;
  min-width: 0;
  margin-right: var(--zen-space-lg);
}

/* ===== Theme Options ===== */
.theme-options {
  display: flex;
  gap: var(--zen-space-sm);
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: transparent;
  border: 2px solid var(--zen-hairline);
  border-radius: var(--zen-radius-container);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-option:hover {
  border-color: var(--zen-accent-light);
}

.theme-option.active {
  border-color: var(--zen-accent);
}

.theme-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--zen-radius-container);
  border: 1px solid var(--zen-hairline);
}

.theme-text {
  font-family: var(--zen-font-serif);
  font-size: 18px;
  font-weight: 600;
}

.theme-name {
  font-size: 12px;
  color: var(--zen-ink-muted);
}

/* ===== Select ===== */
.select-input {
  height: 40px;
  padding: 0 36px 0 14px;
  background: var(--zen-surface);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-interactive);
  font-size: 14px;
  color: var(--zen-ink);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.select-input:focus {
  outline: none;
  border-color: var(--zen-accent);
}

/* ===== Slider Control ===== */
.slider-control {
  display: flex;
  align-items: center;
  gap: var(--zen-space-sm);
}

.slider-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--zen-surface);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-interactive);
  font-size: 14px;
  color: var(--zen-ink);
  cursor: pointer;
  transition: all 0.2s;
}

.slider-btn:hover {
  border-color: var(--zen-accent);
  color: var(--zen-accent);
}

.slider-value {
  min-width: 48px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--zen-ink);
}

/* ===== Switch ===== */
.switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
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

/* ===== About ===== */
.about-info {
  display: flex;
  align-items: center;
  gap: var(--zen-space-lg);
  padding: var(--zen-space-lg);
}

.app-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--zen-accent);
  color: var(--zen-on-accent);
  font-family: var(--zen-font-serif);
  font-size: 24px;
  font-weight: 600;
  border-radius: var(--zen-radius-container);
}

.app-details h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: 4px;
}

.app-details p {
  font-size: 13px;
  color: var(--zen-ink-muted);
}

.copyright {
  margin-top: 4px;
}

.about-links {
  display: flex;
  gap: var(--zen-space-lg);
  padding: var(--zen-space-md) var(--zen-space-lg);
  border-top: 1px solid var(--zen-hairline);
}

.link-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--zen-accent);
  text-decoration: none;
}

.link-item:hover {
  text-decoration: underline;
}

/* ===== Sidebar Preview ===== */
.settings-sidebar {
  position: sticky;
  top: var(--zen-space-xl);
}

.preview-card {
  background: var(--zen-surface);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-container);
  overflow: hidden;
}

.preview-card h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--zen-ink);
  padding: var(--zen-space-md) var(--zen-space-lg);
  border-bottom: 1px solid var(--zen-hairline);
}

.preview-content {
  padding: var(--zen-space-lg);
  min-height: 200px;
  font-family: var(--zen-font-serif);
  color: var(--zen-ink);
}

.preview-text {
  margin: 0;
}

.preview-highlight {
  background: var(--zen-highlight-mind);
  color: var(--zen-highlight-text-mind);
  padding: 1px 2px;
  border-radius: 2px;
}

.preview-controls {
  display: flex;
  gap: var(--zen-space-xs);
  padding: var(--zen-space-sm) var(--zen-space-lg) var(--zen-space-lg);
  flex-wrap: wrap;
}

.preview-btn {
  padding: 6px 12px;
  background: var(--zen-canvas);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-interactive);
  font-size: 12px;
  color: var(--zen-ink-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover {
  border-color: var(--zen-accent);
  color: var(--zen-accent);
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 1023px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    position: static;
    order: -1;
  }

  .preview-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--zen-space-md);
  }

  .preview-card h3 {
    border-bottom: none;
    padding-bottom: 0;
  }

  .preview-content {
    flex: 1;
    min-width: 200px;
  }

  .preview-controls {
    padding: 0 var(--zen-space-lg) var(--zen-space-lg);
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 767px) {
  .page-title {
    font-size: 24px;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--zen-space-md);
  }

  .setting-info {
    margin-right: 0;
  }

  .theme-options {
    width: 100%;
    justify-content: space-between;
  }

  .about-info {
    flex-direction: column;
    text-align: center;
  }

  .about-links {
    justify-content: center;
  }

  .preview-card {
    flex-direction: column;
  }

  .preview-controls {
    width: 100%;
  }

  .preview-btn {
    flex: 1;
  }
}
</style>
