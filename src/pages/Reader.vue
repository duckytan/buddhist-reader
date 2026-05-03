<template>
  <div class="reader">
    <h1>阅读器</h1>
    <p>经文阅读开发中...</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

// Reader — 阅读器页
const route = useRoute()
const sutraId = route.params.sutraId
</script>

<style scoped>
.reader {
  padding: var(--spacing-lg);
}

h1 {
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  margin-bottom: var(--spacing-lg);
}
</style>
