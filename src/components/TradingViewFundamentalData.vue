<template>
  <div class="fundamental-data-container">
    <div v-if="!loaded && !error" class="loading-state skeleton-overlay">
      <WidgetSkeleton :bordered="false" :show-header="false" type="chart" />
    </div>
    
    <div v-if="error" class="error-state">
      <span>⚠️ Failed to load data</span>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- Dedicated container that Vue ignores after mount -->
    <div ref="widgetContainer" class="widget-host"></div>
  </div>
</template>

<script>
import WidgetSkeleton from '@/components/WidgetSkeleton.vue'

export default {
  name: 'TradingViewFundamentalData',
  components: {
    WidgetSkeleton
  },
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    },
    colorTheme: {
      type: String,
      default: 'dark'
    },
    displayMode: {
      type: String,
      default: 'regular'
    },
    isTransparent: {
      type: Boolean,
      default: true
    },
    locale: {
      type: String,
      default: 'zh_TW'
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `fundamental-data-${Date.now()}`
    }
  },
  computed: {
    fullSymbol() {
      return `${this.exchange}:${this.symbol}`
    }
  },
  mounted() {
    this.isMounted = true
    this.loadFundamentalData()
  },
  beforeUnmount() {
    this.isMounted = false
  },
  watch: {
    symbol() {
        if (this.isMounted) this.loadFundamentalData()
    },
    exchange() {
        if (this.isMounted) this.loadFundamentalData()
    },
    colorTheme() {
        if (this.isMounted) this.loadFundamentalData()
    }
  },
  methods: {
    async loadFundamentalData() {
      if (!this.isMounted) return
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        if (this.isMounted) this.createFundamentalData()
      } catch (err) {
        console.error('Failed to load fundamental data:', err)
        if (this.isMounted) this.error = true
      }
    },

    createFundamentalData() {
      if (!this.isMounted) return
      const container = this.$refs.widgetContainer
      if (!container) return

      // Clean existing
      container.innerHTML = ''
      
      try {
          // 創建 widget 容器結構
          const widgetContainer = document.createElement('div')
          widgetContainer.className = 'tradingview-widget-container'
          widgetContainer.style.height = '100%'
          widgetContainer.style.width = '100%'
    
          const widgetContent = document.createElement('div')
          widgetContent.className = 'tradingview-widget-container__widget'
          
          // Append securely
          widgetContainer.appendChild(widgetContent)
          if (container) container.appendChild(widgetContainer)
    
          // 創建配置
          const config = {
            "symbol": this.fullSymbol,
            "colorTheme": this.colorTheme,
            "displayMode": "regular",
            "isTransparent": true,
            "locale": "zh_TW",
            "width": "100%",
            "locale": "zh_TW",
            "width": "100%",
            "height": "100%",
            "autosize": true
          }
    
          // 創建腳本
          const script = document.createElement('script')
          script.type = 'text/javascript'
          script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js'
          script.async = true
          script.innerHTML = JSON.stringify(config)
    
          // 設定載入事件
          script.onload = () => {
            if (this.isMounted) {
                this.loaded = true
                console.log('TradingView Fundamental Data loaded successfully')
            }
          }
    
          script.onerror = () => {
            if (this.isMounted) {
                this.error = true
                console.error('TradingView Fundamental Data failed to load')
            }
          }
    
          // 添加腳本到 widget 容器
          widgetContent.appendChild(script)
    
          // 設定超時保護
          setTimeout(() => {
            if (this.isMounted && !this.loaded && !this.error) {
              this.loaded = true
            }
          }, 8000)
      } catch (e) {
          console.error("Error creating widget:", e);
          if (this.isMounted) this.error = true;
      }
    },

    async retry() {
      await this.loadFundamentalData()
    }
  }
}
</script>

<style scoped>
.fundamental-data-container {
  height: 100%;
  width: 100%;
  position: relative;
}

.fundamental-data-widget {
  height: 100%;
  width: 100%;
  position: relative;
  min-height: 950px;
  min-height: 950px;
}

.widget-host {
    width: 100%;
    height: 100%;
}

/* Loading 狀態 */
/* Skeleton Overlay Style */
.skeleton-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: var(--bg-card);
  padding: 0;
}

/* Error 狀態 */
.fundamental-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
}

.retry-btn {
  padding: 0.25rem 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.retry-btn:hover {
  background: #c82333;
}

/* TradingView Widget 樣式覆蓋 - 僅針對 Fundamental Data */
:global(.fundamental-data-container) {
  display: flex;
  flex-direction: column;
}

/* Force all immediate children (like widget-host) to fill space */
:global(.fundamental-data-container > div) {
  flex: 1;
  height: 100% !important;
  min-height: 100% !important;
}

:global(.fundamental-data-container .widget-host) {
  height: 100% !important;
  min-height: 100% !important;
  width: 100% !important;
}

:global(.fundamental-data-container .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  flex: 1;
}

:global(.fundamental-data-container .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
}

:global(.fundamental-data-container .tradingview-widget-container iframe) {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  display: block; 
}

/* Simplified TradingView overrides */
:global(.fundamental-data-container .tv-embed-widget-wrapper) {
  height: 100% !important;
  min-height: 100% !important;
}

:global(.fundamental-data-container .tv-feed-widget) {
  height: 100% !important;
  min-height: 100% !important;
  overflow: visible !important;
}

:global(.fundamental-data-container .tv-feed-widget__body) {
  height: 100% !important;
  min-height: 100% !important;
  overflow: visible !important;
}
</style>