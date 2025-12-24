// Service Worker for Investment Dashboard
// 提供快取和離線支援

const CACHE_NAME = 'investment-dashboard-v1'
const STATIC_CACHE = 'static-v1'
const API_CACHE = 'api-v1'

// 需要快取的靜態資源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// 需要快取的 API 端點
const API_ENDPOINTS = [
  '/api/quotes',
  '/api/daily',
  '/data/quotes/latest.json',
  '/config/markets_indicators.json'
]

// TradingView 腳本 URL
const TRADINGVIEW_SCRIPTS = [
  'https://s3.tradingview.com/external-embedding/embed-widget-tickers.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
]

// 安裝 Service Worker
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      // 快取靜態資源
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_ASSETS)
      }),
      // 預快取 TradingView 腳本
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(TRADINGVIEW_SCRIPTS.map(url => new Request(url, {
          mode: 'cors',
          credentials: 'omit'
        })))
      })
    ]).then(() => {
      console.log('✅ Service Worker installed successfully')
      self.skipWaiting()
    })
  )
})

// 啟動 Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 清理舊的快取
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('✅ Service Worker activated')
      return self.clients.claim()
    })
  )
})

// 攔截網路請求
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)

  // 只處理 GET 請求
  if (request.method !== 'GET') {
    return
  }

  // TradingView 腳本 - 快取優先策略
  if (TRADINGVIEW_SCRIPTS.some(scriptUrl => request.url.includes(scriptUrl))) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          console.log('📦 Serving TradingView script from cache:', request.url)
          return response
        }
        
        return fetch(request).then(fetchResponse => {
          // 快取成功的回應
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return fetchResponse
        }).catch(() => {
          console.warn('❌ Failed to fetch TradingView script:', request.url)
          // 回傳空回應避免錯誤
          return new Response('', { status: 200 })
        })
      })
    )
    return
  }

  // API 請求 - 網路優先，快取回退
  if (API_ENDPOINTS.some(endpoint => request.url.includes(endpoint))) {
    event.respondWith(
      fetch(request).then(response => {
        // 快取成功的 API 回應
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(API_CACHE).then(cache => {
            cache.put(request, responseClone)
          })
        }
        return response
      }).catch(() => {
        // 網路失敗時使用快取
        return caches.match(request).then(response => {
          if (response) {
            console.log('📦 Serving API from cache:', request.url)
            return response
          }
          // 如果沒有快取，回傳錯誤
          return new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        })
      })
    )
    return
  }

  // 靜態資源 - 快取優先策略
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          // 快取新的靜態資源
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone()
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return fetchResponse
        })
      })
    )
  }
})

// 處理訊息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    caches.keys().then(cacheNames => {
      const status = {
        caches: cacheNames,
        timestamp: new Date().toISOString()
      }
      event.ports[0].postMessage(status)
    })
  }
})

// 錯誤處理
self.addEventListener('error', event => {
  console.error('❌ Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Service Worker unhandled rejection:', event.reason)
})