import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/tokens.css'
import './styles/base.css'
import './styles/themes.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

import { useSettingsStore } from './stores/settings'
const settingsStore = useSettingsStore()
settingsStore.initFromStorage()

app.config.errorHandler = (err, instance, info) => {
  console.error(`[Vue Error] ${info}:`, err)
}

app.mount('#app')