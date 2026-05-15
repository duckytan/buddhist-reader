<template>
  <button
    class="theme-toggle"
    @click="cycleTheme"
  >
    {{ themeIcon(settingsStore.theme) }}
  </button>
</template>

<script setup>
import { useSettingsStore } from '../../stores/settings'
import { useTheme } from '../../composables/useTheme'

const settingsStore = useSettingsStore()
const { cycleTheme } = useTheme()

const icons = { paper: '宣', night: '夜', 'eye-care': '护' }
function themeIcon(t) { return icons[t] || t }
</script>

<style scoped>
.theme-toggle {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-body-sm); color: var(--color-ink-muted);
}
</style>