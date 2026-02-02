import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Import performance utilities
import '@/utils/widgetPreloader'

// Import and initialize auto-update scheduler
import { autoUpdateScheduler } from '@/utils/autoUpdateScheduler.js'

// Import cache warmup service
import { cacheWarmupService } from '@/utils/cacheWarmupService.js'

// Import pages
import MarketDashboard from './pages/MarketDashboard.vue'
import StockDashboard from './pages/StockDashboard.vue'
import Settings from './pages/Settings.vue'
import StockDetail from './pages/StockDetail.vue'
import TechnicalIndicatorsManager from './pages/TechnicalIndicatorsManager.vue'
import AutoUpdateMonitor from './pages/AutoUpdateMonitor.vue'
import SystemManager from './pages/SystemManager.vue'

// Router configuration
const routes = [
  { path: '/', redirect: '/market-overview' },
  { path: '/market-overview', component: MarketDashboard, name: 'market-overview' },
  { path: '/stock-overview', component: StockDashboard, name: 'stock-overview' },
  { path: '/stock-overview/symbols/:symbol', component: StockDetail, name: 'stock-detail' },
  // Legacy redirects for backward compatibility
  { path: '/market-dashboard', redirect: '/market-overview' },
  { path: '/stock-dashboard', redirect: '/stock-overview' },
  { path: '/stock-dashboard/symbols/:symbol', redirect: to => `/stock-overview/symbols/${to.params.symbol}` },
  { path: '/settings', component: Settings, name: 'settings' },
  // Tools
  { path: '/technical-manager', component: TechnicalIndicatorsManager, name: 'technical-manager' },
  { path: '/auto-update-monitor', component: AutoUpdateMonitor, name: 'auto-update-monitor' },
  { path: '/system-manager', component: SystemManager, name: 'system-manager' },
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
