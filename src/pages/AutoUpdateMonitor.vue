<template>
  <div class="auto-update-monitor">
    <div class="monitor-header">
      <h2>自動更新監控面板</h2>
      <div class="header-actions">
        <button @click="refreshStatus" class="btn btn-secondary" :disabled="loading">
          <span v-if="loading">🔄</span>
          <span v-else>🔄</span>
          刷新狀態
        </button>
        <button @click="toggleScheduler" :class="schedulerButtonClass" :disabled="loading">
          {{ schedulerButtonText }}
        </button>
      </div>
    </div>

    <div class="monitor-grid">
      <!-- 調度器狀態 -->
      <div class="status-card">
        <div class="card-header">
          <h3>調度器狀態</h3>
          <div class="status-indicator" :class="schedulerStatusClass">
            {{ schedulerStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">運行狀態:</span>
            <span class="value" :class="schedulerStatusClass">
              {{ status.isRunning ? '運行中' : '已停止' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">活動任務:</span>
            <span class="value">{{ status.activeIntervals?.length || 0 }} 個</span>
          </div>
          <div class="status-item">
            <span class="label">啟動時間:</span>
            <span class="value">{{ formatTime(startTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 技術指標狀態 -->
      <div class="status-card">
        <div class="card-header">
          <h3>技術指標</h3>
          <div class="status-indicator" :class="technicalIndicatorsStatusClass">
            {{ technicalIndicatorsStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">最後更新:</span>
            <span class="value">{{ formatTime(technicalIndicatorsLastUpdate) }}</span>
          </div>
          <div class="status-item">
            <span class="label">數據年齡:</span>
            <span class="value" :class="getDataAgeClass(technicalIndicatorsAge)">
              {{ formatDataAge(technicalIndicatorsAge) }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">下次更新:</span>
            <span class="value">{{ formatTime(status.nextUpdates?.technicalIndicators) }}</span>
          </div>
          <div class="status-item">
            <span class="label">成功率:</span>
            <span class="value">{{ technicalIndicatorsSuccessRate }}%</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerUpdate('technicalIndicators')" class="btn btn-primary btn-sm" :disabled="loading">
            清除緩存
          </button>
          <div class="update-note">
            <small>註: 實際預計算需要在服務器端執行</small>
          </div>
        </div>
      </div>

      <!-- 元數據狀態 -->
      <div class="status-card">
        <div class="card-header">
          <h3>元數據</h3>
          <div class="status-indicator" :class="metadataStatusClass">
            {{ metadataStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">最後更新:</span>
            <span class="value">{{ formatTime(metadataLastUpdate) }}</span>
          </div>
          <div class="status-item">
            <span class="label">數據年齡:</span>
            <span class="value" :class="getDataAgeClass(metadataAge)">
              {{ formatDataAge(metadataAge) }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">下次更新:</span>
            <span class="value">{{ formatTime(status.nextUpdates?.metadata) }}</span>
          </div>
          <div class="status-item">
            <span class="label">股票數量:</span>
            <span class="value">{{ metadataSymbolCount }} 支</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerUpdate('metadata')" class="btn btn-primary btn-sm" :disabled="loading">
            手動更新
          </button>
        </div>
      </div>

      <!-- 緩存預熱狀態 -->
      <div class="status-card">
        <div class="card-header">
          <h3>緩存預熱</h3>
          <div class="status-indicator" :class="warmupStatusClass">
            {{ warmupStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">預熱狀態:</span>
            <span class="value" :class="warmupStatusClass">
              {{ warmupInfo.isWarming ? '進行中' : '待機中' }}
            </span>
          </div>
          <div class="status-item">
            <span class="label">進度:</span>
            <span class="value">{{ Math.round(warmupInfo.progress) }}%</span>
          </div>
          <div class="status-item">
            <span class="label">追蹤股票:</span>
            <span class="value">{{ warmupInfo.trackedSymbols?.length || 0 }} 支</span>
          </div>
          <div class="status-item">
            <span class="label">上次預熱:</span>
            <span class="value">{{ formatTime(warmupInfo.lastWarmupTime) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerWarmup" class="btn btn-info btn-sm" :disabled="loading || warmupInfo.isWarming">
            {{ warmupInfo.isWarming ? '預熱中...' : '手動預熱' }}
          </button>
          <div class="update-note">
            <small>註: 預熱所有股票的技術指標數據</small>
          </div>
        </div>
      </div>

      <!-- 緩存狀態 -->
      <div class="status-card">
        <div class="card-header">
          <h3>緩存狀態</h3>
          <div class="status-indicator status-info">
            {{ cacheStatus }}
          </div>
        </div>
        <div class="card-content">
          <div class="status-item">
            <span class="label">內存緩存:</span>
            <span class="value">{{ cacheStats.memoryCache }} 項</span>
          </div>
          <div class="status-item">
            <span class="label">本地存儲:</span>
            <span class="value">{{ cacheStats.localStorage }} 項</span>
          </div>
          <div class="status-item">
            <span class="label">總大小:</span>
            <span class="value">{{ cacheStats.totalSize }} 項</span>
          </div>
          <div class="status-item">
            <span class="label">下次清理:</span>
            <span class="value">{{ formatTime(status.nextUpdates?.cacheCleanup) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button @click="triggerUpdate('cache')" class="btn btn-warning btn-sm" :disabled="loading">
            清理緩存
          </button>
        </div>
      </div>
    </div>

    <!-- 更新日誌 -->
    <div class="update-logs">
      <div class="logs-header">
        <h3>更新日誌</h3>
        <button @click="clearLogs" class="btn btn-sm btn-outline">清除日誌</button>
      </div>
      <div class="logs-content">
        <div v-if="logs.length === 0" class="no-logs">
          暫無日誌記錄
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

    <!-- 配置面板 -->
    <div class="config-panel">
      <div class="config-header">
        <h3>配置設定</h3>
        <button @click="saveConfig" class="btn btn-success btn-sm" :disabled="!configChanged">
          保存配置
        </button>
      </div>
      <div class="config-content">
        <div class="config-section">
          <h4>技術指標更新</h4>
          <div class="config-item">
            <label>
              <input type="checkbox" v-model="config.technicalIndicators.enabled" @change="onConfigChange">
              啟用自動更新
            </label>
          </div>
          <div class="config-item">
            <label>更新間隔 (小時):</label>
            <input 
              type="number" 
              v-model.number="config.technicalIndicators.intervalHours" 
              @change="onConfigChange"
              min="1" 
              max="24"
            >
          </div>
          <div class="config-item">
            <label>
              <input type="checkbox" v-model="config.technicalIndicators.marketHoursOnly" @change="onConfigChange">
              僅在市場時間更新
            </label>
          </div>
        </div>

        <div class="config-section">
          <h4>元數據更新</h4>
          <div class="config-item">
            <label>
              <input type="checkbox" v-model="config.metadata.enabled" @change="onConfigChange">
              啟用自動更新
            </label>
          </div>
          <div class="config-item">
            <label>更新間隔 (小時):</label>
            <input 
              type="number" 
              v-model.number="config.metadata.intervalHours" 
              @change="onConfigChange"
              min="1" 
              max="168"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { autoUpdateScheduler } from '@/utils/autoUpdateScheduler.js'
import { performanceCache } from '@/utils/performanceCache.js'
import { cacheWarmupService } from '@/utils/cacheWarmupService.js'

export default {
  name: 'AutoUpdateMonitor',
  data() {
    return {
      loading: false,
      status: {},
      cacheStats: {},
      logs: [],
      config: {
        technicalIndicators: {
          enabled: true,
          intervalHours: 1,
          marketHoursOnly: true
        },
        metadata: {
          enabled: true,
          intervalHours: 24
        }
      },
      configChanged: false,
      startTime: null,
      technicalIndicatorsLastUpdate: null,
      technicalIndicatorsAge: 0,
      technicalIndicatorsSuccessRate: 0,
      metadataLastUpdate: null,
      metadataAge: 0,
      metadataSymbolCount: 0,
      warmupInfo: {
        isWarming: false,
        progress: 0,
        lastWarmupTime: null,
        trackedSymbols: []
      }
    }
  },
  computed: {
    schedulerStatus() {
      return this.status.isRunning ? '運行中' : '已停止'
    },
    schedulerStatusClass() {
      return this.status.isRunning ? 'status-success' : 'status-error'
    },
    schedulerButtonText() {
      return this.status.isRunning ? '停止調度器' : '啟動調度器'
    },
    schedulerButtonClass() {
      return this.status.isRunning ? 'btn btn-danger' : 'btn btn-success'
    },
    technicalIndicatorsStatus() {
      if (this.technicalIndicatorsAge < 1) return '最新'
      if (this.technicalIndicatorsAge < 12) return '較新'
      if (this.technicalIndicatorsAge < 24) return '過時'
      return '舊數據'
    },
    technicalIndicatorsStatusClass() {
      if (this.technicalIndicatorsAge < 1) return 'status-success'
      if (this.technicalIndicatorsAge < 12) return 'status-warning'
      return 'status-error'
    },
    metadataStatus() {
      if (this.metadataAge < 24) return '最新'
      if (this.metadataAge < 72) return '較新'
      return '過時'
    },
    metadataStatusClass() {
      if (this.metadataAge < 24) return 'status-success'
      if (this.metadataAge < 72) return 'status-warning'
      return 'status-error'
    },
    cacheStatus() {
      const total = this.cacheStats.totalSize || 0
      if (total > 100) return '需要清理'
      if (total > 50) return '正常'
      return '良好'
    },
    warmupStatus() {
      if (this.warmupInfo.isWarming) return '預熱中'
      if (this.warmupInfo.progress === 100) return '已完成'
      if (this.warmupInfo.lastWarmupTime) return '待機中'
      return '未預熱'
    },
    warmupStatusClass() {
      if (this.warmupInfo.isWarming) return 'status-warning'
      if (this.warmupInfo.progress === 100) return 'status-success'
      if (this.warmupInfo.lastWarmupTime) return 'status-info'
      return 'status-error'
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
      this.loading = true
      try {
        await this.refreshStatus()
        await this.loadTechnicalIndicatorsStatus()
        await this.loadMetadataStatus()
        await this.loadWarmupStatus()
        this.startTime = new Date()
        this.addLog('監控面板已初始化', 'INFO')
      } catch (error) {
        this.addLog(`初始化失敗: ${error.message}`, 'ERROR')
      } finally {
        this.loading = false
      }
    },

    async refreshStatus() {
      try {
        this.status = autoUpdateScheduler.getStatus()
        this.cacheStats = performanceCache.getStats()
      } catch (error) {
        this.addLog(`刷新狀態失敗: ${error.message}`, 'ERROR')
      }
    },

    async loadTechnicalIndicatorsStatus() {
      try {
        const basePath = window.location.hostname === 'romarin-hsieh.github.io' ? '/investment-dashboard/' : '/';
        const response = await fetch(`${basePath}data/technical-indicators/latest_index.json`)
        if (response.ok) {
          const data = await response.json()
          this.technicalIndicatorsLastUpdate = new Date(data.generatedAt)
          this.technicalIndicatorsAge = (Date.now() - this.technicalIndicatorsLastUpdate) / (1000 * 60 * 60)
          this.technicalIndicatorsSuccessRate = Math.round((data.successfulSymbols / data.totalSymbols) * 100)
        }
      } catch (error) {
        this.addLog(`載入技術指標狀態失敗: ${error.message}`, 'ERROR')
      }
    },

    async loadMetadataStatus() {
      try {
        // 這裡可以檢查元數據的狀態
        this.metadataLastUpdate = new Date() // 暫時使用當前時間
        this.metadataAge = 0
        this.metadataSymbolCount = 24 // 暫時硬編碼
      } catch (error) {
        this.addLog(`載入元數據狀態失敗: ${error.message}`, 'ERROR')
      }
    },

    async loadWarmupStatus() {
      try {
        this.warmupInfo = cacheWarmupService.getWarmupStatus()
      } catch (error) {
        this.addLog(`載入預熱狀態失敗: ${error.message}`, 'ERROR')
      }
    },

    async triggerWarmup() {
      this.loading = true
      try {
        this.addLog('手動觸發緩存預熱', 'INFO')
        await cacheWarmupService.triggerManualWarmup()
        this.addLog('緩存預熱完成', 'SUCCESS')
        await this.loadWarmupStatus()
      } catch (error) {
        this.addLog(`緩存預熱失敗: ${error.message}`, 'ERROR')
      } finally {
        this.loading = false
      }
    },

    async toggleScheduler() {
      this.loading = true
      try {
        if (this.status.isRunning) {
          autoUpdateScheduler.stop()
          this.addLog('調度器已停止', 'INFO')
        } else {
          autoUpdateScheduler.start()
          this.addLog('調度器已啟動', 'INFO')
        }
        await this.refreshStatus()
      } catch (error) {
        this.addLog(`切換調度器失敗: ${error.message}`, 'ERROR')
      } finally {
        this.loading = false
      }
    },

    async triggerUpdate(updateType) {
      this.loading = true
      try {
        this.addLog(`手動觸發更新: ${updateType}`, 'INFO')
        await autoUpdateScheduler.triggerManualUpdate(updateType)
        this.addLog(`手動更新完成: ${updateType}`, 'SUCCESS')
        await this.refreshStatus()
        
        if (updateType === 'technicalIndicators') {
          await this.loadTechnicalIndicatorsStatus()
        } else if (updateType === 'metadata') {
          await this.loadMetadataStatus()
        }
      } catch (error) {
        this.addLog(`手動更新失敗: ${error.message}`, 'ERROR')
      } finally {
        this.loading = false
      }
    },

    startPeriodicRefresh() {
      this.refreshInterval = setInterval(async () => {
        await this.refreshStatus()
        await this.loadTechnicalIndicatorsStatus()
        await this.loadMetadataStatus()
        await this.loadWarmupStatus()
      }, 30000) // 每 30 秒刷新一次
    },

    addLog(message, level = 'INFO') {
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
      this.addLog('日誌已清除', 'INFO')
    },

    onConfigChange() {
      this.configChanged = true
    },

    async saveConfig() {
      try {
        // 這裡可以保存配置到本地存儲或發送到服務器
        localStorage.setItem('autoUpdateConfig', JSON.stringify(this.config))
        this.configChanged = false
        this.addLog('配置已保存', 'SUCCESS')
      } catch (error) {
        this.addLog(`保存配置失敗: ${error.message}`, 'ERROR')
      }
    },

    formatTime(date) {
      if (!date) return 'N/A'
      return new Date(date).toLocaleString('zh-TW')
    },

    formatDataAge(ageHours) {
      if (ageHours < 1) return '< 1 小時'
      if (ageHours < 24) return `${Math.round(ageHours)} 小時`
      return `${Math.round(ageHours / 24)} 天`
    },

    getDataAgeClass(ageHours) {
      if (ageHours < 1) return 'text-success'
      if (ageHours < 12) return 'text-warning'
      return 'text-danger'
    },

    getLogLevelClass(level) {
      return {
        'log-info': level === 'INFO',
        'log-success': level === 'SUCCESS',
        'log-warning': level === 'WARN',
        'log-error': level === 'ERROR'
      }
    }
  }
}
</script>

<style scoped>
.auto-update-monitor {
  padding: 1rem;
  max-width: 1600px;
  margin: 0 auto;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.monitor-header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.status-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.status-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-success {
  background: #d4edda;
  color: #155724;
}

.status-warning {
  background: #fff3cd;
  color: #856404;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
}

.status-info {
  background: #d1ecf1;
  color: #0c5460;
}

.card-content {
  padding: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-item .label {
  color: #666;
  font-size: 0.9rem;
}

.status-item .value {
  font-weight: 500;
  color: #333;
}

.text-success {
  color: #28a745;
}

.text-warning {
  color: #ffc107;
}

.text-danger {
  color: #dc3545;
}

.card-actions {
  padding: 0 1rem 1rem;
}

.update-note {
  margin-top: 0.5rem;
  color: #6c757d;
  font-style: italic;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1e7e34;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}

.btn-outline:hover:not(:disabled) {
  background: #6c757d;
  color: white;
}

.update-logs, .config-panel {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.logs-header, .config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.logs-header h3, .config-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.logs-content {
  max-height: 400px;
  overflow-y: auto;
}

.no-logs {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.log-entries {
  padding: 1rem;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #666;
  white-space: nowrap;
  min-width: 150px;
}

.log-level {
  font-weight: 500;
  min-width: 60px;
}

.log-message {
  flex: 1;
}

.log-info .log-level {
  color: #17a2b8;
}

.log-success .log-level {
  color: #28a745;
}

.log-warning .log-level {
  color: #ffc107;
}

.log-error .log-level {
  color: #dc3545;
}

.config-content {
  padding: 1rem;
}

.config-section {
  margin-bottom: 2rem;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.config-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333;
  font-size: 0.9rem;
}

.config-item input[type="number"] {
  padding: 0.375rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  width: 80px;
}

.config-item input[type="checkbox"] {
  margin: 0;
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
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
    gap: 0.25rem;
  }

  .log-entry {
    flex-direction: column;
    gap: 0.25rem;
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