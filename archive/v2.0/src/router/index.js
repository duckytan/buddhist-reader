import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Bookshelf',
    component: () => import('@/pages/Bookshelf.vue'),
    meta: { title: '书架' }
  },
  {
    path: '/reader/:sutraId?',
    name: 'Reader',
    component: () => import('@/pages/Reader.vue'),
    meta: { title: '阅读' }
  },
  {
    path: '/dict',
    name: 'DictManager',
    component: () => import('@/pages/DictManager.vue'),
    meta: { title: '词典管理' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Settings.vue'),
    meta: { title: '设置' }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/pages/Stats.vue'),
    meta: { title: '功德' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

// 路由守卫 — 更新页面标题
router.beforeEach((to, from, next) => {
  const title = to.meta.title
  if (title) {
    document.title = `${title} - 般若佛经阅读器`
  }
  next()
})

export default router
