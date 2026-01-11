<template>
  <div class="cisd-widget">
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
    </div>

    <!-- Settings Modal -->
    <GenericSettingsModal
      v-model:isOpen="showSettings"
      title="CISD Projections Settings"
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
import { CisdAlgo } from '@/utils/technical-analysis/CisdAlgo.js';
import { ShapeType } from '@/utils/technical-analysis/StandardPrimitives.js';
import { useTheme } from '@/composables/useTheme.js';
// Components
import GenericSettingsModal from '@/components/GenericSettingsModal.vue';

export default {
  name: 'CisdWidget',
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
        runBarsThreshold: 2,
        cisdFilter: false,
        cisdFilterLength: 20,
        invalidateCISD: true,
        
        level1: true, level1Mult: 1.0, level1Style: 'solid',
        level2: true, level2Mult: 2.0, level2Style: 'solid',
        level3: true, level3Mult: 2.5, level3Style: 'solid',
        level4: true, level4Mult: 4.0, level4Style: 'solid',
        level5: true, level5Mult: 4.5, level5Style: 'solid',

        baseLevel: true,
        baseLevelStyle: 'dotted',
        labelsSize: 12,
        bullishColor: '#089981', 
        bearishColor: '#F23645',
        backgroundFill: true
      },
      
      // Settings Schema
      settingsSchema: [
        { key: 'runBarsThreshold', label: 'Bars Threshold', type: 'number', min: 1, group: 'Inputs' },
        { key: 'cisdFilter', label: 'CISD Filter', type: 'checkbox', group: 'Inputs' },
        { key: 'cisdFilterLength', label: 'Filter Length', type: 'number', min: 1, group: 'Inputs' },
        { key: 'invalidateCISD', label: 'Invalidate on CHoCH', type: 'checkbox', group: 'Inputs' },
        
        { key: 'bullishColor', label: 'Bullish Color', type: 'text', group: 'Style' },
        { key: 'bearishColor', label: 'Bearish Color', type: 'text', group: 'Style' },
        { key: 'backgroundFill', label: 'Background Fill', type: 'checkbox', group: 'Style' },
        { key: 'baseLevel', label: 'Show Base Level', type: 'checkbox', group: 'Style' },
        { key: 'labelsSize', label: 'Labels Size', type: 'number', min: 8, group: 'Style' },

        { key: 'level1', label: 'Show Level 1', type: 'checkbox', group: 'Levels' },
        { key: 'level1Mult', label: 'Level 1 Multiplier', type: 'number', step: 0.1, group: 'Levels' },
        { key: 'level2', label: 'Show Level 2', type: 'checkbox', group: 'Levels' },
        { key: 'level2Mult', label: 'Level 2 Multiplier', type: 'number', step: 0.1, group: 'Levels' },
        { key: 'level3', label: 'Show Level 3', type: 'checkbox', group: 'Levels' },
        { key: 'level3Mult', label: 'Level 3 Multiplier', type: 'number', step: 0.1, group: 'Levels' },
      ],

      resizeObserver: null,
      ohlcvData: null
    };
  },
  mounted() {
    this.initChart();
    this.loadData();
    
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
      this.handleResize();
    },

    getChartOptions() {
        const isDark = this.theme === 'dark';
        const textColor = isDark ? '#D9D9D9' : '#191919';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const bgColor = 'transparent'; 

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
            const data = await ohlcvApi.getOhlcv(this.symbol, '1d', '5y');
            this.ohlcvData = data;
            
            const chartData = data.timestamps.map((t, i) => ({
                time: t / 1000, 
                open: data.open[i],
                high: data.high[i],
                low: data.low[i],
                close: data.close[i]
            }));

            this.candlestickSeries.setData(chartData);
            this.runAlgo();
        } catch (e) {
            console.error('Failed to load chart data', e);
        } finally {
            this.loading = false;
        }
    },

    runAlgo() {
        if (!this.ohlcvData) return;
        
        if (!this.algo) {
            this.algo = new CisdAlgo(this.ohlcvData);
        }
        
        this.primitives = this.algo.calculate(this.algoConfig);
        console.log(`CISD Algo produced ${this.primitives.length} shapes`);
        
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
        
        const dpr = window.devicePixelRatio || 1;
        this.$refs.overlayCanvas.width = width * dpr;
        this.$refs.overlayCanvas.height = height * dpr;
        this.$refs.overlayCanvas.style.width = width + 'px';
        this.$refs.overlayCanvas.style.height = height + 'px';
        
        const ctx = this.$refs.overlayCanvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        this.drawOverlay();
    },

    drawOverlay() {
       if (!this.chart || !this.candlestickSeries || !this.$refs.overlayCanvas) return;
       const ctx = this.$refs.overlayCanvas.getContext('2d');
       const canvas = this.$refs.overlayCanvas;

       const width = canvas.width / (window.devicePixelRatio || 1);
       const height = canvas.height / (window.devicePixelRatio || 1);
       
       ctx.clearRect(0, 0, width, height);
       
       const timeScale = this.chart.timeScale();
       
       // Clip Drawing Area to prevent overlay on Axes
       // Lightweight charts places the time scale at bottom and price scale at right.
       // We can get their internal dimensions effectively or use a safe margin.
       // API v4 doesn't easily give pixel width of scales directly on `chart`.
       // But we can approximate or use logic. 
       // Better: The chart plot area is usually `chart.timeScale().width()` - ??
       // Actually `timeScale().width()` IS the generic width.
       // Let's rely on standard Compositing: 
       // If visual artifacts persist, we can try to constrain `x` in primitives.
       // But global clip is better.
       // Assuming right price scale width ~50-60px? It varies.
       // Let's ask the chart for the right price scale width.
       const priceScaleWidth = this.chart.priceScale('right').width();
       const timeScaleHeight = this.chart.timeScale().height();
       
       ctx.save();
       ctx.beginPath();
       ctx.rect(0, 0, width - priceScaleWidth, height - timeScaleHeight);
       ctx.clip();
       
       this.primitives.forEach(shape => {
           if (shape.type === ShapeType.LINE) {
               this.drawLine(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.BOX) {
               this.drawBox(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.LABEL) {
               this.drawLabel(ctx, shape, timeScale);
           } else if (shape.type === ShapeType.FILLED_AREA) {
               this.drawFilledArea(ctx, shape, timeScale);
           }
       });
       
       ctx.restore();
    },
    
    timeToX(time, timeScale) {
        return timeScale.timeToCoordinate(time / 1000);
    },
    
    priceToY(price) {
        return this.candlestickSeries.priceToCoordinate(price);
    },

    drawFilledArea(ctx, area, timeScale) {
        if (!area.points || area.points.length === 0) return;
        
        ctx.fillStyle = area.color;
        ctx.beginPath();
        
        let first = true;
        
        // Forward Loop (Top Line)
        for (let i = 0; i < area.points.length; i++) {
            const p = area.points[i];
            const x = this.timeToX(p.time, timeScale);
            const y = this.priceToY(p.yTop);
            
            if (x === null || y === null) continue;
            
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        // Backward Loop (Bottom Line)
        for (let i = area.points.length - 1; i >= 0; i--) {
            const p = area.points[i];
            const x = this.timeToX(p.time, timeScale);
            const y = this.priceToY(p.yBottom);
            
            if (x === null || y === null) continue;
            
            ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        ctx.fill();
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
        const y1 = this.priceToY(box.y1); 
        const y2 = this.priceToY(box.y2); 
        
        if (x1 === null || x2 === null || y1 === null || y2 === null) return;
        
        const w = x2 - x1;
        const h = y2 - y1; 
        
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
        ctx.textBaseline = 'middle';
        ctx.fillText(label.text, x, y);
    }
  }
}
</script>

<style scoped>
.cisd-widget {
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  height: 600px; /* Default Height */
  overflow: hidden;
  position: relative;
}

.settings-floating-btn {
  position: absolute;
  top: 10px;
  right: 80px; 
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
  pointer-events: none; 
  z-index: 2;
}
</style>
