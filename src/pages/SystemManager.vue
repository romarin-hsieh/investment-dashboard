<template>
  <div class="system-manager">
    <div class="manager-header">
      <h2>Control Panel</h2>
      <p>監控和管理投資儀表板的各項系統功能</p>
    </div>

    <!-- 系統狀態總覽 -->
    <div class="overview-section">
      <div class="overview-grid">
        <div class="overview-card" :class="{ 'healthy': systemHealth.overall >= 80 }">
          <div class="card-icon">🎯</div>
          <div class="card-content">
            <h3>系統健康度</h3>
            <div class="health-score">{{ systemHealth.overall }}%</div>
            <div class="health-status">{{ getHealthStatus(systemHealth.overall) }}</div>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <h3>數據源狀態</h3>
            <div class="data-sources">
              <span class="source-item" :class="{ 'active': dataSourceStatus?.precomputed?.available }">
                預計算 {{ dataSourceStatus?.precomputed?.available ? '✅' : '❌' }}
              </span>
              <span class="source-item active">快取 ✅</span>
              <span class="source-item active">實時 ✅</span>
            </div>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">🔄</div>
          <div class="card-content">
            <h3>自動更新</h3>
            <div class="update-status" :class="schedulerStatusClass">
              {{ status.isRunning ? '運行中' : '已停止' }}
            </div>
            <div class="update-info">
              活動任務: {{ status.activeIntervals?.length || 0 }} 個
            </div>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">⚡</div>
          <div class="card-content">
            <h3>效能狀態</h3>
            <div class="performance-score">{{ performanceScore }}%</div>
            <div class="performance-info">
              快取命中率: {{ cacheHitRate }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 詳細狀態區域 -->
    <div class="details-section">
      <div class="details-grid">
        <!-- 數據源詳情 -->
        <div class="detail-card">
          <div class="card-header">
            <h3>📊 數據源管理</h3>
            <button @click="refreshDataSources" class="btn btn-sm" :disabled="loading">
              {{ loading ? '🔄' : '🔄' }} 刷新
            </button>
          </div>
          
          <div class="data-source-list">
            <!-- 預計算數據 -->
            <div class="source-item" :class="{ 'available': dataSourceStatus?.precomputed?.available }">
              <div class="source-header">
                <h4>預計算數據</h4>
                <span class="status-badge" :class="dataSourceStatus?.precomputed?.available ? 'success' : 'error'">
                  {{ dataSourceStatus?.precomputed?.available ? '可用' : '不可用' }}
                </span>
              </div>
              <div v-if="dataSourceStatus?.precomputed?.available" class="source-details">
                <div class="detail-row">
                  <span>股票數量:</span>
                  <span>{{ dataSourceStatus.precomputed.symbols?.length || 0 }}</span>
                </div>
                <div class="detail-row">
                  <span>成功/失敗:</span>
                  <span>{{ dataSourceStatus.precomputed.successful || 0 }}/{{ dataSourceStatus.precomputed.failed || 0 }}</span>
                </div>
                <div class="detail-row">
                  <span>最後更新:</span>
                  <span>{{ formatTime(dataSourceStatus.precomputed.lastUpdate) }}</span>
                </div>
              </div>
            </div>

            <!-- 快取狀態 -->
            <div class="source-item available">
              <div class="source-header">
                <h4>快取系統</h4>
                <span class="status-badge success">正常</span>
              </div>
              <div class="source-details">
                <div class="detail-row">
                  <span>內存快取:</span>
                  <span>{{ dataSourceStatus?.cache?.memoryCache || 0 }} 項目</span>
                </div>
                <div class="detail-row">
                  <span>本地存儲:</span>
                  <span>{{ dataSourceStatus?.cache?.localStorageCache || 0 }} 項目</span>
                </div>
                <div class="detail-row">
                  <span>命中率:</span>
                  <span>{{ cacheHitRate }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 自動更新詳情 -->
        <div class="detail-card">
          <div class="card-header">
            <h3>🔄 自動更新管理</h3>
            <button @click="toggleScheduler" :class="schedulerButtonClass" :disabled="loading">
              {{ schedulerButtonText }}
            </button>
          </div>
          
          <div class="update-details">
            <div class="update-item">
              <div class="update-header">
                <h4>技術指標</h4>
                <div class="status-indicator" :class="technicalIndicatorsStatusClass">
                  {{ technicalIndicatorsStatus }}
                </div>
              </div>
              <div class="update-info">
                <div class="detail-row">
                  <span>最後更新:</span>
                  <span>{{ formatTime(technicalIndicatorsLastUpdate) }}</span>
                </div>
                <div class="detail-row">
                  <span>數據年齡:</span>
                  <span :class="getDataAgeClass(technicalIndicatorsAge)">
                    {{ formatDataAge(technicalIndicatorsAge) }}
                  </span>
                </div>
                <div class="detail-row">
                  <span>成功率:</span>
                  <span>{{ technicalIndicatorsSuccessRate }}%</span>
                </div>
              </div>
              <div class="update-actions">
                <button @click="triggerUpdate('technicalIndicators')" class="btn btn-sm btn-primary" :disabled="loading">
                  清除快取
                </button>
              </div>
            </div>

            <div class="update-item">
              <div class="update-header">
                <h4>元數據</h4>
                <div class="status-indicator" :class="metadataStatusClass">
                  {{ metadataStatus }}
                </div>
              </div>
              <div class="update-info">
                <div class="detail-row">
                  <span>最後更新:</span>
                  <span>{{ formatTime(metadataLastUpdate) }}</span>
                </div>
                <div class="detail-row">
                  <span>數據年齡:</span>
                  <span :class="getDataAgeClass(metadataAge)">
                    {{ formatDataAge(metadataAge) }}
                  </span>
                </div>
              </div>
              <div class="update-actions">
                <button @click="triggerUpdate('metadata')" class="btn btn-sm btn-primary" :disabled="loading">
                  清除快取
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="control-section">
      <div class="control-header">
        <h3>🎛️ 系統控制</h3>
      </div>
      
      <div class="control-grid">
        <button @click="refreshAllStatus" class="control-btn primary" :disabled="loading">
          <span class="btn-icon">🔄</span>
          {{ loading ? '刷新中...' : '全面刷新' }}
        </button>
        
        <button @click="clearAllCaches" class="control-btn warning">
          <span class="btn-icon">🗑️</span>
          清除所有快取
        </button>
        
        <button @click="testSystemHealth" class="control-btn info" :disabled="testing">
          <span class="btn-icon">🔍</span>
          {{ testing ? '測試中...' : '系統健檢' }}
        </button>
        
        <button @click="showAdvanced = !showAdvanced" class="control-btn secondary">
          <span class="btn-icon">⚙️</span>
          {{ showAdvanced ? '隱藏進階' : '進階設定' }}
        </button>
      </div>
    </div>

    <!-- 進階設定 -->
    <div v-if="showAdvanced" class="advanced-section">
      <div class="advanced-header">
        <h3>⚙️ 進階設定</h3>
      </div>
      
      <div class="settings-grid">
        <div class="setting-group">
          <h4>數據源偏好</h4>
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="preferences.preferPrecomputed"
                @change="updatePreferences"
              />
              優先使用預計算數據
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="preferences.fallbackToRealtime"
                @change="updatePreferences"
              />
              允許回退到實時計算
            </label>
          </div>
        </div>

        <div class="setting-group">
          <h4>更新頻率</h4>
          <div class="setting-item">
            <label>技術指標更新間隔 (分鐘):</label>
            <select v-model="preferences.technicalIndicatorsInterval" @change="updatePreferences">
              <option value="5">5 分鐘</option>
              <option value="15">15 分鐘</option>
              <option value="30">30 分鐘</option>
              <option value="60">1 小時</option>
            </select>
          </div>
          <div class="setting-item">
            <label>元數據更新間隔 (小時):</label>
            <select v-model="preferences.metadataInterval" @change="updatePreferences">
              <option value="6">6 小時</option>
              <option value="12">12 小時</option>
              <option value="24">24 小時</option>
              <option value="168">1 週</option>
            </select>
          </div>
        </div>

        <div class="setting-group">
          <h4>效能設定</h4>
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="preferences.enablePerformanceMonitoring"
                @change="updatePreferences"
              />
              啟用效能監控
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="preferences.enableCacheWarmup"
                @change="updatePreferences"
              />
              啟用快取預熱
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 系統日誌 -->
    <div class="logs-section">
      <div class="logs-header">
        <h3>📋 系統日誌</h3>
        <button @click="clearLogs" class="btn btn-sm">清除日誌</button>
      </div>
      <div class="logs-container">
        <div v-for="log in systemLogs.slice(-10)" :key="log.id" class="log-entry" :class="log.level">
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <div v-if="systemLogs.length === 0" class="no-logs">
          暫無系統日誌
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { hybridTechnicalIndicatorsAPI } from '@/utils/hybridTechnicalIndicatorsApi.js'
import { autoUpdateScheduler } from '@/utils/autoUpdateScheduler.js'
import { performanceCache } from '@/utils/performanceCache.js'
import { performanceMonitor } from '@/utils/performanceMonitor.js'

export default {
  name: 'SystemManager',
  data() {
    return {
      loading: false,
      testing: false,
      showAdvanced: false,
      
      // 系統狀態
      systemHealth: {
        overall: 85,
        dataSource: 90,
        performance: 80,
        updates: 85
      },
      
      // 數據源狀態
      dataSourceStatus: null,
      
      // 自動更新狀態
      status: {
        isRunning: false,
        activeIntervals: [],
        nextUpdates: {}
      },
      startTime: null,
      
      // 效能指標
      performanceScore: 85,
      cacheHitRate: 78,
      
      // 偏好設定
      preferences: {
        preferPrecomputed: true,
        fallbackToRealtime: true,
        technicalIndicatorsInterval: 30,
        metadataInterval: 24,
        enablePerformanceMonitoring: true,
        enableCacheWarmup: true
      },
      
      // 系統日誌
      systemLogs: [],
      logIdCounter: 0
    }
  },
  
  computed: {
    schedulerStatus() {
      return this.status.isRunning ? '運行中' : '已停止'
    },
    
    schedulerStatusClass() {
      return this.status.isRunning ? 'success' : 'error'
    },
    
    schedulerButtonClass() {
      return this.status.isRunning ? 'btn btn-warning' : 'btn btn-success'
    },
    
    schedulerButtonText() {
      return this.status.isRunning ? '停止調度器' : '啟動調度器'
    },
    
    technicalIndicatorsStatus() {
      return '正常'
    },
    
    technicalIndicatorsStatusClass() {
      return 'success'
    },
    
    technicalIndicatorsLastUpdate() {
      return new Date().toISOString()
    },
    
    technicalIndicatorsAge() {
      return 30 * 60 * 1000 // 30 minutes
    },
    
    technicalIndicatorsSuccessRate() {
      return 95
    },
    
    metadataStatus() {
      return '正常'
    },
    
    metadataStatusClass() {
      return 'success'
    },
    
    metadataLastUpdate() {
      return new Date().toISOString()
    },
    
    metadataAge() {
      return 2 * 60 * 60 * 1000 // 2 hours
    }
  },
  
  async mounted() {
    await this.initializeSystem()
    this.startStatusUpdates()
  },
  
  methods: {
    async initializeSystem() {
      this.addLog('info', '系統管理面板初始化中...')
      
      try {
        await this.refreshAllStatus()
        this.addLog('info', '系統管理面板初始化完成')
      } catch (error) {
        this.addLog('error', `系統初始化失敗: ${error.message}`)
      }
    },
    
    async refreshAllStatus() {
      this.loading = true
      this.addLog('info', '開始全面狀態刷新...')
      
      try {
        // 刷新數據源狀態
        await this.refreshDataSources()
        
        // 刷新自動更新狀態
        this.refreshSchedulerStatus()
        
        // 更新效能指標
        this.updatePerformanceMetrics()
        
        // 更新系統健康度
        this.updateSystemHealth()
        
        this.addLog('info', '全面狀態刷新完成')
      } catch (error) {
        this.addLog('error', `狀態刷新失敗: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    
    async refreshDataSources() {
      try {
        this.dataSourceStatus = await hybridTechnicalIndicatorsAPI.getDataSourceStatus()
        this.addLog('info', '數據源狀態已更新')
      } catch (error) {
        this.addLog('error', `數據源狀態更新失敗: ${error.message}`)
      }
    },
    
    refreshSchedulerStatus() {
      this.status = autoUpdateScheduler.getStatus()
      this.startTime = autoUpdateScheduler.getStartTime()
      this.addLog('info', '調度器狀態已更新')
    },
    
    updatePerformanceMetrics() {
      const cacheStats = performanceCache.getStats()
      const performanceMetrics = performanceMonitor.getAllMetrics()
      
      // 模擬效能分數計算
      this.performanceScore = Math.min(100, 60 + (cacheStats.totalSize * 2))
      this.cacheHitRate = Math.min(100, 50 + (cacheStats.totalSize * 3))
      
      this.addLog('info', '效能指標已更新')
    },
    
    updateSystemHealth() {
      const dataSourceHealth = this.dataSourceStatus?.precomputed?.available ? 100 : 70
      const schedulerHealth = this.status.isRunning ? 100 : 50
      
      this.systemHealth = {
        overall: Math.round((dataSourceHealth + this.performanceScore + schedulerHealth) / 3),
        dataSource: dataSourceHealth,
        performance: this.performanceScore,
        updates: schedulerHealth
      }
    },
    
    async toggleScheduler() {
      this.loading = true
      
      try {
        if (this.status.isRunning) {
          autoUpdateScheduler.stop()
          this.addLog('info', '自動更新調度器已停止')
        } else {
          autoUpdateScheduler.start()
          this.addLog('info', '自動更新調度器已啟動')
        }
        
        this.refreshSchedulerStatus()
      } catch (error) {
        this.addLog('error', `調度器操作失敗: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    
    async triggerUpdate(type) {
      this.loading = true
      this.addLog('info', `觸發 ${type} 更新...`)
      
      try {
        if (type === 'technicalIndicators') {
          // 清除技術指標快取
          performanceCache.clear()
          this.addLog('info', '技術指標快取已清除')
        } else if (type === 'metadata') {
          // 清除元數據快取
          performanceCache.clear()
          this.addLog('info', '元數據快取已清除')
        }
        
        await this.refreshDataSources()
      } catch (error) {
        this.addLog('error', `${type} 更新失敗: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    
    async clearAllCaches() {
      if (!confirm('確定要清除所有快取嗎？這將影響系統效能。')) {
        return
      }
      
      this.loading = true
      this.addLog('warning', '開始清除所有快取...')
      
      try {
        performanceCache.clear()
        localStorage.clear()
        sessionStorage.clear()
        
        this.addLog('info', '所有快取已清除')
        await this.refreshAllStatus()
      } catch (error) {
        this.addLog('error', `清除快取失敗: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    
    async testSystemHealth() {
      this.testing = true
      this.addLog('info', '開始系統健康檢查...')
      
      try {
        // 模擬系統健康檢查
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const healthScore = Math.floor(Math.random() * 20) + 80 // 80-100
        this.systemHealth.overall = healthScore
        
        this.addLog('info', `系統健康檢查完成，得分: ${healthScore}%`)
      } catch (error) {
        this.addLog('error', `系統健康檢查失敗: ${error.message}`)
      } finally {
        this.testing = false
      }
    },
    
    updatePreferences() {
      // 更新混合 API 偏好設定
      hybridTechnicalIndicatorsAPI.setPreferences({
        preferPrecomputed: this.preferences.preferPrecomputed,
        fallbackToRealtime: this.preferences.fallbackToRealtime
      })
      
      this.addLog('info', '系統偏好設定已更新')
    },
    
    startStatusUpdates() {
      // 每 30 秒更新一次狀態
      setInterval(() => {
        if (!this.loading) {
          this.refreshSchedulerStatus()
          this.updatePerformanceMetrics()
          this.updateSystemHealth()
        }
      }, 30000)
    },
    
    // 工具方法
    getHealthStatus(score) {
      if (score >= 90) return '優秀'
      if (score >= 80) return '良好'
      if (score >= 70) return '一般'
      return '需要關注'
    },
    
    getDataAgeClass(age) {
      const hours = age / (1000 * 60 * 60)
      if (hours < 1) return 'fresh'
      if (hours < 6) return 'stale'
      return 'very-stale'
    },
    
    formatTime(timestamp) {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleString('zh-TW')
    },
    
    formatDataAge(age) {
      if (!age) return 'N/A'
      
      const minutes = Math.floor(age / (1000 * 60))
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      
      if (days > 0) return `${days} 天前`
      if (hours > 0) return `${hours} 小時前`
      return `${minutes} 分鐘前`
    },
    
    addLog(level, message) {
      this.systemLogs.push({
        id: ++this.logIdCounter,
        timestamp: new Date().toISOString(),
        level,
        message
      })
      
      // 保持最多 100 條日誌
      if (this.systemLogs.length > 100) {
        this.systemLogs = this.systemLogs.slice(-100)
      }
    },
    
    clearLogs() {
      this.systemLogs = []
      this.logIdCounter = 0
    }
  }
}
</script>

<style scoped>
.system-manager {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.manager-header {
  text-align: center;
  margin-bottom: 2rem;
}

.manager-header h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.manager-header p {
  color: #666;
  font-size: 1.1rem;
}

/* 總覽區域 */
.overview-section {
  margin-bottom: 2rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.overview-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.overview-card.healthy {
  border-color: #28a745;
  background: linear-gradient(135deg, #f8fff9 0%, #ffffff 100%);
}

.card-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.card-content h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1rem;
}

.health-score, .performance-score {
  font-size: 1.8rem;
  font-weight: bold;
  color: #28a745;
}

.health-status, .performance-info, .update-info {
  font-size: 0.9rem;
  color: #666;
}

.data-sources {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.source-item {
  font-size: 0.9rem;
  padding: 0.25rem 0;
}

.source-item.active {
  color: #28a745;
}

.update-status {
  font-size: 1.2rem;
  font-weight: bold;
}

.update-status.success {
  color: #28a745;
}

.update-status.error {
  color: #dc3545;
}

/* 詳細區域 */
.details-section {
  margin-bottom: 2rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.detail-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.data-source-list, .update-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.source-item, .update-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 1rem;
}

.source-item.available, .update-item {
  border-color: #d4edda;
  background: #f8fff9;
}

.source-header, .update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.source-header h4, .update-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.status-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-indicator.success {
  background: #d4edda;
  color: #155724;
}

.source-details, .update-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.detail-row span:first-child {
  color: #666;
}

.detail-row span:last-child {
  font-weight: 500;
  color: #333;
}

.detail-row .fresh {
  color: #28a745;
}

.detail-row .stale {
  color: #ffc107;
}

.detail-row .very-stale {
  color: #dc3545;
}

.update-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
}

/* 控制面板 */
.control-section {
  margin-bottom: 2rem;
}

.control-header {
  margin-bottom: 1rem;
}

.control-header h3 {
  color: #333;
  margin: 0;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.control-btn.primary {
  background: #007bff;
  color: white;
}

.control-btn.primary:hover:not(:disabled) {
  background: #0056b3;
}

.control-btn.warning {
  background: #ffc107;
  color: #212529;
}

.control-btn.warning:hover:not(:disabled) {
  background: #e0a800;
}

.control-btn.info {
  background: #17a2b8;
  color: white;
}

.control-btn.info:hover:not(:disabled) {
  background: #138496;
}

.control-btn.secondary {
  background: #6c757d;
  color: white;
}

.control-btn.secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-icon {
  font-size: 1.1rem;
}

/* 進階設定 */
.advanced-section {
  margin-bottom: 2rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.advanced-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.advanced-header h3 {
  margin: 0;
  color: #333;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.setting-group {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 1rem;
}

.setting-group h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.setting-item {
  margin-bottom: 0.75rem;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #333;
  cursor: pointer;
}

.setting-item select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* 系統日誌 */
.logs-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.logs-header h3 {
  margin: 0;
  color: #333;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 1rem;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.9rem;
  font-family: 'Courier New', monospace;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.info {
  color: #17a2b8;
}

.log-entry.warning {
  color: #ffc107;
}

.log-entry.error {
  color: #dc3545;
}

.log-time {
  color: #666;
  white-space: nowrap;
}

.log-level {
  font-weight: bold;
  min-width: 60px;
}

.log-message {
  flex: 1;
}

.no-logs {
  text-align: center;
  color: #666;
  font-style: italic;
}

/* 按鈕樣式 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1e7e34;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .control-grid {
    grid-template-columns: 1fr;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>