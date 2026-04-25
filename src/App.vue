<template>
  <div id="app" :class="{ 'dark-mode': isDarkMode }">
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()
const isDarkMode = computed(() => themeStore.isDarkMode)
</script>

<style scoped>
#app {
  min-height: 100vh;
  background-color: var(--bg-page);
  color: var(--text-primary);
  transition: background-color var(--transition-base), color var(--transition-base);
}
</style>
