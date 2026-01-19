<template>
  <div class="system-manager">
    <div class="manager-header">
      <h2>System Status</h2>
      <p>Deployment & Data Pipeline Monitoring</p>
    </div>

    <!-- Status Overview -->
    <div class="overview-section">
      <div class="overview-grid">
        <!-- Pipeline Status -->
        <div class="overview-card" :style="{ borderColor: statusColor }">
            <div class="card-icon">🚀</div>
            <div class="card-content">
                <h3>Pipeline Status</h3>
                <div class="status-val" :style="{ color: statusColor }">
                    {{ isDataFresh ? 'Healthy' : 'Stale' }}
                </div>
                <div class="sub-text" v-if="!isDataFresh && daysSinceUpdate > 0">
                    {{ daysSinceUpdate }} days stale
                </div>
            </div>
        </div>

        <!-- Last Update -->
        <div class="overview-card">
            <div class="card-icon">🕒</div>
            <div class="card-content">
                <h3>Last Data Update</h3>
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
                <h3>Symbol Coverage</h3>
                <div class="status-val text-blue">
                    {{ pipelineStatus.symbolsCount || universeInfo.total }}
                </div>
                <div class="sub-text">Active Symbols</div>
            </div>
        </div>
      </div>
    </div>

    <!-- Detailed Info -->
    <div class="details-section">
        <div class="details-grid">
            <div class="detail-card">
                <h3>📦 Data Pipeline Info</h3>
                <div class="info-row">
                    <span>Source:</span> 
                    <strong>{{ pipelineStatus.source }}</strong>
                </div>
                <div class="info-row">
                    <span>Generated Files:</span> 
                    <strong>{{ pipelineStatus.totalFiles }}</strong>
                </div>
                <div class="stat-item">
              <span class="stat-label">Symbol Total:</span>
              <span class="stat-value">{{ universeInfo.total }}</span>
            </div>
                <hr>
                <div class="actions">
                    <button class="btn" @click="refreshStatus" :disabled="loading">
                        {{ loading ? 'Checking...' : 'Refresh Status' }}
                    </button>
                    <button class="btn warning" @click="clearCache">
                        Clear Browser Cache
                    </button>
                </div>
            </div>

            <div class="detail-card">
                <h3>📋 System Logs</h3>
                <div class="logs-container">
                    <div v-for="log in systemLogs" :key="log.id" class="log-entry" :class="log.level">
                        <span class="time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
                        <span class="msg">{{ log.message }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import { withBase } from '@/utils/baseUrl.js';

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
      this.addLog('info', 'Checking system status...');
      
      try {
        // 1. Fetch Technical Indicators Index (The heartbeat of the daily update)
        try {
            const indexRes = await fetch(withBase('data/technical-indicators/latest_index.json') + '?t=' + new Date().getTime());
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
            this.addLog('success', `Pipeline Index Loaded: ${idx.date}`);
        } catch (e) {
            console.error(e);
            this.pipelineStatus.status = 'Unreachable';
            this.addLog('error', 'Failed to load latest_index.json');
        }

        // 2. Fetch Symbols Metadata (Universe)
        try {
            const metaRes = await fetch(withBase('data/symbols_metadata.json') + '?t=' + new Date().getTime());
            if (!metaRes.ok) throw new Error(`HTTP error! status: ${metaRes.status}`);
            const meta = await metaRes.json();
            const items = meta.items || meta.symbols || [];
            this.universeInfo = {
                total: items.length,
                sectors: [...new Set(items.map(s => s.sector))].filter(Boolean),
                sources: ['Yahoo Finance']
            };
             this.addLog('success', `Universe Metadata Loaded: ${items.length} symbols`);
        } catch (e) {
             this.addLog('warning', 'Failed to load symbols_metadata.json');
        }

      } catch (err) {
        this.error = err.message;
        this.addLog('error', `System Check Failed: ${err.message}`);
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
      if (!isoString) return 'Never';
      return new Date(isoString).toLocaleString();
    },

    clearCache() {
        if(confirm('Clear browser cache? This will force reload.')) {
            window.location.reload(true);
        }
    }
  }
}
</script>

<style scoped>
.system-manager {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.manager-header {
    margin-bottom: 2rem;
    text-align: center;
}

.manager-header h2 {
    font-size: 2rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.manager-header p {
    color: var(--text-secondary);
}

/* Status Cards */
.overview-section {
    margin-bottom: 2rem;
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.overview-card {
    background: var(--bg-card);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    border-top: 5px solid var(--border-color); 
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.card-icon {
    font-size: 2.5rem;
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
    font-size: 1rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-val {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0.2rem 0;
    color: var(--text-primary);
}

.sub-text {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.text-dark { color: var(--text-primary); }
.text-blue { color: var(--primary-color); }

/* Details */
.details-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5rem;
}

.detail-card {
    background: var(--bg-card);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}

.detail-card h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
    color: var(--text-primary);
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.8rem 0;
    border-bottom: 1px solid var(--bg-secondary);
    color: var(--text-primary);
}

.actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.btn {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 6px;
    background: var(--primary-color);
    color: white;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
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
    border-radius: 8px;
    padding: 1rem;
    font-family: 'Consolas', monospace;
}

.log-entry {
    padding: 0.4rem 0;
    border-bottom: 1px solid #333;
    display: flex;
    gap: 1rem;
}

.log-entry .time { color: #6c757d; font-size: 0.8rem; min-width: 80px; }
.log-entry.info .msg { color: #4dabf7; }
.log-entry.success .msg { color: #40c057; }
.log-entry.warning .msg { color: #ffd43b; }
.log-entry.error .msg { color: #fa5252; }

@media (max-width: 768px) {
    .details-grid { grid-template-columns: 1fr; }
}
</style>