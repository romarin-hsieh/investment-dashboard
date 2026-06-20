<template>
  <div>
    <div class="markets-header">
      <div class="update-info" v-if="lastUpdate">
        <span class="text-muted">{{ $t('marketsOverview.lastUpdated', { time: formatTime(lastUpdate) }) }}</span>
        <span class="stale-indicator" :class="staleClass">{{ staleText }}</span>
      </div>
    </div>

    <div class="markets-grid">
      <div 
        v-for="indicator in marketsIndicators" 
        :key="indicator.id"
        class="markets-tile"
        :class="getTileClass(indicator)"
      >
        <div class="markets-name">{{ getIndicatorName(indicator.id) }}</div>
        <div class="markets-value">
          {{ formatValue(indicator.value, indicator.id) }}
        </div>
        <div class="markets-meta">
          <span class="source">{{ indicator.source_name }}</span>
          <span class="quality-flag" :class="getQualityClass(indicator.quality_flag)">
            {{ getQualityText(indicator.quality_flag) }}
          </span>
        </div>
        <div class="markets-time">{{ formatTime(indicator.as_of) }}</div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      {{ $t('marketsOverview.loading') }}
    </div>

    <div v-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary btn-sm">{{ $t('marketsOverview.retry') }}</button>
    </div>
  </div>
</template>

<script>
import { dataFetcher } from '@/lib/fetcher'
import { formatNumber } from '@/utils/numberFormat'

export default {
  name: 'MarketsOverview',
  data() {
    return {
      marketsIndicators: [],
      loading: false,
      error: null,
      lastUpdate: null,
      staleLevel: 'fresh'
    }
  },
  computed: {
    staleClass() {
      return `stale-${this.staleLevel}`
    },
    staleText() {
      switch (this.staleLevel) {
        case 'fresh': return `🟢 ${this.$t('marketsOverview.staleFresh')}`
        case 'stale': return `🟡 ${this.$t('marketsOverview.staleStale')}`
        case 'very_stale': return `🔴 ${this.$t('marketsOverview.staleVeryStale')}`
        default: return `⚪ ${this.$t('marketsOverview.staleUnknown')}`
      }
    }
  },
  async mounted() {
    await this.loadMarketsData()
  },
  methods: {
    async loadMarketsData() {
      this.loading = true
      this.error = null
      
      try {
        const result = await dataFetcher.fetchDailySnapshot()
        
        if (result.data && result.data.macro && result.data.macro.items) {
          this.marketsIndicators = result.data.macro.items
          this.lastUpdate = result.as_of
          this.staleLevel = result.stale_level
        } else {
          throw new Error(this.$t('marketsOverview.errorNoData'))
        }
      } catch (err) {
        this.error = String(err)
        console.error('Failed to load markets data:', err)
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      await this.loadMarketsData()
    },

    getIndicatorName(id) {
      const names = {
        'sp500_index': 'S&P 500',
        'nasdaq_composite': 'NASDAQ',
        'vix_volatility': 'VIX',
        'us_10y_treasury': '10Y Treasury',
        'dxy_dollar_index': 'DXY',
        'gold_spot_price': 'Gold',
        'crude_oil_wti': 'WTI Oil',
        'bitcoin_price': 'Bitcoin',
        'unemployment_rate': 'Unemployment',
        'fed_funds_rate': 'Fed Rate'
      }
      return names[id] || id
    },

    formatValue(value, id) {
      if (value === null || value === undefined) {
        return this.$t('marketsOverview.notAvailable')
      }

      // 根據指標類型格式化數值
      switch (id) {
        case 'sp500_index':
        case 'nasdaq_composite':
        case 'dxy_dollar_index':
          return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
        
        case 'vix_volatility':
        case 'us_10y_treasury':
        case 'unemployment_rate':
        case 'fed_funds_rate':
          return `${formatNumber(value, 2)}%`

        case 'gold_spot_price':
          return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}/oz`

        case 'crude_oil_wti':
          return `$${formatNumber(value, 2)}/bbl`
        
        case 'bitcoin_price':
          return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        
        default:
          return value.toString()
      }
    },

    formatTime(timeString) {
      if (!timeString) return ''
      
      try {
        const date = new Date(timeString)
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return timeString
      }
    },

    getTileClass(indicator) {
      const classes = ['markets-tile']
      
      if (indicator.value === null || indicator.value === undefined) {
        classes.push('no-data')
      }
      
      if (indicator.quality_flag === 'disabled_scrape') {
        classes.push('disabled')
      }
      
      return classes
    },

    getQualityClass(qualityFlag) {
      switch (qualityFlag) {
        case 'good': return 'quality-good'
        case 'stale': return 'quality-stale'
        case 'degraded': return 'quality-degraded'
        case 'disabled_scrape': return 'quality-disabled'
        default: return 'quality-unknown'
      }
    },

    getQualityText(qualityFlag) {
      switch (qualityFlag) {
        case 'good': return this.$t('marketsOverview.qualityGood')
        case 'stale': return this.$t('marketsOverview.qualityStale')
        case 'degraded': return this.$t('marketsOverview.qualityDegraded')
        case 'disabled_scrape': return this.$t('marketsOverview.qualityDisabled')
        default: return this.$t('marketsOverview.qualityUnknown')
      }
    }
  }
}
</script>

<style scoped>
.markets-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: var(--space-4);
}

.markets-grid {
  margin-bottom: var(--space-8);
}

.update-info {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--text-base);
}

.stale-indicator {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.stale-fresh {
  background-color: var(--success-bg);
  color: var(--success-fg);
}

.stale-stale {
  background-color: var(--warning-bg);
  color: var(--warning-fg);
}

.stale-very_stale {
  background-color: var(--danger-bg);
  color: var(--danger-fg);
}

.markets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.markets-tile {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  transition: all var(--transition-base);
}

.markets-tile:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.markets-tile.no-data {
  background-color: var(--grey-50);
  border-color: var(--grey-200);
}

.markets-tile.disabled {
  background-color: var(--grey-150);
  opacity: 0.7;
}

.markets-name {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.markets-value {
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  min-height: 2rem;
}

.markets-tile.no-data .markets-value {
  color: var(--text-muted);
  font-style: italic;
}

.markets-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
  font-size: var(--text-sm);
}

.source {
  color: var(--text-secondary);
}

.quality-flag {
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
}

.quality-good {
  background-color: var(--success-bg);
  color: var(--success-fg);
}

.quality-stale {
  background-color: var(--warning-bg);
  color: var(--warning-fg);
}

.quality-degraded {
  background-color: var(--danger-bg);
  color: var(--danger-fg);
}

.quality-disabled {
  background-color: var(--grey-200);
  color: var(--grey-550);
}

.markets-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.loading {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-secondary);
}

.error {
  text-align: center;
  padding: var(--space-4);
  background-color: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-xs);
  margin-top: var(--space-4);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .markets-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .markets-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .update-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }
}
</style>