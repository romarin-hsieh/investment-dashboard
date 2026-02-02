<template>
  <div class="stock-market-insight-skeleton">
    <!-- Page Header Skeleton -->
    <div class="skeleton-page-header">
      <div class="skeleton-page-title"></div>
      <div class="skeleton-page-description"></div>
    </div>

    <!-- Stock Market Insight Widget Skeleton -->
    <div class="skeleton-widget-container large">
      <div class="skeleton-insight-grid">
        <!-- Daily Insight Section -->
        <div class="skeleton-insight-section">
          <div class="skeleton-section-header">
            <div class="skeleton-section-title"></div>
          </div>
          <div class="skeleton-chart-area">
            <div class="skeleton-chart"></div>
          </div>
        </div>

        <!-- Weekly Insight Section -->
        <div class="skeleton-insight-section">
          <div class="skeleton-section-header">
            <div class="skeleton-section-title"></div>
          </div>
          <div class="skeleton-chart-area">
            <div class="skeleton-chart"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Info Skeleton -->
    <div class="skeleton-config-info">
      <div class="skeleton-config-title"></div>
      <div class="skeleton-config-grid">
        <div class="skeleton-config-section">
          <div class="skeleton-config-section-title"></div>
          <div class="skeleton-config-list">
            <div class="skeleton-config-item" v-for="i in 5" :key="i">
              <div class="skeleton-config-label"></div>
              <div class="skeleton-config-value"></div>
            </div>
          </div>
        </div>
        <div class="skeleton-config-section">
          <div class="skeleton-config-section-title"></div>
          <div class="skeleton-config-list">
            <div class="skeleton-config-item" v-for="i in 5" :key="i">
              <div class="skeleton-config-label"></div>
              <div class="skeleton-config-value"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StockMarketInsightSkeleton'
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

.stock-market-insight-skeleton {
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}

/* 通用骨架樣式 */
.skeleton-base {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* Page Header 骨架 */
.skeleton-page-header {
  margin-bottom: 1rem;
}

.skeleton-page-title {
  @extend .skeleton-base;
  width: 320px;
  height: 32px;
  margin-bottom: 0.5rem;
}

.skeleton-page-description {
  @extend .skeleton-base;
  width: 450px;
  height: 16px;
  margin-bottom: 0.75rem;
}

/* Widget 容器骨架 */
.skeleton-widget-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}

.skeleton-widget-container.large {
  min-height: 1300px;
}

/* Market Insight Grid 骨架 */
.skeleton-insight-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;
}

.skeleton-insight-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-insight-section:nth-child(2) {
  border-top: 1px solid #f0f0f0;
  padding-top: 1.5rem;
}

.skeleton-section-header {
  padding-bottom: 0.5rem;
}

.skeleton-section-title {
  @extend .skeleton-base;
  width: 220px;
  height: 18px;
}

.skeleton-chart-area {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-chart {
  @extend .skeleton-base;
  width: 100%;
  height: 550px;
  border-radius: 8px;
}

/* Configuration Info 骨架 */
.skeleton-config-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 2rem;
}

.skeleton-config-title {
  @extend .skeleton-base;
  width: 200px;
  height: 20px;
  margin-bottom: 1rem;
}

.skeleton-config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.skeleton-config-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-config-section-title {
  @extend .skeleton-base;
  width: 160px;
  height: 18px;
}

.skeleton-config-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-config-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.skeleton-config-label {
  @extend .skeleton-base;
  width: 100px;
  height: 14px;
}

.skeleton-config-value {
  @extend .skeleton-base;
  width: 150px;
  height: 14px;
}

/* 實際應用骨架樣式 */
.skeleton-page-title,
.skeleton-page-description,
.skeleton-section-title,
.skeleton-chart,
.skeleton-config-title,
.skeleton-config-section-title,
.skeleton-config-label,
.skeleton-config-value {
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
  
  .skeleton-widget-container.large {
    min-height: 1000px;
  }
  
  .skeleton-chart-area {
    min-height: 450px;
  }
  
  .skeleton-chart {
    height: 400px;
  }
  
  .skeleton-config-info {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .skeleton-widget-container {
    padding: 0.5rem;
    margin: 0 -0.25rem 1rem -0.25rem;
  }
  
  .skeleton-widget-container.large {
    min-height: 800px;
  }
  
  .skeleton-chart-area {
    min-height: 350px;
  }
  
  .skeleton-chart {
    height: 300px;
  }
  
  .skeleton-config-info {
    padding: 0.5rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
}

/* 動畫延遲效果 */
.skeleton-insight-section:nth-child(1) { animation-delay: 0.1s; }
.skeleton-insight-section:nth-child(2) { animation-delay: 0.2s; }

.skeleton-config-section:nth-child(1) { animation-delay: 0.1s; }
.skeleton-config-section:nth-child(2) { animation-delay: 0.2s; }

.skeleton-config-item:nth-child(odd) { animation-delay: 0.1s; }
.skeleton-config-item:nth-child(even) { animation-delay: 0.2s; }

/* 淡入效果 */
.stock-market-insight-skeleton {
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