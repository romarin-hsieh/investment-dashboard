
<template>
  <div class="sector-rotation-chart">
    <div class="chart-header">
      <div class="title-row">
        <h4>Smart Money Sector Allocation</h4>
        <span class="badge" v-if="managerCount > 0">{{ managerCount }} Superinvestors</span>
      </div>
      <div class="legend-filter">
        <!-- Optional: Custom Legend or Filters -->
      </div>
    </div>

    <div class="chart-container" v-if="!loading && !error">
      <Bar :data="chartData" :options="chartOptions" />
      <div ref="tooltip" class="external-tooltip"></div>
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      Loading Rotation Data...
    </div>

    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>
  </div>
</template>

<script>
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Yahoo Finance Sector Standards (Unified)
const SECTOR_COLORS = {
  "Technology": "#00d1b2", 
  "Financial Services": "#3273dc",
  "Healthcare": "#48c774",
  "Consumer Cyclical": "#ffdd57", 
  "Consumer Defensive": "#ff3860", 
  "Communication Services": "#00b89c",
  "Energy": "#ffb70f",
  "Industrials": "#8c67ef",
  "Basic Materials": "#e0c4fd",
  "Real Estate": "#ff9f43",
  "Utilities": "#209cee" 
}

const NORMALIZE_MAP = {
  "Information Technology": "Technology",
  "Technology": "Technology",
  "Financials": "Financial Services",
  "Financial Services": "Financial Services",
  "Consumer Staples": "Consumer Defensive",
  "Consumer Goods": "Consumer Defensive",
  "Consumer Defensive": "Consumer Defensive",
  "Consumer Discretionary": "Consumer Cyclical",
  "Services": "Consumer Cyclical", // Retail/Services often map here
  "Consumer Cyclical": "Consumer Cyclical",
  "Health Care": "Healthcare",
  "Healthcare": "Healthcare",
  "Industrial Goods": "Industrials",
  "Industrials": "Industrials",
  "Materials": "Basic Materials",
  "Basic Materials": "Basic Materials",
  "Energy": "Energy",
  "Communication Services": "Communication Services",
  "Utilities": "Utilities",
  "Real Estate": "Real Estate"
}

const DEFAULT_COLOR = "#b5b5b5"

export default {
  name: 'SectorRotationChart',
  components: { Bar },
  data() {
    return {
      loading: true,
      error: null,
      managerCount: 0,
      rotationData: {}, // Raw data
      chartData: {
        labels: [],
        datasets: []
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              callback: (value) => value + '%'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#888',
              usePointStyle: true,
              font: { size: 11 }
            }
          },
          tooltip: {
            enabled: false, 
            mode: 'index',
            intersect: false,
            external: this.externalTooltipHandler
          }
        }
      }
    }
  },
  async mounted() {
    await this.fetchData()
  },
  methods: {
    externalTooltipHandler(context) {
      // Tooltip Element
      const { chart, tooltip } = context
      const tooltipEl = this.$refs.tooltip

      // Hide if no tooltip
      if (tooltip.opacity === 0) {
        tooltipEl.style.opacity = 0
        return
      }

      // Set Text
      if (tooltip.body) {
        const titleLines = tooltip.title || []
        
        // --- HTML Generation ---
        let innerHtml = '<thead>'
        titleLines.forEach(title => {
          innerHtml += `<tr><th>${title}</th></tr>`
        })
        innerHtml += '</thead><tbody>'

        // Sorting: High % to Low % like the stack order usually implies, 
        // OR maintain the reversed dataset order we prefer.
        // Let's use the explicit itemSort logic embedded here directly
        const dataPoints = tooltip.dataPoints.sort((a, b) => b.datasetIndex - a.datasetIndex)

        dataPoints.forEach(dataPoint => {
          const dataset = chart.data.datasets[dataPoint.datasetIndex]
          const currentVal = dataPoint.parsed.y || 0
          const label = dataset.label
          const color = dataset.backgroundColor
          
          let changeHtml = ''
          const dataIndex = dataPoint.dataIndex

          if (dataIndex > 0) {
            const prevData = dataset.data[dataIndex - 1]
            const prevVal = typeof prevData === 'number' ? prevData : (prevData?.y || 0)
            const diff = currentVal - prevVal
            
             if (diff !== 0) {
                const sign = diff > 0 ? '+' : ''
                const colorStyle = diff > 0 ? 'color:#48c774' : 'color:#ff3860'
                changeHtml = `<span style="${colorStyle}; font-weight:600">(${sign}${diff.toFixed(1)}%)</span>`
             }
          }

          innerHtml += `
            <tr>
              <td>
                <span class="color-box" style="background:${color}"></span>
                ${label}: ${currentVal.toFixed(1)}% ${changeHtml}
              </td>
            </tr>
          `
        })
        innerHtml += '</tbody>'
        tooltipEl.innerHTML = `<table>${innerHtml}</table>`

        // --- Positioning ---
        // We moved tooltip inside .chart-container, so coordinates are relative to the chart area
        const chartWidth = chart.width
        const chartHeight = chart.height
        
        // Get dimensions of the rendered tooltip to use for calculations
        const tooltipWidth = tooltipEl.offsetWidth
        const tooltipHeight = tooltipEl.offsetHeight

        let left = tooltip.caretX + 15 // Default: Right of cursor
        let top = tooltip.caretY

        // 1. Horizontal Boundary Check
        // If it overflows right edge, flip to left of cursor
        if (left + tooltipWidth > chartWidth) {
          left = tooltip.caretX - tooltipWidth - 15
        }

        // 2. Vertical Alignment & Boundary Check
        // Try to center vertically, or keep top aligned? Default is top aligned to cursor Y.
        // But if it overflows bottom, we must shift it UP.
        
        if (top + tooltipHeight > chartHeight) {
           top = chartHeight - tooltipHeight
        }
        
        // Ensure it doesn't go off top either
        if (top < 0) {
           top = 0
        }

        tooltipEl.style.opacity = 1
        tooltipEl.style.left = left + 'px'
        tooltipEl.style.top = top + 'px'
        tooltipEl.style.transform = 'none' 
      }
    },
    async fetchData() {
      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
          ? import.meta.env.BASE_URL 
          : import.meta.env.BASE_URL + '/'
        const response = await fetch(`${baseUrl}data/smart_money_sector_rotation.json`)
        if (!response.ok) throw new Error("Failed to load data")
        
        const data = await response.json()
        this.managerCount = data.managers_scraped ? data.managers_scraped.length : 0
        this.processData(data.rotation)
        this.loading = false
      } catch (err) {
        console.error(err)
        this.error = "Data not available yet. Scraping in progress."
        this.loading = false
      }
    },
    processData(rotationMap) {
      if (!rotationMap) return

      // Sort Periods (e.g., "2024 Q1", "2024 Q2")
      const periods = Object.keys(rotationMap).sort()
      this.chartData.labels = periods

      // Normalization + Aggregation Step
      // We need to create a new map: normalizedMap[period][UnifiedSector] = Sum(Percentages)
      const normalizedMap = {}
      const allSectors = new Set()

      periods.forEach(p => {
        normalizedMap[p] = {}
        const rawSectors = rotationMap[p]
        
        Object.entries(rawSectors).forEach(([rawName, val]) => {
            // Filter out invalid or missing sectors
            if (!rawName || rawName === 'NA' || rawName === 'N/A' || rawName === 'Unknown' || rawName.trim() === '') {
                return 
            }

            const unifiedName = NORMALIZE_MAP[rawName] || rawName 
            
            // STRICT FILTER: Only allow sectors that are in our standard set
            if (!SECTOR_COLORS[unifiedName]) {
                return
            }

            allSectors.add(unifiedName)
            
            if (!normalizedMap[p][unifiedName]) {
                normalizedMap[p][unifiedName] = 0
            }
            normalizedMap[p][unifiedName] += val
        })

        // Re-Normalize to 100%
        // Calculate current total after filtering
        const validTotal = Object.values(normalizedMap[p]).reduce((sum, val) => sum + val, 0)
        
        if (validTotal > 0 && Math.abs(validTotal - 100) > 0.1) {
             const scaleFactor = 100 / validTotal
             Object.keys(normalizedMap[p]).forEach(key => {
                 // Adjust value and round to specified precision (2 decimals)
                 normalizedMap[p][key] = Math.round((normalizedMap[p][key] * scaleFactor) * 100) / 100
             })
        }
      })

      const sectorsList = Array.from(allSectors).sort()

      // Build Datasets
      const datasets = sectorsList.map(sector => {
        const color = SECTOR_COLORS[sector] || DEFAULT_COLOR

        return {
          label: sector,
          backgroundColor: color,
          // Use normalizedMap[p][sector]
          data: periods.map(p => normalizedMap[p][sector] || 0),
          barPercentage: 0.6,
        }
      })

      this.chartData = {
        labels: periods,
        datasets: datasets
      }
    }
  }
}
</script>

<style scoped>
.sector-rotation-chart {
  width: 100%;
  height: 450px;
  display: flex;
  flex-direction: column;
  position: relative; /* For tooltip absolute positioning */
}

/* External Tooltip Styling */
.external-tooltip {
  opacity: 0;
  position: absolute;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border-radius: 4px;
  pointer-events: none;
  /* transform is now handled in JS for smart positioning */
  transition: all 0.1s ease;
  padding: 8px;
  z-index: 100;
  font-size: 0.85rem;
  line-height: 1.4;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

/* Deep selector because HTML is injected dynamically */
.external-tooltip :deep(table) {
  margin: 0;
  border-spacing: 0;
}
.external-tooltip :deep(th) {
  text-align: left;
  padding-bottom: 6px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 4px;
  display: block;
}
.external-tooltip :deep(td) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}
.external-tooltip :deep(.color-box) {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.external-tooltip :deep(.text-green) {
  color: #48c774; /* Bulma Success Green */
  font-weight: 600;
}
.external-tooltip :deep(.text-red) {
  color: #ff3860; /* Bulma Danger Red */
  font-weight: 600;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-row h4 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.badge {
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.chart-container {
  flex: 1;
  position: relative;
  min-height: 0; /* Important for flex child chart.js */
}

.loading-state, .error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
