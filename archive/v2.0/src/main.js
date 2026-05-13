import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant 4
import Vant from 'vant'
import 'vant/lib/index.css'

// 禅意设计系统
import './styles/tokens.css'
import './styles/base.css'
import './styles/vant-override.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')
