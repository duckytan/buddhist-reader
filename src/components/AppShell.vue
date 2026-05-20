<template>
  <div class="app-shell">
    <AppTabBar />
    <main class="app-shell__content">
      <router-view v-slot="{ Component }">
        <KeepAlive :include="['Bookshelf', 'Notes', 'DictSearch', 'Settings']">
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import AppTabBar from './AppTabBar.vue'
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}
.app-shell__content {
  /* 窄屏：底部 Tab 推开内容 */
  padding-bottom: 60px;
}

/* 宽屏：侧边 Tab 推开内容 */
@media (min-width: 768px) {
  .app-shell__content {
    padding-bottom: 0;
    margin-left: 72px;
  }
}
</style>
