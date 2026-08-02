<template>
  <div class="stock-dashboard">
    <!-- Stock Overview (原 Stock Grid) -->
    <StockOverview />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StockOverview from '@/components/StockOverview.vue'

export default defineComponent({
  name: 'StockDashboard',
  components: {
    StockOverview
  }
})
</script>

<style scoped>
.stock-dashboard {
  padding: 0;
}

.mb-3 {
  margin-bottom: var(--space-3);
}

.text-muted {
  color: var(--text-secondary);
}
</style>