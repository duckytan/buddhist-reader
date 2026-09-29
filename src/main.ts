import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './app/router'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/base.css'

/**
 * 应用入口（v4.0）。
 * 挂载顺序：Pinia → Router → App。业务初始化由各 store / service 自行负责。
 */
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
