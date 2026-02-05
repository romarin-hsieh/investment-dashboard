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
      <!-- Row 1 Left: Stock Structure (1/3) -->
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
      
      <!-- Row 1 Right: Smart Money Trend (2/3) -->
      <div class="card smart-money-card">
          <h3>Smart Money Trend</h3>
          <div class="smart-money-content" v-if="smartMoneyChartData">
              <!-- Right: Trend Chart (Full Width) -->
              <div class="trend-chart-container">
                  <Bar :data="smartMoneyChartData" :options="smartMoneyChartOptions" />
              </div>
          </div>
          <div v-else class="no-data">
              Loading Smart Money Data...
          </div>
      </div>

      <!-- Row 2: Smart Money Volume Profile (Full) -->
      <SmartMoneyVolumeProfile 
        class="card full-width"
        :symbol="symbol" 
        :dataroma-data="dataromaData" 
      />

      <!-- Row 2: Insider Sentiment (Full) -->
      <div class="card sentiment-card full-width">
        <h3>Insider Sentiment (6M)</h3>
        <div class="sentiment-container">
            <!-- Left: Meter -->
             <div class="sentiment-meter-section">
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
             </div>
             
             <!-- Right: Transactions -->
            <div class="recent-transactions">
                <h4>Recent Transactions</h4>
                <div class="transaction-header">
                    <span class="date">Date Reported</span>
                    <span class="name">Holder</span>
                    <span class="relationship">Relationship</span>
                    <span class="type">Transaction</span>
                    <span class="shares">Shares</span>
                    <span class="value">Value</span>
                </div>
                <ul class="transaction-list">
                    <li v-for="(tx, idx) in recentInsiders" :key="idx" :class="tx.buySell">
                        <span class="date">{{ formatDate(tx.startDate) }}</span>
                        <span class="name" :title="tx.filerName">{{ tx.filerName }}</span>
                        <span class="relationship" :title="tx.relationship">{{ tx.relationship || '-' }}</span>
                        <span class="type">{{ tx.transactionText }}</span>
                        <span class="shares">{{ tx.shares ? tx.shares.fmt : 'N/A' }}</span>
                        <span class="value">{{ tx.value ? tx.value.fmt : 'N/A' }}</span>
                    </li>
                </ul>
            </div>
        </div>
      </div>

      <!-- Row 3: Top Institutions (Full) -->
      <div class="card institutions-card full-width">
        <h3>Top Institutional Holders</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Date Reported</th>
                        <th>Holder</th>
                        <th>% Out</th>
                        <th>Shares</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inst, idx) in holders.topInstitutions.slice(0, 10)" :key="idx">
                        <td>{{ inst.reportDate ? inst.reportDate.fmt : 'N/A' }}</td>
                        <td>{{ inst.organization }}</td>
                        <td>{{ inst.pctHeld ? inst.pctHeld.fmt : 'N/A' }}</td>
                        <td>{{ inst.position ? inst.position.fmt : 'N/A' }}</td>
                        <td>{{ inst.value ? ('$' + inst.value.fmt) : 'N/A' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Doughnut, Bar, Line } from 'vue-chartjs'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi.js'
import { useTheme } from '@/composables/useTheme.js'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

import WidgetSkeleton from '@/components/WidgetSkeleton.vue'
import SmartMoneyVolumeProfile from '@/components/SmartMoneyVolumeProfile.vue'

export default {
  name: 'HoldingsAnalysis',
  components: { Doughnut, Bar, Line, WidgetSkeleton, SmartMoneyVolumeProfile },
  props: {
    symbol: {
      type: String,
      required: true
    },
    dataromaData: {
      type: Object,
      default: null
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
      smartMoneyChartData: null,
      calculatedSmartMoneyScore: 0,
      smartMoneyTrendScore: 0,
    }
  },
  computed: {
      recentInsiders() {
          return this.insiderTransactions.slice(0, 10); // Show more transactions
      },
      // ... (existing computed)
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
          
          // Use weighted score by value if available, otherwise count
          // Simple count for now to match UI
          this.insiderTransactions.forEach(tx => {
              if (tx.buySell === 'buy') buys++;
              if (tx.buySell === 'sell') sells++;
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
          if (this.sentimentScore < 40) return '#dc3545';
          return '#ffc107';
      },
      smartMoneyScoreDetails() {
         const score = this.calculatedSmartMoneyScore;
         let text = 'Neutral';
         let color = '#ffc107'; // Yellow
         
         if (score >= 75) {
             text = 'Strong Accumulation (Safe Buy)';
             color = '#28a745'; // Green
         } else if (score < 50) {
             text = 'Weak / Distribution (Caution)';
             color = '#dc3545'; // Red
         } else {
             text = 'Stable / Neutral';
         }
         
         return { score, text, color };
      },
      smartMoneyChartOptions() {
          return {
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                  mode: 'index',
                  intersect: false,
              },
              scales: {
                  y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: { display: true, text: 'Shares Held', color: this.isDark?'#aaa':'#666' },
                      grid: { color: this.isDark?'#333':'#eee' },
                      ticks: { color: this.isDark?'#aaa':'#666' }
                  },
                  y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: { display: true, text: 'Stock Price', color: this.isDark?'#aaa':'#666' },
                      grid: { drawOnChartArea: false }, // only want the grid lines for one axis
                      ticks: { color: this.isDark?'#aaa':'#666', callback: (val) => '$' + val }
                  }
              },
              plugins: {
                  legend: { 
                      position: 'bottom',
                      labels: { padding: 20, color: this.isDark ? '#E6E1DC' : '#666' } 
                  },
                  tooltip: { mode: 'index', intersect: false }
              }
          };
      }
  },
  watch: {
    symbol: {
      handler: 'loadData',
      immediate: true
    },
    dataromaData: {
        handler: 'processDataromaData',
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
            // Native YF transactions
            const yfTransactions = data.insiderTransactions || [];
            
            // If Dataroma data is already available, use it, otherwise fallback to YF
            if (this.dataromaData && this.dataromaData.insiders && this.dataromaData.insiders.transactions) {
                this.processDataromaData();
            } else {
                this.insiderTransactions = yfTransactions;
                this.processTransactions();
            }
            
            this.processOwnershipChart();
            
        } catch (err) {
            console.warn('Live API load error, trying precomputed fallback:', err);
            // ... (keep fallback logic or simplify)
            // Simplified fallback for brevity in this method override
             try {
                const precomputed = await precomputedIndicatorsAPI.getTechnicalIndicators(this.symbol);
                if (precomputed && precomputed.fundamentals) {
                    const data = precomputed.fundamentals;
                    this.holders = data.holders || {}; 
                    const yfTransactions = data.insiderTransactions || [];
                    
                     if (this.dataromaData && this.dataromaData.insiders) {
                        this.processDataromaData();
                    } else {
                        this.insiderTransactions = yfTransactions;
                        this.processTransactions();
                    }

                    this.processOwnershipChart();
                    this.error = null;
                }
            } catch (fbErr) {
                 this.error = 'Failed to load holdings data';
            }
        } finally {
            this.loading = false;
        }
    },
    
    processDataromaData() {
        if (!this.dataromaData || !this.dataromaData.insiders || !this.dataromaData.insiders.transactions) return;
        
        console.log('Use Dataroma Insider Data');
        const transactions = this.dataromaData.insiders.transactions.map(tx => {
            const isBuy = tx.transaction_type === 'Purchase';
            const isSell = tx.transaction_type === 'Sale';
            
            return {
                startDate: tx.transaction_date, // "09 Oct 2025" or "2025-10-09"
                filerName: tx.reporter,
                relationship: tx.relationship || tx.filerRelation || '',
                transactionText: `${tx.transaction_type} at $${tx.price}`,
                shares: { fmt: new Intl.NumberFormat('en-US').format(tx.shares) },
                buySell: isBuy ? 'buy' : (isSell ? 'sell' : 'neutral'),
                value: { fmt: '$' + new Intl.NumberFormat('en-US').format(tx.value) }
            };
        });
        
        this.insiderTransactions = transactions;
        
        // Process Smart Money Data if superinvestors exist
        if (this.dataromaData.superinvestors) {
            this.processSmartMoneyData();
        }
    },
    
    processSmartMoneyData() {
        const historyMap = {};
        // Aggregate superinvestor history
        this.dataromaData.superinvestors.forEach(investor => {
            if (investor.history) {
                investor.history.forEach(rec => {
                    if (!historyMap[rec.period]) {
                         historyMap[rec.period] = { shares: 0, priceSum: 0, priceCount: 0, period: rec.period };
                    }
                    historyMap[rec.period].shares += (rec.shares || 0);
                    if (rec.reported_price) {
                         // Simple clean of '$' if present
                         const p = parseFloat(String(rec.reported_price).replace('$','').replace(',',''));
                         if (!isNaN(p)) {
                             historyMap[rec.period].priceSum += p;
                             historyMap[rec.period].priceCount++;
                         }
                    }
                });
            }
        });
        
        // Convert to array and sort (Oldest to Newest)
        // Periods format: "2024 Q3", "2023 Q4" etc. Needs parsing to sort.
        const sortedHistory = Object.values(historyMap).sort((a, b) => {
            const [yA, qA] = a.period.split(' Q');
            const [yB, qB] = b.period.split(' Q');
            return (parseInt(yA) - parseInt(yB)) || (parseInt(qA) - parseInt(qB));
        });
        
        // Prepare Chart Data
        const labels = sortedHistory.map(h => h.period);
        const sharesData = sortedHistory.map(h => h.shares);
        const priceData = sortedHistory.map(h => h.priceCount ? (h.priceSum / h.priceCount).toFixed(2) : null);
        
        this.smartMoneyChartData = {
            labels,
            datasets: [
                {
                    label: 'Smart Money Shares',
                    type: 'bar',
                    data: sharesData,
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: '#28a745',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Reported Price',
                    type: 'line',
                    data: priceData,
                    borderColor: '#007bff',
                    backgroundColor: '#007bff',
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        };
        
        // Calculate Trend Score (Weight 30%)
        // Compare last quarter to previous quarter shares
        if (sharesData.length >= 2) {
            const current = sharesData[sharesData.length - 1];
            const prev = sharesData[sharesData.length - 2];
            if (prev > 0) {
                const change = (current - prev) / prev;
                if (change > 0.05) this.smartMoneyTrendScore = 100;
                else if (change >= 0) this.smartMoneyTrendScore = 75;
                else if (change > -0.05) this.smartMoneyTrendScore = 40;
                else this.smartMoneyTrendScore = 0;
            } else {
                this.smartMoneyTrendScore = 50; // New position?
            }
        } else {
            this.smartMoneyTrendScore = 50; // Not enough data
        }
        
        this.calculateSmartMoneyScore();
    },
    
    calculateSmartMoneyScore() {
        // A: Institutions (30%)
        const instPct = parseFloat(this.holders.institutionsPercent) || 0;
        const scoreA = Math.min(100, (instPct / 80) * 100);
        
        // B: Super Investor Trend (30%) -> this.smartMoneyTrendScore
        const scoreB = this.smartMoneyTrendScore;
        
        // C: Insider Sentiment (20%)
        const scoreC = this.sentimentScore; // 0-100
        
        // D: Insider Ownership (20%)
        const insiderPct = parseFloat(this.holders.insidersPercent) || 0;
        const scoreD = Math.min(100, (insiderPct / 20) * 100);
        
        this.calculatedSmartMoneyScore = Math.round(
            (scoreA * 0.3) + (scoreB * 0.3) + (scoreC * 0.2) + (scoreD * 0.2)
        );
    },


    
    processTransactions() {
         // Fix insider transaction buy/sell class
        this.insiderTransactions.forEach(tx => {
            const text = tx.transactionText || '';
            if (text.toLowerCase().includes('purchase')) tx.buySell = 'buy';
            else if (text.toLowerCase().includes('sale')) tx.buySell = 'sell';
            else tx.buySell = 'neutral';
            
            // Generate value fmt if missing or add $ prefix
            if (tx.value && tx.value.fmt && !tx.value.fmt.startsWith('$')) {
                tx.value.fmt = '$' + tx.value.fmt;
            } else if (tx.value && !tx.value.fmt) {
                tx.value = { fmt: '$' + new Intl.NumberFormat('en-US').format(tx.value) };
            }
            
            // Ensure relationship exists
             if (!tx.relationship) {
                tx.relationship = tx.filerRelation || '';
             }
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
                // Renaissance Theme Palette (coordinated with site design):
                // Insiders -> Warm Taupe (Secondary Color)
                // Institutions -> Florentine Blue (Primary Color) 
                // Public -> Soft Stone Grey (Background Secondary)
                backgroundColor: this.isDark 
                    ? ['#B5A89A', '#8A9A9C', '#4D4D4D']  // Dark mode
                    : ['#A09080', '#6B7F82', '#D6D2CE'], // Light mode
                hoverBackgroundColor: this.isDark
                    ? ['#C9BFB1', '#9DAEB0', '#5D5D5D']
                    : ['#8A7A6A', '#5A6B6E', '#C4BEB8'],
                borderColor: this.isDark ? '#2C2C2C' : '#FFFFFF',
                borderWidth: 2,
                hoverOffset: 8,
                borderRadius: 4
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
        const raw = (typeof dateObj === 'string') ? dateObj : (dateObj.raw || dateObj.fmt || dateObj);
        
        // Try parsing
        const d = new Date(raw);
        if (isNaN(d.getTime())) {
            // Check if it's already a formatted string like "09 Oct 2025" -> Try to parse manually if needed, or return as is if looks ok
            // For now, return raw if parse fails
            return raw;
        }
        return this.formatDateYYYYMMDD(d);
    },
    
    formatDateYYYYMMDD(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
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
    width: 100%;
    flex-basis: 100%;
}

/* Make cards flex to fill space if row has gap */
.ownership-card { flex: 1; min-width: 300px; }
.smart-money-card { flex: 2; min-width: 500px; } /* 2/3 width */
.sentiment-card { width: 100%; flex-basis: 100%; display: flex; flex-direction: column; }

h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
}

.chart-container {
    height: 200px;
    position: relative;
}

/* Stock Structure Stats */
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
.stat .value { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }

/* Smart Money Strength */
.smart-money-content {
    display: flex;
    align-items: center;
    gap: 0;
    height: 280px; /* Increased height */
    width: 100%;
}

.trend-chart-container {
    flex: 1;
    height: 100%;
    width: 100%;
    position: relative;
}

/* Sentiment (Full Width Layout) */
.sentiment-container {
    display: flex;
    gap: 1.5rem;
    flex-direction: column; /* Vertical split */
    align-items: stretch;
}

.sentiment-meter-section {
    width: 100%;
    padding-top: 0;
}

.sentiment-meter {
    margin-bottom: 0; /* Adjust for side-by-side */
}

.meter-bar-dual {
    height: 12px;
    background: var(--bg-surface-tone);
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    margin-bottom: 0.5rem;
}

.meter-bar-dual .segment { height: 100%; }
.meter-bar-dual .segment.buy { background: #28a745; margin-left: auto; }
.meter-bar-dual .segment.sell { background: #dc3545; margin-right: auto; }

.meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-muted);
}

.recent-transactions {
    flex: 2; /* Take more space */
}

.no-data {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
}

.label-buy { color: var(--success-color); }
.label-sentiment { color: var(--text-secondary); font-weight: 700; }

/* Transactions List */
.transaction-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 0; /* Match TH padding slightly better */
    border-bottom: 1px solid var(--border-color);
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 0;
}

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
    border-bottom: 1px solid var(--border-color-soft); /* Softer border */
    font-size: 0.85rem;
}

.transaction-list li:last-child {
    border-bottom: none;
}

.transaction-list li.buy .type { color: var(--success-color); font-weight: 500; }
.transaction-list li.sell .type { color: var(--error-color); font-weight: 500; }
.transaction-list li.neutral .type { color: var(--text-muted); }

.date { 
    color: var(--text-muted); 
    width: 90px; 
    flex-shrink: 0;
    margin-right: 1.5rem; /* Add spacing between Date and Holder */
}

.name { 
    flex: 1; /* Allow name to expand */
    min-width: 140px;
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    padding-right: 15px;
    font-weight: 500;
    color: var(--text-primary);
}

.relationship {
    width: 190px; /* Increased to allow more text visibility ("Move left" logic) */
    flex-shrink: 0;
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    padding-right: 15px;
    color: var(--text-secondary);
}

.type {
    width: 150px; /* Increased to show full transaction text */
    text-align: center;
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

.value {
    width: 90px;
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
    background: transparent; 
    color: var(--text-muted);
    font-weight: 500;
    border-bottom: 1px solid var(--border-color); 
}

td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color-soft);
    color: var(--text-secondary);
}

td:nth-child(2) {
    color: var(--text-primary);
    font-weight: 500;
}

/* Align right for % Out, Shares, Value (Columns 3, 4, 5) */
th:nth-child(3), td:nth-child(3),
th:nth-child(4), td:nth-child(4),
th:nth-child(5), td:nth-child(5) {
    text-align: right;
}

tr:last-child td {
    border-bottom: none;
}



</style>
