<template>
  <div class="reader-page">
    <h1>阅读器</h1>
    <p>经文阅读页开发中...</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
console.log('Loading sutra:', route.params.id)
</script>

<style scoped>
.reader-page {
  padding: 16px;
  text-align: center;
}
</style>
