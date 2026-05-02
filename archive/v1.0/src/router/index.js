import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Bookshelf',
    component: () => import('@/pages/Bookshelf.vue'),
    meta: { title: '书架' }
  },
  {
    path: '/reader/:id',
    name: 'Reader',
    component: () => import('@/pages/Reader.vue'),
    meta: { title: '阅读' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Settings.vue'),
    meta: { title: '设置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 般若佛经阅读器` : '般若佛经阅读器'
  next()
})

export default router
