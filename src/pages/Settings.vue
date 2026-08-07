<template>
  <div class="settings">
    <h2 class="page-title">{{ $t('settings.title') }}</h2>
    <p class="text-muted mb-3">{{ $t('settings.subtitle') }}</p>

    <!-- Every section is an unimplemented stub (tasks 7.1-7.3). The 規劃中 badge keeps
         the page honest until the controls exist — the descriptions previously promised
         choices the page could not make (audit SD-6 / US-SET1). Implement-vs-delist is
         PRD Open Question 6. -->
    <div class="card">
      <h3>{{ $t('settings.privacy.title') }} <span class="planned-badge">{{ $t('settings.planned') }}</span></h3>
      <p class="text-muted">{{ $t('settings.privacy.description') }}</p>
    </div>

    <div class="card">
      <h3>{{ $t('settings.diagnostics.title') }} <span class="planned-badge">{{ $t('settings.planned') }}</span></h3>
      <p class="text-muted">{{ $t('settings.diagnostics.description') }}</p>
    </div>

    <div class="card">
      <h3>{{ $t('settings.importExport.title') }} <span class="planned-badge">{{ $t('settings.planned') }}</span></h3>
      <p class="text-muted">{{ $t('settings.importExport.description') }}</p>
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
.settings h3 { display: flex; align-items: center; gap: var(--space-2); }
.planned-badge {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-2);
}
</style>
