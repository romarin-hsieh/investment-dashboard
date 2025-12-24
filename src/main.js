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
import TopStoriesTest from './pages/TopStoriesTest.vue'
import StockMarketInsightTest from './pages/StockMarketInsightTest.vue'
import YahooFinanceTest from './pages/YahooFinanceTest.vue'
import TechnicalIndicatorsValidation from './pages/TechnicalIndicatorsValidation.vue'
import MetadataServiceTest from './pages/MetadataServiceTest.vue'
import ProxyDiagnosticTest from './pages/ProxyDiagnosticTest.vue'

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
  // Development/Testing pages
  { path: '/top-stories-test', component: TopStoriesTest, name: 'top-stories-test' },
  { path: '/stock-market-insight-test', component: StockMarketInsightTest, name: 'stock-market-insight-test' },
  { path: '/yahoo-finance-test', component: YahooFinanceTest, name: 'yahoo-finance-test' },
  { path: '/proxy-diagnostic', component: ProxyDiagnosticTest, name: 'proxy-diagnostic' },
  { path: '/technical-validation', component: TechnicalIndicatorsValidation, name: 'technical-validation' },
  { path: '/metadata-test', component: MetadataServiceTest, name: 'metadata-test' },
  { path: '/technical-manager', component: TechnicalIndicatorsManager, name: 'technical-manager' },
  { path: '/auto-update-monitor', component: AutoUpdateMonitor, name: 'auto-update-monitor' },
  { path: '/system-manager', component: SystemManager, name: 'system-manager' },
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
  console.log('🔥 Initializing cache warmup service...')
  cacheWarmupService.start()
}, 5000) // Start after 5 seconds
