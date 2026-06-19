<template>
  <div class="settings">
    <h2>{{ $t('settings.title') }}</h2>
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

<script>
export default {
  name: 'Settings'
}
</script>
