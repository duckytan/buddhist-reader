import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Bookshelf',
    component: () => import('@/pages/Bookshelf.vue')
  },
  {
    path: '/reader/:id',
    name: 'Reader',
    component: () => import('@/pages/Reader.vue')
  },
  {
    path: '/dict-manager',
    name: 'DictManager',
    component: () => import('@/pages/DictManager.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Settings.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/pages/Stats.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
