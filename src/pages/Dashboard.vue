<template>
  <div class="dashboard">
    <h2>Market Dashboard</h2>
    <p class="text-muted mb-3">Macro indicators and stock overview</p>

    <div class="card">
      <h3>Macro Wall</h3>
      <p class="text-muted">10 macro economic indicators will be displayed here</p>
      <!-- MacroWall component will be implemented in task 4.2 -->
    </div>

    <div class="card">
      <h3>Stock Cards</h3>
      <p class="text-muted">Universe stocks grouped by industry will be displayed here</p>
      <!-- StockCard components will be implemented in task 4.4 -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dashboard'
}
</script>
