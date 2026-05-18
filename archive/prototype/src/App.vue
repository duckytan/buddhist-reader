<template>
  <div class="app-container" :data-theme="currentTheme">
    <div class="device-indicator"></div>

    <!-- Desktop Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <h1 class="logo">般若</h1>
        <p class="logo-subtitle">佛经阅读器</p>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="theme-switch">
          <button
            v-for="t in themes"
            :key="t.value"
            class="theme-btn"
            :class="{ active: currentTheme === t.value }"
            @click="setTheme(t.value)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Header -->
    <header class="mobile-header">
      <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>
      <h1 class="mobile-title">{{ currentPageName }}</h1>
      <div class="header-actions">
        <button class="icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Mobile Bottom Nav -->
    <nav class="bottom-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="bottom-nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const sidebarOpen = ref(false)
const currentTheme = ref('day')

const themes = [
  { value: 'day', label: '日' },
  { value: 'dark', label: '夜' },
  { value: 'eye-care', label: '护眼' }
]

const navItems = [
  { path: '/bookshelf', label: '书架', icon: '📚' },
  { path: '/reader', label: '阅读', icon: '📖' },
  { path: '/dict', label: '词典', icon: '🔤' },
  { path: '/settings', label: '设置', icon: '⚙️' }
]

const currentPageName = computed(() => {
  const item = navItems.find(n => n.path === route.path)
  return item ? item.label : ''
})

const setTheme = (theme) => {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
}
</script>

<style>
/* ===== Layout ===== */
.app-container {
  min-height: 100vh;
  background: var(--zen-canvas);
}

/* ===== Desktop Sidebar ===== */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: var(--zen-surface);
  border-right: 1px solid var(--zen-hairline);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: var(--zen-space-lg);
  border-bottom: 1px solid var(--zen-hairline);
}

.logo {
  font-family: var(--zen-font-serif);
  font-size: 28px;
  font-weight: 600;
  color: var(--zen-ink);
  margin: 0;
}

.logo-subtitle {
  font-size: 13px;
  color: var(--zen-ink-muted);
  margin-top: 4px;
}

.sidebar-nav {
  flex: 1;
  padding: var(--zen-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--zen-space-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--zen-space-sm);
  padding: var(--zen-space-sm) var(--zen-space-md);
  border-radius: var(--zen-radius-interactive);
  color: var(--zen-ink-muted);
  text-decoration: none;
  font-size: 15px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--zen-surface-soft);
  color: var(--zen-ink);
}

.nav-item.active {
  background: var(--zen-accent);
  color: var(--zen-on-accent);
}

.nav-icon {
  font-size: 18px;
}

.sidebar-footer {
  padding: var(--zen-space-lg);
  border-top: 1px solid var(--zen-hairline);
}

.theme-switch {
  display: flex;
  gap: var(--zen-space-xs);
  background: var(--zen-canvas);
  padding: 4px;
  border-radius: var(--zen-radius-interactive);
}

.theme-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: var(--zen-radius-interactive);
  font-size: 13px;
  color: var(--zen-ink-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn.active {
  background: var(--zen-accent);
  color: var(--zen-on-accent);
}

/* ===== Mobile Header ===== */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--zen-canvas);
  border-bottom: 1px solid var(--zen-hairline);
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--zen-space-md);
  z-index: 50;
}

.menu-btn,
.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--zen-radius-interactive);
  color: var(--zen-ink);
  cursor: pointer;
}

.mobile-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--zen-ink);
}

/* ===== Bottom Navigation ===== */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--zen-surface);
  border-top: 1px solid var(--zen-hairline);
  z-index: 50;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--zen-ink-muted);
  text-decoration: none;
  font-size: 11px;
  transition: color 0.2s ease;
}

.bottom-nav-item.active {
  color: var(--zen-accent);
}

.bottom-nav-item .nav-icon {
  font-size: 20px;
}

/* ===== Main Content ===== */
.main-content {
  margin-left: 240px;
  min-height: 100vh;
  padding: var(--zen-space-xl);
}

/* ===== Sidebar Overlay ===== */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 90;
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 1023px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
    padding-top: calc(56px + var(--zen-space-lg));
    padding-bottom: calc(56px + var(--zen-space-lg));
  }

  .mobile-header {
    display: flex;
  }

  .bottom-nav {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 767px) {
  .main-content {
    padding: calc(56px + var(--zen-space-md)) var(--zen-space-md) calc(56px + var(--zen-space-md));
  }
}
</style>
