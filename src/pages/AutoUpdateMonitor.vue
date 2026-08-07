<template>
  <div class="auto-update-monitor">
    <div class="monitor-header">
      <h2 class="page-title">{{ $t('autoUpdate.title') }}</h2>
      <div class="header-actions">
        <!-- Per-action busy flags (audit I7): each control disables on ITS OWN work
             only, and Refresh shows real in-progress feedback. -->
        <button @click="manualRefresh" class="btn btn-secondary" :disabled="busy.refresh">
          {{ busy.refresh ? $t('autoUpdate.refreshing') : $t('autoUpdate.refreshStatus') }}
        </button>
        <button @click="toggleScheduler" :class="schedulerButtonClass" :disabled="busy.scheduler">
          {{ schedulerButtonText }}
        </button>
      </div>
    </div>

    <div class="monitor-grid">
      <!-- Scheduler -->
      <div class="status-card">
        <div class="card-header">
          <h3>{{ $t('autoUpdate.schedulerStatus') }}</h3>
          <div class="status-indicator" :class="schedulerStatusClass">
            {{ schedulerStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.runState') }}:</span>
            <span class="value" :class="schedulerStatusClass">
              {{ status.isRunning ? $t('autoUpdate.running') : $t('autoUpdate.stopped') }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.activeTasks') }}:</span>
            <span class="value">{{ status.activeIntervals?.length || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.startTime') }}:</span>
            <span class="value">{{ formatTime(startTime) }}</span>
          </div>
        </div>
      </div>

      <!-- Technical indicators -->
      <div class="status-card">
        <div class="card-header">
          <h3>{{ $t('autoUpdate.technicalIndicators') }}</h3>
          <div class="status-indicator" :class="technicalIndicatorsStatusClass">
            {{ technicalIndicatorsStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.lastUpdate') }}:</span>
            <span class="value">{{ formatTime(technicalIndicatorsLastUpdate) }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.dataAge') }}:</span>
            <span class="value" :class="getDataAgeClass(technicalIndicatorsAge)">
              {{ formatDataAge(technicalIndicatorsAge) }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.nextUpdate') }}:</span>
            <span class="value">{{ formatTime(status.nextUpdates?.technicalIndicators) }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.successRate') }}:</span>
            <span class="value">{{ technicalIndicatorsSuccessRate }}%</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerUpdate('technicalIndicators')" class="btn btn-primary btn-sm" :disabled="busy.technicalIndicators">
            {{ $t('autoUpdate.clearCache') }}
          </button>
          <div class="update-note">
            <small>{{ $t('autoUpdate.noteServerSide') }}</small>
          </div>
        </div>
      </div>

      <!-- Metadata -->
      <div class="status-card">
        <div class="card-header">
          <h3>{{ $t('autoUpdate.metadata') }}</h3>
          <div class="status-indicator" :class="metadataStatusClass">
            {{ metadataStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.lastUpdate') }}:</span>
            <span class="value">{{ formatTime(metadataLastUpdate) }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.dataAge') }}:</span>
            <span class="value" :class="getDataAgeClass(metadataAge)">
              {{ formatDataAge(metadataAge) }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.nextUpdate') }}:</span>
            <span class="value">{{ formatTime(status.nextUpdates?.metadata) }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.symbolCount') }}:</span>
            <span class="value">{{ metadataSymbolCount }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerUpdate('metadata')" class="btn btn-primary btn-sm" :disabled="busy.metadata">
            {{ $t('autoUpdate.manualUpdate') }}
          </button>
        </div>
      </div>

      <!-- Cache warm-up -->
      <div class="status-card">
        <div class="card-header">
          <h3>{{ $t('autoUpdate.cacheWarmup') }}</h3>
          <div class="status-indicator" :class="warmupStatusClass">
            {{ warmupStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.warmupState') }}:</span>
            <span class="value" :class="warmupStatusClass">
              {{ warmupInfo.isWarming ? $t('autoUpdate.inProgress') : $t('autoUpdate.idle') }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.progress') }}:</span>
            <span class="value">{{ Math.round(warmupInfo.progress) }}%</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.trackedSymbols') }}:</span>
            <span class="value">{{ warmupInfo.trackedSymbols?.length || 0 }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.lastWarmup') }}:</span>
            <span class="value">{{ formatTime(warmupInfo.lastWarmupTime) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerWarmup" class="btn btn-secondary btn-sm" :disabled="busy.warmup || warmupInfo.isWarming">
            {{ warmupInfo.isWarming ? $t('autoUpdate.warmingUp') : $t('autoUpdate.manualWarmup') }}
          </button>
          <div class="update-note">
            <small>{{ $t('autoUpdate.noteWarmup') }}</small>
          </div>
        </div>
      </div>

      <!-- Cache status -->
      <div class="status-card">
        <div class="card-header">
          <h3>{{ $t('autoUpdate.cacheStatus') }}</h3>
          <div class="status-indicator status-info">
            {{ cacheStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.memoryCache') }}:</span>
            <span class="value">{{ cacheStats.memoryCache }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.localStorage') }}:</span>
            <span class="value">{{ cacheStats.localStorage }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.totalSize') }}:</span>
            <span class="value">{{ cacheStats.totalSize }}</span>
          </div>
          <div class="status-item">
            <span class="label">{{ $t('autoUpdate.nextCleanup') }}:</span>
            <span class="value">{{ formatTime(status.nextUpdates?.cacheCleanup) }}</span>
          </div>
        </div>
        <!-- The "clean cache" action was removed: no eviction is implemented, so the
             button could only log fake success (audit SD-3). Reinstate together with a
             real eviction path. -->
      </div>
    </div>

    <!-- Update log -->
    <div class="update-logs">
      <div class="logs-header">
        <h3>{{ $t('autoUpdate.updateLog') }}</h3>
        <button @click="clearLogs" class="btn btn-secondary btn-sm">{{ $t('autoUpdate.clearLog') }}</button>
      </div>
      <div class="logs-content">
        <div v-if="logs.length === 0" class="no-logs">
          {{ $t('autoUpdate.noLogs') }}
        </div>
        <div v-else class="log-entries">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="log-entry"
            :class="getLogLevelClass(log.level)"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-level">{{ log.level }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- The Configuration panel was removed (audit SD-4): it saved to a localStorage key
         nothing reads, its defaults contradicted the live scheduler, and marketHoursOnly
         had no implementation — a confirmed-looking control that changed nothing.
         Scheduler cadence lives in code (autoUpdateScheduler.ts constructor); reinstate a
         panel only together with real wiring (hydrate from + write into the scheduler). -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { autoUpdateScheduler } from '@/utils/autoUpdateScheduler'
import { withDataBase } from '@/utils/baseUrl'
import { performanceCache } from '@/utils/performanceCache'
import { cacheWarmupService } from '@/utils/cacheWarmupService'
import { formatDateTime as i18nDateTime, type DateInput } from '@/utils/dateFormat'
import { gradeFreshness, METADATA_SLO_HOURS } from '@/utils/freshness'
import { dataCacheBust } from '@/utils/cacheBust'

/** One entry in the in-memory activity log (newest first). */
interface LogEntry {
  timestamp: Date
  level: string
  message: string
}

/** The warmup fields this monitor reads off `getWarmupStatus()` (a subset). */
interface WarmupInfo {
  isWarming: boolean
  progress: number
  lastWarmupTime: number | null
  trackedSymbols: string[]
}

export default defineComponent({
  name: 'AutoUpdateMonitor',
  data() {
    return {
      // Per-action busy flags (audit I7) — one shared `loading` used to disable every
      // unrelated control and let the 30 s poll race manual actions.
      busy: {
        refresh: false,
        scheduler: false,
        technicalIndicators: false,
        metadata: false,
        warmup: false
      } as { refresh: boolean; scheduler: boolean; technicalIndicators: boolean; metadata: boolean; warmup: boolean } & Record<string, boolean>,
      status: {} as ReturnType<typeof autoUpdateScheduler.getStatus>,
      cacheStats: {} as ReturnType<typeof performanceCache.getStats>,
      logs: [] as LogEntry[],
      startTime: null as Date | null,
      technicalIndicatorsLastUpdate: null as Date | null,
      technicalIndicatorsAge: 0,
      technicalIndicatorsSuccessRate: 0,
      metadataLastUpdate: null as Date | null,
      metadataAge: 0,
      metadataSymbolCount: 0,
      refreshInterval: null as ReturnType<typeof setInterval> | null,
      warmupInfo: {
        isWarming: false,
        progress: 0,
        lastWarmupTime: null,
        trackedSymbols: []
      } as WarmupInfo
    }
  },
  computed: {
    schedulerStatus() {
      return this.status.isRunning ? this.$t('autoUpdate.running') : this.$t('autoUpdate.stopped')
    },
    schedulerStatusClass() {
      return this.status.isRunning ? 'status-success' : 'status-error'
    },
    schedulerButtonText() {
      return this.status.isRunning ? this.$t('autoUpdate.stopScheduler') : this.$t('autoUpdate.startScheduler')
    },
    schedulerButtonClass() {
      return this.status.isRunning ? 'btn btn-danger' : 'btn btn-success'
    },
    // Shared SLO grading (audit SD-1): the same feed must grade identically here and on
    // System Status — a 13 h-old daily feed is ON schedule, not an alarm.
    technicalIndicatorsStatus() {
      const grade = gradeFreshness(this.technicalIndicatorsAge)
      if (grade === 'fresh') return this.$t('autoUpdate.fresh')
      if (grade === 'stale') return this.$t('autoUpdate.stale')
      return this.$t('autoUpdate.outdated')
    },
    technicalIndicatorsStatusClass() {
      const grade = gradeFreshness(this.technicalIndicatorsAge)
      if (grade === 'fresh') return 'status-success'
      if (grade === 'stale') return 'status-warning'
      return 'status-error'
    },
    // Metadata is a WEEKLY feed (update-metadata.yml) — grading it on daily thresholds
    // made a normal 3-day age read as an alarm. Same shared helper, weekly SLO.
    metadataStatus() {
      const grade = gradeFreshness(this.metadataAge, METADATA_SLO_HOURS)
      if (grade === 'fresh') return this.$t('autoUpdate.fresh')
      if (grade === 'stale') return this.$t('autoUpdate.stale')
      return this.$t('autoUpdate.outdated')
    },
    metadataStatusClass() {
      const grade = gradeFreshness(this.metadataAge, METADATA_SLO_HOURS)
      if (grade === 'fresh') return 'status-success'
      if (grade === 'stale') return 'status-warning'
      return 'status-error'
    },
    cacheStatus() {
      const total = this.cacheStats.totalSize || 0
      if (total > 100) return this.$t('autoUpdate.needsCleanup')
      if (total > 50) return this.$t('autoUpdate.normal')
      return this.$t('autoUpdate.good')
    },
    warmupStatus() {
      if (this.warmupInfo.isWarming) return this.$t('autoUpdate.warming')
      if (this.warmupInfo.progress === 100) return this.$t('autoUpdate.completed')
      if (this.warmupInfo.lastWarmupTime) return this.$t('autoUpdate.idle')
      return this.$t('autoUpdate.notWarmed')
    },
    warmupStatusClass() {
      if (this.warmupInfo.isWarming) return 'status-warning'
      if (this.warmupInfo.progress === 100) return 'status-success'
      // Manual-only service that has simply not been run is a neutral state, not an
      // alarm — red-by-construction trained the operator to ignore the card (SD-7).
      return 'status-info'
    }
  },
  async mounted() {
    await this.initializeMonitor()
    this.startPeriodicRefresh()
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },
  methods: {
    async initializeMonitor() {
      this.busy['refresh'] = true
      try {
        await this.refreshStatus()
        await this.loadTechnicalIndicatorsStatus()
        await this.loadMetadataStatus()
        await this.loadWarmupStatus()
        this.startTime = new Date()
        this.addLog(this.$t('autoUpdate.logInitialized'), 'INFO')
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logInitFailed') + (error as Error).message, 'ERROR')
      } finally {
        this.busy['refresh'] = false
      }
    },

    // Manual refresh with real busy feedback (audit I7 — the button used to render the
    // identical glyph in both states, so users re-clicked).
    async manualRefresh() {
      this.busy['refresh'] = true
      try {
        await this.refreshStatus()
        await this.loadTechnicalIndicatorsStatus()
        await this.loadMetadataStatus()
        await this.loadWarmupStatus()
      } finally {
        this.busy['refresh'] = false
      }
    },

    async refreshStatus() {
      try {
        this.status = autoUpdateScheduler.getStatus()
        this.cacheStats = performanceCache.getStats()
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logRefreshFailed') + (error as Error).message, 'ERROR')
      }
    },

    async loadTechnicalIndicatorsStatus() {
      try {
        const response = await fetch(withDataBase('data/technical-indicators/latest_index.json') + dataCacheBust())
        if (response.ok) {
          const data = await response.json()
          const last = new Date(data.generatedAt)
          this.technicalIndicatorsLastUpdate = last
          this.technicalIndicatorsAge = (Date.now() - last.getTime()) / (1000 * 60 * 60)
          // Real coverage: files generated ÷ symbols requested. The index carries
          // `symbols[]` + `totalFiles`, NOT the totalSymbols/successfulSymbols this
          // used to read — those fields never existed, so the rate was a permanent 0%.
          const total = Array.isArray(data.symbols) ? data.symbols.length : 0
          const generated = typeof data.totalFiles === 'number' ? data.totalFiles : 0
          this.technicalIndicatorsSuccessRate = total > 0
            ? Math.round((Math.min(generated, total) / total) * 100)
            : 0
        }
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logTiStatusFailed') + (error as Error).message, 'ERROR')
      }
    },

    async loadMetadataStatus() {
      try {
        // Read REAL metadata status. Previously this hardcoded now()/age 0/24
        // symbols (a "暫時" placeholder), so the card was permanently green and
        // "Fresh" no matter how stale the feed actually was.
        const response = await fetch(withDataBase('data/symbols_metadata.json') + dataCacheBust())
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const asOf = data.as_of || data.generatedAt || null
        this.metadataLastUpdate = asOf ? new Date(asOf) : null
        this.metadataAge = this.metadataLastUpdate
          ? (Date.now() - this.metadataLastUpdate.getTime()) / (1000 * 60 * 60)
          : 24 * 365 // no timestamp → read as stale, never "fresh"
        this.metadataSymbolCount = Array.isArray(data.items)
          ? data.items.length
          : (data.refresh_metadata?.symbols_updated ?? 0)
      } catch (error) {
        this.metadataLastUpdate = null
        this.metadataAge = 24 * 365
        this.addLog(this.$t('autoUpdate.logMetadataFailed') + (error as Error).message, 'ERROR')
      }
    },

    async loadWarmupStatus() {
      try {
        // Hydrate the warm-up list from the universe config before reading the count —
        // it was a hardcoded 24-ticker array beside the real 138-symbol universe (SD-7).
        await cacheWarmupService.ensureTrackedSymbols()
        this.warmupInfo = cacheWarmupService.getWarmupStatus()
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logWarmupStatusFailed') + (error as Error).message, 'ERROR')
      }
    },

    async triggerWarmup() {
      this.busy['warmup'] = true
      try {
        this.addLog(this.$t('autoUpdate.logWarmupTriggered'), 'INFO')
        await cacheWarmupService.triggerManualWarmup()
        this.addLog(this.$t('autoUpdate.logWarmupDone'), 'SUCCESS')
        await this.loadWarmupStatus()
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logWarmupFailed') + (error as Error).message, 'ERROR')
      } finally {
        this.busy['warmup'] = false
      }
    },

    async toggleScheduler() {
      this.busy['scheduler'] = true
      try {
        if (this.status.isRunning) {
          autoUpdateScheduler.stop()
          this.addLog(this.$t('autoUpdate.logSchedulerStopped'), 'INFO')
        } else {
          autoUpdateScheduler.start()
          this.addLog(this.$t('autoUpdate.logSchedulerStarted'), 'INFO')
        }
        await this.refreshStatus()
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logToggleFailed') + (error as Error).message, 'ERROR')
      } finally {
        this.busy['scheduler'] = false
      }
    },

    async triggerUpdate(updateType: string) {
      this.busy[updateType] = true
      try {
        this.addLog(this.$t('autoUpdate.logUpdateTriggered') + updateType, 'INFO')
        const result = await autoUpdateScheduler.triggerManualUpdate(updateType)
        // SUCCESS only when work actually happened (audit SD-3/SK-D-2) — an unchanged
        // version check is a fine outcome, but it is information, not an achievement.
        if (result.changed) {
          this.addLog(this.$t('autoUpdate.logUpdateDone') + updateType, 'SUCCESS')
        } else {
          this.addLog(this.$t('autoUpdate.logNoChange') + updateType, 'INFO')
        }
        await this.refreshStatus()
        
        if (updateType === 'technicalIndicators') {
          await this.loadTechnicalIndicatorsStatus()
        } else if (updateType === 'metadata') {
          await this.loadMetadataStatus()
        }
      } catch (error) {
        this.addLog(this.$t('autoUpdate.logUpdateFailed') + (error as Error).message, 'ERROR')
      } finally {
        this.busy[updateType] = false
      }
    },

    startPeriodicRefresh() {
      this.refreshInterval = setInterval(async () => {
        // Pause the background tick while any manual action runs — it used to clobber
        // a just-triggered action's fields mid-flight (audit I7).
        if (Object.values(this.busy).some(Boolean)) return
        await this.refreshStatus()
        await this.loadTechnicalIndicatorsStatus()
        await this.loadMetadataStatus()
        await this.loadWarmupStatus()
      }, 30000) // 每 30 秒重新整理一次
    },

    addLog(message: string, level: string = 'INFO') {
      const log = {
        timestamp: new Date(),
        level,
        message
      }
      this.logs.unshift(log)
      
      // 保留最近 100 條日誌
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(0, 100)
      }
    },

    clearLogs() {
      this.logs = []
      this.addLog(this.$t('autoUpdate.logCleared'), 'INFO')
    },

    formatTime(date: DateInput) {
      if (!date) return this.$t('common.na')
      return i18nDateTime(date)
    },

    formatDataAge(ageHours: number) {
      if (ageHours < 1) return this.$t('autoUpdate.ageUnder1h')
      if (ageHours < 24) return this.$t('autoUpdate.ageHours', { n: Math.round(ageHours) })
      return this.$t('autoUpdate.ageDays', { n: Math.round(ageHours / 24) })
    },

    getDataAgeClass(ageHours: number) {
      // On-SLO age is unremarkable (no color); only past-SLO ages get emphasis (SD-1).
      const grade = gradeFreshness(ageHours)
      if (grade === 'fresh') return ''
      if (grade === 'stale') return 'text-warning'
      return 'text-danger'
    },

    getLogLevelClass(level: string) {
      return {
        'log-info': level === 'INFO',
        'log-success': level === 'SUCCESS',
        'log-warning': level === 'WARN',
        'log-error': level === 'ERROR'
      }
    }
  }
})
</script>

<style scoped>
.auto-update-monitor {
  /* Gutter, max-width and centering come from Layout's .container;
     vertical spacing from .main-content. */
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.monitor-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: var(--space-4);
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.status-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* Plain header inside the card surface — the tinted full-bleed band was this
     page's own invention; every other route's cards are white with a hairline
     under the title (WIREFRAMES §3). */
  padding: var(--widget-padding) var(--widget-padding) var(--space-2);
  border-bottom: 1px solid var(--border-color);
}

.card-header h3 {
  margin: 0;
  font-size: var(--text-md);
  color: var(--text-primary);
}

.status-indicator {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.status-success {
  background: var(--success-bg);
  color: var(--success-fg);
}

.status-warning {
  background: var(--warning-bg);
  color: var(--warning-fg);
}

.status-error {
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.status-info {
  background: var(--info-bg);
  color: var(--info-fg);
}

.card-content {
  padding: var(--widget-padding);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-item .label {
  color: var(--text-secondary);
  font-size: var(--text-base);
}

.status-item .value {
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}

.text-success {
  color: var(--success-solid);
}

.text-warning {
  color: var(--warning-solid);
}

.text-danger {
  color: var(--danger-solid);
}

.card-actions {
  padding: 0 var(--space-4) var(--space-4);
}

.update-note {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-style: italic;
}

.update-logs, .config-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-8);
}

.logs-header, .config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.logs-header h3, .config-header h3 {
  margin: 0;
  font-size: var(--text-md);
  color: var(--text-primary);
}

.logs-content {
  max-height: 400px;
  overflow-y: auto;
}

.no-logs {
  padding: var(--space-8);
  text-align: center;
  color: var(--text-secondary);
}

.log-entries {
  padding: var(--space-4);
}

.log-entry {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-color);
  font-size: var(--text-base);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 150px;
}

.log-level {
  font-weight: var(--weight-medium);
  min-width: 60px;
}

.log-message {
  flex: 1;
}

/* Log-level badges are TEXT on the (light) log surface — the vivid --*-solid
   fills fail 4.5:1, so use the AA-as-text variants (theme-aware, pass on dark too). */
.log-info .log-level {
  color: var(--info-fg);
}

.log-success .log-level {
  color: var(--success-strong);
}

.log-warning .log-level {
  color: var(--warning-strong);
}

.log-error .log-level {
  color: var(--danger-strong);
}

.config-content {
  padding: var(--space-4);
}

.config-section {
  margin-bottom: var(--space-8);
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 var(--space-4) 0;
  color: var(--text-primary);
  font-size: var(--text-md);
}

.config-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.config-item label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-primary);
  font-size: var(--text-base);
}

.config-item input[type="number"] {
  padding: 0.375rem var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  width: 80px;
}

.config-item input[type="checkbox"] {
  margin: 0;
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .monitor-grid {
    grid-template-columns: 1fr;
  }

  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }

  .log-entry {
    flex-direction: column;
    gap: var(--space-1);
  }

  .log-time {
    min-width: auto;
  }

  .config-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>