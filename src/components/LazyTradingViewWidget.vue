<template>
  <div 
    class="lazy-widget" 
    :id="containerId" 
    ref="container"
    :style="{ height: height }"
  >
    <!-- 載入前的佔位符 -->
    <div v-if="!isVisible && !loaded" class="widget-placeholder">
      <div class="placeholder-content">
        <div class="placeholder-icon">📊</div>
        <div class="placeholder-text">{{ widgetType }} Widget</div>
        <div class="placeholder-subtext">Scroll to load</div>
      </div>
    </div>

    <!-- 載入中狀態 -->
    <div v-if="isVisible && !loaded && !error" class="widget-loading">
      <div class="loading-spinner"></div>
      <span>Loading {{ widgetType }}...</span>
    </div>
    
    <!-- 錯誤狀態 -->
    <div v-if="error" class="widget-error">
      <span>⚠️ Failed to load</span>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LazyTradingViewWidget',
  props: {
    widgetType: {
      type: String,
      required: true
    },
    config: {
      type: Object,
      required: true
    },
    scriptUrl: {
      type: String,
      required: true
    },
    height: {
      type: String,
      default: '400px'
    },
    priority: {
      type: Number,
      default: 1 // 1=高優先級, 2=中優先級, 3=低優先級
    }
  },
  data() {
    return {
      isVisible: false,
      loaded: false,
      error: false,
      observer: null,
      loadStartTime: 0
    }
  },
  computed: {
    containerId() {
      return `lazy-widget-${this.widgetType}-${Date.now()}`
    }
  },
  mounted() {
    this.setupIntersectionObserver()
  },
  beforeUnmount() {
    if (this.observer) {
      this.observer.disconnect()
    }
  },
  methods: {
    setupIntersectionObserver() {
      // 根據優先級設置不同的 rootMargin
      const rootMargins = {
        1: '200px', // 高優先級：提前 200px 載入
        2: '100px', // 中優先級：提前 100px 載入
        3: '50px'   // 低優先級：提前 50px 載入
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.loaded && !this.error) {
              this.isVisible = true
              this.loadWidget()
              this.observer.disconnect() // 載入後停止觀察
            }
          })
        },
        {
          rootMargin: rootMargins[this.priority] || '100px',
          threshold: 0.1
        }
      )

      this.observer.observe(this.$refs.container)
    },

    async loadWidget() {
      this.loadStartTime = performance.now()
      
      try {
        // 根據優先級添加延遲
        const delays = {
          1: 0,     // 高優先級：立即載入
          2: 500,   // 中優先級：延遲 500ms
          3: 1000   // 低優先級：延遲 1000ms
        }

        const delay = delays[this.priority] || 0
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        await this.createWidget()
      } catch (err) {
        console.error('Failed to load widget:', err)
        this.error = true
      }
    },

    async createWidget() {
      return new Promise((resolve, reject) => {
        this.$nextTick(() => {
          const container = this.$refs.container
          if (!container) {
            reject(new Error('Container not found'))
            return
          }

          // 清除現有內容
          const existingContent = container.querySelector('.widget-placeholder, .widget-loading')
          if (existingContent) {
            existingContent.style.display = 'none'
          }

          // 創建 TradingView 容器結構
          const widgetContainer = document.createElement('div')
          widgetContainer.className = 'tradingview-widget-container'
          widgetContainer.style.height = '100%'
          widgetContainer.style.width = '100%'

          const widgetContent = document.createElement('div')
          widgetContent.className = 'tradingview-widget-container__widget'

          widgetContainer.appendChild(widgetContent)

          const script = document.createElement('script')
          script.type = 'text/javascript'
          script.src = this.scriptUrl
          script.async = true
          script.innerHTML = JSON.stringify(this.config)
          
          // 設定超時 - 根據優先級調整
          const timeouts = {
            1: 5000,  // 高優先級：5秒超時
            2: 8000,  // 中優先級：8秒超時
            3: 10000  // 低優先級：10秒超時
          }
          
          const timeout = setTimeout(() => {
            this.error = true
            reject(new Error('Widget load timeout'))
          }, timeouts[this.priority] || 8000)
          
          script.onload = () => {
            clearTimeout(timeout)
            this.loaded = true
            
            const loadTime = performance.now() - this.loadStartTime
            console.log(`${this.widgetType} widget loaded in ${loadTime.toFixed(2)}ms (Priority: ${this.priority})`)
            
            resolve()
          }
          
          script.onerror = () => {
            clearTimeout(timeout)
            this.error = true
            reject(new Error('Script load failed'))
          }
          
          widgetContent.appendChild(script)
          container.appendChild(widgetContainer)
        })
      })
    },

    async retry() {
      this.error = false
      this.loaded = false
      await this.loadWidget()
    }
  }
}
</script>

<style scoped>
.lazy-widget {
  width: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

/* 佔位符樣式 */
.widget-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.widget-placeholder:hover {
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
  border-color: #adb5bd;
}

.placeholder-content {
  text-align: center;
  color: #6c757d;
}

.placeholder-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.placeholder-text {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.placeholder-subtext {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* 載入中樣式 */
.widget-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.widget-loading span {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 錯誤樣式 */
.widget-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #c82333;
}

/* TradingView 容器樣式 */
:global(.lazy-widget .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

:global(.lazy-widget .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 100% !important;
}
</style>