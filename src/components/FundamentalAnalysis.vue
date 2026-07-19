<template>
  <div class="fundamental-analysis">
    <div v-if="loading" class="analyst-grid">
        <!-- Price Targets Skeleton -->
        <div class="section-card">
           <WidgetSkeleton :bordered="false" :item-count="1" />
        </div>
        <!-- Recommendations Skeleton -->
        <div class="section-card">
           <WidgetSkeleton :bordered="false" :item-count="1" />
        </div>
        <!-- Key Metrics Skeleton -->
        <div class="section-card">
           <WidgetSkeleton :bordered="false" type="grid" :item-count="4" />
        </div>
    </div>

    <div v-else-if="error" class="alert alert-danger">
        {{ error }}
    </div>

    <div v-else>
        <!-- Analyst Insights Section -->

        
        <div class="analyst-grid">
            <!-- 1. Analyst Price Targets -->
            <div class="section-card">
                <h6 class="metric-label">{{ $t('fundamentals.priceTargets.title') }}</h6>
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
                        <span class="label bottom">{{ formatCurrency(priceTargets.low) }}<br>{{ $t('fundamentals.priceTargets.low') }}</span>
                    </div>

                    <div class="marker high" :style="{ left: getPricePosition(priceTargets.high) }">
                        <span class="label bottom">{{ formatCurrency(priceTargets.high) }}<br>{{ $t('fundamentals.priceTargets.high') }}</span>
                    </div>

                    <div class="marker avg" :style="{ left: getPricePosition(priceTargets.mean) }">
                        <span class="label top">{{ formatCurrency(priceTargets.mean) }}<br>{{ $t('fundamentals.priceTargets.average') }}</span>
                    </div>

                    <div class="marker current" :style="{ left: getPricePosition(priceTargets.current) }">
                         <span class="label top" style="top: -45px; font-weight: bold; color: var(--success-color);">
                            {{ formatCurrency(priceTargets.current) }}<br>{{ $t('fundamentals.priceTargets.current') }}
                         </span>
                    </div>
                </div>
                <div v-else class="text-center text-muted py-5">
                    {{ $t('fundamentals.priceTargets.noData') }}
                </div>
            </div>

            <!-- 2. Analyst Recommendations (Stacked Bar) -->
            <div class="section-card">
                <h6 class="metric-label">{{ $t('fundamentals.recommendations.title') }}</h6>
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
                        <div class="legend-item"><div class="dot bg-strong-buy"></div> {{ $t('fundamentals.recommendations.strongBuy') }}</div>
                        <div class="legend-item"><div class="dot bg-buy"></div> {{ $t('fundamentals.recommendations.buy') }}</div>
                        <div class="legend-item"><div class="dot bg-hold"></div> {{ $t('fundamentals.recommendations.hold') }}</div>
                        <div class="legend-item"><div class="dot bg-sell"></div> {{ $t('fundamentals.recommendations.sell') }}</div>
                        <div class="legend-item"><div class="dot bg-strong-sell"></div> {{ $t('fundamentals.recommendations.strongSell') }}</div>
                    </div>
                </div>
                <div v-else class="text-center text-muted py-5">
                    {{ $t('fundamentals.recommendations.noData') }}
                </div>
            </div>

            <!-- 3. Key Metrics (Preserved) -->
            <div class="section-card">
                <h6 class="metric-label">{{ $t('fundamentals.keyMetrics.title') }}</h6>
                <div class="metrics-grid mt-3">
                     <div>
                        <div class="metric-label">{{ $t('fundamentals.keyMetrics.revenueGrowth') }}</div>
                        <div class="metric-value" :class="getGrowthClass(metrics.revenueGrowth)">
                            {{ metrics.revenueGrowth || $t('fundamentals.keyMetrics.notAvailable') }}
                        </div>
                     </div>
                     <div>
                        <div class="metric-label">{{ $t('fundamentals.keyMetrics.profitMargin') }}</div>
                        <div class="metric-value" :class="getGrowthClass(metrics.profitMargins)">
                             {{ metrics.profitMargins || $t('fundamentals.keyMetrics.notAvailable') }}
                        </div>
                     </div>
                     <div>
                        <div class="metric-label">{{ $t('fundamentals.keyMetrics.forwardPE') }}</div>
                        <div class="metric-value">
                             {{ displayMetric(metrics.forwardPE, 2) }}
                        </div>
                     </div>
                     <div>
                        <div class="metric-label">{{ $t('fundamentals.keyMetrics.beta') }}</div>
                        <div class="metric-value">
                            {{ displayMetric(metrics.beta, 2) }}
                        </div>
                     </div>
                </div>
            </div>
        </div>

      <!-- Earnings Trend -->
      <div class="card earnings-card full-width">
        <div class="chart-header">
            <h3>{{ $t('fundamentals.earnings.title') }}</h3>
            <!-- Toggle removed as Quarterly data is unavailable -->
            <!-- <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm" :class="earningsViewMode === 'yearly' ? 'btn-primary' : 'btn-outline-primary'" @click="setEarningsView('yearly')">Yearly</button>
                <button type="button" class="btn btn-sm" :class="earningsViewMode === 'quarterly' ? 'btn-primary' : 'btn-outline-primary'" @click="setEarningsView('quarterly')">Quarterly</button>
            </div> -->
        </div>
        <div class="chart-container large">
             <Bar v-if="earningsChartData" :data="earningsChartData" :options="earningsChartOptions" />
        </div>
      </div>

      <!-- Analyst Rating History -->
      <!-- ... (rest of template) ... -->
    </div>
  </div>
</template>

<script>
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController } from 'chart.js'
import { Bar, Line } from 'vue-chartjs'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi.js'
import { formatNumber } from '@/utils/numberFormat'
import { useTheme } from '@/composables/useTheme.js'
import { getToken, getTokenRgba } from '@/utils/designTokens'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController)

import WidgetSkeleton from '@/components/WidgetSkeleton.vue'

export default {
  name: 'FundamentalAnalysis',
  components: { Bar, Line, WidgetSkeleton },
  props: {
    symbol: {
      type: String,
      required: true
    }
  },
  setup() {
    const { theme } = useTheme()
    // PR-G2.5: expose `formatNumber` so the template at line 123 can call it.
    // The function is imported at module top level (line 162) but Vue 3
    // templates only resolve identifiers from setup return / data() /
    // methods / computed / props — not module-scope imports. PR-G2's tests
    // surfaced this as `_ctx.formatNumber is not a function` whenever
    // `metrics.forwardPE` was truthy.
    return { theme, formatNumber }
  },
  data() {
    return {
      loading: true,
      error: null,
      metrics: {},
      upgradesDowngrades: [],
      recommendationChartData: null,
      earningsChartData: null,
      earningsViewMode: 'yearly', // 'yearly' or 'quarterly'
      yearlyEarningsData: [],
      quarterlyEarningsData: [],
      recommendationTrend: [], 
      priceTargets: null, 
      targetPriceChartData: null,
    };
  },
  computed: {
    isDark() {
        return this.theme === 'dark';
    },
    commonChartColors() {
        // Touch `theme` so this computed re-evaluates (re-reads tokens) on
        // light/dark toggle — getToken() reads the DOM, not a reactive dep.
        void this.theme;
        return {
            text: getToken('--text-secondary'),
            grid: getToken('--chart-grid'),
            tooltipBg: getTokenRgba('--bg-card', 0.9),
            tooltipText: getToken('--text-primary')
        }
    },
    recommendationChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: { 
                  stacked: true,
                  ticks: { color: this.commonChartColors.text },
                  grid: { color: this.commonChartColors.grid }
              },
              y: { 
                  stacked: true, 
                  beginAtZero: true,
                  ticks: { color: this.commonChartColors.text },
                  grid: { color: this.commonChartColors.grid }
              }
            }
        }
    },
    earningsChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                  position: 'bottom',
                  labels: { color: this.commonChartColors.text }
              }
            },
            scales: {
              x: {
                  ticks: { color: this.commonChartColors.text },
                  grid: { color: this.commonChartColors.grid }
              },
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: this.$t('fundamentals.earnings.epsAxis'), color: this.commonChartColors.text },
                ticks: { color: this.commonChartColors.text },
                grid: { color: this.commonChartColors.grid }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: this.$t('fundamentals.earnings.revenueAxis'), color: this.commonChartColors.text },
                grid: { drawOnChartArea: false },
                ticks: {
                    color: this.commonChartColors.text,
                    callback: function(value) {
                        if (value >= 1000000000) {
                            return formatNumber(value / 1000000000, 1) + 'B';
                        }
                        if (value >= 1000000) {
                            return formatNumber(value / 1000000, 1) + 'M';
                        }
                        return value;
                    }
                }
              }
            }
        }
    },
    targetPriceChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: { display: true, text: this.$t('fundamentals.targetPriceChart.title'), color: this.commonChartColors.text }
            },
            scales: {
              x: {
                  ticks: { color: this.commonChartColors.text },
                  grid: { color: this.commonChartColors.grid }
              },
              y: {
                beginAtZero: false,
                title: { display: true, text: this.$t('fundamentals.targetPriceChart.priceAxis'), color: this.commonChartColors.text },
                ticks: { color: this.commonChartColors.text },
                grid: { color: this.commonChartColors.grid }
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
                this.error = this.$t('fundamentals.errors.loadFailed');
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
             this.yearlyEarningsData = [];
             this.quarterlyEarningsData = [];
             return;
        }
        
        // Extract Yearly Data
        // COPY, never alias: the synthesis step below pushes onto this array, and
        // `earnings` is a cached API payload — aliasing meant we mutated the
        // caller's (cached) object, so re-entering this view appended duplicate
        // synthesized years each time.
        if (earnings.financialsChart.yearly) {
            this.yearlyEarningsData = [...earnings.financialsChart.yearly];
        } else if (Array.isArray(earnings.financialsChart)) {
            // Legacy handling, assuming array is yearly if not specified
            this.yearlyEarningsData = [...earnings.financialsChart];
        } else {
            this.yearlyEarningsData = [];
        }

        // Extract Quarterly Data
        if (earnings.financialsChart.quarterly) {
            this.quarterlyEarningsData = [...earnings.financialsChart.quarterly];
        } else {
            this.quarterlyEarningsData = [];
        }

        // Synthesis Logic: Fill missing yearly data (e.g., 2025) from quarterly data
        if (this.yearlyEarningsData.length > 0 && this.quarterlyEarningsData.length > 0) {
            // Find the last year present in yearly data
            const lastYearlyDate = this.yearlyEarningsData[this.yearlyEarningsData.length - 1].date;
            const lastYear = typeof lastYearlyDate === 'string' ? parseInt(lastYearlyDate) : lastYearlyDate;

            // Group quarterly data by year
            const quarterlyByYear = {};
            this.quarterlyEarningsData.forEach(q => {
                if (!q.date) return;
                // Parse year from "1Q2025" or similar
                const yearMatch = q.date.toString().match(/(\d{4})/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[1]);
                    // Only synthesize if it's a NEWER year than what we have
                    if (year > lastYear) {
                        if (!quarterlyByYear[year]) {
                            quarterlyByYear[year] = { revenue: 0, earnings: 0, count: 0 };
                        }
                        
                        const rev = q.revenue?.raw !== undefined ? q.revenue.raw : q.revenue;
                        const earn = q.earnings?.raw !== undefined ? q.earnings.raw : q.earnings;
                        
                        quarterlyByYear[year].revenue += (rev || 0);
                        quarterlyByYear[year].earnings += (earn || 0);
                        quarterlyByYear[year].count++;
                    }
                }
            });

            // Append synthesized years
            Object.keys(quarterlyByYear).sort().forEach(yearStr => {
                const year = parseInt(yearStr);
                const data = quarterlyByYear[year];
                // Only synthesize a COMPLETE fiscal year. Aggregating 1-3 quarters
                // and charting it beside full years reads as a revenue collapse.
                if (data.count !== 4) return;
                // Push synthesized aggregation
                this.yearlyEarningsData.push({
                    date: year,
                    revenue: data.revenue,
                    earnings: data.earnings,
                    synthesized: true // logic marker (optional usage)
                });
            });
        }

        // Initialize view
        this.setEarningsView(this.earningsViewMode);
    },

    setEarningsView(mode) {
        // Enforce yearly view as quarterly data is unavailable/blocked
        this.earningsViewMode = 'yearly';
        const data = this.yearlyEarningsData;

        if (!data || data.length === 0) {
             this.updateEarningsChart(data);
             return;
        }
        this.updateEarningsChart(data);
    },

    updateEarningsChart(history) {
        if (!history || history.length === 0) {
            this.earningsChartData = null;
            return;
        }
        
        const labels = history.map(item => item.date); // Year string or '1Q2025'
        
        this.earningsChartData = {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: this.$t('fundamentals.earnings.revenueSeries'),
                    // Support both object with .raw (legacy/live API) and direct number (new static data)
                    data: history.map(item => item.revenue?.raw !== undefined ? item.revenue.raw : item.revenue),
                    backgroundColor: getTokenRgba('--primary-color', 0.6), // brand primary with opacity
                    hoverBackgroundColor: getToken('--primary-color'),
                    yAxisID: 'y1'
                },
                {
                    type: 'line',
                    label: this.$t('fundamentals.earnings.earningsSeries'),
                    data: history.map(item => item.earnings?.raw !== undefined ? item.earnings.raw : item.earnings),
                    borderColor: getToken('--chart-up'),
                    backgroundColor: getToken('--chart-up'),
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
        if (val === undefined || val === null) return this.$t('fundamentals.keyMetrics.notAvailable');
        // Handle both raw number (0.36) and object ({fmt: '36%'})
        const num = typeof val === 'object' ? val.raw : val;
        const pct = formatNumber(num * 100, 2, null);
        return pct === null ? this.$t('fundamentals.keyMetrics.notAvailable') : pct + '%';
    },

    prepareTargetPriceChart(validItems) {
        if (!validItems) return;
        // Filter out items without price targets for the chart, and ensure target > 0
        const chartItems = validItems
            .filter(item => item.currentPriceTarget !== undefined && item.currentPriceTarget !== null && item.currentPriceTarget > 0)
            .sort((a, b) => a.epochGradeDate - b.epochGradeDate);

        if (chartItems.length > 0) {
            this.targetPriceChartData = {
                labels: chartItems.map(item => this.formatDate(item.epochGradeDate)),
                datasets: [{
                    label: this.$t('fundamentals.targetPriceChart.priceTargetSeries'),
                    data: chartItems.map(item => item.currentPriceTarget),
                    borderColor: getToken('--warning-solid'),
                    backgroundColor: getTokenRgba('--warning-solid', 0.2),
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
        if (val === undefined || val === null) return this.$t('fundamentals.keyMetrics.notAvailable');
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

    /**
     * Yahoo returns `{ raw, fmt }` envelopes for many fields. Unwrap to a primitive
     * so downstream code never stringifies an object into the UI.
     */
    unwrapValue(val) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if (val.raw !== undefined) return val.raw
        if (val.fmt !== undefined) return val.fmt
        return null
      }
      return val
    },

    /**
     * Render a metric that may arrive as a number, a numeric string, or a Yahoo
     * `{ raw, fmt }` envelope. The envelope used to fall through as truthy and
     * render literally as "[object Object]" (beta), or die in
     * parseFloat({}) -> NaN and show a silent N/A for a value we DO have (forwardPE).
     */
    displayMetric(value, decimals = 2) {
      const raw = this.unwrapValue(value)
      if (raw === null || raw === undefined || raw === '') {
        return this.$t('fundamentals.keyMetrics.notAvailable')
      }
      const n = typeof raw === 'number' ? raw : parseFloat(raw)
      if (!Number.isFinite(n)) return this.$t('fundamentals.keyMetrics.notAvailable')
      return formatNumber(n, decimals)
    },

    getGrowthClass(val) {
        // Previously `val.includes('-')`, which THREW on a number or a {raw,fmt}
        // object, and returned 'text-success' for any string without a '-' —
        // painting missing data ('N/A') green, i.e. as positive growth.
        const raw = this.unwrapValue(val)
        if (raw === null || raw === undefined || raw === '') return '';
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[%,\s]/g, ''))
        if (!Number.isFinite(n)) return '';   // unknown -> no colour, never green
        return n < 0 ? 'text-danger' : 'text-success';
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
         // A missing high/low makes `range` NaN, which propagated all the way out
         // as the literal CSS string 'NaN%' on the marker's `left`/`right`.
         if (!Number.isFinite(pct)) return '0%';
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
        const map = {
            '0m': this.$t('fundamentals.periods.current'),
            '-1m': this.$t('fundamentals.periods.oneMonthAgo'),
            '-2m': this.$t('fundamentals.periods.twoMonthsAgo'),
            '-3m': this.$t('fundamentals.periods.threeMonthsAgo')
        };
        return map[periodKey] || periodKey;
    }
  }
}
</script>

<style scoped>
.fundamental-analysis {
    /* padding: var(--space-4);  Removed to use parent container's spacing */
    /* background: var(--bg-primary); Removed gray background */
    /* border-radius: 8px; Removed */
    background: transparent;
}
.section-title {
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border-color);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
}

/* Grid Layout */
.analyst-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
    margin-bottom: var(--space-8);
}
.section-card {
    background: var(--bg-card);
    padding: var(--space-6);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-color);
}
.metric-label {
    font-size: var(--text-base);
    color: var(--text-muted);
    margin-bottom: var(--space-4);
    font-weight: var(--weight-semibold);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--space-2);
}

/* Price Targets Visual */
.price-target-visual {
    position: relative;
    height: 80px; 
    margin: var(--space-8) 0;
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
    background: var(--bg-secondary);
    transform: translateY(-50%);
    border-radius: var(--radius-pill);
}
.range-fill {
    position: absolute;
    top: 50%;
    height: 6px;
    background: var(--text-muted);
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
    border: 3px solid var(--bg-card);
    box-shadow: var(--shadow-sm);
    z-index: 2;
}
.marker.low { background: var(--text-muted); }
.marker.high { background: var(--text-muted); }
.marker.avg { 
    background: var(--primary-color); 
    width: 18px; 
    height: 18px;
    z-index: 3;
}
.marker.current { 
    background: var(--success-color); 
    width: 18px; 
    height: 18px;
    z-index: 4;
}
.label {
    position: absolute;
    font-size: var(--text-sm);
    color: var(--text-secondary);
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
    font-size: var(--text-base);
    color: var(--text-secondary);
    font-weight: var(--weight-medium);
}
.rec-bar {
    flex: 1;
    height: 28px;
    display: flex;
    border-radius: var(--radius-xs);
    overflow: hidden;
    background: var(--bg-secondary);
}
.rec-segment {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    /* width is the correct animated property here: a flex segment sized by the
       recommendation proportion; transform: scaleX would distort the label inside. */
    transition: width var(--transition-slow) ease;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.bg-strong-buy { background-color: var(--chart-up); } /* TradingView Green */
.bg-buy { background-color: rgba(34, 171, 148, 0.7); }
.bg-hold { background-color: #DCC070; color: var(--grey-800); } /* Theme Warning */
.bg-sell { background-color: rgba(247, 82, 95, 0.7); }
.bg-strong-sell { background-color: var(--chart-down); } /* TradingView Red */

.legend-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    justify-content: center;
    margin-top: var(--space-6);
    font-size: var(--text-sm);
    color: var(--text-muted);
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
    gap: var(--space-6);
}
.metric-value {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    margin-top: 0.2rem;
    color: var(--text-primary);
}

/* Utilities */
.full-width {
    grid-column: 1 / -1;
    margin-top: var(--space-4);
}
.text-success { color: var(--success-color) !important; }
.text-danger { color: var(--error-color) !important; }
.text-warning { color: var(--warning-color) !important; }

/* Loading/Error */
.loading-state, .error-state {
    text-align: center;
    padding: var(--space-12);
}
.spinner {
    width: 40px; 
    height: 40px; 
    border: 4px solid var(--bg-secondary); 
    border-top: 4px solid var(--primary-color); 
    border-radius: 50%; 
    animation: spin 1s linear infinite; 
    margin: 0 auto var(--space-4);
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* History Card & Tables */
.earnings-card {
    background: var(--bg-card);
    padding: var(--space-6);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
}
.table-container {
    overflow-x: auto;
    margin-top: var(--space-4);
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-base);
}
th, td {
    padding: var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
}
th {
    background: var(--bg-secondary);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
}
tbody tr:hover {
    background: var(--bg-secondary);
}

/* Chart Container */
.chart-container.large {
    height: 350px;
    position: relative;
}

/* Chart Header (for Toggle) */
.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
}
.chart-header h3 {
    margin: 0;
    font-size: var(--text-md);
    color: var(--text-primary);
}

/* Button Group */
.btn-group {
    display: inline-flex;
    border-radius: var(--radius-xs);
    overflow: hidden;
    border: 1px solid var(--border-color);
}
.btn {
    border: none;
    padding: 0.4rem 0.8rem;
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-base);
    background: var(--bg-card);
    color: var(--text-primary);
}
.btn-primary {
    background: var(--primary-color);
    color: white;
}
.btn-outline-primary {
    background: var(--bg-card);
    color: var(--text-secondary);
}
.btn-outline-primary:hover {
    background: var(--bg-secondary);
}
</style>
