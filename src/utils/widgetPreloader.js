/**
 * TradingView Widget 預載入系統
 * 提前載入 TradingView 腳本以提升性能
 */

class WidgetPreloader {
  constructor() {
    this.preloadedScripts = new Set()
    this.scriptPromises = new Map()
  }

  /**
   * 預載入 TradingView 腳本
   */
  preloadScript(scriptUrl) {
    if (this.preloadedScripts.has(scriptUrl)) {
      return Promise.resolve()
    }

    if (this.scriptPromises.has(scriptUrl)) {
      return this.scriptPromises.get(scriptUrl)
    }

    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = scriptUrl
      link.crossOrigin = 'anonymous'
      
      link.onload = () => {
        this.preloadedScripts.add(scriptUrl)
        resolve()
      }
      
      link.onerror = () => {
        reject(new Error(`Failed to preload script: ${scriptUrl}`))
      }
      
      document.head.appendChild(link)
    })

    this.scriptPromises.set(scriptUrl, promise)
    return promise
  }

  /**
   * 預載入所有常用的 TradingView 腳本
   */
  async preloadAllScripts() {
    const scripts = [
      'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js',
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    ]

    try {
      await Promise.all(scripts.map(script => this.preloadScript(script)))
      console.log('All TradingView scripts preloaded successfully')
    } catch (error) {
      console.warn('Some TradingView scripts failed to preload:', error)
    }
  }

  /**
   * 檢查腳本是否已預載入
   */
  isPreloaded(scriptUrl) {
    return this.preloadedScripts.has(scriptUrl)
  }
}

// 單例模式
export const widgetPreloader = new WidgetPreloader()

// 頁面載入時自動預載入腳本
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // 延遲 1 秒後開始預載入，避免影響初始頁面載入
    setTimeout(() => {
      widgetPreloader.preloadAllScripts()
    }, 1000)
  })
}

export default widgetPreloader