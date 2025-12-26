<template>
  <div class="company-profile-container">
    <div class="company-profile-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="profile-loading">
        <div class="loading-spinner"></div>
        <span>Loading company profile...</span>
      </div>
      
      <div v-if="error" class="profile-error">
        <span>⚠️ Failed to load company profile</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewCompanyProfile',
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
      default: 'light'
    },
    isTransparent: {
      type: Boolean,
      default: true
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
      widgetId: `company-profile-${Date.now()}`
    }
  },
  computed: {
    fullSymbol() {
      return `${this.exchange}:${this.symbol}`
    }
  },
  mounted() {
    this.loadCompanyProfile()
  },
  watch: {
    symbol() {
      this.loadCompanyProfile()
    },
    exchange() {
      this.loadCompanyProfile()
    }
  },
  methods: {
    async loadCompanyProfile() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createCompanyProfile()
      } catch (err) {
        console.error('Failed to load company profile:', err)
        this.error = true
      }
    },

    createCompanyProfile() {
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
        "symbol": this.fullSymbol,
        "colorTheme": this.colorTheme,
        "isTransparent": this.isTransparent,
        "locale": this.locale,
        "width": "100%",
        "height": "100%"
      }

      console.log(`🏢 Creating Company Profile widget for ${this.fullSymbol}`, config)

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView Company Profile loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView Company Profile failed to load')
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
      await this.loadCompanyProfile()
    }
  }
}
</script>

<style scoped>
.company-profile-container {
  height: 100%;
  width: 100%;
}

.company-profile-widget {
  height: 100%;
  width: 100%;
  position: relative;
}

/* Loading 狀態 */
.profile-loading {
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
.profile-error {
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

/* TradingView Widget 樣式覆蓋 - 僅針對 Company Profile */
:global(.company-profile-widget .tv-embed-widget-wrapper) {
  width: 100% !important;
  height: 100% !important;
  min-height: 400px !important;
  max-height: 600px !important;
  overflow: visible !important;
}

:global(.company-profile-widget .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  min-height: 400px !important;
  max-height: 600px !important;
}

:global(.company-profile-widget .tradingview-widget-container__widget) {
  width: 100% !important;
  height: calc(100% - 32px) !important;
  min-height: 370px !important;
  max-height: 570px !important;
}

:global(.company-profile-widget .tradingview-widget-container iframe) {
  width: 100% !important;
  height: 400px !important;
  min-height: 400px !important;
  max-height: 600px !important;
}
</style>