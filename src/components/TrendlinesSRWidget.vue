<template>
  <div class="trendlines-sr-widget">
    <!-- Floating Settings Button (Top-Right, avoiding Y-Axis) -->
    <button class="settings-floating-btn" @click="showSettings = true" title="Indicator Settings">
      ⚙️
    </button>

    <!-- Chart Container -->
    <div class="chart-wrapper" ref="chartContainer">
      <!-- The Chart (Lightweight Charts) -->
      <div ref="chartDiv" class="lw-chart"></div>

      <!-- The Overlay (Canvas) -->
      <canvas ref="overlayCanvas" class="chart-overlay"></canvas>
      
      <!-- Tooltip -->
      <div 
        v-if="tooltip.visible" 
        class="chart-tooltip" 
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        {{ tooltip.text }}
      </div>
    </div>

    <!-- Settings Modal -->
    <GenericSettingsModal
      v-model:isOpen="showSettings"
      title="Trendlines & SR Settings"
      :schema="settingsSchema"
      :modelValue="algoConfig"
      @save="onSettingsSave"
    />
  </div>
</template>

<script>
// Libraries
import { createChart } from 'lightweight-charts';
// Services & Algos
import { ohlcvApi } from '@/services/ohlcvApi.js';
import { TrendlinesAlgo } from '@/utils/technical-analysis/TrendlinesAlgo.js';
import { ShapeType } from '@/utils/technical-analysis/StandardPrimitives.js';
import { useTheme } from '@/composables/useTheme.js';
// Components
import GenericSettingsModal from '@/components/GenericSettingsModal.vue';

export default {
  name: 'TrendlinesSRWidget',
  components: {
    GenericSettingsModal
  },
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    }
  },
  setup() {
    const { theme } = useTheme();
    return { theme };
  },
  data() {
    return {
      loading: false,
      showSettings: false,
      chart: null,
      candlestickSeries: null,
      primitives: [], // List of Drawables from Algo
      
      // Algorithm + Config
      algo: null,
      algoConfig: {
        // Trendlines
        leftBars: 10,
        rightBars: 10,
        extendBars: 50,
        period: 100,
        multiplier: 1.0,
        highLineColor: 'rgba(255, 59, 48, 1)',
        lowLineColor: 'rgba(52, 199, 89, 1)',
        
        // Volume Delta
        vdLookback: 200,
        vdZoneColorDemand: 'rgba(52, 199, 89, 0.3)',
        vdZoneColorSupply: 'rgba(255, 59, 48, 0.3)',
        vdZoneNum: 3,
        vdBarAlign: 'left'
      },
      
      // Settings Schema (Driven by data above)
      settingsSchema: [
        { key: 'leftBars', label: 'Pivot Left Bars', type: 'number', min: 1, group: 'Inputs' },
        { key: 'rightBars', label: 'Pivot Right Bars', type: 'number', min: 1, group: 'Inputs' },
        { key: 'extendBars', label: 'Extend Lines', type: 'number', min: 0, group: 'Inputs' },
        { key: 'multiplier', label: 'Tolerance Multiplier', type: 'number', step: 0.1, group: 'Inputs' },
        { key: 'highLineColor', label: 'Resistance Color', type: 'text', group: 'Style' },
        { key: 'lowLineColor', label: 'Support Color', type: 'text', group: 'Style' },
        { key: 'vdZoneColorSupply', label: 'Supply Zone Color', type: 'text', group: 'Style' },

        { key: 'vdZoneColorDemand', label: 'Demand Zone Color', type: 'text', group: 'Style' },
        { key: 'vdBarAlign', label: 'Bar Alignment', type: 'select', options: ['right', 'left'], group: 'Style' }
      ],

      tooltip: { visible: false, x: 0, y: 0, text: '' },
      resizeObserver: null,
      
      // Data Cache
      ohlcvData: null
    };
  },
  mounted() {
    this.initChart();
    this.loadData();
    
    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
    });
    this.resizeObserver.observe(this.$refs.chartContainer);
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.remove();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  watch: {
    symbol() {
        this.loadData();
    },
    theme() {
        this.updateChartTheme();
    }
  },
  methods: {
    initChart() {
      const chartOptions = this.getChartOptions();
      this.chart = createChart(this.$refs.chartDiv, chartOptions);
      this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor: '#26a69a', 
          downColor: '#ef5350', 
          borderVisible: false, 
          wickUpColor: '#26a69a', 
          wickDownColor: '#ef5350' 
      });

      // Subscribe to visible range changes to redraw overlay
      this.chart.timeScale().subscribeVisibleTimeRangeChange(this.drawOverlay);
      
      // Sync Canvas Size
      this.handleResize();
    },

    getChartOptions() {
        const isDark = this.theme === 'dark';
        const textColor = isDark ? '#D9D9D9' : '#191919';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const bgColor = 'transparent'; // Let CSS handle background

        return {
            layout: {
                background: { type: 'solid', color: bgColor },
                textColor: textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            rightPriceScale: {
                borderColor: gridColor,
            },
            timeScale: {
                borderColor: gridColor,
                timeVisible: true,
            },
            autoSize: true
        };
    },

    updateChartTheme() {
        if (!this.chart) return;
        this.chart.applyOptions(this.getChartOptions());
    },

    async loadData() {
        this.loading = true;
        try {
            // Fetch 5Y data to ensure we have enough for drawing
            const data = await ohlcvApi.getOhlcv(this.symbol, '1d', '5y');
            this.ohlcvData = data;
            
            // Transform for Lightweight Charts
            // API returns { timestamps: [], open: [], ... }
            const chartData = data.timestamps.map((t, i) => ({
                time: t / 1000, // Unix Timestamp
                open: data.open[i],
                high: data.high[i],
                low: data.low[i],
                close: data.close[i]
            }));

            this.candlestickSeries.setData(chartData);
            
            // Run Algo
            this.runAlgo();
            
            // Default View: Last 6 months
            // this.chart.timeScale().fitContent(); // Fits all
            // Or set visible range... let's just fit content for now
            // But 5Y is too long. Let's try to set visible range to last 200 bars manually?
            // fitContent is safer for V1.
            
        } catch (e) {
            console.error('Failed to load chart data', e);
        } finally {
            this.loading = false;
        }
    },

    runAlgo() {
        if (!this.ohlcvData) return;
        
        if (!this.algo) {
            this.algo = new TrendlinesAlgo(this.ohlcvData);
        }
        
        // Calculate Primitives
        this.primitives = this.algo.calculate(this.algoConfig);
        console.log(`Algo produced ${this.primitives.length} shapes`);
        
        // Trigger Redraw
        // Need to wait for next tick for canvas to be ready?
        requestAnimationFrame(this.drawOverlay);
    },

    onSettingsSave(newConfig) {
        this.algoConfig = { ...newConfig };
        this.runAlgo();
    },

    handleResize() {
        if (!this.$refs.chartContainer || !this.$refs.overlayCanvas) return;
        const width = this.$refs.chartContainer.clientWidth;
        const height = this.$refs.chartContainer.clientHeight;
        
        // Update Chart
        // this.chart.resize(width, height); // autosize: true handles this usually, but explicit is ok
        
        // Update Canvas (HiDPI support)
        const dpr = window.devicePixelRatio || 1;
        this.$refs.overlayCanvas.width = width * dpr;
        this.$refs.overlayCanvas.height = height * dpr;
        this.$refs.overlayCanvas.style.width = width + 'px';
        this.$refs.overlayCanvas.style.height = height + 'px';
        
        const ctx = this.$refs.overlayCanvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        this.drawOverlay();
    },

    // ============================================================
    // THE OVERLAY DRAWING ENGINE
    // ============================================================
    drawOverlay() {
       if (!this.chart || !this.candlestickSeries || !this.$refs.overlayCanvas) return;
       const ctx = this.$refs.overlayCanvas.getContext('2d');
       const canvas = this.$refs.overlayCanvas;
       
       // Clear Canvas
       // Note: canvas.width is scaled by DPR, so clearing simple rect works
       ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears everything
       
       // Get Coordinate Conversion Methods
       // We need valid time range to filter primitives? 
       // Or usually easier to just try to project all that are within range.
       // Primitives are simple lines/boxes, iterating 100-500 items is fast.
       
       const timeScale = this.chart.timeScale();
       
       this.primitives.forEach(shape => {
           if (shape.type === ShapeType.LINE) {
               this.drawLine(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.BOX) {
               this.drawBox(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.LABEL) {
               this.drawLabel(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.ARROW) {
               this.drawArrow(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.SIDE_BAR) {
               this.drawSideBar(ctx, shape, timeScale);
           }
       });
    },
    
    // Coordinate Helpers
    timeToX(time, timeScale) {
        // time is unix * 1000 in primitive? Algo uses original timestamps (ms)
        // Lightweight charts uses seconds for unix.
        // Wait, ohlcvApi returns ms. Lightweight charts expects seconds.
        // In loadData I divided by 1000.
        // So primitives hold ms timestamps. Need to divide by 1000.
        return timeScale.timeToCoordinate(time / 1000);
    },
    
    priceToY(price) {
        return this.candlestickSeries.priceToCoordinate(price);
    },

    drawLine(ctx, line, timeScale) {
        const x1 = this.timeToX(line.x1, timeScale);
        const x2 = this.timeToX(line.x2, timeScale);
        const y1 = this.priceToY(line.y1);
        const y2 = this.priceToY(line.y2);

        if (x1 === null || x2 === null || y1 === null || y2 === null) return;
        
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        
        if (line.style === 'dashed') ctx.setLineDash([5, 5]);
        else if (line.style === 'dotted') ctx.setLineDash([2, 2]);
        else ctx.setLineDash([]);
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    },

    drawBox(ctx, box, timeScale) {
        const x1 = this.timeToX(box.x1, timeScale); 
        const x2 = this.timeToX(box.x2, timeScale);
        const y1 = this.priceToY(box.y1); // Top Price
        const y2 = this.priceToY(box.y2); // Bottom Price
        
        if (x1 === null || x2 === null || y1 === null || y2 === null) return;
        
        const w = x2 - x1;
        const h = y2 - y1; // y increases downwards
        
        ctx.fillStyle = box.color;
        ctx.fillRect(x1, y1, w, h);
        
        if (box.borderWidth > 0) {
            ctx.strokeStyle = box.borderColor;
            ctx.lineWidth = box.borderWidth;
            ctx.setLineDash([]);
            ctx.strokeRect(x1, y1, w, h);
        }
    },
    
    drawLabel(ctx, label, timeScale) {
        const x = this.timeToX(label.x, timeScale);
        const y = this.priceToY(label.y);
        
        if (x === null || y === null) return;
        
        ctx.fillStyle = label.textColor;
        ctx.font = `${label.fontSize}px sans-serif`;
        ctx.textAlign = label.align;
        ctx.textBaseline = label.valign === 'bottom' ? 'bottom' : (label.valign === 'middle' ? 'middle' : 'top');
        ctx.fillText(label.text, x, y);
    },

    drawArrow(ctx, arrow, timeScale) {
        const x = this.timeToX(arrow.x, timeScale);
        const y = this.priceToY(arrow.y);
        if (x === null || y === null) return;
        
        const size = 12;
        ctx.fillStyle = arrow.color;
        ctx.beginPath();
        
        if (arrow.direction === 'up') {
            // Up Arrow (Triangle pointing up)
            ctx.moveTo(x, y + size);
            ctx.lineTo(x - size/2, y + size*2);
            ctx.lineTo(x + size/2, y + size*2);
        } else {
            // Down Arrow
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size/2, y - size*2);
            ctx.lineTo(x + size/2, y - size*2);
        }
        ctx.fill();
        
        // Optional text inside arrow? usually specific logic.
    },

    drawSideBar(ctx, bar, timeScale) {
        const y1 = this.priceToY(bar.y1); // Top (price-wise higher, canvas y lower) -- wait, y increases down
        // priceToY: Higher price = Lower Y
        // So y1 (Top Price) should be smaller Y value than y2 (Bottom Price)
        const y2 = this.priceToY(bar.y2);
        
        if (y1 === null || y2 === null) return;
        
        const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1); // Logic width
        // Wait, context is already scaled. ctx.canvas.width is the physical width. 
        // If we used ctx.scale(dpr, dpr), then logical coords 0..clientWidth are valid.
        // Let's rely on this.$refs.chartContainer.clientWidth
        const fullWidth = this.$refs.chartContainer.clientWidth;
        
        const barWidth = fullWidth * bar.widthPct;
        
        let xStart;
        if (bar.align === 'left') {
             xStart = 0; // Starts from left edge
        } else {
             xStart = fullWidth - barWidth; // Starts from right edge (Default)
        }

        const height = Math.abs(y2 - y1);
        
        // Draw Bar
        ctx.fillStyle = bar.color;
        ctx.fillRect(xStart, Math.min(y1, y2), barWidth, height);
        
        // Draw Text (Delta %) centered in bar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        
        const centerX = xStart + barWidth / 2;
        const centerY = Math.min(y1, y2) + height / 2;
        
        ctx.fillText(bar.text, centerX, centerY);
        
        ctx.shadowBlur = 0; // Reset
    }
  }
}
</script>

<style scoped>
.trendlines-sr-widget {
  background: var(--bg-card);
  /* Removed border and border-radius to avoid double-grouping visuals */
  display: flex;
  flex-direction: column;
  height: 600px; /* Default Height */
  overflow: hidden;
  position: relative;
}

.settings-floating-btn {
  position: absolute;
  top: 10px;
  right: 80px; /* Avoid Y-axis (approx 60px) */
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.settings-floating-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  opacity: 1;
}

.chart-wrapper {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
}

.lw-chart {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass to chart */
  z-index: 2;
}

.chart-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
}
</style>
