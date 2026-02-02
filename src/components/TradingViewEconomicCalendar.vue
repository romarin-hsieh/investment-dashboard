<template>
  <div class="economic-calendar-container">
    <div class="widget-header">
      <h3>Economic Calendar</h3>
      <p class="widget-description">Upcoming economic events and indicators</p>
    </div>
    <div class="economic-calendar-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="calendar-loading">
        <div class="loading-spinner"></div>
        <span>Loading economic calendar...</span>
      </div>
      
      <div v-if="error" class="calendar-error">
        <span>⚠️ Failed to load economic calendar</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewEconomicCalendar',
  props: {
    colorTheme: {
      type: String,
      default: 'light'
    },
    height: {
      type: String,
      default: '400px'
    },
    locale: {
      type: String,
      default: 'en'
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `economic-calendar-${Date.now()}`
    }
  },
  mounted() {
    this.loadEconomicCalendar()
  },
  methods: {
    async loadEconomicCalendar() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createEconomicCalendar()
      } catch (err) {
        console.error('Failed to load economic calendar:', err)
        this.error = true
      }
    },

    createEconomicCalendar() {
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
        "colorTheme": this.colorTheme,
        "isTransparent": false,
        "width": "100%",
        "height": "100%",
        "locale": this.locale,
        "importanceFilter": "-1,0,1",
        "countryFilter": "us,eu,jp,gb,au,ca,ch,cn,de,fr,it,nz,ru,kr,es,tr"
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView Economic Calendar loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView Economic Calendar failed to load')
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
      await this.loadEconomicCalendar()
    }
  }
}
</script>

<style scoped>
.economic-calendar-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.widget-header {
  background: #f8f9fa;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.widget-description {
  font-size: 0.9rem;
  color: #6c757d;
  margin: 0;
}

.economic-calendar-widget {
  height: 400px;
  width: 100%;
  position: relative;
}

/* Loading 狀態 */
.calendar-loading {
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
.calendar-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
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
</style>