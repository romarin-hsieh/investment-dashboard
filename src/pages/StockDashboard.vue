<template>
  <div class="stock-dashboard">
    <!-- Performance Monitor -->
    <PerformanceMonitor />

    <!-- Stock Overview (原 Stock Grid) -->
    <StockOverview />
  </div>
</template>

<script>
import StockOverview from '@/components/StockOverview.vue'
import PerformanceMonitor from '@/components/PerformanceMonitor.vue'

export default {
  name: 'StockDashboard',
  components: {
    StockOverview,
    PerformanceMonitor
  }
}
</script>

<style scoped>
.stock-dashboard {
  padding: 0;
}

.mb-3 {
  margin-bottom: var(--space-3);
}

.text-muted {
  color: var(--grey-550);
}
</style>