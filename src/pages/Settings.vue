<template>
  <div class="settings">
    <h2 class="page-title">{{ $t('settings.title') }}</h2>
    <p class="text-muted mb-3">{{ $t('settings.subtitle') }}</p>

    <!-- Decision 2026-08-07 (PRD Q6 → option C): the three promise-only stubs became one
         page of real, browser-local functions. Section 1 is a statement, not a control —
         there is genuinely nothing to toggle: the app has no tracking or analytics. -->
    <div class="card">
      <h3>{{ $t('settings.privacy.title') }}</h3>
      <p class="text-muted">{{ $t('settings.privacy.description') }}</p>
    </div>

    <div class="card">
      <h3>{{ $t('settings.importExport.title') }}</h3>
      <p class="text-muted">{{ $t('settings.importExport.description') }}</p>
      <div class="actions">
        <button class="btn btn-secondary" @click="exportPrefs">
          {{ $t('settings.importExport.exportButton') }}
        </button>
        <label class="btn btn-secondary import-label">
          {{ $t('settings.importExport.importButton') }}
          <input type="file" accept="application/json,.json" class="file-input" @change="onImportFile">
        </label>
      </div>
      <p v-if="importStatus === 'done'" class="status-line text-muted" role="status">
        {{ $t('settings.importExport.importSuccess') }}
      </p>
      <p v-else-if="importStatus === 'invalid'" class="status-line text-danger" role="alert">
        {{ $t('settings.importExport.importInvalid') }}
      </p>
    </div>

    <div class="card">
      <h3>{{ $t('settings.clearData.title') }}</h3>
      <p class="text-muted">{{ $t('settings.clearData.description') }}</p>
      <div class="actions">
        <!-- Two-step inline confirm (no native confirm() — audit I5): first click arms
             for 5 s, second click clears. -->
        <button class="btn btn-warning" @click="onClearClick">
          {{ clearArmed ? $t('settings.clearData.confirmButton') : $t('settings.clearData.clearButton') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { SUPPORTED_LOCALES } from '@/i18n'

interface PreferencePayload {
  app: string
  version: number
  exportedAt: string
  prefs: { theme?: string | null; locale?: string | null }
}

export default defineComponent({
  name: 'Settings',
  data() {
    return {
      importStatus: null as null | 'done' | 'invalid',
      clearArmed: false,
      clearArmTimer: null as ReturnType<typeof setTimeout> | null
    }
  },
  beforeUnmount() {
    if (this.clearArmTimer) clearTimeout(this.clearArmTimer)
  },
  methods: {
    // Pure payload builder (unit-tested separately from the download plumbing).
    buildExportPayload(): PreferencePayload {
      return {
        app: 'investment-dashboard-preferences',
        version: 1,
        exportedAt: new Date().toISOString(),
        prefs: {
          theme: localStorage.getItem('theme'),
          locale: localStorage.getItem('locale')
        }
      }
    },

    exportPrefs() {
      const blob = new Blob([JSON.stringify(this.buildExportPayload(), null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'investment-dashboard-preferences.json'
      a.click()
      URL.revokeObjectURL(url)
    },

    /** Validates and applies an imported payload; returns whether it was accepted. */
    applyImportedPayload(raw: unknown): boolean {
      const payload = raw as Partial<PreferencePayload> | null
      const prefs = payload?.prefs
      if (payload?.app !== 'investment-dashboard-preferences' || !prefs || typeof prefs !== 'object') {
        return false
      }
      const theme = prefs.theme
      const locale = prefs.locale
      if (theme != null && !['light', 'dark'].includes(theme)) return false
      if (locale != null && !SUPPORTED_LOCALES.includes(locale)) return false
      if (theme != null) localStorage.setItem('theme', theme)
      if (locale != null) localStorage.setItem('locale', locale)
      return true
    },

    async onImportFile(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = '' // allow re-selecting the same file
      if (!file) return
      try {
        const parsed: unknown = JSON.parse(await file.text())
        if (!this.applyImportedPayload(parsed)) {
          this.importStatus = 'invalid'
          return
        }
        this.importStatus = 'done'
        // Reload so theme/locale bootstrapping re-reads the imported values.
        setTimeout(() => this.reloadApp(), 600)
      } catch {
        this.importStatus = 'invalid'
      }
    },

    onClearClick() {
      if (!this.clearArmed) {
        this.clearArmed = true
        this.clearArmTimer = setTimeout(() => {
          this.clearArmed = false
        }, 5000)
        return
      }
      if (this.clearArmTimer) clearTimeout(this.clearArmTimer)
      localStorage.clear()
      this.reloadApp()
    },

    // Seam for tests (jsdom cannot navigate).
    reloadApp() {
      window.location.reload()
    }
  }
})
</script>

<style scoped>
.settings .card { padding: var(--card-padding); }
.settings .card + .card { margin-top: var(--space-4); }
.settings h2 { margin-bottom: var(--space-2); }
.actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}
/* A <label> styled as .btn hosts the hidden file input (keyboard: the input itself
   stays focusable). */
.import-label { position: relative; overflow: hidden; }
.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.status-line { margin-top: var(--space-3); }
</style>
