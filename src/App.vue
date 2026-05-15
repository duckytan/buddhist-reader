<template>
  <div
    v-if="offline"
    class="offline-banner"
  >
    当前处于离线状态，仅可阅读已加载内容
  </div>
  <router-view />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const offline = ref(false)

function updateOnlineStatus() {
  offline.value = !navigator.onLine
}

onMounted(() => {
  offline.value = !navigator.onLine
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<style scoped>
.offline-banner {
  text-align: center;
  padding: var(--spacing-xs);
  background: var(--color-warning);
  color: var(--color-canvas);
  font-size: var(--text-body-sm);
  position: sticky; top: 0; z-index: 50;
}
</style>