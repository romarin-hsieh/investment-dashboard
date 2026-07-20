<template>
  <div class="system-manager">
    <div class="manager-header">
      <h2>{{ $t('systemManager.pageTitle') }}</h2>
      <p>{{ $t('systemManager.pageSubtitle') }}</p>
    </div>

    <!-- Error banner: `error` was assigned on a failed status check but never
         rendered, so a total fetch failure showed only stale/zero values. -->
    <div v-if="error" class="error-banner" role="alert">
      <span>{{ $t('systemManager.errorBanner', { error }) }}</span>
      <button class="btn" @click="refreshStatus" :disabled="loading">{{ $t('systemManager.actions.retry') }}</button>
    </div>

    <!-- Status Overview -->
    <div class="overview-section">
      <div class="overview-grid">
        <!-- Pipeline Status -->
        <div class="overview-card" :style="{ borderColor: statusColor }">
            <div class="card-icon">🚀</div>
            <div class="card-content">
                <h3>{{ $t('systemManager.pipelineStatus.title') }}</h3>
                <div class="status-val" :style="{ color: statusColor }">
                    {{ isDataFresh ? $t('systemManager.pipelineStatus.healthy') : $t('systemManager.pipelineStatus.stale') }}
                </div>
                <div class="sub-text" v-if="!isDataFresh && daysSinceUpdate > 0">
                    {{ $t('systemManager.pipelineStatus.daysStale', { n: daysSinceUpdate }) }}
                </div>
            </div>
        </div>

        <!-- Last Update -->
        <div class="overview-card">
            <div class="card-icon">🕒</div>
            <div class="card-content">
                <h3>{{ $t('systemManager.lastUpdate.title') }}</h3>
                <div class="status-val text-dark">
                    {{ formatDate(pipelineStatus.generatedAt).split(',')[0] }}
                </div>
                <div class="sub-text">
                    {{ formatDate(pipelineStatus.generatedAt).split(',')[1] }}
                </div>
            </div>
        </div>

        <!-- Universe Coverage -->
        <div class="overview-card">
            <div class="card-icon">📈</div>
            <div class="card-content">
                <h3>{{ $t('systemManager.coverage.title') }}</h3>
                <div class="status-val text-blue">
                    {{ pipelineStatus.symbolsCount || universeInfo.total }}
                </div>
                <div class="sub-text">{{ $t('systemManager.coverage.activeSymbols') }}</div>
            </div>
        </div>
      </div>
    </div>

    <!-- Detailed Info -->
    <div class="details-section">
        <div class="details-grid">
            <div class="detail-card">
                <h3>{{ $t('systemManager.pipelineInfo.title') }}</h3>
                <div class="info-row">
                    <span>{{ $t('systemManager.pipelineInfo.source') }}</span>
                    <strong>{{ pipelineStatus.source }}</strong>
                </div>
                <div class="info-row">
                    <span>{{ $t('systemManager.pipelineInfo.generatedFiles') }}</span>
                    <strong>{{ pipelineStatus.totalFiles }}</strong>
                </div>
                <div class="info-row">
                    <span>{{ $t('systemManager.pipelineInfo.symbolTotal') }}</span>
                    <strong>{{ universeInfo.total }}</strong>
                </div>
                <hr>
                <div class="actions">
                    <button class="btn" @click="refreshStatus" :disabled="loading">
                        {{ loading ? $t('systemManager.actions.checking') : $t('systemManager.actions.refreshStatus') }}
                    </button>
                    <button class="btn warning" @click="clearCache" :disabled="loading">
                        {{ $t('systemManager.actions.clearCache') }}
                    </button>
                </div>
            </div>

            <div class="detail-card">
                <h3>{{ $t('systemManager.logs.title') }}</h3>
                <div class="logs-container">
                    <div v-for="log in systemLogs" :key="log.id" class="log-entry" :class="log.level">
                        <span class="time">{{ formatTime(log.timestamp) }}</span>
                        <span class="msg">{{ log.message }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import { withDataBase } from '@/utils/baseUrl';
import { technicalIndicatorsCache } from '@/utils/technicalIndicatorsCache';
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi';
import { formatTime as i18nTime, formatDateTime as i18nDateTime } from '@/utils/dateFormat';

export default {
  name: 'SystemManager',
  data() {
    return {
      loading: false,
      error: null,
      
      // Real Pipeline Status
      pipelineStatus: {
        lastUpdate: null,
        totalFiles: 0,
        symbolsCount: 0,
        generatedAt: null,
        status: 'Unknown', // 'Clean', 'Stale', 'Error'
        source: 'N/A'
      },
      
      // Universe Info
      universeInfo: {
        total: 0,
        sectors: [],
        sources: []
      },

      // System Logs (simulated for now, could be real alerts)
      systemLogs: []
    }
  },
  
  computed: {
    isDataFresh() {
       if (!this.pipelineStatus.generatedAt) return false;
       const genTime = new Date(this.pipelineStatus.generatedAt).getTime();
       const now = new Date().getTime();
       // Considered fresh if < 25 hours (allowing for daily update skew)
       return (now - genTime) < (25 * 60 * 60 * 1000);
    },
    statusColor() {
        if (!this.pipelineStatus.generatedAt) return 'gray';
        return this.isDataFresh ? '#28a745' : '#dc3545';
    },
    daysSinceUpdate() {
        if (!this.pipelineStatus.generatedAt) return 0;
        const diff = new Date().getTime() - new Date(this.pipelineStatus.generatedAt).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
  },
  
  async mounted() {
    await this.refreshStatus();
  },
  
  methods: {
    async refreshStatus() {
      this.loading = true;
      this.error = null;
      this.addLog('info', this.$t('systemManager.log.checkingStatus'));
      
      try {
        // PR-F1 (audit finding #3): kick off both independent fetches in
        // parallel — they hit different files with no inter-dependency,
        // so awaiting in series was pure latency overhead (~200-400 ms
        // on first paint of /system-manager). Per-fetch error isolation
        // preserved by keeping the two try/catch wrappers below — each
        // `await` on an already-rejected promise re-throws into its own
        // catch block.
        const cacheBust = '?t=' + new Date().getTime();
        const indexPromise = fetch(withDataBase('data/technical-indicators/latest_index.json') + cacheBust);
        const metaPromise = fetch(withDataBase('data/symbols_metadata.json') + cacheBust);

        // 1. Fetch Technical Indicators Index (The heartbeat of the daily update)
        try {
            const indexRes = await indexPromise;
            if (!indexRes.ok) throw new Error(`HTTP error! status: ${indexRes.status}`);
            const idx = await indexRes.json();
            this.pipelineStatus = {
                lastUpdate: idx.date,
                generatedAt: idx.generatedAt,
                totalFiles: idx.totalFiles,
                symbolsCount: idx.symbols ? idx.symbols.length : 0,
                source: idx.source || 'GitHub Actions',
                status: 'Active'
            };
            this.addLog('success', this.$t('systemManager.log.indexLoaded', { date: idx.date }));
        } catch (e) {
            console.error(e);
            this.pipelineStatus.status = 'Unreachable';
            this.addLog('error', this.$t('systemManager.log.indexFailed'));
        }

        // 2. Fetch Symbols Metadata (Universe)
        try {
            const metaRes = await metaPromise;
            if (!metaRes.ok) throw new Error(`HTTP error! status: ${metaRes.status}`);
            const meta = await metaRes.json();
            const items = meta.items || meta.symbols || [];
            this.universeInfo = {
                total: items.length,
                sectors: [...new Set(items.map(s => s.sector))].filter(Boolean),
                sources: ['Yahoo Finance']
            };
             this.addLog('success', this.$t('systemManager.log.metadataLoaded', { count: items.length }));
        } catch (e) {
             this.addLog('warning', this.$t('systemManager.log.metadataFailed'));
        }

      } catch (err) {
        this.error = err.message;
        this.addLog('error', this.$t('systemManager.log.systemCheckFailed', { error: err.message }));
      } finally {
        this.loading = false;
      }
    },
    
    addLog(level, message) {
      this.systemLogs.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        level,
        message
      });
      if (this.systemLogs.length > 50) this.systemLogs.pop();
    },
    
    formatDate(isoString) {
      if (!isoString) return this.$t('systemManager.never');
      return i18nDateTime(isoString);
    },

    formatTime(timestamp) {
      return i18nTime(timestamp);
    },

    clearCache() {
        if (!confirm(this.$t('systemManager.clearCacheConfirm'))) return;
        // Actually clear the data caches, THEN reload to re-fetch fresh. The old
        // body only did `reload(true)` — a mislabeled reload that purged nothing
        // (localStorage-backed caches survived; the `true` arg is ignored by
        // modern browsers).
        try {
            technicalIndicatorsCache.clearAllCache();
            precomputedIndicatorsAPI.clearCache();
            this.addLog('success', this.$t('systemManager.log.cacheCleared'));
            window.location.reload();
        } catch (e) {
            this.error = e.message;
            this.addLog('error', this.$t('systemManager.log.cacheClearFailed', { error: e.message }));
        }
    }
  }
}
</script>

<style scoped>
.system-manager {
    padding: var(--space-8);
    max-width: 1200px;
    margin: 0 auto;
}

.manager-header {
    margin-bottom: var(--space-8);
    text-align: center;
}

.manager-header h2 {
    font-size: var(--text-2xl);
    color: var(--text-primary);
    margin-bottom: var(--space-2);
}

.manager-header p {
    color: var(--text-secondary);
}

/* Status Cards */
.overview-section {
    margin-bottom: var(--space-8);
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
}

.overview-card {
    background: var(--bg-card);
    padding: var(--card-padding);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: var(--space-6);
}

.card-icon {
    font-size: var(--text-3xl);
    background: var(--bg-secondary);
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.card-content h3 {
    margin: 0;
    font-size: var(--text-md);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-val {
    font-size: var(--text-2xl);
    font-weight: var(--weight-extrabold);
    margin: 0.2rem 0;
    color: var(--text-primary);
}

.sub-text {
    font-size: var(--text-base);
    color: var(--text-muted);
}

.text-dark { color: var(--text-primary); }
.text-blue { color: var(--primary-color); }

/* Details */
.details-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-6);
}

.detail-card {
    background: var(--bg-card);
    padding: var(--space-8);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}

.detail-card h3 {
    margin-top: 0;
    margin-bottom: var(--space-6);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--space-4);
    color: var(--text-primary);
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.8rem 0;
    border-bottom: 1px solid var(--bg-secondary);
    color: var(--text-primary);
}

.error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-6);
    padding: var(--space-4) var(--space-6);
    background: var(--bg-card);
    border: 1px solid var(--danger-solid);
    border-left-width: 4px;
    border-radius: var(--radius-md);
    color: var(--text-primary);
}

.actions {
    margin-top: var(--space-8);
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
}

.btn {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--primary-color);
    color: white;
    cursor: pointer;
    font-weight: var(--weight-semibold);
    transition: background var(--transition-base);
}

.btn:hover { background: var(--primary-hover); }
.btn:disabled { background: var(--border-color); cursor: not-allowed; }
.btn.warning { background: var(--warning-color); color: #000; }

/* Logs */
.logs-container {
    max-height: 400px;
    overflow-y: auto;
    background: #1e1e1e; /* Logs always dark looks fine, or use bg-secondary? Let's keep logs dark terminal style */
    color: #fff;
    border-radius: var(--radius-sm);
    padding: var(--space-4);
    font-family: 'Consolas', monospace;
}

.log-entry {
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--grey-800);
    display: flex;
    gap: var(--space-4);
}

.log-entry .time { color: var(--grey-550); font-size: var(--text-sm); min-width: 80px; }
.log-entry.info .msg { color: #4dabf7; }
.log-entry.success .msg { color: #40c057; }
.log-entry.warning .msg { color: #ffd43b; }
.log-entry.error .msg { color: #fa5252; }

@media (max-width: 768px) {
    .details-grid { grid-template-columns: 1fr; }
}
</style>