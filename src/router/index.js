import { createRouter, createWebHistory } from 'vue-router'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router