// Edge 瀏覽器相容性優化工具
// 專門處理 Edge 瀏覽器的 TradingView Widget 載入問題

class EdgeCompatibilityManager {
  constructor() {
    this.isEdge = this.detectEdge()
    this.loadedScripts = new Set()
    this.retryAttempts = new Map()
    this.maxRetries = 3
    this.retryDelay = 2000 // 2 seconds
  }

  // 檢測是否為 Edge 瀏覽器
  detectEdge() {
    const userAgent = navigator.userAgent.toLowerCase()
    return userAgent.includes('edge') || userAgent.includes('edg/')
  }

  // Edge 專用的腳本載入器
  async loadScriptForEdge(scriptUrl, containerId, config) {
    const scriptId = `tradingview-script-${Date.now()}`
    
    if (this.isEdge) {
      console.log('🔧 Using Edge-optimized script loading for:', scriptUrl)
      
      // Edge 專用載入策略
      return await this.loadWithEdgeOptimizations(scriptUrl, containerId, config, scriptId)
    } else {
      // 非 Edge 瀏覽器使用標準載入
      return await this.loadStandardScript(scriptUrl, containerId, config, scriptId)
    }
  }

  // Edge 優化載入策略
  async loadWithEdgeOptimizations(scriptUrl, containerId, config, scriptId) {
    const retryKey = `${scriptUrl}-${containerId}`
    const currentAttempts = this.retryAttempts.get(retryKey) || 0

    try {
      // 1. 預檢查容器是否存在
      const container = document.getElementById(containerId)
      if (!container) {
        throw new Error(`Container ${containerId} not found`)
      }

      // 2. 清理之前的內容
      container.innerHTML = ''

      // 3. Edge 專用的腳本載入
      await this.createScriptWithTimeout(scriptUrl, scriptId, 10000) // 10秒超時

      // 4. 等待 TradingView 全域物件可用
      await this.waitForTradingView(5000) // 5秒超時

      // 5. 延遲初始化 Widget (Edge 需要更多時間)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 6. 初始化 Widget
      const widgetConfig = {
        ...config,
        container_id: containerId,
        // Edge 專用配置
        autosize: true,
        symbol: config.symbol || 'NASDAQ:AAPL',
        interval: config.interval || 'D',
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        // 增加穩定性的配置
        studies_overrides: {},
        overrides: {},
        enabled_features: [],
        disabled_features: ['use_localstorage_for_settings']
      }

      // 使用全域 TradingView 物件
      if (window.TradingView && window.TradingView.widget) {
        new window.TradingView.widget(widgetConfig)
        console.log('✅ Edge: TradingView widget loaded successfully')
        this.retryAttempts.delete(retryKey)
        return true
      } else {
        throw new Error('TradingView widget constructor not available')
      }

    } catch (error) {
      console.error(`❌ Edge: Failed to load widget (attempt ${currentAttempts + 1}):`, error)
      
      if (currentAttempts < this.maxRetries) {
        this.retryAttempts.set(retryKey, currentAttempts + 1)
        console.log(`🔄 Edge: Retrying in ${this.retryDelay}ms...`)
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        return await this.loadWithEdgeOptimizations(scriptUrl, containerId, config, scriptId)
      } else {
        this.retryAttempts.delete(retryKey)
        throw new Error(`Failed to load after ${this.maxRetries} attempts: ${error.message}`)
      }
    }
  }

  // 標準腳本載入
  async loadStandardScript(scriptUrl, containerId, config, scriptId) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = scriptUrl
      script.async = true
      
      script.onload = () => {
        console.log('✅ Standard: Script loaded successfully')
        
        // 標準初始化
        setTimeout(() => {
          const container = document.getElementById(containerId)
          if (container && window.TradingView) {
            new window.TradingView.widget({
              ...config,
              container_id: containerId
            })
            resolve(true)
          } else {
            reject(new Error('Container or TradingView not available'))
          }
        }, 500)
      }
      
      script.onerror = () => {
        reject(new Error('Failed to load script'))
      }
      
      document.head.appendChild(script)
    })
  }

  // 建立帶超時的腳本載入
  createScriptWithTimeout(scriptUrl, scriptId, timeout) {
    return new Promise((resolve, reject) => {
      // 檢查是否已載入
      if (this.loadedScripts.has(scriptUrl)) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.id = scriptId
      script.src = scriptUrl
      script.async = true
      script.defer = true // Edge 專用

      const timeoutId = setTimeout(() => {
        script.remove()
        reject(new Error(`Script loading timeout: ${scriptUrl}`))
      }, timeout)

      script.onload = () => {
        clearTimeout(timeoutId)
        this.loadedScripts.add(scriptUrl)
        console.log('✅ Edge: Script loaded with timeout protection')
        resolve()
      }

      script.onerror = () => {
        clearTimeout(timeoutId)
        script.remove()
        reject(new Error(`Script loading error: ${scriptUrl}`))
      }

      document.head.appendChild(script)
    })
  }

  // 等待 TradingView 全域物件
  waitForTradingView(timeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkTradingView = () => {
        if (window.TradingView && window.TradingView.widget) {
          resolve()
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('TradingView object timeout'))
        } else {
          setTimeout(checkTradingView, 100)
        }
      }
      
      checkTradingView()
    })
  }

  // 清理資源
  cleanup() {
    // 移除所有載入的腳本
    this.loadedScripts.forEach(scriptUrl => {
      const scripts = document.querySelectorAll(`script[src="${scriptUrl}"]`)
      scripts.forEach(script => script.remove())
    })
    
    this.loadedScripts.clear()
    this.retryAttempts.clear()
  }

  // 獲取 Edge 專用的建議配置
  getEdgeOptimizedConfig(baseConfig) {
    if (!this.isEdge) return baseConfig

    return {
      ...baseConfig,
      // Edge 專用優化
      autosize: true,
      theme: 'light',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      save_image: false,
      // 禁用可能導致問題的功能
      disabled_features: [
        'use_localstorage_for_settings',
        'study_templates',
        'popup_hints'
      ],
      // 啟用穩定性功能
      enabled_features: [
        'dont_show_boolean_study_arguments',
        'hide_last_na_study_output'
      ]
    }
  }
}

// 建立全域實例
export const edgeCompatibility = new EdgeCompatibilityManager()
export default edgeCompatibility