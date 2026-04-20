import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './styles/tokens.css'  // Neutral palette + semantic-state tokens (load first)
import './style.css'          // Brand theme (overrides apply)

// Import performance utilities
import '@/utils/widgetPreloader'

// Import and initialize auto-update scheduler
import { autoUpdateScheduler } from '@/utils/autoUpdateScheduler.js'

// Import cache warmup service
import { cacheWarmupService } from '@/utils/cacheWarmupService.js'

// Router configuration
// WS-C PR-C2: All pages are lazy-imported via `() => import(...)` so Vite
// emits each route as its own chunk. This drops the initial JS bundle
// to just what's needed for the landing route (market-overview) + shell.
// Eager pre-imports at top of file were removed; each route loads on first
// navigation and is cached by the browser thereafter.
const routes = [
  { path: '/', redirect: '/market-overview' },
  { path: '/market-overview', component: () => import('./pages/MarketDashboard.vue'), name: 'market-overview' },
  { path: '/stock-overview', component: () => import('./pages/StockDashboard.vue'), name: 'stock-overview' },
  { path: '/stock-overview/symbols/:symbol', component: () => import('./pages/StockDetail.vue'), name: 'stock-detail' },
  // Legacy redirects for backward compatibility
  { path: '/market-dashboard', redirect: '/market-overview' },
  { path: '/stock-dashboard', redirect: '/stock-overview' },
  { path: '/stock-dashboard/symbols/:symbol', redirect: to => `/stock-overview/symbols/${to.params.symbol}` },
  { path: '/settings', component: () => import('./pages/Settings.vue'), name: 'settings' },
  // Tools
  { path: '/technical-manager', component: () => import('./pages/TechnicalIndicatorsManager.vue'), name: 'technical-manager' },
  { path: '/auto-update-monitor', component: () => import('./pages/AutoUpdateMonitor.vue'), name: 'auto-update-monitor' },
  { path: '/system-manager', component: () => import('./pages/SystemManager.vue'), name: 'system-manager' },
  // Quant Strategy (Dev Only)
  ...(process.env.NODE_ENV === 'development' ? [
    { path: '/quant-strategy', component: () => import('./pages/QuantDashboard.vue'), name: 'quant-strategy' }
  ] : []),
  // Catch-all route for 404s
  { path: '/:pathMatch(.*)*', redirect: '/market-overview' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')

// Initialize auto-update scheduler after app is mounted
// Delay startup to avoid interfering with initial page load
setTimeout(() => {
  console.log('🚀 Initializing auto-update scheduler...')
  autoUpdateScheduler.start()
}, 10000) // Start after 10 seconds

// Initialize cache warmup service
// Start earlier to preload data before users navigate
setTimeout(() => {
  // console.log('🔥 Initializing cache warmup service...')
  // cacheWarmupService.start()
}, 5000) // Start after 5 seconds
