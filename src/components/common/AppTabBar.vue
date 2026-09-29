<template>
  <nav
    class="tab-bar"
    aria-label="主导航"
  >
    <RouterLink
      v-for="item in tabs"
      :key="item.name"
      :to="{ name: item.name }"
      class="tab-bar__item"
      active-class="tab-bar__item--active"
    >
      <span
        class="tab-bar__icon"
        aria-hidden="true"
      >{{ item.icon }}</span>
      <span class="tab-bar__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface TabItem {
  /** 路由名（对应 `router/index.ts`） */
  name: string
  /** 展示文案 */
  label: string
  /** 轻量图标（字符占位，M3 可替换为 SVG） */
  icon: string
}

/** 4 个 Tab 入口（方案 §5 M15）。 */
const tabs: TabItem[] = [
  { name: 'bookshelf', label: '书架', icon: '📖' },
  { name: 'dict', label: '词典', icon: '🔍' },
  { name: 'notes', label: '笔记', icon: '✎' },
  { name: 'settings', label: '设置', icon: '⚙' }
]
</script>

<style scoped>
.tab-bar {
  position: fixed;
  inset: auto 0 0 0;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-hairline);
  z-index: 20;
}

.tab-bar__item {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xxs);
  min-height: var(--touch-target);
  padding: var(--spacing-xs) 0;
  color: var(--color-ink-muted);
  font-size: var(--text-caption);
  text-decoration: none;
}

.tab-bar__item--active {
  color: var(--color-accent);
}

.tab-bar__icon {
  font-size: var(--text-body);
  line-height: 1;
}

/* 宽屏改为左侧栏（方案 §5 M15：窄屏底部 / 宽屏侧边） */
@media (min-width: 768px) {
  .tab-bar {
    inset: 0 auto 0 0;
    width: 88px;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-lg);
    border-top: none;
    border-right: 1px solid var(--color-hairline);
  }

  .tab-bar__item {
    flex: 0 0 auto;
  }
}
</style>
