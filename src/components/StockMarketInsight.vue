<template>
  <div class="stock-market-insight-container">
    <div class="widget-header">
      <h3>{{ $t('marketInsight.title') }}</h3>
    </div>
    
    <div class="insight-grid">
      <!-- Stock Market Daily -->
      <div class="insight-section">
        <div class="section-header">
          <h4>{{ $t('marketInsight.dailyTitle') }}</h4>
        </div>
        <div class="daily-widget" :id="dailyWidgetId" ref="dailyContainer">
          <div v-if="!dailyLoaded && !dailyError" class="widget-loading">
            <div class="loading-spinner"></div>
            <span>{{ $t('marketInsight.dailyLoading') }}</span>
          </div>

          <div v-if="dailyError" class="widget-error">
            <span>⚠️ {{ $t('marketInsight.dailyError') }}</span>
            <button @click="retryDaily" class="retry-btn">{{ $t('marketInsight.retry') }}</button>
          </div>
        </div>
      </div>

      <!-- Stock Market Weekly -->
      <div class="insight-section">
        <div class="section-header">
          <h4>{{ $t('marketInsight.weeklyTitle') }}</h4>
        </div>
        <div class="weekly-widget" :id="weeklyWidgetId" ref="weeklyContainer">
          <div v-if="!weeklyLoaded && !weeklyError" class="widget-loading">
            <div class="loading-spinner"></div>
            <span>{{ $t('marketInsight.weeklyLoading') }}</span>
          </div>

          <div v-if="weeklyError" class="widget-error">
            <span>⚠️ {{ $t('marketInsight.weeklyError') }}</span>
            <button @click="retryWeekly" class="retry-btn">{{ $t('marketInsight.retry') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StockMarketInsight',
  props: {
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
    height: {
      type: String,
      default: '1300px'
    }
  },
  data() {
    return {
      dailyLoaded: false,
      dailyError: false,
      weeklyLoaded: false,
      weeklyError: false,
      dailyWidgetId: `daily-market-${Date.now()}`,
      weeklyWidgetId: `weekly-market-${Date.now()}`,
      // PR-E2: tracked so beforeUnmount can clear the 8s widget-load
      // timeouts if the user navigates away before the scripts settle.
      dailyTimeoutId: null,
      weeklyTimeoutId: null
    }
  },
  mounted() {
    this.loadWidgets()
  },
  beforeUnmount() {
    if (this.dailyTimeoutId) clearTimeout(this.dailyTimeoutId)
    if (this.weeklyTimeoutId) clearTimeout(this.weeklyTimeoutId)
  },
  methods: {
    async loadWidgets() {
      await this.$nextTick()
      this.createDailyWidget()
      this.createWeeklyWidget()
    },

    createDailyWidget() {
      const container = this.$refs.dailyContainer
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

      // Daily 配置
      const dailyConfig = {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "candlesticks",
        "showVolume": true,
        "fontColor": "#707070",
        "gridLineColor": "rgba(46, 46, 46, 0.06)",
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": "#ffffff",
        "widgetFontColor": "#0F0F0F",
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": this.colorTheme,
        "isTransparent": this.isTransparent,
        "locale": this.locale,
        "chartOnly": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "symbols": [["IG:NASDAQ|6M"], ["THINKMARKETS:US30|6M"]],
        "dateRanges": ["6m|1D"],
        "fontSize": "10",
        "headerFontSize": "medium",
        "autosize": true,
        "width": "100%",
        "height": "100%",
        "noTimeScale": false,
        "hideDateRanges": false,
        "showMA": true,
        "maLength": "5",
        "maLineColor": "#2962FF",
        "maLineWidth": 1,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
      script.async = true
      script.innerHTML = JSON.stringify(dailyConfig)

      // 設定載入事件
      script.onload = () => {
        this.dailyLoaded = true
        console.log('Daily Market Widget loaded successfully')
      }

      script.onerror = () => {
        this.dailyError = true
        console.error('Daily Market Widget failed to load')
      }

      // 添加腳本到 widget 容器
      widgetContent.appendChild(script)

      // 設定超時保護
      this.dailyTimeoutId = setTimeout(() => {
        if (!this.dailyLoaded && !this.dailyError) {
          this.dailyLoaded = true
        }
      }, 8000)
    },

    createWeeklyWidget() {
      const container = this.$refs.weeklyContainer
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

      // Weekly 配置 (主要差異是 dateRanges: ["6m|1W"])
      const weeklyConfig = {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "candlesticks",
        "showVolume": true,
        "fontColor": "#707070",
        "gridLineColor": "rgba(46, 46, 46, 0.06)",
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": "#ffffff",
        "widgetFontColor": "#0F0F0F",
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": this.colorTheme,
        "isTransparent": this.isTransparent,
        "locale": this.locale,
        "chartOnly": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "symbols": [["IG:NASDAQ|6M"], ["THINKMARKETS:US30|6M"]],
        "dateRanges": ["6m|1W"],
        "fontSize": "10",
        "headerFontSize": "medium",
        "autosize": true,
        "width": "100%",
        "height": "100%",
        "noTimeScale": false,
        "hideDateRanges": false,
        "showMA": true,
        "maLength": "5",
        "maLineColor": "#2962FF",
        "maLineWidth": 1,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
      script.async = true
      script.innerHTML = JSON.stringify(weeklyConfig)

      // 設定載入事件
      script.onload = () => {
        this.weeklyLoaded = true
        console.log('Weekly Market Widget loaded successfully')
      }

      script.onerror = () => {
        this.weeklyError = true
        console.error('Weekly Market Widget failed to load')
      }

      // 添加腳本到 widget 容器
      widgetContent.appendChild(script)

      // 設定超時保護
      this.weeklyTimeoutId = setTimeout(() => {
        if (!this.weeklyLoaded && !this.weeklyError) {
          this.weeklyLoaded = true
        }
      }, 8000)
    },

    async retryDaily() {
      this.dailyLoaded = false
      this.dailyError = false
      await this.$nextTick()
      this.createDailyWidget()
    },

    async retryWeekly() {
      this.weeklyLoaded = false
      this.weeklyError = false
      await this.$nextTick()
      this.createWeeklyWidget()
    }
  }
}
</script>

<style scoped>
.stock-market-insight-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin-bottom: var(--space-8);
  overflow: hidden;
  position: relative;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.widget-header h3 {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.insight-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  align-items: start;
}

.insight-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-header {
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-color);
}

.section-header h4 {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--text-secondary);
  margin: 0;
}

.daily-widget,
.weekly-widget {
  height: 600px;
  min-height: 600px;
  width: 100%;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
}

/* Loading 狀態 */
.widget-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 100%;
  color: var(--text-muted);
  font-size: var(--text-base);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--grey-100);
  border-top: 2px solid var(--blue-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error 狀態 */
.widget-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  height: 100%;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  color: var(--danger-fg);
  border-radius: var(--radius-xs);
}

.retry-btn {
  padding: var(--space-1) var(--space-3);
  background: var(--danger-solid);
  color: white;
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.retry-btn:hover {
  background: #c82333;
}

/* TradingView Widget 樣式覆蓋 */
:global(.stock-market-insight-container .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  position: relative !important;
}

:global(.stock-market-insight-container .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .daily-widget,
  .weekly-widget {
    height: 550px;
    min-height: 550px;
  }
}

@media (max-width: 768px) {
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .daily-widget,
  .weekly-widget {
    height: 500px;
    min-height: 500px;
  }
}

@media (max-width: 480px) {
  .stock-market-insight-container {
    padding: var(--space-3);
    margin: 0 -var(--space-1) var(--space-8) -var(--space-1);
  }
  
  .insight-grid {
    gap: var(--space-3);
  }
  
  .daily-widget,
  .weekly-widget {
    height: 450px;
    min-height: 450px;
  }
}
</style>