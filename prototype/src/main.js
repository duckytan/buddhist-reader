import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import 'vant/lib/index.css'
import './styles/tokens.css'

import BookshelfPage from './pages/BookshelfPage.vue'
import ReaderPage from './pages/ReaderPage.vue'
import DictManagerPage from './pages/DictManagerPage.vue'
import SettingsPage from './pages/SettingsPage.vue'

const routes = [
  { path: '/', redirect: '/bookshelf' },
  { path: '/bookshelf', component: BookshelfPage, name: '书架' },
  { path: '/reader', component: ReaderPage, name: '阅读' },
  { path: '/dict', component: DictManagerPage, name: '词典' },
  { path: '/settings', component: SettingsPage, name: '设置' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
