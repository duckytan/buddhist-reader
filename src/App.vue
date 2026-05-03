<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useDictStore } from '@/stores/dict'

const dictStore = useDictStore()

onMounted(async () => {
  await dictStore.loadExternalDictionaries()
})
</script>

<style scoped>
</style>
