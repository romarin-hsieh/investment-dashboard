<template>
  <div class="holdings-analysis">
    <div v-if="loading" class="holdings-grid">
      <!-- Ownership Skeleton -->
      <div class="card ownership-card">
        <h3>{{ $t('holdings.ownershipStructure') }}</h3>
        <div class="chart-container">
          <WidgetSkeleton type="chart" :show-header="false" :bordered="false" />
        </div>
      </div>

      <!-- Sentiment Skeleton -->
      <div class="card sentiment-card">
        <h3>{{ $t('holdings.insiderSentiment6m') }}</h3>
         <WidgetSkeleton type="list" :item-count="3" :show-header="false" :bordered="false" />
      </div>

      <!-- Institutions Skeleton -->
      <div class="card institutions-card full-width">
        <h3>{{ $t('holdings.topInstitutionalHolders') }}</h3>
         <WidgetSkeleton type="list" :item-count="5" :show-header="false" :bordered="false" />
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadData">{{ $t('holdings.retry') }}</button>
    </div>

    <div v-else class="holdings-grid">
      <!-- Row 1 Left: Stock Structure (1/3) -->
      <div class="card ownership-card">
        <h3>{{ $t('holdings.ownershipStructure') }}</h3>
        <div class="chart-container">
          <Doughnut v-if="ownershipChartData" :data="ownershipChartData" :options="ownershipChartOptions" />
        </div>
        <div class="stats-row">
            <div class="stat">
                <span class="label">{{ $t('holdings.insiders') }}</span>
                <span class="value">{{ holders['insidersPercent'] || '0%' }}</span>
            </div>
             <div class="stat">
                <span class="label">{{ $t('holdings.institutions') }}</span>
                <span class="value">{{ holders['institutionsPercent'] || '0%' }}</span>
            </div>
        </div>
      </div>

      <!-- Row 1 Right: Smart Money Trend (2/3) -->
      <div class="card smart-money-card">
          <h3>{{ $t('holdings.smartMoneyTrend') }}</h3>
          <div class="smart-money-content" v-if="smartMoneyChartData">
              <!-- Right: Trend Chart (Full Width) -->
              <div class="trend-chart-container">
                  <Bar :data="smartMoneyChartData" :options="smartMoneyChartOptions" />
              </div>
          </div>
          <div v-else class="no-data">
              {{ $t('holdings.loadingSmartMoney') }}
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
        <h3>{{ $t('holdings.insiderSentiment6m') }}</h3>
        <div class="sentiment-container">
            <!-- Left: Meter -->
             <div class="sentiment-meter-section">
                <div class="sentiment-meter">
                    <div class="meter-bar-dual">
                        <div class="segment sell" :style="{ width: getSentimentStyles().sell + '%'}"></div>
                        <div class="segment buy" :style="{ width: getSentimentStyles().buy + '%'}"></div>
                    </div>
                    <div class="meter-labels">
                        <span class="label-sell">{{ $t('holdings.percentSelling', { n: Math.round(getSentimentStyles().sell) }) }}</span>
                        <span class="label-sentiment">{{ sentimentLabel }}</span>
                        <span class="label-buy">{{ $t('holdings.percentBuying', { n: Math.round(getSentimentStyles().buy) }) }}</span>
                    </div>
                </div>
             </div>

             <!-- Right: Transactions -->
            <div class="recent-transactions">
                <h4>{{ $t('holdings.recentTransactions') }}</h4>
                <div class="transaction-header">
                    <span class="date">{{ $t('holdings.dateReported') }}</span>
                    <span class="name">{{ $t('holdings.holder') }}</span>
                    <span class="relationship">{{ $t('holdings.relationship') }}</span>
                    <span class="type">{{ $t('holdings.transaction') }}</span>
                    <span class="shares">{{ $t('holdings.shares') }}</span>
                    <span class="value">{{ $t('holdings.value') }}</span>
                </div>
                <ul class="transaction-list">
                    <li v-for="(tx, idx) in recentInsiders" :key="idx" :class="tx['buySell']">
                        <span class="date">{{ formatDate(tx['startDate']) }}</span>
                        <span class="name" :title="tx['filerName']">{{ tx['filerName'] }}</span>
                        <span class="relationship" :title="tx['relationship']">{{ relationshipDisplay(tx['relationship']) }}</span>
                        <span class="type">{{ tx['transactionText'] }}</span>
                        <span class="shares">{{ tx['shares'] ? tx['shares'].fmt : $t('common.na') }}</span>
                        <span class="value">{{ tx['value'] ? tx['value'].fmt : $t('common.na') }}</span>
                    </li>
                </ul>
            </div>
        </div>
      </div>

      <!-- Row 3: Top Institutions (Full) -->
      <div class="card institutions-card full-width">
        <h3>{{ $t('holdings.topInstitutionalHolders') }}</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>{{ $t('holdings.dateReported') }}</th>
                        <th>{{ $t('holdings.holder') }}</th>
                        <th>{{ $t('holdings.percentOutstanding') }}</th>
                        <th>{{ $t('holdings.shares') }}</th>
                        <th>{{ $t('holdings.value') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inst, idx) in holders['topInstitutions'].slice(0, 10)" :key="idx">
                        <td>{{ inst.reportDate ? inst.reportDate.fmt : $t('common.na') }}</td>
                        <td>{{ inst.organization }}</td>
                        <td>{{ inst.pctHeld ? inst.pctHeld.fmt : $t('common.na') }}</td>
                        <td>{{ inst.position ? inst.position.fmt : $t('common.na') }}</td>
                        <td>{{ inst.value ? ('$' + inst.value.fmt) : $t('common.na') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, type ChartData, type ChartOptions } from 'chart.js'
import { Doughnut, Bar, Line } from 'vue-chartjs'
import yahooFinanceAPI from '@/api/yahooFinanceApi'
import { txTypeLabel, relationshipLabel } from '@/utils/marketTermL10n'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi'
import { useTheme } from '@/composables/useTheme'
import { getToken, getTokenRgba } from '@/utils/designTokens'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

import WidgetSkeleton from '@/components/WidgetSkeleton.vue'
import SmartMoneyVolumeProfile from '@/components/SmartMoneyVolumeProfile.vue'

/** Dataroma payload subset. The insider/superinvestor records are dynamically
 *  shaped external data mutated in place, so `any`-valued at this boundary. */
interface DataromaData {
  insiders?: { transactions?: Array<Record<string, any>> }
  superinvestors?: Array<{ history?: Array<Record<string, any>>; [key: string]: any }>
  [key: string]: any
}

export default defineComponent({
  name: 'HoldingsAnalysis',
  components: { Doughnut, Bar, Line, WidgetSkeleton, SmartMoneyVolumeProfile },
  props: {
    symbol: {
      type: String,
      required: true
    },
    dataromaData: {
      type: Object as PropType<DataromaData | null>,
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
      error: null as string | null,
      holders: {} as Record<string, any>,
      insiderTransactions: [] as Array<Record<string, any>>,
      ownershipChartData: null as ChartData<'doughnut'> | null,
      smartMoneyChartData: null as ChartData<'bar'> | null,
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
      ownershipChartOptions(): ChartOptions<'doughnut'> {
        // Chart.js reads raw values at render time; tokens recomputed on theme change.
        return {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  position: 'right',
                  labels: { color: getToken('--text-secondary') }
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
              if (tx['buySell'] === 'buy') buys++;
              if (tx['buySell'] === 'sell') sells++;
          });
          
          const total = buys + sells;
          if (total === 0) return 50;
          return (buys / total) * 100;
      },
      sentimentLabel() {
          if (this.sentimentScore > 60) return this.$t('holdings.sentimentBullish');
          if (this.sentimentScore < 40) return this.$t('holdings.sentimentBearish');
          return this.$t('holdings.sentimentNeutral');
      },
      smartMoneyChartOptions(): ChartOptions<'bar'> {
          // Theme-adaptive chart styling. Tokens resolve to different hex in
          // light vs dark via .dark-mode overrides in style.css.
          const axisTextColor = getToken('--text-secondary');
          const gridColor     = getToken('--border-color');
          const legendColor   = getToken('--text-secondary');
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
                      title: { display: true, text: this.$t('holdings.axisSharesHeld'), color: axisTextColor },
                      grid: { color: gridColor },
                      ticks: { color: axisTextColor }
                  },
                  y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: { display: true, text: this.$t('holdings.axisStockPrice'), color: axisTextColor },
                      grid: { drawOnChartArea: false }, // only want the grid lines for one axis
                      ticks: { color: axisTextColor, callback: (val) => '$' + val }
                  }
              },
              plugins: {
                  legend: {
                      position: 'bottom',
                      labels: { padding: 20, color: legendColor }
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
    // SEC relationship titles localize via the finite map; long tail stays raw (CP-8).
    relationshipDisplay(raw: string | undefined) {
        return relationshipLabel(raw, (k: string) => this.$t(k));
    },
    async loadData() {
        if (!this.symbol) return;
        this.loading = true;
        this.error = null;
        try {
            // StockInfo is opaque ({ isStatic?; [key]: unknown }); read its
            // holders/insiderTransactions off a loose view at this boundary.
            const data = (await yahooFinanceAPI.getStockInfo(this.symbol)) as Record<string, any> | undefined;
            if (!data || !data['holders']) {
                throw new Error('Data incomplete');
            }

            this.holders = data['holders'];
            // Native YF transactions
            const yfTransactions = data['insiderTransactions'] || [];
            
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
                if (precomputed && precomputed['fundamentals']) {
                    const data = precomputed['fundamentals'] as Record<string, any>;
                    this.holders = data['holders'] || {};
                    const yfTransactions = data['insiderTransactions'] || [];
                    
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
                 this.error = this.$t('holdings.errorLoadFailed');
            }
        } finally {
            this.loading = false;
        }
    },
    
    processDataromaData() {
        if (!this.dataromaData || !this.dataromaData.insiders || !this.dataromaData.insiders.transactions) return;
        
        console.log('Use Dataroma Insider Data');
        const transactions = this.dataromaData.insiders.transactions.map(tx => {
            const isBuy = tx['transaction_type'] === 'Purchase';
            const isSell = tx['transaction_type'] === 'Sale';
            
            return {
                startDate: tx['transaction_date'], // "09 Oct 2025" or "2025-10-09"
                filerName: tx['reporter'],
                relationship: tx['relationship'] || tx['filerRelation'] || '',
                transactionText: this.$t('holdings.transactionAtPrice', { type: txTypeLabel(tx['transaction_type'], (k: string) => this.$t(k)), price: tx['price'] }),
                shares: { fmt: new Intl.NumberFormat('en-US').format(tx['shares']) },
                buySell: isBuy ? 'buy' : (isSell ? 'sell' : 'neutral'),
                value: { fmt: '$' + new Intl.NumberFormat('en-US').format(tx['value']) }
            };
        });
        
        this.insiderTransactions = transactions;
        
        // Process Smart Money Data if superinvestors exist
        if (this.dataromaData.superinvestors) {
            this.processSmartMoneyData();
        }
    },
    
    processSmartMoneyData() {
        const dr = this.dataromaData;
        if (!dr || !dr.superinvestors) return;
        const historyMap: Record<string, { shares: number; priceSum: number; priceCount: number; period: string }> = {};
        // Aggregate superinvestor history
        dr.superinvestors.forEach(investor => {
            if (investor.history) {
                investor.history.forEach(rec => {
                    const period = rec['period'];
                    // Capture the entry once: element-access narrowing from the
                    // create-if-absent check isn't retained across statements.
                    const entry = (historyMap[period] ??= { shares: 0, priceSum: 0, priceCount: 0, period });
                    entry.shares += (rec['shares'] || 0);
                    if (rec['reported_price']) {
                         // Simple clean of '$' if present
                         const p = parseFloat(String(rec['reported_price']).replace('$','').replace(',',''));
                         if (!isNaN(p)) {
                             entry.priceSum += p;
                             entry.priceCount++;
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
            return (parseInt(yA ?? '') - parseInt(yB ?? '')) || (parseInt(qA ?? '') - parseInt(qB ?? ''));
        });
        
        // Prepare Chart Data
        const labels = sortedHistory.map(h => h.period);
        const sharesData = sortedHistory.map(h => h.shares);
        const priceData = sortedHistory.map(h => h.priceCount ? (h.priceSum / h.priceCount).toFixed(2) : null);
        
        // Mixed bar+line chart with a string/null price series — looser than
        // ChartData<'bar'>, so cast at this assignment boundary.
        this.smartMoneyChartData = {
            labels,
            datasets: [
                {
                    label: this.$t('holdings.datasetSmartMoneyShares'),
                    type: 'bar',
                    data: sharesData,
                    backgroundColor: getTokenRgba('--success-solid', 0.6),
                    borderColor: getToken('--success-solid'),
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: this.$t('holdings.datasetAvgReportedPrice'),
                    type: 'line',
                    data: priceData,
                    borderColor: getToken('--blue-500'),
                    backgroundColor: getToken('--blue-500'),
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        } as unknown as ChartData<'bar'>;
    },

    processTransactions() {
         // Fix insider transaction buy/sell class
        this.insiderTransactions.forEach(tx => {
            const text = tx['transactionText'] || '';
            if (text.toLowerCase().includes('purchase')) tx['buySell'] = 'buy';
            else if (text.toLowerCase().includes('sale')) tx['buySell'] = 'sell';
            else tx['buySell'] = 'neutral';
            
            // Generate value fmt if missing or add $ prefix
            if (tx['value'] && tx['value'].fmt && !tx['value'].fmt.startsWith('$')) {
                tx['value'].fmt = '$' + tx['value'].fmt;
            } else if (tx['value'] && !tx['value'].fmt) {
                tx['value'] = { fmt: '$' + new Intl.NumberFormat('en-US').format(tx['value']) };
            }
            
            // Ensure relationship exists
             if (!tx['relationship']) {
                tx['relationship'] = tx['filerRelation'] || '';
             }
        });
    },
    
    processOwnershipChart() {
        // Parse percentages
        const insiders = parseFloat(this.holders['insidersPercent']) || 0;
        const institutions = parseFloat(this.holders['institutionsPercent']) || 0;
        const publicFloat = Math.max(0, 100 - insiders - institutions); 
        
        // Renaissance-theme ownership palette:
        //   Insiders      -> --secondary-color (Warm Taupe)
        //   Institutions  -> --primary-color   (Florentine Blue)
        //   Public/Other  -> theme-neutral grey (no matching brand token;
        //                    kept inline so the brand namespace stays focused)
        // Hover variants are manual shade tweaks of the same hues; not worth
        // tokenising for one pie chart. Border uses --bg-card so the slices
        // visually 'cut out' of the card surface in both themes.
        const publicSlice      = this.isDark ? '#4D4D4D' : '#D6D2CE';
        const hoverInsiders    = this.isDark ? '#C9BFB1' : '#8A7A6A';
        const hoverInstitutions = this.isDark ? '#9DAEB0' : '#5A6B6E';
        const hoverPublic      = this.isDark ? '#5D5D5D' : '#C4BEB8';

        this.ownershipChartData = {
            labels: [this.$t('holdings.insiders'), this.$t('holdings.institutions'), this.$t('holdings.publicOther')],
            datasets: [{
                data: [insiders, institutions, publicFloat] as number[],
                backgroundColor: [
                    getToken('--secondary-color'),
                    getToken('--primary-color'),
                    publicSlice
                ],
                hoverBackgroundColor: [hoverInsiders, hoverInstitutions, hoverPublic],
                borderColor: getToken('--bg-card'),
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
            if (tx['buySell'] === 'buy') buys++;
            if (tx['buySell'] === 'sell') sells++;
        });
        
        const total = buys + sells;
        if (total === 0) return { buy: 50, sell: 50 };
        
        return {
            buy: (buys / total) * 100,
            sell: (sells / total) * 100
        };
    },

    formatDate(dateObj: any) {
        if (!dateObj) return this.$t('common.na');
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
    
    formatDateYYYYMMDD(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }
  }
})
</script>

<style scoped>
.holdings-analysis {
    /* padding: var(--space-4); Removed */
    /* background: var(--bg-primary); Removed */
    /* border-radius: 8px; Removed */
    background: transparent;
}

.holdings-grid {
    display: flex; 
    flex-wrap: wrap;
    gap: var(--space-6);
}

.card {
    background: var(--bg-card);
    padding: var(--space-6);
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

/* PR-F5: collapse forced widths at tablet (≤900) so the 500px
 * smart-money-card and 300px ownership-card flow without overflow on
 * smaller viewports. Aligned with PR-A4 ≤900 stack standard. */
@media (max-width: 900px) {
  .ownership-card,
  .smart-money-card {
    min-width: 100%;
    flex-basis: 100%;
  }
}

h3 {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--text-md);
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: var(--space-2);
}

.chart-container {
    height: 200px;
    position: relative;
}

/* Stock Structure Stats */
.stats-row {
    display: flex;
    justify-content: space-around;
    margin-top: var(--space-4);
}
.stat {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.stat .label { font-size: var(--text-sm); color: var(--text-muted); }
.stat .value { font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--text-primary); }

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
    gap: var(--space-6);
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
    border-radius: var(--radius-pill);
    overflow: hidden;
    display: flex;
    margin-bottom: var(--space-2);
}

.meter-bar-dual .segment { height: 100%; }
.meter-bar-dual .segment.buy { background: var(--success-solid); margin-left: auto; }
.meter-bar-dual .segment.sell { background: var(--danger-solid); margin-right: auto; }

.meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
    color: var(--text-muted);
}

.recent-transactions {
    flex: 2; /* Take more space */
}

.no-data {
    text-align: center;
    padding: var(--space-8);
    color: var(--text-muted);
}

.label-buy { color: var(--success-strong); }
.label-sentiment { color: var(--text-secondary); font-weight: var(--weight-bold); }

/* Transactions List */
.transaction-header {
    display: flex;
    align-items: center;
    padding: var(--space-3) 0; /* Match TH padding slightly better */
    border-bottom: 1px solid var(--border-color);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    margin-bottom: 0;
}

.transaction-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: var(--text-sm);
}

.transaction-list li {
    display: flex;
    align-items: center; 
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border-color-soft); /* Softer border */
    font-size: var(--text-sm);
}

.transaction-list li:last-child {
    border-bottom: none;
}

.transaction-list li.buy .type { color: var(--success-strong); font-weight: var(--weight-medium); }
.transaction-list li.sell .type { color: var(--danger-strong); font-weight: var(--weight-medium); }
.transaction-list li.neutral .type { color: var(--text-muted); }

.date { 
    color: var(--text-muted); 
    width: 90px; 
    flex-shrink: 0;
    margin-right: var(--space-6); /* Add spacing between Date and Holder */
}

.name { 
    flex: 1; /* Allow name to expand */
    min-width: 140px;
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    padding-right: 15px;
    font-weight: var(--weight-medium);
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
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    flex-shrink: 0;
}

.value {
    width: 90px;
    text-align: right; 
    font-family: 'Roboto Mono', monospace;
    font-weight: var(--weight-medium);
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
    font-size: var(--text-base);
}

th {
    text-align: left;
    padding: var(--space-3);
    background: transparent; 
    color: var(--text-muted);
    font-weight: var(--weight-medium);
    border-bottom: 1px solid var(--border-color); 
}

td {
    padding: var(--space-3);
    border-bottom: 1px solid var(--border-color-soft);
    color: var(--text-secondary);
}

td:nth-child(2) {
    color: var(--text-primary);
    font-weight: var(--weight-medium);
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
