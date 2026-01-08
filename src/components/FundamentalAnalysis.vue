<template>
  <div class="fundamental-analysis">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading fundamental analysis...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadData">Retry</button>
    </div>

    <div v-else class="analysis-grid">
      <!-- Analyst Consensus -->
      <div class="card analyst-card">
        <h3>Analyst Consensus</h3>
        <div class="consensus-summary">
          <div class="recommendation-key" :class="getRecommendationClass(metrics.recommendationKey)">
            {{ formatRecommendation(metrics.recommendationKey) }}
          </div>
          <div class="target-price">
            <span class="label">Target Price</span>
            <span class="value">{{ formatCurrency(metrics.targetPrice) }}</span>
          </div>
        </div>
        <div class="chart-container">
          <Bar v-if="recommendationChartData" :data="recommendationChartData" :options="recommendationChartOptions" />
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="card metrics-card">
        <h3>Key Metrics</h3>
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="label">Revenue Growth (YoY)</span>
            <span class="value" :class="getGrowthClass(metrics.revenueGrowth)">{{ metrics.revenueGrowth || 'N/A' }}</span>
          </div>
          <div class="metric-item">
            <span class="label">Profit Margin</span>
            <span class="value">{{ metrics.profitMargin || 'N/A' }}</span>
          </div>
          <div class="metric-item">
            <span class="label">Forward P/E</span>
            <span class="value">{{ metrics.forwardPE || 'N/A' }}</span>
          </div>
          <div class="metric-item">
            <span class="label">Beta</span>
            <span class="value">{{ metrics.beta || 'N/A' }}</span>
          </div>
           <div class="metric-item">
            <span class="label">Total Revenue</span>
            <span class="value">{{ metrics.totalRevenue || 'N/A' }}</span>
          </div>
           <div class="metric-item">
            <span class="label">EBITDA</span>
            <span class="value">{{ metrics.ebitda || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- Earnings Trend -->
      <div class="card earnings-card full-width">
        <h3>Earnings & Revenue History</h3>
        <div class="chart-container large">
             <Bar v-if="earningsChartData" :data="earningsChartData" :options="earningsChartOptions" />
        </div>
      </div>

      <!-- Analyst Rating History -->
      <div style="background: #ffeeba; padding: 10px; margin-bottom: 10px; color: #856404; border: 1px solid #bee5eb;">
          DEBUG: Upgrades Loaded: {{ upgradesDowngrades ? upgradesDowngrades.length : 'undefined' }}
      </div>
      <div class="card history-card full-width" v-if="upgradesDowngrades && upgradesDowngrades.length > 0">
        <h3>Analyst Rating History (Last 12 Months)</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Firm</th>
                        <th>Action</th>
                        <th>From</th>
                        <th>To</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in upgradesDowngrades" :key="index">
                        <td>{{ formatDate(item.epochGradeDate) }}</td>
                        <td>{{ item.firm }}</td>
                        <td>{{ item.action }}</td>
                        <td>{{ item.fromGrade }}</td>
                        <td><strong>{{ item.toGrade }}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController } from 'chart.js'
import { Bar } from 'vue-chartjs'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController)

export default {
  name: 'FundamentalAnalysis',
  components: { Bar },
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
      metrics: {},
      upgradesDowngrades: [],
      recommendationChartData: null,
      earningsChartData: null,
      recommendationChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      },
      earningsChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'EPS' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Revenue' },
                grid: { drawOnChartArea: false }
            }
        }
      }
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
            if (!data || !data.financials) {
                throw new Error('Data incomplete');
            }
            
            this.metrics = data.financials;
            this.processRecommendationTrend(data.recommendationTrend);
            this.processEarningsHistory(data.earnings);
            this.upgradesDowngrades = data.upgradesDowngrades || [];
            
        } catch (err) {
            console.warn('Live API load error, trying precomputed fallback:', err);
            
            // Fallback to precomputed data
            try {
                const precomputed = await precomputedIndicatorsAPI.getTechnicalIndicators(this.symbol);
                if (precomputed && precomputed.fundamentals) {
                    console.log('Using precomputed fundamentals for', this.symbol);
                    const data = precomputed.fundamentals;
                    this.metrics = data.financials || {};
                    this.processRecommendationTrend(data.recommendationTrend);
                    this.processEarningsHistory(data.earnings);
                    this.upgradesDowngrades = data.upgradesDowngrades || [];
                    this.error = null; // Clear error if fallback succeeds
                } else {
                    throw new Error('No precomputed fundamentals available');
                }
            } catch (fallbackErr) {
                console.error('Fallback failed:', fallbackErr);
                this.error = 'Failed to load fundamental data';
            }
        } finally {
            this.loading = false;
        }
    },
    
    processRecommendationTrend(trend) {
        if (!trend || trend.length === 0) {
            this.recommendationChartData = null;
            return;
        }
        
        // Take latest 12 months (or as many as available) as requested
        const recent = trend.slice(0, 12).reverse();
        const labels = recent.map(t => t.period);
        
        this.recommendationChartData = {
            labels,
            datasets: [
                { label: 'Strong Buy', data: recent.map(r => r.strongBuy), backgroundColor: '#1d892d' }, // Dark Green
                { label: 'Buy', data: recent.map(r => r.buy), backgroundColor: '#28a745' }, // Green
                { label: 'Hold', data: recent.map(r => r.hold), backgroundColor: '#ffc107' }, // Yellow
                { label: 'Sell', data: recent.map(r => r.sell), backgroundColor: '#dc3545' }, // Red
                { label: 'Strong Sell', data: recent.map(r => r.strongSell), backgroundColor: '#8b0000' } // Dark Red
            ]
        };
    },
    
    processEarningsHistory(earnings) {
        if (!earnings || !earnings.financialsChart) {
             this.earningsChartData = null;
             return;
        }
        
        // Handle both array (legacy?) and object structure (yearly/quarterly)
        let history = [];
        if (Array.isArray(earnings.financialsChart)) {
            history = earnings.financialsChart;
        } else if (earnings.financialsChart.yearly) {
            history = earnings.financialsChart.yearly;
        }

        if (history.length === 0) {
            this.earningsChartData = null;
            return;
        }
        
        const labels = history.map(item => item.date); // Year string usually
        
        this.earningsChartData = {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Revenue',
                    // Support both object with .raw (legacy/live API) and direct number (new static data)
                    data: history.map(item => item.revenue?.raw !== undefined ? item.revenue.raw : item.revenue),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    yAxisID: 'y1'
                },
                {
                    type: 'line',
                    label: 'Earnings',
                    data: history.map(item => item.earnings?.raw !== undefined ? item.earnings.raw : item.earnings),
                    borderColor: '#28a745',
                    backgroundColor: '#28a745',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                }
            ]
        };
    },
    
    formatCurrency(val) {
        if (!val) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    },
    
    formatRecommendation(key) {
        return key ? key.replace(/_/g, ' ').toUpperCase() : 'N/A';
    },
    
    getRecommendationClass(key) {
        if (!key) return '';
        const k = key.toLowerCase();
        if (k.includes('buy')) return 'text-success';
        if (k.includes('sell')) return 'text-danger';
        return 'text-warning';
    },

    getGrowthClass(val) {
        if (!val) return '';
        return val.includes('-') ? 'text-danger' : 'text-success';
    },

    formatDate(epoch) {
        if (!epoch) return '-';
        // Check if it's already a date string or object
        if (typeof epoch === 'string' && epoch.includes('T')) {
           return new Date(epoch).toLocaleDateString();
        }
        // Assume unix timestamp (seconds) if number
        return new Date(epoch * 1000).toLocaleDateString();
    }
  }
}
</script>

<style scoped>
.fundamental-analysis {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
}

.analysis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #495057;
    border-bottom: 2px solid #e9ecef;
    padding-bottom: 0.5rem;
}

.consensus-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.recommendation-key {
    font-size: 1.2rem;
    font-weight: 800;
}

.metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.metric-item {
    display: flex;
    flex-direction: column;
}

.metric-item .label {
    font-size: 0.8rem;
    color: #6c757d;
}

.metric-item .value {
    font-size: 1.1rem;
    font-weight: 600;
}

.chart-container {
    height: 250px;
    position: relative;
}

.chart-container.large {
    height: 350px;
}

.text-success { color: #28a745; }
.text-danger { color: #dc3545; }
.text-warning { color: #ffc107; }

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

.table-container {
    overflow-x: auto;
    max-height: 400px;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}

th {
    background: #f8f9fa;
    font-weight: 600;
    position: sticky;
    top: 0;
}

tbody tr:hover {
    background: #f1f3f5;
}
</style>
