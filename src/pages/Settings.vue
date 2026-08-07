<template>
  <div class="settings">
    <h2 class="page-title">{{ $t('settings.title') }}</h2>
    <p class="text-muted mb-3">{{ $t('settings.subtitle') }}</p>

    <div class="card">
      <h3>{{ $t('settings.privacy.title') }}</h3>
      <p class="text-muted">{{ $t('settings.privacy.description') }}</p>
      <!-- Settings toggles will be implemented in task 7.1 -->
    </div>

    <div class="card">
      <h3>{{ $t('settings.diagnostics.title') }}</h3>
      <p class="text-muted">{{ $t('settings.diagnostics.description') }}</p>
      <!-- Diagnostics panel will be implemented in task 7.2 -->
    </div>

    <div class="card">
      <h3>{{ $t('settings.importExport.title') }}</h3>
      <p class="text-muted">{{ $t('settings.importExport.description') }}</p>
      <!-- Import/export functionality will be implemented in task 7.3 -->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Settings'
})
</script>

<style scoped>
.settings .card { padding: var(--card-padding); }
.settings .card + .card { margin-top: var(--space-4); }
.settings h2 { margin-bottom: var(--space-2); }
</style>
