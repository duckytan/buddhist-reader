<template>
  <div class="settings">
    <header class="settings-header">
      <button class="back-btn" @click="router.push('/')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="settings-title">设置</h1>
      <div class="settings-spacer" />
    </header>

    <div class="settings-section">
      <h2 class="section-title">显示</h2>
      <div class="setting-item">
        <label class="setting-label">主题</label>
        <div class="theme-options">
          <button
            v-for="t in themes"
            :key="t.value"
            :class="['theme-btn', { active: settingStore.theme === t.value }]"
            @click="settingStore.updateSetting('theme', t.value)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">正文字号</label>
        <div class="font-size-control">
          <button class="size-btn" @click="changeFontSize(-1)">−</button>
          <span class="size-value">{{ settingStore.fontSize }}px</span>
          <button class="size-btn" @click="changeFontSize(1)">+</button>
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">行高</label>
        <div class="line-height-control">
          <input
            type="range"
            min="1.4"
            max="2.2"
            step="0.1"
            :value="settingStore.lineHeight"
            @input="settingStore.updateSetting('lineHeight', parseFloat($event.target.value))"
          />
          <span class="value-label">{{ settingStore.lineHeight }}</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="section-title">阅读</h2>
      <div class="setting-item">
        <label class="setting-label">词典高亮模式</label>
        <div class="highlight-options">
          <button
            v-for="m in highlightModes"
            :key="m.value"
            :class="['mode-btn', { active: settingStore.highlightMode === m.value }]"
            @click="settingStore.updateSetting('highlightMode', m.value)"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">TTS 语速</label>
        <div class="tts-rate-control">
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            :value="settingStore.ttsRate"
            @input="settingStore.updateSetting('ttsRate', parseFloat($event.target.value))"
          />
          <span class="value-label">{{ settingStore.ttsRate }}x</span>
        </div>
      </div>

      <div class="setting-item toggle-item">
        <label class="setting-label">启用 TTS 朗读</label>
        <label class="toggle-switch">
          <input
            type="checkbox"
            :checked="settingStore.ttsEnabled"
            @change="settingStore.updateSetting('ttsEnabled', $event.target.checked)"
          />
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <div class="settings-section danger-zone">
      <h2 class="section-title">数据</h2>
      <button class="reset-btn" @click="resetAll">重置所有设置</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useSettingStore } from '@/stores/setting'

const router = useRouter()
const settingStore = useSettingStore()

const themes = [
  { value: 'day', label: '日间' },
  { value: 'dark', label: '夜间' },
  { value: 'eye-care', label: '护眼' }
]

const highlightModes = [
  { value: 'background', label: '背景色' },
  { value: 'underline', label: '下划线' }
]

function changeFontSize(delta) {
  const newSize = Math.max(14, Math.min(24, settingStore.fontSize + delta))
  settingStore.updateSetting('fontSize', newSize)
}

async function resetAll() {
  if (confirm('确定要重置所有设置吗？')) {
    await settingStore.resetAllSettings()
  }
}
</script>

<style scoped>
.settings {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.settings-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.back-btn {
  width: var(--touch-target);
  height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--color-ink);
  background: transparent;
  cursor: pointer;
}

.back-btn:hover {
  background: var(--color-surface);
}

.settings-title {
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  flex: 1;
  text-align: center;
}

.settings-spacer {
  width: var(--touch-target);
}

.settings-section {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border-radius: var(--radius-container);
}

.section-title {
  font-family: var(--font-serif);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  margin-bottom: var(--spacing-md);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
}

.setting-item + .setting-item {
  border-top: 1px solid var(--color-hairline);
}

.setting-label {
  font-size: var(--text-body);
  color: var(--color-ink);
}

.theme-options,
.highlight-options {
  display: flex;
  gap: var(--spacing-xs);
}

.theme-btn,
.mode-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn.active,
.mode-btn.active {
  color: var(--color-canvas);
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.font-size-control,
.line-height-control,
.tts-rate-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.size-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  font-size: var(--text-body);
  cursor: pointer;
}

.size-value,
.value-label {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  min-width: 48px;
  text-align: center;
}

input[type="range"] {
  width: 120px;
  accent-color: var(--color-accent);
}

.toggle-item {
  display: flex;
  justify-content: space-between;
}

.toggle-switch input {
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

.danger-zone {
  border: 1px solid var(--color-error);
}

.reset-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-pill);
  background: var(--color-error);
  color: var(--color-canvas);
  font-size: var(--text-body-sm);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.reset-btn:hover {
  opacity: 0.9;
}
</style>
