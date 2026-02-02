<template>
  <div class="stock-heatmap-container">
    <div class="heatmap-header">
      <h4>Stock Market Heatmap</h4>
    </div>
    
    <div class="heatmap-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="heatmap-loading">
        <div class="loading-spinner"></div>
        <span>Loading stock heatmap...</span>
      </div>
      
      <div v-if="error" class="heatmap-error">
        <span>⚠️ Failed to load heatmap</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewStockHeatmap',
  props: {
    dataSource: {
      type: String,
      default: 'SPX500'
    },
    blockSize: {
      type: String,
      default: 'market_cap_basic'
    },
    blockColor: {
      type: String,
      default: 'change'
    },
    grouping: {
      type: String,
      default: 'sector'
    },
    colorTheme: {
      type: String,
      default: 'light'
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
      widgetId: `stock-heatmap-${Date.now()}`
    }
  },
  mounted() {
    this.loadHeatmap()
  },
  methods: {
    async loadHeatmap() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createHeatmap()
      } catch (err) {
        console.error('Failed to load stock heatmap:', err)
        this.error = true
      }
    },

    createHeatmap() {
      const container = this.$refs.container
      if (!container) return

      // 清除現有的 widget
      let widgetDiv = container.querySelector('.tradingview-widget-container__widget')
      if (widgetDiv) {
        widgetDiv.innerHTML = ''
      } else {
        // 創建 widget 容器結構
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container'
        widgetContainer.style.height = this.height
        widgetContainer.style.width = '100%'

        const widgetContent = document.createElement('div')
        widgetContent.className = 'tradingview-widget-container__widget'

        widgetContainer.appendChild(widgetContent)
        
        // 清空容器並添加新結構
        container.innerHTML = ''
        container.appendChild(widgetContainer)
        
        // 更新 widgetDiv 引用
        widgetDiv = widgetContent
      }

      // 創建配置
      const config = {
        "dataSource": this.dataSource,
        "blockSize": this.blockSize,
        "blockColor": this.blockColor,
        "grouping": this.grouping,
        "locale": "en",
        "symbolUrl": "",
        "colorTheme": this.colorTheme,
        "exchanges": [],
        "hasTopBar": true,
        "isDataSetEnabled": true,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "isMonoSize": false,
        "width": "100%",
        "height": "100%"
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView Stock Heatmap loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView Stock Heatmap failed to load')
      }

      // 添加腳本到 widget 容器
      if (widgetDiv) {
        widgetDiv.appendChild(script)
      }

      // 設定超時保護
      setTimeout(() => {
        if (!this.loaded && !this.error) {
          this.loaded = true // 假設載入成功
        }
      }, 8000) // 8秒超時，heatmap 載入較慢
    },

    async retry() {
      await this.loadHeatmap()
    }
  }
}
</script>

<style scoped>
.stock-heatmap-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.heatmap-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.heatmap-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.control-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.control-select:hover {
  border-color: #007bff;
}

.control-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.heatmap-widget {
  min-height: 500px;
  position: relative;
  background: #fafafa;
  border-radius: 4px;
  overflow: hidden;
}

/* Loading 狀態 */
.heatmap-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: #6c757d;
  font-size: 1rem;
  min-height: 500px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error 狀態 */
.heatmap-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  min-height: 500px;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #c82333;
}

/* TradingView Widget 樣式覆蓋 */
:global(.tradingview-widget-container) {
  width: 100% !important;
  height: 500px !important;
  min-height: 500px !important;
}

:global(.tradingview-widget-container__widget) {
  width: 100% !important;
  height: 500px !important; /* 調整為 500px 匹配 iframe */
}

/* 響應式設計 */
@media (max-width: 768px) {
  .heatmap-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .heatmap-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .control-select {
    flex: 1;
    max-width: 150px;
  }
  
  .heatmap-widget {
    min-height: 500px;
  }
  
  .heatmap-loading,
  .heatmap-error {
    min-height: 500px;
    padding: 2rem;
  }
}

@media (max-width: 480px) {
  .stock-heatmap-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 1.5rem -0.25rem;
  }
  
  .heatmap-controls {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .control-select {
    width: 100%;
    max-width: none;
  }
  
  .heatmap-widget {
    min-height: 400px;
  }
  
  .heatmap-loading,
  .heatmap-error {
    min-height: 400px;
    padding: 1.5rem;
    flex-direction: column;
    text-align: center;
  }
}
</style>