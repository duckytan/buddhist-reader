import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import Vant from 'vant'
import 'vant/lib/index.css'

import './assets/styles/reset.scss'
import './assets/styles/global.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')
