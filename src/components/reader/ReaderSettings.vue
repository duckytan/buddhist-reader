<template>
  <Transition name="slide-up">
    <div
      v-if="visible"
      class="reader-settings"
    >
      <div
        class="reader-settings__overlay"
        @click="$emit('close')"
      />
      <div class="reader-settings__panel">
        <header class="reader-settings__header">
          <h3 class="reader-settings__title">
            阅读设置
          </h3>
          <button
            class="reader-settings__close"
            @click="$emit('close')"
          >
            &#10005;
          </button>
        </header>

        <section class="reader-settings__section">
          <h4 class="reader-settings__label">
            字体大小
          </h4>
          <div class="reader-settings__row">
            <button
              v-for="(size, i) in settingsStore.fontSizes"
              :key="i"
              :class="['reader-settings__size-btn', { active: settingsStore.fontSizeIndex === i }]"
              @click="settingsStore.setFontSize(i)"
            >
              {{ sizeLabel(i) }}
            </button>
          </div>
        </section>

        <section class="reader-settings__section">
          <h4 class="reader-settings__label">
            行间距
          </h4>
          <div class="reader-settings__row">
            <button
              v-for="(h, i) in settingsStore.lineHeights"
              :key="i"
              :class="['reader-settings__size-btn', { active: settingsStore.lineHeightIndex === i }]"
              @click="settingsStore.setLineHeight(i)"
            >
              {{ lineHeightLabel(i) }}
            </button>
          </div>
        </section>

        <section class="reader-settings__section">
          <h4 class="reader-settings__label">
            主题
          </h4>
          <div class="reader-settings__row">
            <button
              v-for="t in settingsStore.themes"
              :key="t"
              :class="['reader-settings__theme-btn', { active: settingsStore.theme === t }]"
              @click="settingsStore.setTheme(t)"
            >
              {{ themeLabel(t) }}
            </button>
          </div>
        </section>

        <div class="reader-settings__more">
          <router-link to="/settings" class="reader-settings__more-link">
            更多设置 &rarr;
          </router-link>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useSettingsStore } from '../../stores/settings'

defineProps({ visible: { type: Boolean, default: false } })
defineEmits(['close'])

const settingsStore = useSettingsStore()

const sizeLabels = ['小', '中', '大', '特大']
const lineHeightLabels = ['紧凑', '舒适', '宽松']
const themeLabels = { 'paper': '宣纸', 'night': '夜间', 'eye-care': '护眼' }

function sizeLabel(i) { return sizeLabels[i] }
function lineHeightLabel(i) { return lineHeightLabels[i] }
function themeLabel(t) { return themeLabels[t] || t }
</script>

<style scoped>
.reader-settings { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; }
.reader-settings__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.2); }
.reader-settings__panel {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
  border-radius: var(--radius-container) var(--radius-container) 0 0;
  max-height: 50vh; overflow-y: auto;
}
.reader-settings__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md); border-bottom: 1px solid var(--color-hairline);
}
.reader-settings__title { font-family: var(--font-serif); font-size: var(--text-h3); }
.reader-settings__close {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center; color: var(--color-ink-muted);
}
.reader-settings__section { padding: var(--spacing-md); }
.reader-settings__label { font-size: var(--text-body-sm); color: var(--color-ink-muted); margin-bottom: var(--spacing-sm); }
.reader-settings__row { display: flex; gap: var(--spacing-sm); }
.reader-settings__size-btn, .reader-settings__theme-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  background: var(--color-surface);
  transition: color 0.2s, background 0.2s;
}
.reader-settings__size-btn.active, .reader-settings__theme-btn.active {
  color: var(--color-canvas); background: var(--color-accent);
}
.reader-settings__more {
  text-align: center;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  border-top: 1px solid var(--color-hairline);
}
.reader-settings__more-link {
  font-size: var(--text-body-sm);
  color: var(--color-accent);
  text-decoration: none;
}
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s, transform 0.3s; }
.slide-up-enter-from { opacity: 0; transform: translateY(100%); }
.slide-up-leave-to { opacity: 0; transform: translateY(100%); }
</style>