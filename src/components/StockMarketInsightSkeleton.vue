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

<style scoped lang="scss">
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
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: var(--radius-xs);
}

/* Page Header 骨架 */
.skeleton-page-header {
  margin-bottom: var(--space-4);
}

.skeleton-page-title {
  @extend .skeleton-base;
  width: 320px;
  height: 32px;
  margin-bottom: var(--space-2);
}

.skeleton-page-description {
  @extend .skeleton-base;
  width: 450px;
  height: 16px;
  margin-bottom: var(--space-3);
}

/* Widget 容器骨架 */
.skeleton-widget-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin-bottom: var(--space-8);
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
  gap: var(--space-6);
  align-items: start;
}

.skeleton-insight-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-insight-section:nth-child(2) {
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-6);
}

.skeleton-section-header {
  padding-bottom: var(--space-2);
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
  border-radius: var(--radius-sm);
}

/* Configuration Info 骨架 */
.skeleton-config-info {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  margin-top: var(--space-8);
}

.skeleton-config-title {
  @extend .skeleton-base;
  width: 200px;
  height: 20px;
  margin-bottom: var(--space-4);
}

.skeleton-config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

.skeleton-config-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-config-section-title {
  @extend .skeleton-base;
  width: 160px;
  height: 18px;
}

.skeleton-config-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-config-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
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
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: var(--radius-xs);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .skeleton-widget-container {
    padding: var(--space-3);
    margin-bottom: var(--space-4);
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
    padding: var(--space-3);
  }
}

@media (max-width: 480px) {
  .skeleton-widget-container {
    padding: var(--space-2);
    margin: 0 -var(--space-1) var(--space-4) -var(--space-1);
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
    padding: var(--space-2);
    margin: 0 -var(--space-1) var(--space-8) -var(--space-1);
  }
}

/* 動畫延遲效果 */
.skeleton-insight-section:nth-child(1) { animation-delay: var(--transition-fast); }
.skeleton-insight-section:nth-child(2) { animation-delay: var(--transition-base); }

.skeleton-config-section:nth-child(1) { animation-delay: var(--transition-fast); }
.skeleton-config-section:nth-child(2) { animation-delay: var(--transition-base); }

.skeleton-config-item:nth-child(odd) { animation-delay: var(--transition-fast); }
.skeleton-config-item:nth-child(even) { animation-delay: var(--transition-base); }

/* 淡入效果 */
.stock-market-insight-skeleton {
  animation: fadeIn var(--transition-slow) ease-in;
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