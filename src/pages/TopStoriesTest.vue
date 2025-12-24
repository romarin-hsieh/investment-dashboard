<template>
  <div class="top-stories-test">
    <h2>Top Stories Widget Test</h2>
    <p class="text-muted mb-3">Testing TradingView Top Stories component</p>

    <!-- 載入狀態顯示骨架屏 -->
    <div v-if="loading" class="loading-with-skeleton">
      <TopStoriesSkeleton />
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">Retry</button>
    </div>

    <!-- 正常內容 -->
    <div v-else>
      <!-- Top Stories Widget -->
      <TradingViewTopStories 
        display-mode="regular"
        feed-mode="market"
        color-theme="light"
        :is-transparent="true"
        locale="en"
        market="stock"
        height="650px"
      />

      <!-- Configuration Info -->
      <div class="config-info">
        <h3>Widget Configuration</h3>
        <ul>
          <li><strong>Display Mode:</strong> regular</li>
          <li><strong>Feed Mode:</strong> market</li>
          <li><strong>Color Theme:</strong> light</li>
          <li><strong>Market:</strong> stock</li>
          <li><strong>Height:</strong> 650px</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import TradingViewTopStories from '@/components/TradingViewTopStories.vue'
import TopStoriesSkeleton from '@/components/TopStoriesSkeleton.vue'

export default {
  name: 'TopStoriesTest',
  components: {
    TradingViewTopStories,
    TopStoriesSkeleton
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
        await new Promise(resolve => setTimeout(resolve, 800))
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
.top-stories-test {
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

.config-info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.config-info li {
  margin-bottom: 0.5rem;
  color: #666;
}
</style>