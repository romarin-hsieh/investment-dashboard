<template>
  <div>
    <div class="markets-header">
      <div class="update-info" v-if="lastUpdate">
        <span class="text-muted">Last updated: {{ formatTime(lastUpdate) }}</span>
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
      Loading markets indicators...
    </div>

    <div v-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary btn-sm">Retry</button>
    </div>
  </div>
</template>

<script>
import { dataFetcher } from '@/lib/fetcher'

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
        case 'fresh': return '🟢 Fresh'
        case 'stale': return '🟡 Stale'
        case 'very_stale': return '🔴 Very Stale'
        default: return '⚪ Unknown'
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
          throw new Error('No markets data available')
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
        return 'N/A'
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
          return `${value.toFixed(2)}%`
        
        case 'gold_spot_price':
          return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}/oz`
        
        case 'crude_oil_wti':
          return `$${value.toFixed(2)}/bbl`
        
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
        case 'good': return 'Good'
        case 'stale': return 'Stale'
        case 'degraded': return 'Degraded'
        case 'disabled_scrape': return 'Disabled'
        default: return 'Unknown'
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
  margin-bottom: 1rem;
}

.markets-grid {
  margin-bottom: 2rem;
}

.update-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
}

.stale-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.stale-fresh {
  background-color: #d4edda;
  color: #155724;
}

.stale-stale {
  background-color: #fff3cd;
  color: #856404;
}

.stale-very_stale {
  background-color: #f8d7da;
  color: #721c24;
}

.markets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.markets-tile {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.markets-tile:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.markets-tile.no-data {
  background-color: #f8f9fa;
  border-color: #dee2e6;
}

.markets-tile.disabled {
  background-color: #f1f3f4;
  opacity: 0.7;
}

.markets-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.5rem;
}

.markets-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
  min-height: 2rem;
}

.markets-tile.no-data .markets-value {
  color: #999;
  font-style: italic;
}

.markets-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.source {
  color: #666;
}

.quality-flag {
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
}

.quality-good {
  background-color: #d4edda;
  color: #155724;
}

.quality-stale {
  background-color: #fff3cd;
  color: #856404;
}

.quality-degraded {
  background-color: #f8d7da;
  color: #721c24;
}

.quality-disabled {
  background-color: #e2e3e5;
  color: #6c757d;
}

.markets-time {
  font-size: 0.75rem;
  color: #999;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  text-align: center;
  padding: 1rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-top: 1rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .markets-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .markets-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .update-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>