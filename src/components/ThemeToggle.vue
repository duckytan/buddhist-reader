<template>
  <button class="theme-toggle" @click="toggleTheme" :title="buttonTitle">
    <span class="toggle-icon">{{ icon }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const isDarkMode = computed(() => themeStore.isDarkMode)

const icon = computed(() => {
  return isDarkMode.value ? '☀️' : '🌙'
})

const buttonTitle = computed(() => {
  return isDarkMode.value ? '切换到日间模式' : '切换到夜间模式'
})

const toggleTheme = () => {
  themeStore.toggleDarkMode()
}
</script>

<style scoped lang="scss">
.theme-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background-color: var(--bg-page);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--highlight-bg);
    border-color: var(--primary-color);
    transform: scale(1.05);
  }

  .toggle-icon {
    font-size: 20px;
  }
}
</style>
