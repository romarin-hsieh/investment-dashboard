<template>
  <div class="vix-widget-container" :style="{ height: '600px' }">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading VIX Index...</span>
    </div>
    <div v-if="error" class="error-state">
      <span>⚠️ Failed to load VIX</span>
      <button @click="loadVixWidget" class="retry-btn">Retry</button>
    </div>
    <!-- Dedicated Mount Point that Vue doesn't touch internally, but we manage manually -->
    <div ref="tvMountPoint" class="tv-mount-point" v-show="!loading && !error"></div>
  </div>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js';

export default {
  name: 'VixWidget',
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loading: true,
      error: false,
      widgetId: `vix-widget-${Date.now()}`
    }
  },
  mounted() {
    this.loadVixWidget()
  },
  methods: {
    async loadVixWidget() {
      this.loading = true
      this.error = false
      
      try {
        // 清除容器 (Only the mount point)
        const container = this.$refs.tvMountPoint
        if (!container) return
        
        // 移除所有子元素
        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }
        
        console.log('🔧 Starting VIX widget creation with FRED:VIXCLS...')
        
        // 參考 LazyTradingViewWidget 的成功實作
        await this.createWidget()
        
      } catch (error) {
        console.error('❌ VIX widget creation failed:', error)
        this.error = true
        this.loading = false
      }
    },

    async createWidget() {
      return new Promise((resolve, reject) => {
        this.$nextTick(() => {
          const container = this.$refs.tvMountPoint
          if (!container) {
            reject(new Error('Container not found'))
            return
          }

          try {
            // 創建 TradingView 容器結構 - 參考 LazyTradingViewWidget
            const widgetContainer = document.createElement('div')
            widgetContainer.className = 'tradingview-widget-container'
            widgetContainer.style.height = '100%'
            widgetContainer.style.width = '100%'

            const widgetContent = document.createElement('div')
            widgetContent.className = 'tradingview-widget-container__widget'
            widgetContent.style.height = '100%'
            widgetContent.style.width = '100%'

            widgetContainer.appendChild(widgetContent)

            // 創建 script 元素 - 使用 LazyTradingViewWidget 的方式
            const script = document.createElement('script')
            script.type = 'text/javascript'
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
            script.async = true
            
            // VIX 配置 - 使用 FRED:VIXCLS，參考 Market Daily Insight 的配置
            const isDark = this.theme === 'dark';
            const commonColors = {
                bg: isDark ? '#2C2C2C' : '#ffffff',
                text: isDark ? '#E6E1DC' : '#0F0F0F',
                grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 46, 46, 0.06)',
            }

            const vixConfig = {
              "lineWidth": 2,
              "lineType": 2,
              "chartType": "line",
              "showVolume": false,
              "fontColor": "rgb(106, 109, 120)",
              "gridLineColor": commonColors.grid,
              "volumeUpColor": "rgba(34, 171, 148, 0.5)",
              "volumeDownColor": "rgba(247, 82, 95, 0.5)",
              "backgroundColor": commonColors.bg,
              "widgetFontColor": commonColors.text,
              "upColor": "#22ab94",
              "downColor": "#f7525f",
              "borderUpColor": "#22ab94",
              "borderDownColor": "#f7525f",
              "wickUpColor": "#22ab94",
              "wickDownColor": "#f7525f",
              "colorTheme": isDark ? "dark" : "light",
              "isTransparent": true,
              "locale": "en",
              "chartOnly": false,
              "scalePosition": "right",
              "scaleMode": "Normal",
              "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
              "valuesTracking": "1",
              "changeMode": "price-and-percent",
              "symbols": [["FRED:VIXCLS|12M"]],
              "dateRanges": ["12m|1D", "60m|1W", "all|1M"],
              "fontSize": "10",
              "headerFontSize": "medium",
              "autosize": true,
              "width": "100%",
              "height": "100%",
              "noTimeScale": false,
              "hideDateRanges": false,
              "hideMarketStatus": false,
              "hideSymbolLogo": false
            }
            
            // 關鍵：使用 innerHTML 而不是 textContent - 參考 LazyTradingViewWidget
            const configJson = JSON.stringify(vixConfig)
            script.innerHTML = configJson
            
            console.log('🔧 FRED:VIXCLS Config:', vixConfig)
            console.log('📝 Config JSON:', configJson)
            
            // 設置超時檢查
            const timeout = setTimeout(() => {
              console.warn('⏰ VIX widget load timeout')
              this.error = true
              this.loading = false
              reject(new Error('Widget load timeout'))
            }, 8000)
            
            // 設置載入處理
            script.onload = () => {
              clearTimeout(timeout)
              console.log('✅ FRED:VIXCLS widget script loaded')
              this.loading = false
              resolve()
            }
            
            script.onerror = (error) => {
              clearTimeout(timeout)
              console.error('❌ VIX widget script failed:', error)
              this.error = true
              this.loading = false
              reject(new Error('Script load failed'))
            }
            
            // 添加到 DOM - 參考 LazyTradingViewWidget 的順序
            widgetContent.appendChild(script)
            container.appendChild(widgetContainer)
            
          } catch (error) {
            console.error('❌ VIX widget creation failed:', error)
            this.error = true
            this.loading = false
            reject(error)
          }
        })
      })
    }
  }
}
</script>

<style scoped>
.vix-widget-container {
  width: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: var(--bg-secondary);
  color: var(--text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: var(--bg-card);
  border: 1px solid var(--error-color);
  color: var(--error-color);
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--error-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.retry-btn:hover {
  opacity: 0.9;
}

:global(.vix-widget-container .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important; /* 參考 LazyTradingViewWidget */
}

:global(.vix-widget-container .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 100% !important;
}

.tv-mount-point {
  width: 100%;
  height: 100%;
}
</style>