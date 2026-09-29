import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/tokens.css'
import './styles/base.css'
import './styles/themes.css'

console.log(
  `%c[Buddhist-Reader] %cv${__APP_VERSION__} %c| %cCommit: ${__COMMIT_HASH__}`,
  'color: #8b7355; font-weight: bold;',
  'color: #2c2c2c; font-weight: bold;',
  'color: #8b7355;',
  'color: #2c2c2c;'
)

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.config.errorHandler = (err, instance, info) => {
  console.error(`[Vue Error] ${info}:`, err)
}

app.mount('#app')
console.log('[App] mounted')

import { useSettingsStore } from './stores/settings'
const settingsStore = useSettingsStore()
settingsStore.initFromStorage()
console.log('[App] settings initialized')

router.beforeEach((to, from, next) => {
  console.log(`[Router] ${from.path || '(enter)'} → ${to.fullPath}`)
  next()
})

router.afterEach((to, from) => {
  console.log(`[Router] navigated → ${to.fullPath} (name: ${to.name || 'none'})`)
  console.log('[Router] matched:', to.matched.map(r => r.path).join(' > '))
})
