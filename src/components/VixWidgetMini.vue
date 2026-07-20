<template>
  <div class="vix-mini-widget" ref="vixContainer" :style="{ height: '400px' }">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>{{ $t('vix.loading') }}</span>
    </div>
    <div v-if="error" class="error-state">
      <span>⚠️ {{ $t('vix.failed') }}</span>
      <button @click="loadVixWidget" class="retry-btn">{{ $t('common.retry') }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VixWidgetMini',
  data() {
    return {
      loading: true,
      error: false,
      // PR-E2: tracked so beforeUnmount can clear the 8s widget-load
      // timeout if the user navigates away before the script settles.
      loadTimeoutId: null
    }
  },
  mounted() {
    this.loadVixWidget()
  },
  beforeUnmount() {
    if (this.loadTimeoutId) clearTimeout(this.loadTimeoutId)
  },
  methods: {
    async loadVixWidget() {
      this.loading = true
      this.error = false
      
      try {
        const container = this.$refs.vixContainer
        if (!container) return
        
        // 清除容器
        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }
        
        console.log('🔧 Loading VIX Mini Widget...')
        
        // 創建 TradingView 容器結構
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container'
        widgetContainer.style.height = '100%'
        widgetContainer.style.width = '100%'
        
        const widgetContent = document.createElement('div')
        widgetContent.className = 'tradingview-widget-container__widget'
        
        // 創建 script 元素
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
        script.async = true
        
        // VIX Mini 配置 - 使用 FRED:VIXCLS
        const vixMiniConfig = {
          "symbol": "FRED:VIXCLS",
          "width": "100%",
          "height": "400",
          "locale": "en",
          "dateRange": "12M",
          "colorTheme": "light",
          "isTransparent": false,
          "autosize": true,
          "largeChartUrl": "",
          "chartOnly": false,
          "showVolume": false,
          "hideDateRanges": false,
          "hideMarketStatus": false,
          "hideSymbolLogo": false,
          "scalePosition": "right",
          "scaleMode": "Normal",
          "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
          "fontSize": "10",
          "noTimeScale": false,
          "valuesTracking": "1",
          "changeMode": "price-and-percent",
          "chartType": "line",
          "backgroundColor": "#ffffff",
          "lineWidth": 2,
          "lineColor": "#2962FF"
        }
        
        // 設置配置為 textContent
        script.textContent = JSON.stringify(vixMiniConfig)
        
        console.log('🔧 VIX Mini Config:', vixMiniConfig)
        
        // 設置載入處理
        script.onload = () => {
          console.log('✅ VIX Mini widget script loaded')
          this.loading = false
        }
        
        script.onerror = (error) => {
          console.error('❌ VIX Mini widget script failed:', error)
          this.error = true
          this.loading = false
        }
        
        // 組裝 DOM
        widgetContent.appendChild(script)
        widgetContainer.appendChild(widgetContent)
        container.appendChild(widgetContainer)
        
        // 設置超時檢查
        this.loadTimeoutId = setTimeout(() => {
          if (this.loading) {
            console.warn('⏰ VIX Mini widget load timeout')
            this.loading = false
          }
        }, 8000)
        
      } catch (error) {
        console.error('❌ VIX Mini Widget creation failed:', error)
        this.error = true
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.vix-mini-widget {
  width: 100%;
  position: relative;
  border-radius: var(--radius-sm);
  overflow: visible !important; /* 確保內容不被隱藏 */
}

/* TradingView 容器樣式 */
:global(.vix-mini-widget .tradingview-widget-container) {
  width: 100% !important;
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

:global(.vix-mini-widget .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

/* TradingView Mini Symbol Overview 內部元素樣式 */
:global(.vix-mini-widget .tv-mini-symbol-overview__link) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

:global(.vix-mini-widget .tv-mini-symbol-overview__chart) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

:global(.vix-mini-widget .js-link) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

/* 針對 TradingView 內部元素的更深層修復 */
:global(.vix-mini-widget iframe) {
  height: 400px !important;
  min-height: 400px !important;
}

:global(.vix-mini-widget canvas) {
  height: 400px !important;
  min-height: 400px !important;
}

:global(.vix-mini-widget .tv-mini-symbol-overview) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

:global(.vix-mini-widget .tv-mini-symbol-overview__body) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

:global(.vix-mini-widget .tv-mini-symbol-overview__content) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
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
  border: 3px solid var(--grey-100);
  border-top: 3px solid var(--blue-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
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
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  color: var(--danger-fg);
}

.retry-btn {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--danger-solid);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
}

.retry-btn:hover {
  background: #c82333;
}
</style>