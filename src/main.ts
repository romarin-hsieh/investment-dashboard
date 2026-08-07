import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import App from './App.vue'
import i18n, { loadLocaleMessages } from './i18n'
import './styles/tokens.css'  // Neutral palette + semantic-state tokens (load first)
import './style.css'          // Brand theme (overrides apply)

// Import performance utilities
import '@/utils/widgetPreloader'

// Import and initialize auto-update scheduler
import { autoUpdateScheduler } from '@/utils/autoUpdateScheduler'

// Router configuration
// WS-C PR-C2: All pages are lazy-imported via `() => import(...)` so Vite
// emits each route as its own chunk. This drops the initial JS bundle
// to just what's needed for the landing route (market-overview) + shell.
// Eager pre-imports at top of file were removed; each route loads on first
// navigation and is cached by the browser thereafter.
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/market-overview' },
  { path: '/market-overview', component: () => import('./pages/MarketDashboard.vue'), name: 'market-overview' },
  { path: '/stock-overview', component: () => import('./pages/StockDashboard.vue'), name: 'stock-overview' },
  { path: '/stock-overview/symbols/:symbol', component: () => import('./pages/StockDetail.vue'), name: 'stock-detail' },
  // Legacy redirects for backward compatibility
  { path: '/market-dashboard', redirect: '/market-overview' },
  { path: '/stock-dashboard', redirect: '/stock-overview' },
  { path: '/stock-dashboard/symbols/:symbol', redirect: to => `/stock-overview/symbols/${to.params['symbol']}` },
  { path: '/settings', component: () => import('./pages/Settings.vue'), name: 'settings' },
  // Tools
  { path: '/technical-manager', component: () => import('./pages/TechnicalIndicatorsManager.vue'), name: 'technical-manager' },
  { path: '/auto-update-monitor', component: () => import('./pages/AutoUpdateMonitor.vue'), name: 'auto-update-monitor' },
  { path: '/system-manager', component: () => import('./pages/SystemManager.vue'), name: 'system-manager' },
  // Quant Strategy (Dev Only)
  // Must be import.meta.env.DEV, not process.env: Vite only statically replaces
  // the dot-access form `process.env.NODE_ENV`, and the #187
  // noPropertyAccessFromIndexSignature codemod rewrote this to bracket access.
  // That silently stopped matching, leaving a bare `process` reference that the
  // dev server cannot resolve — `npm run dev` booted to a blank page with
  // "ReferenceError: process is not defined". Production was unaffected (the
  // build defines process.env), which is why CI stayed green.
  ...(import.meta.env.DEV ? [
    { path: '/quant-strategy', component: () => import('./pages/QuantDashboard.vue'), name: 'quant-strategy' }
  ] : []),
  // Catch-all route for 404s
  { path: '/:pathMatch(.*)*', redirect: '/market-overview' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Stale-chunk recovery: routes are lazy chunks with hashed filenames, so a tab that
// stayed open across a deploy (nightly 02:00 UTC) or a local rebuild will 404 on its
// next navigation and the click appears dead. Reload once to pick up the new manifest;
// the sessionStorage guard prevents a reload loop if the failure is something else.
router.onError((error, to) => {
  const message = String(error?.message ?? error)
  const isStaleChunk =
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)
  if (isStaleChunk && !sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1')
    window.location.href = to.fullPath ? `${window.location.pathname}#${to.fullPath}` : window.location.href
    window.location.reload()
  }
})
router.afterEach(() => sessionStorage.removeItem('chunk-reload'))

const app = createApp(App)
app.use(i18n)
app.use(router)

// Load the active locale's (precompiled) messages before first paint so no keys
// flash as raw paths; the non-active locale is fetched lazily on first switch.
// `.finally` so the app still mounts even if the locale chunk fails to load.
loadLocaleMessages(i18n.global.locale.value).finally(() => app.mount('#app'))

// Initialize auto-update scheduler after app is mounted (single bootstrap owner —
// the module-level self-start was removed, audit SD-10). Production only: on local
// hosts the scheduler adds timer noise without value, and 127.0.0.1 previously
// bypassed the module's own localhost gate.
const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
if (!isLocalHost) {
  // Delay startup to avoid interfering with initial page load
  setTimeout(() => {
    console.log('🚀 Initializing auto-update scheduler...')
    autoUpdateScheduler.start()
  }, 10000)
}
