import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Import pages
import Dashboard from './pages/Dashboard.vue'
import Holdings from './pages/Holdings.vue'
import Settings from './pages/Settings.vue'

// Router configuration
const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, name: 'dashboard' },
  { path: '/holdings', component: Holdings, name: 'holdings' },
  { path: '/settings', component: Settings, name: 'settings' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
