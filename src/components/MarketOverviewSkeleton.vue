<template>
  <div class="market-overview-skeleton">
    <!-- Market Index Widget Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-ticker-area">
        <div class="skeleton-ticker-item" v-for="i in 6" :key="i"></div>
      </div>
    </div>

    <!-- Fear & Greed Gauge Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-gauge-area">
        <div class="skeleton-gauge-circle"></div>
        <div class="skeleton-gauge-info">
          <div class="skeleton-gauge-value"></div>
          <div class="skeleton-gauge-label"></div>
        </div>
      </div>
    </div>

    <!-- Top Stories Widget Skeleton -->
    <div class="skeleton-widget-container large">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-stories-area">
        <div class="skeleton-story-item" v-for="i in 8" :key="i">
          <div class="skeleton-story-time"></div>
          <div class="skeleton-story-title"></div>
          <div class="skeleton-story-content"></div>
        </div>
      </div>
    </div>

    <!-- Market Insight Widget Skeleton -->
    <div class="skeleton-widget-container large">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-insight-grid">
        <div class="skeleton-insight-section">
          <div class="skeleton-section-header">
            <div class="skeleton-section-title"></div>
          </div>
          <div class="skeleton-chart-area">
            <div class="skeleton-chart"></div>
          </div>
        </div>
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

    <!-- Stock Heatmap Widget Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-heatmap-area">
        <div class="skeleton-heatmap-grid">
          <div class="skeleton-heatmap-cell" v-for="i in 20" :key="i"></div>
        </div>
      </div>
    </div>

    <!-- Performance Monitor Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-performance-area">
        <div class="skeleton-performance-item" v-for="i in 4" :key="i">
          <div class="skeleton-performance-label"></div>
          <div class="skeleton-performance-value"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MarketOverviewSkeleton'
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

.market-overview-skeleton {
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}

/* 通用骨架樣式 */
.skeleton-base {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* Widget 容器骨架 */
.skeleton-widget-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}

.skeleton-widget-container.large {
  min-height: 400px;
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
  width: 140px;
  height: 20px;
}

/* Market Index Ticker 骨架 */
.skeleton-ticker-area {
  display: flex;
  gap: 1rem;
  overflow: hidden;
  min-height: 100px;
  align-items: center;
  flex-wrap: wrap;
}

.skeleton-ticker-item {
  @extend .skeleton-base;
  flex: 1;
  min-width: 120px;
  height: 60px;
  border-radius: 8px;
}

/* Fear & Greed Gauge 骨架 */
.skeleton-gauge-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  min-height: 200px;
}

.skeleton-gauge-circle {
  @extend .skeleton-base;
  width: 150px;
  height: 150px;
  border-radius: 50%;
}

.skeleton-gauge-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-gauge-value {
  @extend .skeleton-base;
  width: 80px;
  height: 32px;
}

.skeleton-gauge-label {
  @extend .skeleton-base;
  width: 120px;
  height: 20px;
}

/* Top Stories 骨架 */
.skeleton-stories-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 600px;
}

.skeleton-story-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.skeleton-story-time {
  @extend .skeleton-base;
  width: 100px;
  height: 14px;
}

.skeleton-story-title {
  @extend .skeleton-base;
  width: 80%;
  height: 18px;
}

.skeleton-story-content {
  @extend .skeleton-base;
  width: 60%;
  height: 14px;
}

/* Market Insight 骨架 */
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
  width: 200px;
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
  height: 500px;
  border-radius: 8px;
}

/* Stock Heatmap 骨架 */
.skeleton-heatmap-area {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-heatmap-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  width: 100%;
  height: 400px;
}

.skeleton-heatmap-cell {
  @extend .skeleton-base;
  border-radius: 4px;
}

/* Performance Monitor 骨架 */
.skeleton-performance-area {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  min-height: 120px;
}

.skeleton-performance-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.skeleton-performance-label {
  @extend .skeleton-base;
  width: 100px;
  height: 16px;
}

.skeleton-performance-value {
  @extend .skeleton-base;
  width: 80px;
  height: 24px;
}

/* 實際應用骨架樣式 */
.skeleton-title,
.skeleton-ticker-item,
.skeleton-gauge-circle,
.skeleton-gauge-value,
.skeleton-gauge-label,
.skeleton-story-time,
.skeleton-story-title,
.skeleton-story-content,
.skeleton-section-title,
.skeleton-chart,
.skeleton-heatmap-cell,
.skeleton-performance-label,
.skeleton-performance-value {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
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
    height: 50px;
  }
  
  .skeleton-gauge-area {
    flex-direction: column;
    gap: 1rem;
  }
  
  .skeleton-gauge-circle {
    width: 120px;
    height: 120px;
  }
  
  .skeleton-heatmap-grid {
    grid-template-columns: repeat(3, 1fr);
    height: 300px;
  }
  
  .skeleton-performance-area {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .skeleton-widget-container {
    padding: 0.5rem;
    margin: 0 -0.25rem 1rem -0.25rem;
  }
  
  .skeleton-heatmap-grid {
    grid-template-columns: repeat(2, 1fr);
    height: 250px;
  }
}

/* 動畫延遲效果 */
.skeleton-ticker-item:nth-child(1) { animation-delay: 0.1s; }
.skeleton-ticker-item:nth-child(2) { animation-delay: 0.2s; }
.skeleton-ticker-item:nth-child(3) { animation-delay: 0.3s; }
.skeleton-ticker-item:nth-child(4) { animation-delay: 0.4s; }
.skeleton-ticker-item:nth-child(5) { animation-delay: 0.5s; }
.skeleton-ticker-item:nth-child(6) { animation-delay: 0.6s; }

.skeleton-story-item:nth-child(odd) { animation-delay: 0.1s; }
.skeleton-story-item:nth-child(even) { animation-delay: 0.2s; }

/* 淡入效果 */
.market-overview-skeleton {
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