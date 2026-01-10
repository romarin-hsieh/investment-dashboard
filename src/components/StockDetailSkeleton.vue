<template>
  <div class="stock-detail-skeleton">
    <!-- Breadcrumb Skeleton -->
    <div class="skeleton-breadcrumb">
      <div class="skeleton-breadcrumb-link"></div>
      <div class="skeleton-breadcrumb-separator">›</div>
      <div class="skeleton-breadcrumb-current"></div>
    </div>

    <!-- Stock Header Skeleton -->
    <div class="skeleton-stock-header">
      <div class="skeleton-header-info">
        <div class="skeleton-symbol-info">
          <div class="skeleton-symbol"></div>
          <div class="skeleton-tags">
            <div class="skeleton-tag"></div>
            <div class="skeleton-tag"></div>
          </div>
        </div>
        <div class="skeleton-header-actions">
          <div class="skeleton-back-button"></div>
        </div>
      </div>

      <!-- Widgets Container Skeleton -->
      <div class="skeleton-widgets-container">
        <!-- Symbol Overview (2/3 width) -->
        <div class="skeleton-widget-overview">
          <div class="skeleton-widget-header">
            <div class="skeleton-title"></div>
          </div>
          <div class="skeleton-overview-content"></div>
        </div>

        <!-- Technical Analysis (1/3 width) -->
        <div class="skeleton-widget-technical">
          <div class="skeleton-widget-header">
            <div class="skeleton-title"></div>
          </div>
          <div class="skeleton-technical-content"></div>
        </div>
      </div>
    </div>

    <!-- Insight Widgets Container Skeleton -->
    <div class="skeleton-insight-widgets">
      <!-- Daily Insight -->
      <div class="skeleton-insight-widget">
        <div class="skeleton-widget-header">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-insight-content"></div>
      </div>

      <!-- Weekly Insight -->
      <div class="skeleton-insight-widget">
        <div class="skeleton-widget-header">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-insight-content"></div>
      </div>
    </div>

    <!-- Technical Indicators Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-technical-indicators">
        <div class="skeleton-indicator-item" v-for="i in 6" :key="i">
          <div class="skeleton-indicator-name"></div>
          <div class="skeleton-indicator-value"></div>
          <div class="skeleton-indicator-signal"></div>
        </div>
      </div>
    </div>

    <!-- Performance Monitor Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-widget-header">
        <div class="skeleton-title"></div>
      </div>
      <div class="skeleton-performance-grid">
        <div class="skeleton-performance-item" v-for="i in 4" :key="i">
          <div class="skeleton-performance-label"></div>
          <div class="skeleton-performance-value"></div>
        </div>
      </div>
    </div>

    <!-- Content Layout Skeleton -->
    <div class="skeleton-content-layout">
      <!-- Stock News Row -->
      <div class="skeleton-news-row">
        <div class="skeleton-widget-header">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-news-content">
          <div class="skeleton-news-item" v-for="i in 5" :key="i">
            <div class="skeleton-news-title"></div>
            <div class="skeleton-news-summary"></div>
            <div class="skeleton-news-time"></div>
          </div>
        </div>
      </div>

      <!-- Fundamental Data Row -->
      <div class="skeleton-fundamental-row">
        <div class="skeleton-widget-header">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-fundamental-content">
          <div class="skeleton-fundamental-grid">
            <div class="skeleton-fundamental-item" v-for="i in 8" :key="i">
              <div class="skeleton-fundamental-label"></div>
              <div class="skeleton-fundamental-value"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Company Profile Row -->
      <div class="skeleton-profile-row">
        <div class="skeleton-widget-header">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-profile-content">
          <div class="skeleton-profile-info">
            <div class="skeleton-profile-item" v-for="i in 6" :key="i">
              <div class="skeleton-profile-label"></div>
              <div class="skeleton-profile-value"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StockDetailSkeleton'
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

.stock-detail-skeleton {
  background: var(--bg-primary);
  padding: 1rem;
  min-height: 100vh;
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

/* Breadcrumb 骨架 */
.skeleton-breadcrumb {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.skeleton-breadcrumb-link {
  @extend .skeleton-base;
  width: 120px;
  height: 16px;
}

.skeleton-breadcrumb-separator {
  color: var(--text-muted);
  margin: 0 0.25rem;
}

.skeleton-breadcrumb-current {
  @extend .skeleton-base;
  width: 150px;
  height: 16px;
}

/* Stock Header 骨架 */
.skeleton-stock-header {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.skeleton-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.skeleton-symbol-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-symbol {
  @extend .skeleton-base;
  width: 100px;
  height: 24px;
}

.skeleton-tags {
  display: flex;
  gap: 0.5rem;
}

.skeleton-tag {
  @extend .skeleton-base;
  width: 80px;
  height: 20px;
  border-radius: 10px;
}

.skeleton-header-actions {
  display: flex;
  align-items: center;
}

.skeleton-back-button {
  @extend .skeleton-base;
  width: 160px;
  height: 36px;
  border-radius: 6px;
}

/* Widgets Container 骨架 */
.skeleton-widgets-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  min-height: 450px;
}

.skeleton-widget-overview,
.skeleton-widget-technical {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.skeleton-widget-header {
  background: var(--bg-card);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.skeleton-title {
  @extend .skeleton-base;
  width: 120px;
  height: 16px;
}

.skeleton-overview-content,
.skeleton-technical-content {
  @extend .skeleton-base;
  flex: 1;
  margin: 1rem;
  min-height: 380px;
  border-radius: 8px;
}

/* Insight Widgets 骨架 */
.skeleton-insight-widgets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.skeleton-insight-widget {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 600px;
}

.skeleton-insight-content {
  @extend .skeleton-base;
  flex: 1;
  margin: 1rem;
  min-height: 540px;
  border-radius: 8px;
}

/* Widget 容器骨架 */
.skeleton-widget-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
  position: relative;
}

/* Technical Indicators 骨架 */
.skeleton-technical-indicators {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  min-height: 300px;
}

.skeleton-indicator-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--skeleton-bg);
  border-radius: 8px;
}

.skeleton-indicator-name {
  @extend .skeleton-base;
  width: 120px;
  height: 16px;
}

.skeleton-indicator-value {
  @extend .skeleton-base;
  width: 80px;
  height: 24px;
}

.skeleton-indicator-signal {
  @extend .skeleton-base;
  width: 60px;
  height: 20px;
  border-radius: 10px;
}

/* Performance Monitor 骨架 */
.skeleton-performance-grid {
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
  background: var(--skeleton-bg);
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

/* Content Layout 骨架 */
.skeleton-content-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.skeleton-news-row,
.skeleton-fundamental-row,
.skeleton-profile-row {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  overflow: hidden;
}

/* Stock News 骨架 */
.skeleton-news-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 400px;
}

.skeleton-news-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-news-title {
  @extend .skeleton-base;
  width: 80%;
  height: 18px;
}

.skeleton-news-summary {
  @extend .skeleton-base;
  width: 60%;
  height: 14px;
}

.skeleton-news-time {
  @extend .skeleton-base;
  width: 100px;
  height: 12px;
}

/* Fundamental Data 骨架 */
.skeleton-fundamental-content {
  min-height: 600px;
}

.skeleton-fundamental-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.skeleton-fundamental-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--skeleton-bg);
  border-radius: 8px;
}

.skeleton-fundamental-label {
  @extend .skeleton-base;
  width: 80px;
  height: 14px;
}

.skeleton-fundamental-value {
  @extend .skeleton-base;
  width: 100px;
  height: 20px;
}

/* Company Profile 骨架 */
.skeleton-profile-content {
  min-height: 400px;
}

.skeleton-profile-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.skeleton-profile-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--skeleton-bg);
  border-radius: 8px;
}

.skeleton-profile-label {
  @extend .skeleton-base;
  width: 100px;
  height: 16px;
}

.skeleton-profile-value {
  @extend .skeleton-base;
  width: 120px;
  height: 16px;
}

/* 實際應用骨架樣式 */
.skeleton-breadcrumb-link,
.skeleton-breadcrumb-current,
.skeleton-symbol,
.skeleton-tag,
.skeleton-back-button,
.skeleton-title,
.skeleton-overview-content,
.skeleton-technical-content,
.skeleton-insight-content,
.skeleton-indicator-name,
.skeleton-indicator-value,
.skeleton-indicator-signal,
.skeleton-performance-label,
.skeleton-performance-value,
.skeleton-news-title,
.skeleton-news-summary,
.skeleton-news-time,
.skeleton-fundamental-label,
.skeleton-fundamental-value,
.skeleton-profile-label,
.skeleton-profile-value {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .skeleton-widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .skeleton-insight-widgets {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .stock-detail-skeleton {
    padding: 0.5rem;
  }
  
  .skeleton-stock-header {
    padding: 1rem;
  }
  
  .skeleton-header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .skeleton-widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
    min-height: auto;
  }
  
  .skeleton-insight-widgets {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .skeleton-insight-widget {
    height: auto;
    min-height: 500px;
  }
  
  .skeleton-insight-content {
    min-height: 450px;
  }
  
  .skeleton-overview-content,
  .skeleton-technical-content {
    min-height: 330px;
  }
  
  .skeleton-technical-indicators {
    grid-template-columns: 1fr;
  }
  
  .skeleton-performance-grid {
    grid-template-columns: 1fr;
  }
  
  .skeleton-fundamental-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .skeleton-profile-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .skeleton-stock-header {
    padding: 0.75rem;
    margin: 0 -0.25rem 1rem -0.25rem;
  }
  
  .skeleton-widget-container,
  .skeleton-news-row,
  .skeleton-fundamental-row,
  .skeleton-profile-row {
    padding: 0.5rem;
    margin: 0 -0.25rem 1rem -0.25rem;
  }
  
  .skeleton-fundamental-grid {
    grid-template-columns: 1fr;
  }
}

/* 動畫延遲效果 */
.skeleton-tag:nth-child(1) { animation-delay: 0.1s; }
.skeleton-tag:nth-child(2) { animation-delay: 0.2s; }

.skeleton-indicator-item:nth-child(odd) { animation-delay: 0.1s; }
.skeleton-indicator-item:nth-child(even) { animation-delay: 0.2s; }

.skeleton-news-item:nth-child(1) { animation-delay: 0.1s; }
.skeleton-news-item:nth-child(2) { animation-delay: 0.2s; }
.skeleton-news-item:nth-child(3) { animation-delay: 0.3s; }

.skeleton-fundamental-item:nth-child(odd) { animation-delay: 0.1s; }
.skeleton-fundamental-item:nth-child(even) { animation-delay: 0.2s; }

.skeleton-profile-item:nth-child(odd) { animation-delay: 0.1s; }
.skeleton-profile-item:nth-child(even) { animation-delay: 0.2s; }

/* 淡入效果 */
.stock-detail-skeleton {
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