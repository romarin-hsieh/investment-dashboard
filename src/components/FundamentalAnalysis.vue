<template>
  <div class="fundamental-analysis">
    <div v-if="loading" class="text-center p-3">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">
        {{ error }}
    </div>

    <div v-else>
        <!-- Analyst Insights Section -->
        <h5 class="section-title">Deep Research</h5>
        
        <div class="analyst-grid">
            <!-- 1. Analyst Price Targets -->
            <div class="section-card">
                <h6 class="metric-label">Analyst Price Targets</h6>
                <div class="price-target-visual" v-if="priceTargets">
                    <!-- Track -->
                    <div class="range-track"></div>
                    <!-- Fill (Low to High) -->
                    <div class="range-fill" 
                         :style="{ 
                            left: getPricePosition(priceTargets.low), 
                            right: (100 - parseFloat(getPricePosition(priceTargets.high))) + '%' 
                         }">
                    </div>
                    
                    <!-- Markers -->
                    <div class="marker low" :style="{ left: getPricePosition(priceTargets.low) }">
                        <span class="label bottom">{{ formatCurrency(priceTargets.low) }}<br>Low</span>
                    </div>
                    
                    <div class="marker high" :style="{ left: getPricePosition(priceTargets.high) }">
                        <span class="label bottom">{{ formatCurrency(priceTargets.high) }}<br>High</span>
                    </div>
                    
                    <div class="marker avg" :style="{ left: getPricePosition(priceTargets.mean) }">
                        <span class="label top">{{ formatCurrency(priceTargets.mean) }}<br>Average</span>
                    </div>
                    
                    <div class="marker current" :style="{ left: getPricePosition(priceTargets.current) }">
                         <span class="label top" style="top: -45px; font-weight: bold; color: #28a745;">
                            {{ formatCurrency(priceTargets.current) }}<br>Current
                         </span>
                    </div>
                </div>
                <div v-else class="text-center text-muted py-5">
                    No Price Target Data Available
                </div>
            </div>

            <!-- 2. Analyst Recommendations (Stacked Bar) -->
            <div class="section-card">
                <h6 class="metric-label">Analyst Recommendations</h6>
                <div v-if="recommendationTrend && recommendationTrend.length > 0" class="mt-3">
                    <div v-for="period in recommendationTrend" :key="period.period" class="rec-row">
                        <div class="rec-label">{{ getPeriodLabel(period.period) }}</div>
                        <div class="rec-bar">
                            <div v-if="period.strongBuy" class="rec-segment bg-strong-buy" :style="{ width: getVotePct(period, 'strongBuy') }">
                                {{ period.strongBuy }}
                            </div>
                            <div v-if="period.buy" class="rec-segment bg-buy" :style="{ width: getVotePct(period, 'buy') }">
                                {{ period.buy }}
                            </div>
                            <div v-if="period.hold" class="rec-segment bg-hold" :style="{ width: getVotePct(period, 'hold') }">
                                {{ period.hold }}
                            </div>
                            <div v-if="period.sell" class="rec-segment bg-sell" :style="{ width: getVotePct(period, 'sell') }">
                                {{ period.sell }}
                            </div>
                            <div v-if="period.strongSell" class="rec-segment bg-strong-sell" :style="{ width: getVotePct(period, 'strongSell') }">
                                {{ period.strongSell }}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Legend -->
                    <div class="legend-row">
                        <div class="legend-item"><div class="dot bg-strong-buy"></div> Strong Buy</div>
                        <div class="legend-item"><div class="dot bg-buy"></div> Buy</div>
                        <div class="legend-item"><div class="dot bg-hold"></div> Hold</div>
                        <div class="legend-item"><div class="dot bg-sell"></div> Sell</div>
                        <div class="legend-item"><div class="dot bg-strong-sell"></div> Strong Sell</div>
                    </div>
                </div>
                <div v-else class="text-center text-muted py-5">
                    No Recommendation Data Available
                </div>
            </div>

            <!-- 3. Key Metrics (Preserved) -->
            <div class="section-card">
                <h6 class="metric-label">Key Metrics</h6>
                <div class="metrics-grid mt-3">
                     <div>
                        <div class="metric-label">Revenue Growth (YoY)</div>
                        <div class="metric-value" :class="getGrowthClass(metrics.revenueGrowth)">
                            {{ metrics.revenueGrowth || 'N/A' }}
                        </div>
                     </div>
                     <div>
                        <div class="metric-label">Profit Margin</div>
                        <div class="metric-value" :class="getGrowthClass(metrics.profitMargins)">
                             {{ metrics.profitMargins || 'N/A' }}
                        </div>
                     </div>
                     <div>
                        <div class="metric-label">Forward P/E</div>
                        <div class="metric-value">
                             {{ metrics.forwardPE ? parseFloat(metrics.forwardPE).toFixed(2) : 'N/A' }}
                        </div>
                     </div>
                     <div>
                        <div class="metric-label">Beta</div>
                        <div class="metric-value">
                            {{ metrics.beta || 'N/A' }}
                        </div>
                     </div>
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

      <div class="card history-card full-width" v-if="upgradesDowngrades && upgradesDowngrades.length > 0">
        <h3>Analyst Rating History (Last 5 Years)</h3>
        
        <!-- Price Target Trend Chart -->
        <div class="chart-container large" v-if="targetPriceChartData" style="margin-bottom: 20px;">
             <Line :data="targetPriceChartData" :options="targetPriceChartOptions" />
        </div>

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
import { Bar, Line } from 'vue-chartjs'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController)

export default {
  name: 'FundamentalAnalysis',
  components: { Bar, Line },
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
      recommendationTrend: [], // Initialize recommendationTrend
      priceTargets: null, // Initialize priceTargets
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
      },
      targetPriceChartData: null,
      targetPriceChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Price Target Values' }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'Price ($)' }
          }
        }
      }
    };
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
        
        // Map Price Targets
        if (this.metrics && this.metrics.targetMeanPrice) {
            this.priceTargets = {
                low: this.metrics.targetLowPrice,
                high: this.metrics.targetHighPrice,
                mean: this.metrics.targetMeanPrice,
                current: this.metrics.currentPrice
            };
        } else {
            this.priceTargets = null;
        }

        this.processRecommendationTrend(data.recommendationTrend);
        this.processEarningsHistory(data.earnings);
            
            // Handle varying API structures
            const history = data.upgradeDowngradeHistory?.history || data.upgradesDowngrades || [];
            this.processUpgradesDowngrades(history);
            
        } catch (err) {
            console.warn('Live API load error, trying precomputed fallback:', err);
            
            // Fallback to precomputed data
            try {
                const precomputed = await precomputedIndicatorsAPI.getTechnicalIndicators(this.symbol);
                if (precomputed && precomputed.fundamentals) {
                    console.log('Using precomputed fundamentals for', this.symbol);
                    const data = precomputed.fundamentals;
                    // Fix mapping: financialData holds the metrics in raw JSON
                    const rawMetrics = data.financialData || {};
                    const rawStats = data.defaultKeyStatistics || {};
                    
                    this.metrics = {
                        ...rawMetrics,
                        ...rawStats,
                        // specific overrides if needed
                        profitMargins: this.formatPercent(rawMetrics.profitMargins || rawStats.profitMargins),
                        revenueGrowth: this.formatPercent(rawMetrics.revenueGrowth),
                        beta: rawStats.beta,
                        forwardPE: rawStats.forwardPE
                    };
                    this.processRecommendationTrend(data.recommendationTrend);
                    this.processEarningsHistory(data.earnings);
                    
                    const history = data.upgradeDowngradeHistory?.history || [];
                    this.processUpgradesDowngrades(history);
                    
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
            this.recommendationTrend = [];
            return;
        }
        
        // Take latest 3-4 months for the stacked bar visual
        // The API usually returns [0m, -1m, -2m, -3m] where 0m is current
        this.recommendationTrend = trend.slice(0, 4);
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
    
    processUpgradesDowngrades(history) {
        if (!history || !Array.isArray(history)) {
            this.upgradesDowngrades = [];
            this.targetPriceChartData = null;
            return;
        }

        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        // Filter valid items with dates and normalize to milliseconds
        const validItems = history
            .map(item => {
                let d = new Date(item.epochGradeDate);
                // Handle Unix timestamp in seconds (common in YF API)
                if (!isNaN(d.getTime()) && d.getFullYear() === 1970 && typeof item.epochGradeDate === 'number') {
                    d = new Date(item.epochGradeDate * 1000);
                }
                // Return new object with normalized date (millis)
                return { ...item, epochGradeDate: d.getTime() };
            })
            .filter(item => {
                 const d = new Date(item.epochGradeDate);
                 return !isNaN(d.getTime()) && d >= fiveYearsAgo;
            });

        // 1. Prepare Table Data (Newest First)
        this.upgradesDowngrades = [...validItems].sort((a, b) => b.epochGradeDate - a.epochGradeDate);
        
        // 2. Prepare Chart Data
        this.prepareTargetPriceChart(this.upgradesDowngrades);
    },

    formatPercent(val) {
        if (val === undefined || val === null) return 'N/A';
        // Handle both raw number (0.36) and object ({fmt: '36%'})
        const num = typeof val === 'object' ? val.raw : val;
        return (num * 100).toFixed(2) + '%';
    },
             b.epochGradeDate - a.epochGradeDate
        );

        // 2. Prepare Chart Data (Oldest First)
        // Filter out items without price targets for the chart, and ensure target > 0
        const chartItems = validItems
            .filter(item => item.currentPriceTarget !== undefined && item.currentPriceTarget !== null && item.currentPriceTarget > 0)
            .sort((a, b) => a.epochGradeDate - b.epochGradeDate);

        if (chartItems.length > 0) {
            this.targetPriceChartData = {
                labels: chartItems.map(item => this.formatDate(item.epochGradeDate)),
                datasets: [{
                    label: 'Price Target',
                    data: chartItems.map(item => item.currentPriceTarget),
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.2
                }]
            };
        } else {
            // console.warn('No chart items found despite history existing.');
            this.targetPriceChartData = null;
        }
    },

    formatCurrency(val) {
        if (val === undefined || val === null) return 'N/A';
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
        // Check if it's already a date string
        if (typeof epoch === 'string' && epoch.includes('T')) {
           return new Date(epoch).toLocaleDateString();
        }
        
        // Check if it's likely seconds (small number) or milliseconds (large number)
        // Milliseconds for 2000-01-01 is about 946684800000 (12 digits)
        // Seconds for 2000-01-01 is about 946684800 (9 digits)
        // If it's less than 100 billion, assume seconds.
        if (typeof epoch === 'number' && epoch < 100000000000) {
            return new Date(epoch * 1000).toLocaleDateString();
        }
        
        return new Date(epoch).toLocaleDateString();
    },
    
    // Helpers for Analyst Visuals
    getPricePosition(price) {
         if (!this.priceTargets || !price) return '0%';
         const { low, high } = this.priceTargets;
         if (low === high) return '50%';
         
         const range = high - low;
         // Add 10% buffer to range for visual comfort
         const min = low - (range * 0.05);
         const max = high + (range * 0.05);
         const total = max - min;
         
         let pct = ((price - min) / total) * 100;
         return Math.max(0, Math.min(100, pct)) + '%';
    },
    
    getTotalVotes(period) {
        return (period.strongBuy || 0) + (period.buy || 0) + (period.hold || 0) + (period.sell || 0) + (period.strongSell || 0);
    },
    
    getVotePct(period, type) {
        const total = this.getTotalVotes(period);
        if (total === 0) return '0%';
        const count = period[type] || 0;
        return (count / total * 100) + '%';
    },
    
    getPeriodLabel(periodKey) {
        // Simple mapping for 0m, -1m, etc.
        const map = { '0m': 'Current', '-1m': '1M Ago', '-2m': '2M Ago', '-3m': '3M Ago' };
        return map[periodKey] || periodKey;
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
.section-title {
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #dee2e6;
    font-weight: 600;
    color: #495057;
}

/* Grid Layout */
.analyst-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}
.section-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    height: 100%;
    display: flex;
    flex-direction: column;
}
.metric-label {
    font-size: 0.95rem;
    color: #6c757d;
    margin-bottom: 1rem;
    font-weight: 600;
    border-bottom: 1px solid #f1f3f5;
    padding-bottom: 0.5rem;
}

/* Price Targets Visual */
.price-target-visual {
    position: relative;
    height: 80px; /* Increased height for labels */
    margin: 2rem 0;
    flex: 1;
    display: flex;
    align-items: center;
}
.range-track {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 6px;
    background: #e9ecef;
    transform: translateY(-50%);
    border-radius: 3px;
}
.range-fill {
    position: absolute;
    top: 50%;
    height: 6px;
    background: #adb5bd;
    transform: translateY(-50%);
    opacity: 0.5;
}
.marker {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    z-index: 2;
}
.marker.low { background: #6c757d; }
.marker.high { background: #6c757d; }
.marker.avg { 
    background: #0d6efd; 
    width: 18px; 
    height: 18px;
    z-index: 3;
}
.marker.current { 
    background: #198754; 
    width: 18px; 
    height: 18px;
    z-index: 4;
}
.label {
    position: absolute;
    font-size: 0.85rem;
    color: #495057;
    white-space: nowrap;
    transform: translateX(-50%);
    text-align: center;
    line-height: 1.2;
}
.label.top { top: -40px; }
.label.bottom { bottom: -40px; }

/* Recommendations Visual */
.rec-row {
    display: flex;
    align-items: center;
    margin-bottom: 0.8rem;
}
.rec-label {
    width: 70px;
    font-size: 0.9rem;
    color: #495057;
    font-weight: 500;
}
.rec-bar {
    flex: 1;
    height: 28px;
    display: flex;
    border-radius: 6px;
    overflow: hidden;
    background: #e9ecef;
}
.rec-segment {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    transition: width 0.3s ease;
}
.bg-strong-buy { background-color: #157347; }
.bg-buy { background-color: #198754; }
.bg-hold { background-color: #ffc107; color: #333; }
.bg-sell { background-color: #dc3545; }
.bg-strong-sell { background-color: #bb2d3b; }

.legend-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: #6c757d;
}
.legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

/* Metrics Grid */
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
}
.metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 0.2rem;
}

/* Utilities */
.full-width {
    grid-column: 1 / -1;
    margin-top: 1rem;
}
.text-success { color: #198754 !important; }
.text-danger { color: #dc3545 !important; }
.text-warning { color: #ffc107 !important; }

/* Loading/Error */
.loading-state, .error-state {
    text-align: center;
    padding: 3rem;
}
.spinner {
    width: 40px; 
    height: 40px; 
    border: 4px solid #f3f3f3; 
    border-top: 4px solid #0d6efd; 
    border-radius: 50%; 
    animation: spin 1s linear infinite; 
    margin: 0 auto 1rem;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* History Card & Tables */
.history-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.table-container {
    overflow-x: auto;
    margin-top: 1rem;
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
}
th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}
th {
    background: #f8f9fa;
    font-weight: 600;
    color: #495057;
}
tbody tr:hover {
    background: #f8f9fa;
}

/* Chart Container */
.chart-container.large {
    height: 350px;
    position: relative;
}
</style>
