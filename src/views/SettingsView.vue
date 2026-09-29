<template>
  <section class="view">
    <header class="view__header">
      <h1 class="view__title">
        设置
      </h1>
      <p class="view__subtitle">
        四主题：宣纸 / 墨夜 / 护眼 / 日间
      </p>
    </header>

    <div class="settings__row">
      <span class="settings__label">字号</span>
      <div class="settings__control">
        <button
          type="button"
          class="settings__step"
          aria-label="减小字号"
          :disabled="!canDecreaseFontSize"
          @click="decreaseFontSize"
        >
          A－
        </button>
        <span class="settings__value">{{ fontSizeIndex + 1 }} / {{ fontSteps }}</span>
        <button
          type="button"
          class="settings__step"
          aria-label="增大字号"
          :disabled="!canIncreaseFontSize"
          @click="increaseFontSize"
        >
          A＋
        </button>
      </div>
    </div>

    <div class="settings__row">
      <span class="settings__label">行距</span>
      <div class="settings__control">
        <button
          type="button"
          class="settings__step"
          aria-label="减小行距"
          :disabled="!canDecreaseLineHeight"
          @click="decreaseLineHeight"
        >
          －
        </button>
        <span class="settings__value">{{ lineHeightIndex + 1 }} / {{ lineSteps }}</span>
        <button
          type="button"
          class="settings__step"
          aria-label="增大行距"
          :disabled="!canIncreaseLineHeight"
          @click="increaseLineHeight"
        >
          ＋
        </button>
      </div>
    </div>

    <div class="settings__row settings__row--stack">
      <span class="settings__label">主题</span>
      <div
        class="settings__themes"
        role="group"
        aria-label="主题选择"
      >
        <button
          v-for="option in themes"
          :key="option.value"
          type="button"
          class="settings__theme"
          :class="{ 'settings__theme--active': theme === option.value }"
          :aria-pressed="theme === option.value"
          @click="setTheme(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <button
      type="button"
      class="settings__reset"
      @click="reset"
    >
      恢复默认
    </button>
  </section>
</template>

<script setup lang="ts">
/**
 * 设置视图（方案 §9 T09 / §6.7 / §6.8）——路由 `/settings`（Tab）。
 *
 * - 字号 / 行距 / **4 主题**（宣纸 `paper` / 墨夜 `night` / 护眼 `eye-care` / 日间 `day`）；
 * - **守 §6.8**：`settings` store **无任何 DOM 副作用**——本视图只改 store 状态，
 *   样式经 `useReaderSettings` 的 `data-theme` + CSS 变量**声明式绑定**应用到应用根
 *   （`AppShell`）与阅读器根（`ReaderView`），主题色全部来自 `themes.css` 变量；
 * - 设置持久化由 `settingsService` 承担，刷新保持。
 *
 * 口径与阅读器内 `ReaderSettings` 面板一致（同一 `useReaderSettings`，单一实现）。
 */

import {
  FONT_SIZE_STEPS,
  LINE_HEIGHT_STEPS,
  useReaderSettings
} from '@/composables/useReaderSettings'
import type { ThemeName } from '@/types/reader'

const {
  theme,
  fontSizeIndex,
  lineHeightIndex,
  canIncreaseFontSize,
  canDecreaseFontSize,
  canIncreaseLineHeight,
  canDecreaseLineHeight,
  increaseFontSize,
  decreaseFontSize,
  increaseLineHeight,
  decreaseLineHeight,
  setTheme,
  reset
} = useReaderSettings()

const fontSteps = FONT_SIZE_STEPS
const lineSteps = LINE_HEIGHT_STEPS

const themes: ReadonlyArray<{ value: ThemeName; label: string }> = [
  { value: 'paper', label: '宣纸' },
  { value: 'night', label: '墨夜' },
  { value: 'eye-care', label: '护眼' },
  { value: 'day', label: '日间' }
]
</script>

<style scoped>
.view {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.view__header {
  margin-bottom: var(--spacing-lg);
}

.view__title {
  font-size: var(--text-h1);
}

.view__subtitle {
  margin-top: var(--spacing-xxs);
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-hairline);
}

.settings__row--stack {
  flex-direction: column;
  align-items: stretch;
}

.settings__label {
  color: var(--color-ink);
  font-size: var(--text-body-sm);
}

.settings__control {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.settings__step {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  color: var(--color-accent);
  font-size: var(--text-body);
}

.settings__step:disabled {
  color: var(--color-ink-subtle);
  opacity: 0.5;
}

.settings__value {
  min-width: 48px;
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
  text-align: center;
}

.settings__themes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.settings__theme {
  min-height: var(--touch-target);
  padding: 0 var(--spacing-lg);
  background: var(--tag-bg);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  color: var(--tag-text);
  font-size: var(--text-body-sm);
}

.settings__theme--active {
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
  font-weight: var(--weight-medium);
}

.settings__reset {
  margin-top: var(--spacing-lg);
  min-height: var(--button-height);
  padding: 0 var(--spacing-lg);
  background: var(--btn-ghost-bg);
  border: 1px solid var(--color-hairline-strong);
  border-radius: var(--radius-pill);
  color: var(--btn-ghost-text);
  font-size: var(--text-body-sm);
}
</style>
