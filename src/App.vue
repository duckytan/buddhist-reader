<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useDictStore } from '@/stores/dict'

onMounted(async () => {
  const dictStore = useDictStore()
  await dictStore.initDicts()
})
</script>

<style lang="scss">
:root {
  --color-primary: #8B7355;
  --color-primary-light: #A89279;
  --color-primary-dark: #6B5740;
  --color-bg: #FAF8F5;
  --color-bg-dark: #1A1A1A;
  --color-bg-warm: #F5F0E8;
  --color-text: #333333;
  --color-text-light: #666666;
  --color-text-dark: #E0E0E0;
  --color-border: #E8E4DE;
  --color-highlight-1: #FFE4B5;
  --color-highlight-2: #E0F0E0;
  --color-highlight-3: #E0E8F0;
  --color-highlight-4: #F0E0F0;
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-family-sanskrit: 'Noto Sans Devanagari', 'Siddhanta', var(--font-family-base);
  --font-size-base: 16px;
  --line-height-base: 1.8;
  --spacing-unit: 4px;
  --radius-base: 8px;
  --shadow-base: 0 2px 8px rgba(0, 0, 0, 0.08);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>
