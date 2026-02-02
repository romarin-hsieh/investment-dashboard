<template>
  <div class="top-stories-container">
    <div class="widget-header">
      <h3>Top Stories</h3>
    </div>
    
    <div class="top-stories-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="stories-loading">
        <div class="loading-spinner"></div>
        <span>Loading market news...</span>
      </div>
      
      <div v-if="error" class="stories-error">
        <span>⚠️ Failed to load market news</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewTopStories',
  props: {
    displayMode: {
      type: String,
      default: 'regular'
    },
    feedMode: {
      type: String,
      default: 'market'
    },
    colorTheme: {
      type: String,
      default: 'light'
    },
    isTransparent: {
      type: Boolean,
      default: true
    },
    locale: {
      type: String,
      default: 'en'
    },
    market: {
      type: String,
      default: 'stock'
    },
    height: {
      type: String,
      default: '600px'
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `top-stories-${Date.now()}`
    }
  },
  mounted() {
    this.loadTopStories()
  },
  methods: {
    async loadTopStories() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createTopStories()
      } catch (err) {
        console.error('Failed to load top stories:', err)
        this.error = true
      }
    },

    createTopStories() {
      const container = this.$refs.container
      if (!container) return

      // 清除現有的 widget
      container.innerHTML = ''

      // 創建 widget 容器結構
      const widgetContainer = document.createElement('div')
      widgetContainer.className = 'tradingview-widget-container'
      widgetContainer.style.height = '100%'
      widgetContainer.style.width = '100%'

      const widgetContent = document.createElement('div')
      widgetContent.className = 'tradingview-widget-container__widget'

      widgetContainer.appendChild(widgetContent)
      container.appendChild(widgetContainer)

      // 創建配置
      const config = {
        "displayMode": this.displayMode,
        "feedMode": this.feedMode,
        "colorTheme": this.colorTheme,
        "isTransparent": this.isTransparent,
        "locale": this.locale,
        "market": this.market,
        "width": "100%",
        "height": "100%"
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView Top Stories loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView Top Stories failed to load')
      }

      // 添加腳本到 widget 容器
      widgetContent.appendChild(script)

      // 設定超時保護
      setTimeout(() => {
        if (!this.loaded && !this.error) {
          this.loaded = true
        }
      }, 8000)
    },

    async retry() {
      await this.loadTopStories()
    }
  }
}
</script>

<style scoped>
.top-stories-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.top-stories-widget {
  height: 650px;
  min-height: 650px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* Loading 狀態 */
.stories-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  color: #6c757d;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error 狀態 */
.stories-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  border-radius: 4px;
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

/* TradingView Widget 樣式覆蓋 */
:global(.top-stories-container .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  position: relative !important;
}

:global(.top-stories-container .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .top-stories-widget {
    height: 550px;
    min-height: 550px;
  }
  
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .top-stories-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .top-stories-widget {
    height: 500px;
    min-height: 500px;
  }
}
</style>