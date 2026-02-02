// 正式環境效能優化器
// 專門針對正式環境的效能問題進行優化

class ProductionOptimizer {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.optimizations = new Map()
    this.performanceMetrics = new Map()
  }

  // 初始化正式環境優化
  initializeProductionOptimizations() {
    if (!this.isProduction) {
      console.log('🔧 Development mode - skipping production optimizations')
      return
    }

    console.log('🚀 Initializing production optimizations...')

    // 1. 預載入關鍵資源
    this.preloadCriticalResources()

    // 2. 設定 Service Worker (如果可用)
    this.setupServiceWorker()

    // 3. 優化圖片載入
    this.optimizeImageLoading()

    // 4. 設定錯誤監控
    this.setupErrorMonitoring()

    // 5. 優化 TradingView Widget 載入
    this.optimizeTradingViewWidgets()

    console.log('✅ Production optimizations initialized')
  }

  // 預載入關鍵資源
  preloadCriticalResources() {
    const criticalResources = [
      'https://s3.tradingview.com/external-embedding/embed-widget-tickers.js',
      'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js',
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    ]

    criticalResources.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = url
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })

    console.log('📦 Preloaded critical resources')
  }

  // 設定 Service Worker
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration)
        })
        .catch(error => {
          console.log('❌ Service Worker registration failed:', error)
        })
    }
  }

  // 優化圖片載入
  optimizeImageLoading() {
    // 實施圖片懶載入
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
              imageObserver.unobserve(img)
            }
          }
        })
      })

      // 觀察所有帶有 data-src 的圖片
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img)
      })
    }
  }

  // 設定錯誤監控
  setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      this.logError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', {
        reason: event.reason
      })
    })

    // 監控 TradingView Widget 載入錯誤
    this.monitorWidgetErrors()
  }

  // 監控 Widget 錯誤
  monitorWidgetErrors() {
    const originalConsoleError = console.error
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('TradingView') || message.includes('widget')) {
        this.logError('TradingView Widget Error', {
          message,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      }
      originalConsoleError.apply(console, args)
    }
  }

  // 優化 TradingView Widget 載入
  optimizeTradingViewWidgets() {
    // 設定全域 TradingView 配置
    window.TradingViewWidgetConfig = {
      // 通用優化設定
      autosize: true,
      theme: 'light',
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      save_image: false,
      // 效能優化設定
      disabled_features: [
        'use_localstorage_for_settings',
        'study_templates',
        'popup_hints',
        'header_symbol_search',
        'symbol_search_hot_key'
      ],
      enabled_features: [
        'dont_show_boolean_study_arguments',
        'hide_last_na_study_output'
      ],
      // 載入優化
      loading_screen: { backgroundColor: '#ffffff' },
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#22ab94',
        'mainSeriesProperties.candleStyle.downColor': '#f7525f'
      }
    }

    console.log('📊 TradingView widgets optimized for production')
  }

  // 記錄錯誤
  logError(type, details) {
    const errorLog = {
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }

    console.error('🚨 Production Error:', errorLog)

    // 在正式環境中，這裡可以發送到錯誤追蹤服務
    // 例如 Sentry, LogRocket, 或自定義的錯誤收集 API
  }

  // 效能監控
  startPerformanceMonitoring() {
    // 監控頁面載入效能
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0]
        this.performanceMetrics.set('pageLoad', {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.fetchStart
        })

        console.log('📊 Page Load Performance:', this.performanceMetrics.get('pageLoad'))
      }, 0)
    })

    // 監控資源載入
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('tradingview')) {
          this.performanceMetrics.set(`widget_${Date.now()}`, {
            name: entry.name,
            duration: entry.duration,
            transferSize: entry.transferSize
          })
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  // 獲取效能報告
  getPerformanceReport() {
    return {
      isProduction: this.isProduction,
      optimizations: Array.from(this.optimizations.entries()),
      metrics: Array.from(this.performanceMetrics.entries()),
      timestamp: new Date().toISOString()
    }
  }

  // 清理資源
  cleanup() {
    this.optimizations.clear()
    this.performanceMetrics.clear()
  }
}

// 建立全域實例並自動初始化
export const productionOptimizer = new ProductionOptimizer()

// 在正式環境中自動啟動優化
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    productionOptimizer.initializeProductionOptimizations()
    productionOptimizer.startPerformanceMonitoring()
  })
}

export default productionOptimizer