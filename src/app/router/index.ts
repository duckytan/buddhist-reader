import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由表（v4.0 骨架）。
 *
 * 5 条路由：
 * - `/`         书架（Tab）
 * - `/dict`     词典（Tab）
 * - `/notes`    笔记（Tab）
 * - `/settings` 设置（Tab）
 * - `/read/:id` 阅读器（全屏，脱离 Tab 壳）
 *
 * 采用 hash 历史（保留旧版约定：中文文件名 + hash 路由，见方案 §13 §6.②）。
 * 4 个 Tab 路由挂在 `AppShell` 布局下，由 `<KeepAlive>` 保留页面状态。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/app/AppShell.vue'),
    children: [
      {
        path: '',
        name: 'bookshelf',
        component: () => import('@/views/BookshelfView.vue')
      },
      {
        path: 'dict',
        name: 'dict',
        component: () => import('@/views/DictSearchView.vue')
      },
      {
        path: 'notes',
        name: 'notes',
        component: () => import('@/views/NotesView.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue')
      }
    ]
  },
  {
    path: '/read/:id',
    name: 'reader',
    component: () => import('@/views/ReaderView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
