<template>
  <div class="app-shell">
    <main class="app-shell__main">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>

    <AppTabBar />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppTabBar from '@/components/common/AppTabBar.vue'
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas);
}

.app-shell__main {
  flex: 1 1 auto;
  /* 给底部 Tab 栏留出安全距离 */
  padding-bottom: var(--spacing-section);
}
</style>
