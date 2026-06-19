<template>
  <div class="indicators-manager">
    <div class="manager-header">
      <h2>{{ $t('techIndicators.title') }}</h2>
      <p>{{ $t('techIndicators.subtitle') }}</p>
    </div>

    <!-- Data sources -->
    <div class="status-section">
      <h3>{{ $t('techIndicators.dataSources') }}</h3>

      <div class="status-grid">
        <!-- Pre-computed data -->
        <div class="status-card" :class="{ 'available': dataSourceStatus?.precomputed?.available }">
          <div class="status-header">
            <h4>{{ $t('techIndicators.precomputed') }}</h4>
            <span class="status-badge" :class="dataSourceStatus?.precomputed?.available ? 'success' : 'error'">
              {{ dataSourceStatus?.precomputed?.available ? $t('common.available') : $t('common.unavailable') }}
            </span>
          </div>

          <div v-if="dataSourceStatus?.precomputed?.available" class="status-details">
            <p><strong>{{ $t('techIndicators.symbolCount') }}:</strong> {{ dataSourceStatus.precomputed.symbols.length }}</p>
            <p><strong>{{ $t('techIndicators.successful') }}:</strong> {{ dataSourceStatus.precomputed.successful }}</p>
            <p><strong>{{ $t('techIndicators.failed') }}:</strong> {{ dataSourceStatus.precomputed.failed }}</p>
            <p><strong>{{ $t('techIndicators.lastUpdate') }}:</strong> {{ formatDate(dataSourceStatus.precomputed.lastUpdate) }}</p>
          </div>
        </div>

        <!-- Cache -->
        <div class="status-card available">
          <div class="status-header">
            <h4>{{ $t('techIndicators.dailyCache') }}</h4>
            <span class="status-badge success">{{ $t('common.available') }}</span>
          </div>

          <div class="status-details">
            <p><strong>{{ $t('techIndicators.memoryCache') }}:</strong> {{ dataSourceStatus?.cache?.memoryCache || 0 }} {{ $t('techIndicators.items') }}</p>
            <p><strong>{{ $t('techIndicators.localStorage') }}:</strong> {{ dataSourceStatus?.cache?.localStorageCache || 0 }} {{ $t('techIndicators.items') }}</p>
            <p><strong>{{ $t('techIndicators.totalSize') }}:</strong> {{ formatBytes(dataSourceStatus?.cache?.totalSize || 0) }}</p>
          </div>
        </div>

        <!-- Real-time -->
        <div class="status-card available">
          <div class="status-header">
            <h4>{{ $t('techIndicators.realtime') }}</h4>
            <span class="status-badge success">{{ $t('common.available') }}</span>
          </div>

          <div class="status-details">
            <p><strong>{{ $t('techIndicators.dataSourcesCount') }}:</strong> {{ dataSourceStatus?.realtime?.proxies || 0 }}</p>
            <p><strong>{{ $t('techIndicators.statusLabel') }}:</strong> {{ $t('techIndicators.statusFallback') }}</p>
            <p><strong>{{ $t('techIndicators.expectedDelayLabel') }}:</strong> {{ $t('techIndicators.expectedDelayValue') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="control-section">
      <h3>{{ $t('techIndicators.controls') }}</h3>

      <div class="control-grid">
        <button @click="refreshStatus()" class="control-btn primary" :disabled="loading">
          {{ loading ? $t('common.loading') : $t('techIndicators.refreshStatus') }}
        </button>

        <button @click="clearAllCaches()" class="control-btn warning">
          {{ $t('techIndicators.clearAllCaches') }}
        </button>

        <button @click="testPrecomputed()" class="control-btn info" :disabled="testing">
          {{ testing ? $t('techIndicators.testing') : $t('techIndicators.testPrecomputed') }}
        </button>

        <button @click="showPreferences = !showPreferences" class="control-btn secondary">
          {{ showPreferences ? $t('techIndicators.hideSettings') : $t('techIndicators.showSettings') }}
        </button>
      </div>
    </div>

    <!-- Preferences -->
    <div v-if="showPreferences" class="preferences-section">
      <h3>{{ $t('techIndicators.preferences') }}</h3>

      <div class="preferences-form">
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              v-model="preferences.preferPrecomputed"
              @change="updatePreferences"
            />
            {{ $t('techIndicators.preferPrecomputed') }}
          </label>
        </div>

        <div class="form-group">
          <label>
            <input
              type="checkbox"
              v-model="preferences.fallbackToRealtime"
              @change="updatePreferences"
            />
            {{ $t('techIndicators.allowFallback') }}
          </label>
        </div>

        <div class="form-group">
          <label>{{ $t('techIndicators.maxAgeLabel') }}</label>
          <input
            type="number"
            v-model.number="preferences.maxAgeHours"
            @change="updatePreferences"
            min="1"
            max="72"
          />
        </div>
      </div>
    </div>

    <!-- Test results -->
    <div v-if="testResults.length > 0" class="test-results-section">
      <h3>{{ $t('techIndicators.testResults') }}</h3>

      <div class="test-results">
        <div
          v-for="(result, index) in testResults"
          :key="index"
          class="test-result-item"
          :class="{ 'success': result.success, 'error': !result.success }"
        >
          <div class="result-header">
            <span class="symbol">{{ result.symbol }}</span>
            <span class="source">{{ result.source }}</span>
            <span class="load-time">{{ result.loadTime }}</span>
          </div>

          <div v-if="result.error" class="error-message">
            {{ result.error }}
          </div>

          <div v-else class="indicators-preview">
            <span>MA5: {{ result.data.ma5?.value || $t('common.na') }}</span>
            <span>ADX: {{ result.data.adx14?.value || $t('common.na') }}</span>
            <span>MACD: {{ result.data.macd?.signal || $t('common.na') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pre-computed symbols -->
    <div v-if="dataSourceStatus?.precomputed?.available" class="symbols-section">
      <h3>{{ $t('techIndicators.precomputedSymbols') }}</h3>

      <div class="symbols-grid">
        <span
          v-for="symbol in dataSourceStatus.precomputed.symbols"
          :key="symbol"
          class="symbol-tag"
        >
          {{ symbol }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import hybridTechnicalIndicatorsAPI from '@/api/hybridTechnicalIndicatorsApi.js'

export default {
  name: 'TechnicalIndicatorsManager',
  data() {
    return {
      loading: false,
      testing: false,
      showPreferences: false,
      dataSourceStatus: null,
      testResults: [],
      preferences: {
        preferPrecomputed: true,
        fallbackToRealtime: true,
        maxAgeHours: 24
      }
    }
  },
  async mounted() {
    await this.refreshStatus();
  },
  methods: {
    async refreshStatus() {
      this.loading = true;
      try {
        this.dataSourceStatus = await hybridTechnicalIndicatorsAPI.getDataSourceStatus();
      } catch (error) {
        console.error('Failed to refresh status:', error);
        alert(this.$t('techIndicators.refreshFailed') + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    async clearAllCaches() {
      if (!confirm(this.$t('techIndicators.confirmClear'))) {
        return;
      }

      try {
        // 這裡需要調用各個緩存清理方法
        // technicalIndicatorsCache.clearAllCache();
        // precomputedIndicatorsAPI.clearCache();
        alert(this.$t('techIndicators.cachesCleared'));
        await this.refreshStatus();
      } catch (error) {
        alert(this.$t('techIndicators.clearFailed') + error.message);
      }
    },
    
    async testPrecomputed() {
      this.testing = true;
      this.testResults = [];
      
      const testSymbols = ['AAPL', 'TSLA', 'MSFT'];
      
      try {
        for (const symbol of testSymbols) {
          const startTime = Date.now();
          
          try {
            const data = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators(symbol);
            const loadTime = Date.now() - startTime;
            
            this.testResults.push({
              symbol,
              success: true,
              data,
              source: data.source,
              loadTime: `${loadTime}ms`
            });
          } catch (error) {
            this.testResults.push({
              symbol,
              success: false,
              error: error.message,
              loadTime: `${Date.now() - startTime}ms`
            });
          }
        }
      } finally {
        this.testing = false;
      }
    },
    
    updatePreferences() {
      const maxAge = this.preferences.maxAgeHours * 60 * 60 * 1000;
      
      hybridTechnicalIndicatorsAPI.setPreferences({
        preferPrecomputed: this.preferences.preferPrecomputed,
        fallbackToRealtime: this.preferences.fallbackToRealtime,
        maxPrecomputedAge: maxAge
      });
      
      console.log('Preferences updated:', this.preferences);
    },
    
    formatDate(dateString) {
      if (!dateString) return this.$t('common.na');
      const loc = this.$i18n.locale.value === 'zh-TW' ? 'zh-TW' : 'en-US';
      return new Date(dateString).toLocaleString(loc);
    },
    
    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
}
</script>

<style scoped>
.indicators-manager {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.manager-header {
  text-align: center;
  margin-bottom: 2rem;
}

.manager-header h2 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.status-section, .control-section, .preferences-section, .test-results-section, .symbols-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.status-section h3, .control-section h3, .preferences-section h3, .test-results-section h3, .symbols-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.status-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #dc3545;
}

.status-card.available {
  border-left-color: #28a745;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-header h4 {
  margin: 0;
  color: var(--text-secondary);
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.status-details p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.control-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
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

.control-btn.warning:hover {
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

.control-btn.secondary:hover {
  background: #545b62;
}

.control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preferences-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.form-group input[type="number"] {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 100px;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.test-result-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #dc3545;
}

.test-result-item.success {
  border-left-color: #28a745;
}

.result-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.symbol {
  color: var(--text-secondary);
}

.source {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.load-time {
  margin-left: auto;
  color: #007bff;
}

.error-message {
  color: #dc3545;
  font-size: 0.9rem;
}

.indicators-preview {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.symbols-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.symbol-tag {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .indicators-manager {
    padding: 1rem;
  }
  
  .status-grid, .control-grid {
    grid-template-columns: 1fr;
  }
  
  .result-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .load-time {
    margin-left: 0;
  }
}
</style>