<template>
  <div class="stock-card-skeleton">
    <!-- Stock Card Header -->
    <div class="skeleton-header">
      <div class="skeleton-symbol"></div>
      <div class="skeleton-price-group">
        <div class="skeleton-price"></div>
        <div class="skeleton-change"></div>
      </div>
    </div>
    
    <!-- Stock Card Content -->
    <div class="skeleton-content">
      <!-- Widgets Container Skeleton -->
      <div class="skeleton-widgets-container">
        <!-- Overview Widget Skeleton -->
        <div class="skeleton-widget overview">
           <div class="skeleton-widget-header"></div>
           <div class="skeleton-chart"></div>
        </div>
        <!-- Technical Widget Skeleton -->
        <div class="skeleton-widget technical">
           <div class="skeleton-widget-header"></div>
           <div class="skeleton-chart"></div>
        </div>
      </div>
    </div>
    
    <!-- Stock Card Footer -->
    <div class="skeleton-footer">
      <div class="skeleton-tags">
        <div class="skeleton-tag exchange"></div>
        <div class="skeleton-tag industry"></div>
      </div>
      <div class="skeleton-metadata">
        <div class="skeleton-confidence"></div>
        <div class="skeleton-source"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StockCardSkeleton'
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

/* 通用骨架樣式 */
.skeleton-base {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

.stock-card-skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease-in;
}

/* Header 骨架 */
.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.skeleton-symbol {
  @extend .skeleton-base;
  width: 80px;
  height: 28px;
  font-weight: bold;
}

.skeleton-price-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.skeleton-price {
  @extend .skeleton-base;
  width: 100px;
  height: 24px;
}

.skeleton-change {
  @extend .skeleton-base;
  width: 80px;
  height: 20px;
}

/* Content 骨架 */
.skeleton-content {
  margin-bottom: 1.5rem;
}

.skeleton-widgets-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.skeleton-widget {
  background: var(--bg-primary); /* Slightly different from card base */
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-widget.overview {
  height: 440px;
}

.skeleton-widget.technical {
  height: 440px;
}

.skeleton-widget-header {
  @extend .skeleton-base;
  width: 120px;
  height: 20px;
}

.skeleton-chart {
  @extend .skeleton-base;
  flex: 1;
  width: 100%;
  border-radius: 4px;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .skeleton-widgets-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .skeleton-widget.overview,
  .skeleton-widget.technical {
    height: 380px;
  }
}

@media (max-width: 480px) {
  .stock-card-skeleton {
    padding: 1rem;
  }
  
  .skeleton-header {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .skeleton-price-group {
    align-items: flex-start;
  }

  .skeleton-widget.overview,
  .skeleton-widget.technical {
    height: 330px;
  }
}

/* Footer 骨架 */
.skeleton-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-tags {
  display: flex;
  gap: 0.5rem;
}

.skeleton-tag {
  @extend .skeleton-base;
  height: 24px;
  border-radius: 12px;
}

.skeleton-tag.exchange {
  width: 70px;
}

.skeleton-tag.industry {
  width: 120px;
}

.skeleton-metadata {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.skeleton-confidence {
  @extend .skeleton-base;
  width: 80px;
  height: 14px;
}

.skeleton-source {
  @extend .skeleton-base;
  width: 100px;
  height: 12px;
}

/* 實際應用骨架樣式 */
.skeleton-symbol,
.skeleton-price,
.skeleton-change,
.skeleton-company-name,
.skeleton-market-cap,
.skeleton-exchange,
.skeleton-description,
.skeleton-chart,
.skeleton-chart-label,
.skeleton-chart-value,
.skeleton-tag,
.skeleton-confidence,
.skeleton-source {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .skeleton-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .skeleton-chart-section {
    width: 100%;
  }
  
  .skeleton-chart {
    height: 100px;
  }
  
  .skeleton-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .skeleton-metadata {
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .stock-card-skeleton {
    padding: 1rem;
  }
  
  .skeleton-header {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .skeleton-price-group {
    align-items: flex-start;
  }
  
  .skeleton-market-info {
    flex-direction: column;
    gap: 0.5rem;
  }
}

/* 動畫延遲效果 */
.skeleton-symbol {
  animation-delay: 0.1s;
}

.skeleton-price {
  animation-delay: 0.2s;
}

.skeleton-change {
  animation-delay: 0.3s;
}

.skeleton-company-name {
  animation-delay: 0.4s;
}

.skeleton-chart {
  animation-delay: 0.5s;
}

/* 淡入效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>