<template>
  <div class="theme-switcher">
    <button
      v-for="t in themes"
      :key="t.value"
      :class="['theme-dot', { active: settingStore.theme === t.value }]"
      @click="settingStore.updateSetting('theme', t.value)"
      :title="t.label"
    />
  </div>
</template>

<script setup>
import { useSettingStore } from '@/stores/setting'

const settingStore = useSettingStore()

const themes = [
  { value: 'day', label: '日间模式', color: '#ffffff' },
  { value: 'dark', label: '夜间模式', color: '#1a1a1a' },
  { value: 'eye-care', label: '护眼模式', color: '#f5f0e8' }
]
</script>

<style scoped>
.theme-switcher {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs);
  background: var(--color-surface);
  border-radius: var(--radius-pill);
}

.theme-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--color-hairline);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-dot:nth-child(1) {
  background: #ffffff;
}

.theme-dot:nth-child(2) {
  background: #1a1a1a;
}

.theme-dot:nth-child(3) {
  background: #f5f0e8;
}

.theme-dot.active {
  border-color: var(--color-accent);
  transform: scale(1.1);
}

.theme-dot:hover {
  border-color: var(--color-accent-light);
}
</style>
