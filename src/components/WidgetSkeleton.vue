<template>
  <div class="widget-skeleton">
    <!-- Optional Header -->
    <div v-if="showHeader" class="skeleton-header">
      <div class="skeleton-title"></div>
      <div v-if="showSubtitle" class="skeleton-subtitle"></div>
    </div>

    <!-- Content Area -->
    <div class="skeleton-content" :class="{ 'grid-layout': isGrid, 'chart-layout': isChart }" style="flex: 1;">
      <!-- Grid Items -->
      <template v-if="isGrid">
        <div v-for="i in itemCount" :key="i" class="skeleton-grid-item">
          <div class="skeleton-label"></div>
          <div class="skeleton-value"></div>
        </div>
      </template>

      <!-- Chart Item -->
      <template v-else-if="isChart">
        <div class="skeleton-chart"></div>
      </template>

      <!-- List Items -->
      <template v-else>
        <div v-for="i in itemCount" :key="i" class="skeleton-list-item">
          <div class="skeleton-line full"></div>
          <div class="skeleton-line short"></div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WidgetSkeleton',
  props: {
    showHeader: {
      type: Boolean,
      default: false
    },
    showSubtitle: {
      type: Boolean,
      default: false
    },
    type: {
      type: String, // 'list' | 'grid'
      default: 'list'
    },
    itemCount: {
      type: Number,
      default: 6
    },
    bordered: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    isGrid() {
      return this.type === 'grid'
    },
    isChart() {
      return this.type === 'chart'
    }
  }
}
</script>

<style scoped>
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.widget-skeleton {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.widget-skeleton.bordered {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  padding: 1rem;
}

/* Base Skeleton Animation */
.skeleton-title,
.skeleton-subtitle,
.skeleton-label,
.skeleton-value,
.skeleton-line {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}

/* Header */
.skeleton-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-title {
  width: 120px;
  height: 20px;
  margin-bottom: 0.5rem;
}

.skeleton-subtitle {
  width: 80px;
  height: 14px;
}

/* List Layout */
.skeleton-list-item {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-line {
  height: 16px;
}

.skeleton-line.full { width: 100%; }
.skeleton-line.short { width: 60%; }

/* Grid Layout */
.skeleton-content.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
}

.skeleton-grid-item {
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-label {
  width: 100%;
  height: 12px;
  opacity: 0.7;
}

.skeleton-value {
  width: 80%;
  height: 16px;
}

/* Chart Layout */
.skeleton-content.chart-layout {
  height: 100%;
  width: 100%;
  flex: 1;
  display: flex;
}

.skeleton-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 4px;
}
</style>
