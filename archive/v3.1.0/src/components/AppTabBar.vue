<template>
  <nav class="app-tab-bar">
    <router-link
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="app-tab-bar__item"
      :class="{ 'app-tab-bar__item--active': isActive(tab.path) }"
    >
      <span class="app-tab-bar__icon">
        <svg
          v-if="tab.icon === 'bookshelf'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <path d="M8 3v18"/>
          <path d="M12 8h4"/>
          <path d="M12 12h4"/>
          <path d="M12 16h3"/>
        </svg>
        <svg
          v-else-if="tab.icon === 'notes'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
        <svg
          v-else-if="tab.icon === 'dict'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2c-4 4-6 8-6 12a6 6 0 1 0 12 0c0-4-2-8-6-12z"/>
          <path d="M12 18v-6"/>
          <path d="M10 14h4"/>
        </svg>
        <svg
          v-else-if="tab.icon === 'settings'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v3"/>
          <path d="M12 20v3"/>
          <path d="M4.22 4.22l2.12 2.12"/>
          <path d="M17.66 17.66l2.12 2.12"/>
          <path d="M1 12h3"/>
          <path d="M20 12h3"/>
          <path d="M4.22 19.78l2.12-2.12"/>
          <path d="M17.66 6.34l2.12-2.12"/>
        </svg>
      </span>
      <span class="app-tab-bar__label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/', label: '书架', icon: 'bookshelf' },
  { path: '/notes', label: '笔记', icon: 'notes' },
  { path: '/dicts', label: '词典', icon: 'dict' },
  { path: '/settings', label: '设置', icon: 'settings' }
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

onMounted(() => {
  console.log('[AppTabBar] mounted, current route:', route.path)
})
</script>

<style scoped>
.app-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  background: var(--color-surface);
  border-top: 1px solid var(--color-hairline);
  z-index: 40;
}

.app-tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--spacing-xxs) var(--spacing-sm);
  color: var(--color-ink-muted);
  text-decoration: none;
  transition: color 0.2s;
  min-width: var(--touch-target);
  min-height: var(--touch-target);
}

.app-tab-bar__item--active {
  color: var(--color-accent);
}

.app-tab-bar__icon {
  width: 24px;
  height: 24px;
}

.app-tab-bar__label {
  font-family: var(--font-serif);
  font-size: var(--text-caption);
}

@media (min-width: 768px) {
  .app-tab-bar {
    top: 0;
    bottom: auto;
    right: auto;
    width: 72px;
    height: 100vh;
    height: 100dvh;
    flex-direction: column;
    justify-content: flex-start;
    padding-top: var(--spacing-xl);
    gap: var(--spacing-lg);
    border-top: none;
    border-right: 1px solid var(--color-hairline);
  }

  .app-tab-bar__icon {
    width: 20px;
    height: 20px;
  }

  .app-tab-bar__label {
    font-size: var(--text-body-sm);
  }
}
</style>