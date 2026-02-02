<template>
  <div class="holdings-analysis">
    <div v-if="loading" class="holdings-grid">
      <!-- Ownership Skeleton -->
      <div class="card ownership-card">
        <h3>Ownership Structure</h3>
        <div class="chart-container">
          <WidgetSkeleton type="chart" :show-header="false" :bordered="false" />
        </div>
      </div>

      <!-- Sentiment Skeleton -->
      <div class="card sentiment-card">
        <h3>Insider Sentiment (6M)</h3>
         <WidgetSkeleton type="list" :item-count="3" :show-header="false" :bordered="false" />
      </div>

      <!-- Institutions Skeleton -->
      <div class="card institutions-card full-width">
        <h3>Top Institutional Holders</h3>
         <WidgetSkeleton type="list" :item-count="5" :show-header="false" :bordered="false" />
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadData">Retry</button>
    </div>

    <div v-else class="holdings-grid">
      <!-- Ownership Breakdown -->
      <div class="card ownership-card">
        <h3>Ownership Structure</h3>
        <div class="chart-container">
          <Doughnut v-if="ownershipChartData" :data="ownershipChartData" :options="ownershipChartOptions" />
        </div>
        <div class="stats-row">
            <div class="stat">
                <span class="label">Insiders</span>
                <span class="value">{{ holders.insidersPercent || '0%' }}</span>
            </div>
             <div class="stat">
                <span class="label">Institutions</span>
                <span class="value">{{ holders.institutionsPercent || '0%' }}</span>
            </div>
        </div>
      </div>

      <!-- Insider Sentiment -->
      <div class="card sentiment-card">
        <h3>Insider Sentiment (6M)</h3>
        <div class="sentiment-meter">
            <div class="meter-bar-dual">
                <div class="segment sell" :style="{ width: getSentimentStyles().sell + '%'}"></div>
                <div class="segment buy" :style="{ width: getSentimentStyles().buy + '%'}"></div>
            </div>
            <div class="meter-labels">
                 <span class="label-sell">{{ Math.round(getSentimentStyles().sell) }}% Selling</span>
                 <span class="label-sentiment">{{ sentimentLabel }}</span>
                 <span class="label-buy">{{ Math.round(getSentimentStyles().buy) }}% Buying</span>
            </div>
        </div>
        
        <div class="recent-transactions">
            <h4>Recent Transactions</h4>
            <ul class="transaction-list">
                <li v-for="(tx, idx) in recentInsiders" :key="idx" :class="tx.buySell">
                    <span class="date">{{ formatDate(tx.startDate) }}</span>
                    <span class="name" :title="tx.filerName">{{ tx.filerName }}</span>
                    <span class="type">{{ tx.transactionText }}</span>
                    <span class="shares">{{ tx.shares ? tx.shares.fmt : 'N/A' }}</span>
                </li>
            </ul>
        </div>
      </div>

      <!-- Top Institutions -->
      <div class="card institutions-card full-width">
        <h3>Top Institutional Holders</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Holder</th>
                        <th>Shares</th>
                        <th>Date Reported</th>
                        <th>% Out</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inst, idx) in holders.topInstitutions.slice(0, 10)" :key="idx">
                        <td>{{ inst.organization }}</td>
                        <td>{{ inst.position ? inst.position.fmt : 'N/A' }}</td>
                        <td>{{ inst.reportDate ? inst.reportDate.fmt : 'N/A' }}</td>
                        <td>{{ inst.pctHeld ? inst.pctHeld.fmt : 'N/A' }}</td>
                        <td>{{ inst.value ? inst.value.fmt : 'N/A' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi.js'
import { useTheme } from '@/composables/useTheme.js'

ChartJS.register(ArcElement, Tooltip, Legend)

import WidgetSkeleton from '@/components/WidgetSkeleton.vue'

export default {
  name: 'HoldingsAnalysis',
  components: { Doughnut, WidgetSkeleton },
  props: {
    symbol: {
      type: String,
      required: true
    }
  },
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loading: true,
      error: null,
      holders: {},
      insiderTransactions: [],
      ownershipChartData: null,
      ownershipChartOptions: null // computed now
    }
  },
  computed: {
      recentInsiders() {
          return this.insiderTransactions.slice(0, 5);
      },
      isDark() {
          return this.theme === 'dark';
      },
      ownershipChartOptions() {
        return {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: { 
                  position: 'right',
                  labels: { color: this.isDark ? '#E6E1DC' : '#666' }
              }
          }
        }
      },
      sentimentScore() {
          // Calculate simple sentiment score based on recent transactions
          if (!this.insiderTransactions.length) return 50;
          
          let buys = 0;
          let sells = 0;
          
          this.insiderTransactions.forEach(tx => {
              if (tx.transactionText && tx.transactionText.toLowerCase().includes('purchase')) buys++;
              if (tx.transactionText && tx.transactionText.toLowerCase().includes('sale')) sells++;
          });
          
          const total = buys + sells;
          if (total === 0) return 50;
          return (buys / total) * 100;
      },
      sentimentLabel() {
          if (this.sentimentScore > 60) return 'Bullish';
          if (this.sentimentScore < 40) return 'Bearish';
          return 'Neutral';
      },
      sentimentColor() {
          if (this.sentimentScore > 60) return '#28a745';
          if (this.sentimentScore < 40) return '#dc3545';
          return '#ffc107';
      }
  },
  watch: {
    symbol: {
      handler: 'loadData',
      immediate: true
    }
  },
  methods: {
    async loadData() {
        if (!this.symbol) return;
        this.loading = true;
        this.error = null;
        try {
            const data = await yahooFinanceAPI.getStockInfo(this.symbol);
            if (!data || !data.holders) {
                throw new Error('Data incomplete');
            }
            
            this.holders = data.holders;
            this.insiderTransactions = data.insiderTransactions || [];
            this.processTransactions();
            this.processOwnershipChart();
            
        } catch (err) {
            console.warn('Live API load error, trying precomputed fallback:', err);
            
            // Fallback to precomputed data
            try {
                const precomputed = await precomputedIndicatorsAPI.getTechnicalIndicators(this.symbol);
                if (precomputed && precomputed.fundamentals) {
                    console.log('Using precomputed fundamentals for', this.symbol);
                    const data = precomputed.fundamentals;
                    
                    // Handle pre-processed or raw data structures
                    if (data.holders) {
                         this.holders = data.holders;
                    } else if (data.majorHoldersBreakdown || data.institutionOwnership) {
                         // Adapting raw yahoo-finance2 structure to component structure
                         const getPercentFmt = (val) => {
                            if (val && typeof val === 'object' && val.fmt) return val.fmt;
                            if (typeof val === 'number') return (val * 100).toFixed(2) + '%';
                            return val || '0%';
                         };
                         const createFmt = (val, formatter) => {
                            if (val && typeof val === 'object' && val.fmt) return val;
                            return { raw: val, fmt: val !== null && val !== undefined ? formatter(val) : 'N/A' };
                         };
                         
                         const holdersData = data.majorHoldersBreakdown || {};
                         const instOwn = data.institutionOwnership || {};
                         
                         this.holders = {
                            insidersPercent: getPercentFmt(holdersData.insidersPercentHeld),
                            institutionsPercent: getPercentFmt(holdersData.institutionsPercentHeld),
                            institutionsCount: holdersData.institutionsCount || (instOwn.ownershipList ? instOwn.ownershipList.length : 0),
                            topInstitutions: (instOwn.ownershipList || []).map(h => ({
                                organization: h.organization,
                                position: createFmt(h.position, v => Number(v).toLocaleString()),
                                reportDate: createFmt(h.reportDate, d => new Date(d).toLocaleDateString()),
                                pctHeld: createFmt(h.pctHeld, v => (Number(v) * 100).toFixed(2) + '%'),
                                value: createFmt(h.value, v => Number(v).toLocaleString())
                            }))
                         };
                    } else {
                        this.holders = {};
                    }

                    this.insiderTransactions = data.insiderTransactions || [];
                    this.processTransactions();
                    this.processOwnershipChart();
                    this.error = null;
                } else {
                    throw new Error('No precomputed fundamentals available');
                }
            } catch (fallbackErr) {
                console.error('Holdings fallback failed:', fallbackErr);
                this.error = 'Failed to load holdings data';
            }
        } finally {
            this.loading = false;
        }
    },
    
    processTransactions() {
         // Fix insider transaction buy/sell class
        this.insiderTransactions.forEach(tx => {
            const text = tx.transactionText || '';
            if (text.toLowerCase().includes('purchase')) tx.buySell = 'buy';
            else if (text.toLowerCase().includes('sale')) tx.buySell = 'sell';
            else tx.buySell = 'neutral';
        });
    },
    
    processOwnershipChart() {
        // Parse percentages
        const insiders = parseFloat(this.holders.insidersPercent) || 0;
        const institutions = parseFloat(this.holders.institutionsPercent) || 0;
        const publicFloat = Math.max(0, 100 - insiders - institutions); 
        
        this.ownershipChartData = {
            labels: ['Insiders', 'Institutions', 'Public/Other'],
            datasets: [{
                data: [insiders, institutions, publicFloat],
                // Match "Analyst Price Targets" palette:
                // Insiders -> Green (Current Price)
                // Institutions -> Blue (Average Target)
                // Public -> Grey (Range/Background)
                backgroundColor: ['#22ab94', '#2962FF', '#CFD8DC'],
                borderColor: this.isDark ? '#2C2C2C' : '#ffffff',
                borderWidth: 1
            }]
        };
    },
    
    // Calculated computed for meter instead
    getSentimentStyles() {
        if (!this.insiderTransactions.length) return { buy: 50, sell: 50 };
        
        let buys = 0;
        let sells = 0;
        
        this.insiderTransactions.forEach(tx => {
            if (tx.buySell === 'buy') buys++;
            if (tx.buySell === 'sell') sells++;
        });
        
        const total = buys + sells;
        if (total === 0) return { buy: 50, sell: 50 };
        
        return {
            buy: (buys / total) * 100,
            sell: (sells / total) * 100
        };
    },

    formatDate(dateObj) {
        if (!dateObj) return 'N/A';
        if (typeof dateObj === 'string') return dateObj;
        if (dateObj.fmt) return dateObj.fmt;
        return 'N/A';
    }
  }
}
</script>

<style scoped>
.holdings-analysis {
    /* padding: 1rem; Removed */
    /* background: var(--bg-primary); Removed */
    /* border-radius: 8px; Removed */
    background: transparent;
}

.holdings-grid {
    display: flex; 
    flex-wrap: wrap;
    gap: 1.5rem;
}

.card {
    background: var(--bg-card);
    padding: 1.5rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}

.full-width {
    grid-column: 1 / -1;
}

/* Make cards flex to fill space if row has gap */
.ownership-card { flex: 1; min-width: 300px; }
.sentiment-card { flex: 2; min-width: 300px; } 

h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.5rem;
}

.chart-container {
    height: 200px;
    position: relative;
    margin-bottom: 1rem;
}

.stats-row {
    display: flex;
    justify-content: space-around;
    margin-top: 1rem;
}

.stat {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat .label { font-size: 0.8rem; color: var(--text-muted); }
.stat .value { font-size: 1.2rem; font-weight: bold; color: var(--text-primary); }

/* Sentiment Meter Dual */
.sentiment-meter {
    margin-bottom: 1.5rem;
}

.meter-bar-dual {
    height: 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    margin-bottom: 0.5rem;
}

.segment {
    height: 100%;
    transition: width 0.5s ease;
}

.segment.sell { background: var(--error-color); }
.segment.buy { background: var(--success-color); }

.meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 600;
}

.label-sell { color: var(--error-color); }
.label-buy { color: var(--success-color); }
.label-sentiment { color: var(--text-secondary); font-weight: 700; }

/* Transactions List */
.transaction-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
}

.transaction-list li {
    display: flex;
    align-items: center; 
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.85rem;
}

.transaction-list li.buy .type { color: var(--success-color); font-weight: 600; }
.transaction-list li.sell .type { color: var(--error-color); font-weight: 600; }
.transaction-list li.neutral .type { color: var(--text-muted); }

.date { 
    color: var(--text-muted); 
    width: 85px; 
    flex-shrink: 0;
}

.name { 
    flex: 1; 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    padding-right: 15px;
    font-weight: 500;
    color: var(--text-primary);
}

.type {
    width: 120px;
    text-align: right;
    padding-right: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
}

.shares { 
    width: 80px; 
    text-align: right; 
    font-family: 'Roboto Mono', monospace;
    font-weight: 500;
    color: var(--text-primary);
    flex-shrink: 0;
}

/* Table */
.table-responsive {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

th {
    text-align: left;
    padding: 0.75rem;
    background: transparent; /* Removed gray header */
    color: var(--text-secondary);
    font-weight: 600;
    border-bottom: 2px solid var(--border-color); /* Added stronger border for separation */
}

td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
}


</style>
