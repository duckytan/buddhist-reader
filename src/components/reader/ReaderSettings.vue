<template>
  <BaseSheet
    :open="open"
    title="阅读设置"
    @close="emit('close')"
  >
    <div class="settings">
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
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
/**
 * 阅读设置面板（方案 §6.3 / §6.7）。
 *
 * 字号/行距/主题即时生效（状态 → `settingsService` 持久化 → 刷新保持）；
 * **无 DOM 副作用**：样式经 `useReaderSettings` 的声明式绑定应用到阅读器根元素。
 * 4 主题颜色全部来自 `themes.css` 变量（单一来源，无硬编码色值）。
 */

import BaseSheet from '@/components/common/BaseSheet.vue'
import {
  FONT_SIZE_STEPS,
  LINE_HEIGHT_STEPS,
  useReaderSettings
} from '@/composables/useReaderSettings'
import type { ThemeName } from '@/types/reader'

interface Props {
  /** 是否展开 */
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{ close: [] }>()

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
  setTheme
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
</style>
