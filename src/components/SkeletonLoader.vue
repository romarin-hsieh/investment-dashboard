<template>
  <div class="skeleton-loader">
    <!-- Market Index Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
      <div class="skeleton-ticker-area">
        <div class="skeleton-ticker-item" v-for="i in 6" :key="i"></div>
      </div>
    </div>

    <!-- Sector Groups Skeleton -->
    <div class="skeleton-sector-groups">
      <div 
        v-for="sector in skeletonSectors" 
        :key="sector.name"
        class="skeleton-sector-group"
      >
        <div class="skeleton-sector-header">
          <div class="skeleton-sector-title"></div>
          <div class="skeleton-stock-count"></div>
        </div>
        
        <div class="skeleton-stocks-grid">
          <div 
            v-for="i in sector.stockCount" 
            :key="i"
            class="skeleton-stock-card"
          >
            <!-- Stock Card Header -->
            <div class="skeleton-stock-header">
              <div class="skeleton-stock-symbol"></div>
              <div class="skeleton-stock-price"></div>
            </div>
            
            <!-- Stock Card Content -->
            <div class="skeleton-stock-content">
              <div class="skeleton-stock-info">
                <div class="skeleton-info-line"></div>
                <div class="skeleton-info-line short"></div>
              </div>
              <div class="skeleton-stock-chart"></div>
            </div>
            
            <!-- Stock Card Footer -->
            <div class="skeleton-stock-footer">
              <div class="skeleton-tag"></div>
              <div class="skeleton-tag"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SkeletonLoader',
  data() {
    return {
      // 模擬不同 sector 的骨架結構
      skeletonSectors: [
        { name: 'Technology', stockCount: 8 },
        { name: 'Communication Services', stockCount: 4 },
        { name: 'Consumer Cyclical', stockCount: 3 },
        { name: 'Industrials', stockCount: 4 },
        { name: 'Healthcare', stockCount: 2 },
        { name: 'Energy', stockCount: 3 }
      ]
    }
  }
}
</script>

<style scoped>
/* 基礎骨架動畫 */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton-loader {
  margin-bottom: 1rem;
}

/* 通用骨架樣式 */
.skeleton-base {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* Market Index Widget 骨架 */
.skeleton-widget-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.skeleton-widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.skeleton-title {
  @extend .skeleton-base;
  width: 120px;
  height: 20px;
}

.skeleton-subtitle {
  @extend .skeleton-base;
  width: 80px;
  height: 14px;
}

.skeleton-ticker-area {
  display: flex;
  gap: 1rem;
  overflow: hidden;
  min-height: 100px;  /* 改為與 LazyTradingViewWidget 相同的高度 */
  align-items: center;
  flex-wrap: wrap;
}

.skeleton-ticker-item {
  @extend .skeleton-base;
  flex: 1;
  min-width: 120px;  /* 調整最小寬度 */
  height: 60px;      /* 調整高度更接近真實 ticker */
  border-radius: 8px;
}

/* Sector Groups 骨架 */
.skeleton-sector-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.skeleton-sector-group {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.skeleton-sector-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skeleton-sector-title {
  @extend .skeleton-base;
  width: 140px;
  height: 22px;
}

.skeleton-stock-count {
  @extend .skeleton-base;
  width: 30px;
  height: 16px;
}

/* Stock Cards 骨架 */
.skeleton-stocks-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.skeleton-stock-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
}

.skeleton-stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.skeleton-stock-symbol {
  @extend .skeleton-base;
  width: 60px;
  height: 24px;
  font-weight: bold;
}

.skeleton-stock-price {
  @extend .skeleton-base;
  width: 80px;
  height: 20px;
}

.skeleton-stock-content {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.skeleton-stock-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-info-line {
  @extend .skeleton-base;
  height: 16px;
  width: 100%;
}

.skeleton-info-line.short {
  width: 70%;
}

.skeleton-stock-chart {
  @extend .skeleton-base;
  width: 200px;
  height: 100px;
  border-radius: 8px;
}

.skeleton-stock-footer {
  display: flex;
  gap: 0.5rem;
}

.skeleton-tag {
  @extend .skeleton-base;
  width: 80px;
  height: 24px;
  border-radius: 12px;
}

/* 實際應用骨架樣式 */
.skeleton-title,
.skeleton-subtitle,
.skeleton-ticker-item,
.skeleton-sector-title,
.skeleton-stock-count,
.skeleton-stock-symbol,
.skeleton-stock-price,
.skeleton-info-line,
.skeleton-stock-chart,
.skeleton-tag {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .skeleton-widget-container {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .skeleton-ticker-area {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .skeleton-ticker-item {
    min-width: 100%;
    height: 60px;
  }
  
  .skeleton-sector-group {
    padding: 1rem;
  }
  
  .skeleton-stock-content {
    flex-direction: column;
  }
  
  .skeleton-stock-chart {
    width: 100%;
    height: 80px;
  }
}

@media (max-width: 480px) {
  .skeleton-widget-container {
    padding: 0.5rem;
    margin: 0 -0.25rem 1rem -0.25rem;
  }
  
  .skeleton-sector-group {
    padding: 0.75rem;
    margin: 0 -0.25rem;
  }
  
  .skeleton-stock-card {
    padding: 1rem;
  }
  
  .skeleton-stock-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* 特殊動畫效果 */
.skeleton-ticker-item {
  animation-delay: 0.1s;
}

.skeleton-ticker-item:nth-child(2) {
  animation-delay: 0.2s;
}

.skeleton-ticker-item:nth-child(3) {
  animation-delay: 0.3s;
}

.skeleton-ticker-item:nth-child(4) {
  animation-delay: 0.4s;
}

.skeleton-ticker-item:nth-child(5) {
  animation-delay: 0.5s;
}

.skeleton-ticker-item:nth-child(6) {
  animation-delay: 0.6s;
}

/* 淡入效果 */
.skeleton-loader {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>