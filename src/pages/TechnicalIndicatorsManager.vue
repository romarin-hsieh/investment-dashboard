<template>
  <div class="indicators-manager">
    <div class="manager-header">
      <h2 class="page-title">{{ $t('techIndicators.title') }}</h2>
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
        <button @click="refreshStatus()" class="btn btn-primary" :disabled="loading">
          {{ loading ? $t('common.loading') : $t('techIndicators.refreshStatus') }}
        </button>

        <button @click="clearAllCaches()" class="btn btn-warning">
          {{ $t('techIndicators.clearAllCaches') }}
        </button>

        <button @click="testPrecomputed()" class="btn btn-secondary" :disabled="testing">
          {{ testing ? $t('techIndicators.testing') : $t('techIndicators.testPrecomputed') }}
        </button>

        <button @click="showPreferences = !showPreferences" class="btn btn-secondary">
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
          <label for="ti-max-age">{{ $t('techIndicators.maxAgeLabel') }}</label>
          <input
            id="ti-max-age"
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
            <span>MA5: {{ result.data?.ma5?.value || $t('common.na') }}</span>
            <span>ADX: {{ result.data?.adx14?.value || $t('common.na') }}</span>
            <span>MACD: {{ result.data?.macd?.signal || $t('common.na') }}</span>
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

<script lang="ts">
import { defineComponent } from 'vue'
import hybridTechnicalIndicatorsAPI from '@/api/hybridTechnicalIndicatorsApi'
import { technicalIndicatorsCache } from '@/utils/technicalIndicatorsCache'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi'
import { formatDateTime as i18nDateTime } from '@/utils/dateFormat'

/** The indicator fields the test-results table reads off a returned payload. */
interface TestPayload {
  ma5?: { value?: unknown } | null
  adx14?: { value?: unknown } | null
  macd?: { signal?: unknown } | null
  [key: string]: unknown
}

/** One row of the precomputed-vs-realtime self-test. */
interface TestResult {
  symbol: string
  success: boolean
  data?: TestPayload
  source?: string | undefined
  error?: string
  loadTime: string
}

export default defineComponent({
  name: 'TechnicalIndicatorsManager',
  data() {
    return {
      loading: false,
      testing: false,
      showPreferences: false,
      dataSourceStatus: null as Awaited<ReturnType<typeof hybridTechnicalIndicatorsAPI.getDataSourceStatus>> | null,
      testResults: [] as TestResult[],
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
        alert(this.$t('techIndicators.refreshFailed') + (error as Error).message);
      } finally {
        this.loading = false;
      }
    },
    
    async clearAllCaches() {
      if (!confirm(this.$t('techIndicators.confirmClear'))) {
        return;
      }

      try {
        // Actually clear the caches. These calls used to be commented out while
        // the success alert fired unconditionally — the user was told the purge
        // succeeded when nothing had been cleared.
        technicalIndicatorsCache.clearAllCache();
        precomputedIndicatorsAPI.clearCache();
        alert(this.$t('techIndicators.cachesCleared'));
        await this.refreshStatus();
      } catch (error) {
        alert(this.$t('techIndicators.clearFailed') + (error as Error).message);
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
              data: data as unknown as TestPayload,
              source: data.source,
              loadTime: `${loadTime}ms`
            });
          } catch (error) {
            this.testResults.push({
              symbol,
              success: false,
              error: (error as Error).message,
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
    
    formatDate(dateString: string | null | undefined) {
      if (!dateString) return this.$t('common.na');
      return i18nDateTime(dateString);
    },

    formatBytes(bytes: number) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
})
</script>

<style scoped>
.indicators-manager {
  /* Gutter, max-width and centering come from Layout's .container;
     vertical spacing from .main-content. */
}

.manager-header {
  /* Left-aligned per the shared page-header grammar (WIREFRAMES §1). */
  margin-bottom: var(--space-8);
}

.manager-header h2 {
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.status-section, .control-section, .preferences-section, .test-results-section, .symbols-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--card-padding);
  margin-bottom: var(--space-8);
}

.status-section h3, .control-section h3, .preferences-section h3, .test-results-section h3, .symbols-section h3 {
  margin: 0 0 var(--space-4) 0;
  color: var(--text-secondary);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}

.status-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  /* Nested tinted panel: shares the card radius, stays shadowless (WIREFRAMES §3). */
  border-radius: var(--radius-md);
  padding: var(--widget-padding);
}
/* Status is conveyed by the .status-badge in each card header (no side-stripe). */

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.status-header h4 {
  margin: 0;
  color: var(--text-secondary);
}

.status-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
}

.status-badge.success {
  background: var(--success-bg);
  color: var(--success-fg);
}

.status-badge.error {
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.status-details p {
  margin: var(--space-1) 0;
  font-size: var(--text-base);
  color: var(--text-muted);
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.preferences-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--weight-medium);
}

.form-group input[type="number"] {
  padding: var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  width: 100px;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.test-result-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
}

/* Pass/fail conveyed by a calm full-card tint (mode-aware tokens), not a side-stripe. */
.test-result-item.success {
  background: var(--success-bg);
}

.test-result-item.error {
  background: var(--danger-bg);
}

.result-header {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
  font-weight: var(--weight-semibold);
}

.symbol {
  color: var(--text-secondary);
}

.source {
  color: var(--text-muted);
  font-size: var(--text-base);
}

.load-time {
  margin-left: auto;
  /* --blue-700 is theme-FIXED (#0056b3) — fine in light but only 2.20:1 on the
     dark secondary card. Use the theme-aware meta token so it clears AA in both. */
  color: var(--text-secondary);
}

.error-message {
  /* --danger-solid #dc3545 was 3.39:1 on --danger-bg; --danger-fg reaches 8.25:1 */
  color: var(--danger-fg);
  font-size: var(--text-base);
}

.indicators-preview {
  display: flex;
  gap: var(--space-4);
  font-size: var(--text-base);
  color: var(--text-muted);
}

.symbols-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.symbol-tag {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

@media (max-width: 768px) {
  .indicators-manager {
    padding: var(--space-4);
  }
  
  .status-grid, .control-grid {
    grid-template-columns: 1fr;
  }
  
  .result-header {
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .load-time {
    margin-left: 0;
  }
}
</style>