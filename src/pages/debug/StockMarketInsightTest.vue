<template>
  <div class="stock-market-insight-test">
    <h2>Stock Market Insight Test</h2>
    <p class="text-muted mb-3">Testing Stock Market Insight component with Daily and Weekly views</p>

    <!-- 載入狀態顯示骨架屏 -->
    <div v-if="loading" class="loading-with-skeleton">
      <StockMarketInsightSkeleton />
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">Retry</button>
    </div>

    <!-- 正常內容 -->
    <div v-else>
      <!-- Stock Market Insight Widget -->
      <StockMarketInsight 
        color-theme="light"
        :is-transparent="true"
        locale="en"
        height="1300px"
      />

      <!-- Configuration Info -->
      <div class="config-info">
        <h3>Widget Configuration</h3>
        <div class="config-grid">
          <div class="config-section">
            <h4>Daily Configuration</h4>
            <ul>
              <li><strong>Symbols:</strong> NASDAQ, US30</li>
              <li><strong>Date Range:</strong> 6 months, 1 Day intervals</li>
              <li><strong>Chart Type:</strong> Candlesticks</li>
              <li><strong>Moving Average:</strong> 5-period</li>
              <li><strong>Volume:</strong> Enabled</li>
            </ul>
          </div>
          <div class="config-section">
            <h4>Weekly Configuration</h4>
            <ul>
              <li><strong>Symbols:</strong> NASDAQ, US30</li>
              <li><strong>Date Range:</strong> 6 months, 1 Week intervals</li>
              <li><strong>Chart Type:</strong> Candlesticks</li>
              <li><strong>Moving Average:</strong> 5-period</li>
              <li><strong>Volume:</strong> Enabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StockMarketInsight from '@/components/StockMarketInsight.vue'
import StockMarketInsightSkeleton from '@/components/StockMarketInsightSkeleton.vue'

export default {
  name: 'StockMarketInsightTest',
  components: {
    StockMarketInsight,
    StockMarketInsightSkeleton
  },
  data() {
    return {
      loading: true,
      error: null
    }
  },
  mounted() {
    this.initializePage()
  },
  methods: {
    async initializePage() {
      try {
        // 模擬載入時間
        await new Promise(resolve => setTimeout(resolve, 1000))
        this.loading = false
      } catch (err) {
        this.error = String(err)
        this.loading = false
      }
    },
    async refresh() {
      this.loading = true
      this.error = null
      await this.initializePage()
    }
  }
}
</script>

<style scoped>
.stock-market-insight-test {
  padding: 0;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.text-muted {
  color: #6c757d;
}

.loading-with-skeleton {
  /* 骨架屏載入容器 */
}

.error {
  text-align: center;
  padding: 2rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  margin: 1rem 0;
}

.text-danger {
  color: #dc3545;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.config-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 2rem;
}

.config-info h3 {
  margin-bottom: 1rem;
  color: #333;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.config-section h4 {
  margin-bottom: 0.75rem;
  color: #555;
  font-size: 1rem;
}

.config-section ul {
  margin: 0;
  padding-left: 1.5rem;
}

.config-section li {
  margin-bottom: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}
</style>