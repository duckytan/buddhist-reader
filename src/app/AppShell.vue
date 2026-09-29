<template>
  <div
    class="app-shell"
    :data-theme="theme"
    :style="cssVars"
  >
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
/**
 * 应用外壳（方案 §5 M15 / §6.7）。
 *
 * - 4 个 Tab 路由（书架 / 词典 / 笔记 / 设置）挂载于 `<KeepAlive>` 下，切 Tab
 *   保留各页状态（如书架的筛选、笔记的搜索词）；
 * - **主题应用点**：`data-theme` + 字号/行距 CSS 变量绑定到外壳根，使 4 个 Tab 页
 *   随主题即时变色（§6.7）；`settings` store 仍**无 DOM 副作用**（§6.8）——样式经
 *   `useReaderSettings` **声明式**绑定，非 `document` 操作（守 §11）。
 */

import { RouterView } from 'vue-router'

import AppTabBar from '@/components/common/AppTabBar.vue'
import { useReaderSettings } from '@/composables/useReaderSettings'

const { theme, cssVars } = useReaderSettings()
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas);
  color: var(--color-ink);
}

.app-shell__main {
  flex: 1 1 auto;
  /* 给底部 Tab 栏留出安全距离 */
  padding-bottom: var(--spacing-section);
}
</style>
