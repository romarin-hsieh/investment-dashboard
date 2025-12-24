<template>
  <div class="top-stories-skeleton">
    <!-- Page Header Skeleton -->
    <div class="skeleton-page-header">
      <div class="skeleton-page-title"></div>
      <div class="skeleton-page-description"></div>
    </div>

    <!-- Top Stories Widget Skeleton -->
    <div class="skeleton-widget-container">
      <div class="skeleton-stories-area">
        <div class="skeleton-story-item" v-for="i in 10" :key="i">
          <div class="skeleton-story-time"></div>
          <div class="skeleton-story-title"></div>
          <div class="skeleton-story-content"></div>
          <div class="skeleton-story-tags">
            <div class="skeleton-story-tag" v-for="j in 3" :key="j"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Info Skeleton -->
    <div class="skeleton-config-info">
      <div class="skeleton-config-title"></div>
      <div class="skeleton-config-list">
        <div class="skeleton-config-item" v-for="i in 5" :key="i">
          <div class="skeleton-config-label"></div>
          <div class="skeleton-config-value"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TopStoriesSkeleton'
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

.top-stories-skeleton {
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
  width: 280px;
  height: 32px;
  margin-bottom: 0.5rem;
}

.skeleton-page-description {
  @extend .skeleton-base;
  width: 350px;
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
  min-height: 650px;
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
  gap: 0.75rem;
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.skeleton-story-time {
  @extend .skeleton-base;
  width: 120px;
  height: 14px;
}

.skeleton-story-title {
  @extend .skeleton-base;
  width: 85%;
  height: 20px;
}

.skeleton-story-content {
  @extend .skeleton-base;
  width: 70%;
  height: 16px;
}

.skeleton-story-tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.skeleton-story-tag {
  @extend .skeleton-base;
  width: 60px;
  height: 18px;
  border-radius: 9px;
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
  width: 180px;
  height: 20px;
  margin-bottom: 1rem;
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
  width: 120px;
  height: 16px;
}

.skeleton-config-value {
  @extend .skeleton-base;
  width: 80px;
  height: 16px;
}

/* 實際應用骨架樣式 */
.skeleton-page-title,
.skeleton-page-description,
.skeleton-story-time,
.skeleton-story-title,
.skeleton-story-content,
.skeleton-story-tag,
.skeleton-config-title,
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
    min-height: 500px;
  }
  
  .skeleton-stories-area {
    min-height: 450px;
  }
  
  .skeleton-story-item {
    padding: 1rem;
  }
  
  .skeleton-config-info {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .skeleton-widget-container {
    padding: 0.5rem;
    margin: 0 -0.25rem 1rem -0.25rem;
    min-height: 400px;
  }
  
  .skeleton-stories-area {
    min-height: 350px;
  }
  
  .skeleton-story-item {
    padding: 0.75rem;
  }
  
  .skeleton-config-info {
    padding: 0.5rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .skeleton-story-tags {
    flex-wrap: wrap;
  }
}

/* 動畫延遲效果 */
.skeleton-story-item:nth-child(1) { animation-delay: 0.1s; }
.skeleton-story-item:nth-child(2) { animation-delay: 0.2s; }
.skeleton-story-item:nth-child(3) { animation-delay: 0.3s; }
.skeleton-story-item:nth-child(4) { animation-delay: 0.4s; }
.skeleton-story-item:nth-child(5) { animation-delay: 0.5s; }

.skeleton-story-tag:nth-child(1) { animation-delay: 0.1s; }
.skeleton-story-tag:nth-child(2) { animation-delay: 0.2s; }
.skeleton-story-tag:nth-child(3) { animation-delay: 0.3s; }

.skeleton-config-item:nth-child(odd) { animation-delay: 0.1s; }
.skeleton-config-item:nth-child(even) { animation-delay: 0.2s; }

/* 淡入效果 */
.top-stories-skeleton {
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