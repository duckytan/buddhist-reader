import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../components/AppShell.vue'),
    children: [
      { path: '', name: 'bookshelf', component: () => import('../pages/Bookshelf.vue') },
      { path: 'notes', name: 'notes', component: () => import('../pages/Notes.vue') },
      { path: 'dicts', name: 'dicts', component: () => import('../pages/DictSearch.vue') },
      { path: 'settings', name: 'settings', component: () => import('../pages/Settings.vue') }
    ]
  },
  {
    path: '/reader/:id',
    name: 'reader',
    component: () => import('../pages/Reader.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
