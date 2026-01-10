<template>
  <div class="performance-monitor" v-if="showMonitor">
    <div class="monitor-header">
      <h4>Performance Monitor</h4>
      <button @click="toggleMonitor" class="toggle-btn">
        {{ expanded ? '−' : '+' }}
      </button>
    </div>
    
    <div v-if="expanded" class="monitor-content">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Page Load</div>
          <div class="metric-value">{{ pageLoadTime }}ms</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Widgets Loaded</div>
          <div class="metric-value">{{ widgetsLoaded }}/{{ totalWidgets }}</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Total Size</div>
          <div class="metric-value">{{ totalSize }}</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Memory Usage</div>
          <div class="metric-value">{{ memoryUsage }}</div>
        </div>
      </div>
      
      <div class="widgets-list">
        <h5>Widget Load Times</h5>
        <div v-for="widget in widgetTimes" :key="widget.id" class="widget-item">
          <span class="widget-name">{{ widget.name }}</span>
          <span class="widget-time" :class="getTimeClass(widget.time)">
            {{ widget.time }}ms
          </span>
          <span class="widget-priority">P{{ widget.priority }}</span>
        </div>
      </div>
      
      <div class="actions">
        <button @click="clearMetrics" class="clear-btn">Clear</button>
        <button @click="exportMetrics" class="export-btn">Export</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PerformanceMonitor',
  data() {
    return {
      showMonitor: false,
      expanded: true, // 預設為展開狀態
      pageLoadTime: 0,
      widgetsLoaded: 0,
      totalWidgets: 0,
      widgetTimes: [],
      startTime: 0
    }
  },
  computed: {
    totalSize() {
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const entries = performance.getEntriesByType('resource')
        const totalBytes = entries.reduce((sum, entry) => {
          return sum + (entry.transferSize || 0)
        }, 0)
        
        if (totalBytes > 1024 * 1024) {
          return `${(totalBytes / (1024 * 1024)).toFixed(1)}MB`
        } else if (totalBytes > 1024) {
          return `${(totalBytes / 1024).toFixed(1)}KB`
        }
        return `${totalBytes}B`
      }
      return 'N/A'
    },
    
    memoryUsage() {
      if (typeof performance !== 'undefined' && performance.memory) {
        const used = performance.memory.usedJSHeapSize
        if (used > 1024 * 1024) {
          return `${(used / (1024 * 1024)).toFixed(1)}MB`
        }
        return `${(used / 1024).toFixed(1)}KB`
      }
      return 'N/A'
    }
  },
  mounted() {
    this.startTime = performance.now()
    this.setupPerformanceTracking()
    
    // 檢查是否在開發環境或有 debug 參數
    // 檢查是否在開發環境或有 debug 參數
    // const isDev = process.env.NODE_ENV === 'development' // 禁用自動開發模式顯示
    const hasDebug = new URLSearchParams(window.location.search).has('debug')
    this.showMonitor = hasDebug
    
    // 監聽頁面載入完成
    if (document.readyState === 'complete') {
      this.calculatePageLoadTime()
    } else {
      window.addEventListener('load', this.calculatePageLoadTime)
    }
  },
  beforeUnmount() {
    window.removeEventListener('load', this.calculatePageLoadTime)
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  },
  methods: {
    setupPerformanceTracking() {
      // 🚨 修復：移除 console.log 攔截，避免無限循環和 Console 崩潰
      // 改用 Performance Observer API 和自定義事件來追蹤性能
      
      // 監聽自定義性能事件
      window.addEventListener('widget-loaded', (event) => {
        if (event.detail) {
          this.addWidgetTime({
            name: event.detail.name,
            time: event.detail.time,
            priority: event.detail.priority || 1
          })
        }
      })
      
      // 使用 Performance Observer 監聽資源載入
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          this.performanceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // 只監聽 TradingView 相關的資源
              if (entry.name.includes('tradingview') || entry.name.includes('widget')) {
                this.addWidgetTime({
                  name: entry.name.split('/').pop() || 'Unknown Widget',
                  time: Math.round(entry.duration),
                  priority: 2
                })
              }
            }
          })
          
          this.performanceObserver.observe({ entryTypes: ['resource', 'navigation'] })
        } catch (error) {
          console.warn('PerformanceObserver not supported:', error)
          this.performanceObserver = null;
        }
      }
    },
    
    calculatePageLoadTime() {
      this.pageLoadTime = Math.round(performance.now() - this.startTime)
    },
    
    addWidgetTime(widget) {
      this.widgetTimes.push({
        id: Date.now() + Math.random(),
        ...widget
      })
      this.widgetsLoaded++
      
      // 估算總 widgets 數量
      if (this.totalWidgets === 0) {
        // 根據當前頁面估算
        const path = this.$route?.path || window.location.pathname
        if (path.includes('market-dashboard')) {
          this.totalWidgets = 5 // Market Dashboard 的 widgets 數量
        } else if (path.includes('stock-dashboard')) {
          this.totalWidgets = 10 // 估算 Stock Dashboard 的 widgets 數量
        } else {
          this.totalWidgets = this.widgetsLoaded + 2 // 動態估算
        }
      }
    },
    
    getTimeClass(time) {
      if (time < 1000) return 'time-good'
      if (time < 3000) return 'time-ok'
      return 'time-slow'
    },
    
    toggleMonitor() {
      this.expanded = !this.expanded
    },
    
    clearMetrics() {
      this.widgetTimes = []
      this.widgetsLoaded = 0
      this.totalWidgets = 0
      this.startTime = performance.now()
    },
    
    exportMetrics() {
      const data = {
        pageLoadTime: this.pageLoadTime,
        widgetsLoaded: this.widgetsLoaded,
        totalWidgets: this.totalWidgets,
        totalSize: this.totalSize,
        memoryUsage: this.memoryUsage,
        widgetTimes: this.widgetTimes,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.performance-monitor {
  position: fixed;
  top: 80px;
  right: 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 300px;
  max-width: 400px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.monitor-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  color: #007bff;
}

.monitor-content {
  padding: 1rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-card {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
}

.metric-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.metric-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.widgets-list {
  margin-bottom: 1rem;
}

.widgets-list h5 {
  font-size: 0.85rem;
  margin: 0 0 0.5rem 0;
  color: #333;
}

.widget-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.widget-name {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.widget-time {
  margin-right: 0.5rem;
  font-weight: 600;
}

.time-good {
  color: #28a745;
}

.time-ok {
  color: #ffc107;
}

.time-slow {
  color: #dc3545;
}

.widget-priority {
  background: #007bff;
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.clear-btn,
.export-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.clear-btn:hover {
  background: #f8f9fa;
}

.export-btn {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.export-btn:hover {
  background: #0056b3;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .performance-monitor {
    position: relative;
    top: auto;
    right: auto;
    margin: 1rem;
    width: calc(100% - 2rem);
  }
}
</style>