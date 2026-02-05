<template>
  <div class="smart-money-volume-profile">
    <div class="header">
      <h3>Smart Money Volume Profile ({{ selectedRangeLabel }})</h3>
      <select v-model="selectedRange" @change="onRangeChange" class="range-selector">
        <option value="6mo">6 Months</option>
        <option value="1y">1 Year</option>
        <option value="5y">5 Years</option>
      </select>
    </div>
    
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Calculating volume profile...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="chart-container-profile">
      <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
      <div v-else class="no-data">Insufficient volume data</div>
    </div>
  </div>
</template>


<script>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { ohlcvApi } from '@/services/ohlcvApi.js'
import { useTheme } from '@/composables/useTheme.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

export default {
  name: 'SmartMoneyVolumeProfile',
  components: { Bar },
  props: {
    symbol: { type: String, required: true },
    dataromaData: { type: Object, default: null }
  },
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loading: false,
      error: null,
      chartData: null,
      ohlcv: null,
      selectedRange: '6mo'
    }
  },
  computed: {
    selectedRangeLabel() {
        const map = { '6mo': '6M', '1y': '1Y', '5y': '5Y' };
        return map[this.selectedRange] || '6M';
    },
    isDark() { return this.theme === 'dark' },
    chartOptions() {
      return {
        indexAxis: 'y', // Horizontal Bar
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            title: { display: true, text: 'Total Volume', color: this.isDark ? '#aaa':'#666' },
            grid: { color: this.isDark ? '#333':'#eee' },
            ticks: { color: this.isDark ? '#aaa':'#666', callback: (val) => this.formatVolume(val) }
          },
          y: {
            display: true,
            title: { display: true, text: 'Price Zone', color: this.isDark ? '#aaa':'#666' },
            grid: { display: false },
            ticks: { color: this.isDark ? '#aaa':'#666', font: { size: 11 } }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: this.isDark ? '#E6E1DC' : '#666', generateLabels: this.generateLegendLabels }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const raw = context.raw;
                const dataIndex = context.dataIndex;
                // Chart displays reversed bins (Max -> Min), so we must reverse index to access original bins (Min -> Max)
                // Or simply reverse the original bins array if accessing linearly.
                // dataIndex 0 (Top of chart) = Max Price = Last Element of this.bins
                const bin = this.bins[this.bins.length - 1 - dataIndex];
                
                const volStr = this.formatVolume(raw);
                let label = `Total Vol: ${volStr}`;
                
                if (bin) {
                    if (bin.netSmartShares > 0) label += ` | Smart Net Buy: +${this.formatNumber(bin.netSmartShares)}`;
                    else if (bin.netSmartShares < 0) label += ` | Smart Net Sell: ${this.formatNumber(bin.netSmartShares)}`;
                    else label += ` | Smart Money: Neutral`;
                }
                return label;
              }
            }
          }
        }
      }
    },
    bins() {
        return this.generatedBins || [];
    }
  },
  watch: {
    symbol: { handler: 'loadProfileData', immediate: true },
    dataromaData: { handler: 'calculateProfile', deep: true }
  },
  methods: {
    async loadProfileData() {
      if (!this.symbol) return;
      this.loading = true;
      this.error = null;
      try {
        // Fetch daily data via ohlcvApi for selected range
        const data = await ohlcvApi.getOhlcv(this.symbol, '1d', this.selectedRange);
        if (data && data.timestamps && data.timestamps.length > 0) {
            this.ohlcv = data;
            this.calculateProfile();
        } else {
            throw new Error('No historical data found');
        }
      } catch (err) {
        console.error('Profile Load Error:', err);
        this.error = 'Failed to load volume profile data';
      } finally {
        this.loading = false;
      }
    },

    onRangeChange() {
        this.loadProfileData();
    },

    calculateProfile() {
      if (!this.ohlcv) return;
      
      const { high, low, close, volume } = this.ohlcv;
      
      // Calculate Cutoff Date for Filtering Smart Money Data
      const now = new Date();
      const cutoffDate = new Date();
      if (this.selectedRange === '6mo') cutoffDate.setMonth(now.getMonth() - 6);
      else if (this.selectedRange === '1y') cutoffDate.setFullYear(now.getFullYear() - 1);
      else if (this.selectedRange === '5y') cutoffDate.setFullYear(now.getFullYear() - 5);
      
      // 1. Determine Price Range (Min/Max of last 6mo)
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      
      // Filter out nulls
      const validHighs = high.filter(v => v!=null);
      const validLows = low.filter(v => v!=null);
      
      if (!validHighs.length) return;
      
      minPrice = Math.min(...validLows);
      maxPrice = Math.max(...validHighs);
      
      // 2. Create Bins (e.g., 50 bins)
      const binCount = 50;
      const binSize = (maxPrice - minPrice) / binCount;
      const bins = Array(binCount).fill(0).map((_, i) => ({
          min: minPrice + (i * binSize),
          max: minPrice + ((i + 1) * binSize),
          totalVolume: 0,
          smartBuy: 0,
          smartSell: 0,
          netSmartShares: 0
      }));
      
      // 3. Distribute Market Volume into Bins
      // Logic: For each day, distribute volume across the day's High-Low range? 
      // Simplified: Assign daily volume to the Close price bin (or spread between Low-High).
      // Spreading is more accurate for profile.
      
      for (let i = 0; i < close.length; i++) {
          if (!volume[i] || !high[i] || !low[i]) continue;
          
          const dayVol = volume[i];
          const dayLow = low[i];
          const dayHigh = high[i];
          
          // Identify which bins this day touches
          const startBin = Math.floor((dayLow - minPrice) / binSize);
          const endBin = Math.floor((dayHigh - minPrice) / binSize);
          
          // Clamp
          const safeStart = Math.max(0, Math.min(binCount - 1, startBin));
          const safeEnd = Math.max(0, Math.min(binCount - 1, endBin));
          
          const binsInvolved = (safeEnd - safeStart) + 1;
          const volPerBin = dayVol / binsInvolved;
          
          for (let b = safeStart; b <= safeEnd; b++) {
              bins[b].totalVolume += volPerBin;
          }
      }
      
      // 4. Map Smart Money Activity to Bins (Filtered by Date)
      // Source A: Insider Transactions (Exact Price)
      if (this.dataromaData && this.dataromaData.insiders && this.dataromaData.insiders.transactions) {
          this.dataromaData.insiders.transactions.forEach(tx => {
              // Filter by Date
              if (tx.transaction_date) {
                  const txDate = new Date(tx.transaction_date);
                  if (txDate < cutoffDate) return;
              }

              if (tx.price && tx.shares) {
                  const p = parseFloat(String(tx.price).replace('$','').replace(',',''));
                  let shares = tx.shares;
                  // Look for negative shares or Sales
                  const type = (tx.transaction_type || '').toLowerCase();
                  if (type.includes('sale') || type.includes('sell')) {
                       // treated as sell
                  } else if (type.includes('purchase') || type.includes('buy')) {
                       // treated as buy
                  } else {
                       // Option exercise etc? sometimes neutral. 
                       return;
                  }
                  
                  const isBuy = type.includes('purchase') || type.includes('buy');
                  
                  // Find bin
                  let bIdx = Math.floor((p - minPrice) / binSize);
                  bIdx = Math.max(0, Math.min(binCount - 1, bIdx));
                  
                  if (isBuy) bins[bIdx].smartBuy += shares;
                  else bins[bIdx].smartSell += shares;
                  
                  bins[bIdx].netSmartShares += (isBuy ? shares : -shares);
              }
          });
      }
      
      // Source B: SuperInvestors (Avg Price for Quarter)
      if (this.dataromaData && this.dataromaData.activity) {
          Object.entries(this.dataromaData.activity).forEach(([key, items]) => {
              // Parse Quarter Key "Q3  2025" or similar
              // Regex to extract Q and Y
              const match = key.match(/Q(\d)\s+(\d{4})/);
              if (match) {
                  const q = parseInt(match[1]);
                  const y = parseInt(match[2]);
                  
                  // Approximate Quarter End Date
                  // Q1: Mar 31, Q2: Jun 30, Q3: Sep 30, Q4: Dec 31
                  const qEndDate = new Date(y, q * 3, 0); // Day 0 of next month is last day of prev month
                  
                  if (qEndDate < cutoffDate) return; // Skip old quarters
                  
                  items.forEach(item => {
                      if (item.reported_price && item.shares_changed) {
                          const p = parseFloat(String(item.reported_price).replace('$','').replace(',',''));
                          const shares = Math.abs(item.shares_changed);
                          const isBuy = item.type === 'Buy' || item.type === 'Add';
                          
                          if (!isNaN(p)) {
                              let bIdx = Math.floor((p - minPrice) / binSize);
                              bIdx = Math.max(0, Math.min(binCount - 1, bIdx));
                              
                              if (isBuy) bins[bIdx].smartBuy += shares;
                              else bins[bIdx].smartSell += shares;
                              
                              bins[bIdx].netSmartShares += (isBuy ? shares : -shares);
                          }
                      }
                  });
              }
          });
      }
      
      this.generatedBins = bins;
      this.renderChart(bins);
    },
    
    renderChart(bins) {
        // Reverse bins to show High Price at Top (Standard Chart Y-Axis)
        // bins is Min -> Max. We want Max -> Min for display if Chart.js renders Index 0 at Top.
        const reversedBins = [...bins].reverse();
        
        const labels = reversedBins.map(b => `$${b.min.toFixed(2)} - $${b.max.toFixed(2)}`);
        const data = reversedBins.map(b => b.totalVolume);
        
        // Coloring Logic
        // Normalize Net Activity to determine intensity?
        // Simple logic: 
        // Net > 0 => Green Tint
        // Net < 0 => Red Tint
        // Neutral => Grey
        
        const backgroundColors = reversedBins.map(b => {
            if (b.netSmartShares > 1000) return '#28a745'; // Significant Buy (Green)
            if (b.netSmartShares > 0) return '#82c91e'; // Muted Green
            if (b.netSmartShares < -1000) return '#dc3545'; // Significant Sell (Red)
            if (b.netSmartShares < 0) return '#ff8787'; // Muted Red
            return this.isDark ? '#343a40' : '#e9ecef'; // Neutral Grey (Base)
        });
        
        const borderColors = reversedBins.map(b => {
             if (b.netSmartShares > 0) return '#28a745';
             if (b.netSmartShares < 0) return '#dc3545';
             return this.isDark ? '#495057' : '#ced4da';
        });

        this.chartData = {
            labels,
            datasets: [
                {
                    label: 'Volume Profile',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    barPercentage: 1.0, 
                    categoryPercentage: 1.0 // Make bars touch like histogram
                }
            ]
        };
    },
    
    generateLegendLabels(chart) {
        // Custom Legend to explain colors
        return [
           { text: 'Smart Money Buy', fillStyle: '#28a745', strokeStyle: '#28a745' },
           { text: 'Smart Money Sell', fillStyle: '#dc3545', strokeStyle: '#dc3545' },
           { text: 'Neutral / Retail', fillStyle: this.isDark ? '#343a40':'#e9ecef', strokeStyle: this.isDark ? '#495057':'#ced4da' }
        ];
    },
    
    formatVolume(num) {
        if (num > 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num > 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(0);
    },
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    }
  }
}
</script>

<style scoped>
.smart-money-volume-profile {
  /* margin-top: 1.5rem; Handled by card class */
  /* padding: 1.5rem; Handled by card class */
  height: 100%;
}

.header {
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.range-selector {
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--bg-card);
    color: var(--text-primary);
    font-size: 0.85rem;
    cursor: pointer;
}
.range-selector:focus {
    outline: none;
    border-color: var(--primary-color);
}
.header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.chart-container-profile {
    height: 400px; /* Tall enough for 50 bins */
    position: relative;
}

.loading-state, .error-state, .no-data {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: var(--text-muted);
}
.error-state { color: var(--error-color); }
.spinner {
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 3px solid var(--primary-color);
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
