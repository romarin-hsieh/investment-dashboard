<template>
  <div 
    class="lazy-widget" 
    :id="containerId" 
    ref="container"
    :style="{ height: height }"
  >
    <!-- 載入前的佔位符 -->
    <div v-if="!isVisible && !loaded" class="widget-overlay widget-placeholder">
      <div class="placeholder-content">
        <div class="placeholder-icon">📊</div>
        <div class="placeholder-text">{{ widgetType }} Widget</div>
        <div class="placeholder-subtext">Scroll to load</div>
      </div>
    </div>

    <!-- 載入中狀態 -->
    <div v-if="isVisible && !loaded && !error" class="widget-overlay widget-loading">
      <div class="loading-spinner"></div>
      <span>Loading {{ widgetType }}...</span>
    </div>
    
    <!-- 錯誤狀態 -->
    <div v-if="error" class="widget-overlay widget-error">
      <span>⚠️ Failed to load</span>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- Widget Target Container (This must be separate!) -->
    <div ref="widgetTarget" class="widget-target"></div>
  </div>
</template>

<script>
import { widgetLoadManager } from '@/utils/widgetLoadManager'

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

        // 使用 Widget Load Manager 管理併發
        const widgetId = `lazy-${this.widgetType}-${this.containerId}`
        await widgetLoadManager.addToQueue(
          () => this.createWidget(),
          widgetId,
          this.priority
        )
      } catch (err) {
        console.error('Failed to load widget:', err)
        this.error = true
      }
    },

    async createWidget() {
      return new Promise((resolve, reject) => {
        this.$nextTick(() => {
          // Use specific widget target instead of broad container
          const target = this.$refs.widgetTarget
          
          if (!target) {
            reject(new Error('Widget target container not found'))
            return
          }

          // 清除現有內容 (雖然理論上是空的，但在重試時有用)
          target.innerHTML = ''

          try {
            // 創建 TradingView 容器結構
            const widgetContainer = document.createElement('div')
            widgetContainer.className = 'tradingview-widget-container'
            widgetContainer.style.height = '100%'
            widgetContainer.style.width = '100%'

            const widgetContent = document.createElement('div')
            widgetContent.className = 'tradingview-widget-container__widget'
            widgetContent.style.height = '100%'
            widgetContent.style.width = '100%'

            widgetContainer.appendChild(widgetContent)

            // 創建 TradingView script - 正確的方式
            const script = document.createElement('script')
            script.type = 'text/javascript'
            script.src = this.scriptUrl
            script.async = true
            
            // 將配置作為 script 的內容
            const configJson = JSON.stringify(this.config)
            script.innerHTML = configJson
            
            // 調試信息
            console.log(`🔧 Creating ${this.widgetType} widget with config:`, this.config)
            
            // 設定超時
            const timeouts = {
              1: 8000,
              2: 10000,
              3: 12000
            }
            
            const timeout = setTimeout(() => {
              console.warn(`${this.widgetType} widget load timeout`)
              this.error = true
              reject(new Error('Widget load timeout'))
            }, timeouts[this.priority] || 10000)
            
            script.onload = () => {
              clearTimeout(timeout)
              this.loaded = true
              
              const loadTime = performance.now() - this.loadStartTime
              console.log(`✅ ${this.widgetType} widget loaded in ${loadTime.toFixed(2)}ms (Priority: ${this.priority})`)
              
              resolve()
            }
            
            script.onerror = (error) => {
              clearTimeout(timeout)
              console.error(`❌ ${this.widgetType} script load failed:`, error)
              this.error = true
              reject(new Error('Script load failed'))
            }
            
            // 添加到 DOM
            widgetContent.appendChild(script)
            target.appendChild(widgetContainer)
            
          } catch (error) {
            console.error(`❌ ${this.widgetType} widget creation failed:`, error)
            this.error = true
            reject(error)
          }
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

/* 統一的 Overlay 樣式 */
.widget-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
}

/* 佔位符樣式 */
.widget-placeholder {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  box-sizing: border-box; /* 確保邊框包含在寬高內 */
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
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
  box-sizing: border-box;
}

/* Widget Target Container */
.widget-target {
  width: 100% !important;
  height: 100% !important;
  position: relative;
  z-index: 1; /* 比 overlay 低 */
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