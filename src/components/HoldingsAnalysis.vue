<template>
  <div class="holdings-analysis">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading holdings data...</p>
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

ChartJS.register(ArcElement, Tooltip, Legend)

export default {
  name: 'HoldingsAnalysis',
  components: { Doughnut },
  props: {
    symbol: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      holders: {},
      insiderTransactions: [],
      ownershipChartData: null,
      ownershipChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' }
        }
      }
    }
  },
  computed: {
      recentInsiders() {
          return this.insiderTransactions.slice(0, 5);
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
            
            // Fix insider transaction buy/sell class
            this.insiderTransactions.forEach(tx => {
                const text = tx.transactionText || '';
                if (text.toLowerCase().includes('purchase')) tx.buySell = 'buy';
                else if (text.toLowerCase().includes('sale')) tx.buySell = 'sell';
                else tx.buySell = 'neutral';
            });

            this.processOwnershipChart();
            
        } catch (err) {
            console.error('Holdings load error:', err);
            this.error = 'Failed to load holdings data';
        } finally {
            this.loading = false;
        }
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
                backgroundColor: ['#fd7e14', '#0d6efd', '#adb5bd'],
                borderWidth: 0
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
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
}

.holdings-grid {
    display: flex; /* Changed from grid to flex for filling space */
    flex-wrap: wrap;
    gap: 1.5rem;
}

.card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.full-width {
    grid-column: 1 / -1;
}

/* Make cards flex to fill space if row has gap */
.ownership-card { flex: 1; min-width: 300px; }
.sentiment-card { flex: 2; min-width: 300px; } /* Give sentiment more weight */

h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #495057;
    border-bottom: 2px solid #e9ecef;
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

.stat .label { font-size: 0.8rem; color: #6c757d; }
.stat .value { font-size: 1.2rem; font-weight: bold; color: #212529; }

/* Sentiment Meter Dual */
.sentiment-meter {
    margin-bottom: 1.5rem;
}

.meter-bar-dual {
    height: 12px;
    background: #e9ecef;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    margin-bottom: 0.5rem;
}

.segment {
    height: 100%;
    transition: width 0.5s ease;
}

.segment.sell { background: #dc3545; }
.segment.buy { background: #28a745; }

.meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: 600;
}

.label-sell { color: #dc3545; }
.label-buy { color: #28a745; }
.label-sentiment { color: #495057; font-weight: 700; }

/* Transactions List */
.transaction-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
}

.transaction-list li {
    display: flex;
    align-items: center; /* Align vertical center */
    padding: 0.6rem 0;
    border-bottom: 1px solid #f1f3f5;
    font-size: 0.85rem;
}

.transaction-list li.buy .type { color: #28a745; font-weight: 600; }
.transaction-list li.sell .type { color: #dc3545; font-weight: 600; }
.transaction-list li.neutral .type { color: #6c757d; }

.date { 
    color: #adb5bd; 
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
    color: #343a40;
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
    color: #495057;
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
    background: #f8f9fa;
    color: #495057;
    font-weight: 600;
}

td {
    padding: 0.75rem;
    border-bottom: 1px solid #dee2e6;
    color: #212529;
}

.loading-state, .error-state {
    text-align: center;
    padding: 2rem;
}

.spinner {
    width: 40px; 
    height: 40px; 
    border: 4px solid #f3f3f3; 
    border-top: 4px solid #007bff; 
    border-radius: 50%; 
    animation: spin 1s linear infinite; 
    margin: 0 auto 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
