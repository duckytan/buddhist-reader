import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'bookshelf',
    component: () => import('../pages/Bookshelf.vue')
  },
  {
    path: '/reader/:id',
    name: 'reader',
    component: () => import('../pages/Reader.vue')
  },
  {
    path: '/dicts',
    name: 'dicts',
    component: () => import('../pages/DictManager.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router