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
      <div class="skeleton-info-section">
        <div class="skeleton-company-name"></div>
        <div class="skeleton-market-info">
          <div class="skeleton-market-cap"></div>
          <div class="skeleton-exchange"></div>
        </div>
        <div class="skeleton-description"></div>
        <div class="skeleton-description short"></div>
      </div>
      
      <div class="skeleton-chart-section">
        <div class="skeleton-chart"></div>
        <div class="skeleton-chart-info">
          <div class="skeleton-chart-label"></div>
          <div class="skeleton-chart-value"></div>
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
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

.stock-card-skeleton {
  background: white;
  border: 1px solid #e0e0e0;
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
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.skeleton-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-company-name {
  @extend .skeleton-base;
  width: 200px;
  height: 20px;
}

.skeleton-market-info {
  display: flex;
  gap: 1rem;
}

.skeleton-market-cap {
  @extend .skeleton-base;
  width: 120px;
  height: 16px;
}

.skeleton-exchange {
  @extend .skeleton-base;
  width: 60px;
  height: 16px;
}

.skeleton-description {
  @extend .skeleton-base;
  height: 16px;
  width: 100%;
}

.skeleton-description.short {
  width: 75%;
}

.skeleton-chart-section {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-chart {
  @extend .skeleton-base;
  width: 100%;
  height: 120px;
  border-radius: 8px;
}

.skeleton-chart-info {
  display: flex;
  justify-content: space-between;
}

.skeleton-chart-label {
  @extend .skeleton-base;
  width: 80px;
  height: 14px;
}

.skeleton-chart-value {
  @extend .skeleton-base;
  width: 60px;
  height: 14px;
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
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
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