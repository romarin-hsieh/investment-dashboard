<template>
  <div class="trendlines-sr-widget">
    <!-- Floating Settings Button (Top-Right, avoiding Y-Axis) -->
    <button class="settings-floating-btn" @click="showSettings = true" :title="$t('trendlines.settingsButtonTitle')">
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
      :title="$t('trendlines.settingsModalTitle')"
      :schema="settingsSchema"
      :modelValue="algoConfig"
      @save="onSettingsSave"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// Libraries
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type ITimeScaleApi,
  type Time,
  type UTCTimestamp,
  type CandlestickData,
  type DeepPartial,
  type ChartOptions
} from 'lightweight-charts';
// Services & Algos
import { ohlcvApi } from '@/services/ohlcvApi';
import { TrendlinesAlgo, type OhlcvData as TrendlinesOhlcvData, type TrendlinesSettings } from '@/utils/technical-analysis/TrendlinesAlgo';
import { ShapeType, type LineObject, type BoxObject, type LabelObject, type ArrowObject, type SideBarObject } from '@/utils/technical-analysis/StandardPrimitives';
import { useTheme } from '@/composables/useTheme';
import { getToken, getTokenRgba } from '@/utils/designTokens';
// Components
import GenericSettingsModal from '@/components/GenericSettingsModal.vue';

/** The drawable primitives the trendlines algo emits. */
type TrendlineShape = LineObject | BoxObject | LabelObject | ArrowObject | SideBarObject;

export default defineComponent({
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
      chart: null as IChartApi | null,
      candlestickSeries: null as ISeriesApi<'Candlestick'> | null,
      primitives: [] as TrendlineShape[], // List of Drawables from Algo

      // Algorithm + Config
      algo: null as TrendlinesAlgo | null,
      algoConfig: {
        // Trendlines
        leftBars: 10,
        rightBars: 10,
        extendBars: 50,
        period: 100,
        multiplier: 1.0,
        highLineColor: getToken('--chart-down-alt'),
        lowLineColor: getToken('--chart-up-alt'),
        
        // Volume Delta
        vdLookback: 200,
        vdZoneColorDemand: getTokenRgba('--chart-up-alt', 0.3),
        vdZoneColorSupply: getTokenRgba('--chart-down-alt', 0.3),
        vdZoneNum: 3,
        vdBarAlign: 'left'
      },
      
      // Settings Schema (Driven by data above)
      settingsSchema: [
        { key: 'leftBars', label: this.$t('trendlines.settings.leftBars'), type: 'number', min: 1, group: this.$t('trendlines.settings.groupInputs') },
        { key: 'rightBars', label: this.$t('trendlines.settings.rightBars'), type: 'number', min: 1, group: this.$t('trendlines.settings.groupInputs') },
        { key: 'extendBars', label: this.$t('trendlines.settings.extendBars'), type: 'number', min: 0, group: this.$t('trendlines.settings.groupInputs') },
        { key: 'multiplier', label: this.$t('trendlines.settings.multiplier'), type: 'number', step: 0.1, group: this.$t('trendlines.settings.groupInputs') },
        { key: 'highLineColor', label: this.$t('trendlines.settings.highLineColor'), type: 'text', group: this.$t('trendlines.settings.groupStyle') },
        { key: 'lowLineColor', label: this.$t('trendlines.settings.lowLineColor'), type: 'text', group: this.$t('trendlines.settings.groupStyle') },
        { key: 'vdZoneColorSupply', label: this.$t('trendlines.settings.vdZoneColorSupply'), type: 'text', group: this.$t('trendlines.settings.groupStyle') },

        { key: 'vdZoneColorDemand', label: this.$t('trendlines.settings.vdZoneColorDemand'), type: 'text', group: this.$t('trendlines.settings.groupStyle') },
        { key: 'vdBarAlign', label: this.$t('trendlines.settings.vdBarAlign'), type: 'select', options: ['right', 'left'], group: this.$t('trendlines.settings.groupStyle') }
      ],

      tooltip: { visible: false, x: 0, y: 0, text: '' },
      resizeObserver: null as ResizeObserver | null,

      // Data Cache
      ohlcvData: null as TrendlinesOhlcvData | null
    };
  },
  mounted() {
    this.initChart();
    this.loadData();
    
    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
    });
    this.resizeObserver.observe(this.$refs['chartContainer'] as Element);
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
      this.chart = createChart(this.$refs['chartDiv'] as HTMLElement, chartOptions);
      this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor: getToken('--chart-up'),
          downColor: getToken('--chart-down'),
          borderVisible: false,
          wickUpColor: getToken('--chart-up'),
          wickDownColor: getToken('--chart-down')
      });

      // Subscribe to visible range changes to redraw overlay
      this.chart.timeScale().subscribeVisibleTimeRangeChange(() => this.drawOverlay());

      // Sync Canvas Size
      this.handleResize();
    },

    getChartOptions(): DeepPartial<ChartOptions> {
        const textColor = getToken('--text-primary');
        const gridColor = getToken('--chart-grid');
        const bgColor = 'transparent'; // Let CSS handle background

        return {
            layout: {
                background: { type: ColorType.Solid, color: bgColor },
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
            if (!data || !data.timestamps) return;
            // ohlcvApi's OhlcvData is loose (optional / nullable arrays); the algo
            // needs the strict all-number shape, hence the cast at this boundary.
            this.ohlcvData = data as TrendlinesOhlcvData;

            // Transform for Lightweight Charts
            // API returns { timestamps: [], open: [], ... }
            const timestamps = data.timestamps;
            const open = data.open ?? [];
            const high = data.high ?? [];
            const low = data.low ?? [];
            const close = data.close ?? [];
            const chartData: CandlestickData[] = timestamps.map((t, i) => ({
                time: (t / 1000) as UTCTimestamp, // Unix Timestamp
                open: open[i],
                high: high[i],
                low: low[i],
                close: close[i] as number
            }));

            this.candlestickSeries?.setData(chartData);
            
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
        const ohlcv = this.ohlcvData;
        if (!ohlcv) return;

        if (!this.algo) {
            this.algo = new TrendlinesAlgo(ohlcv);
        }

        // Calculate Primitives
        this.primitives = this.algo.calculate(this.algoConfig);
        console.log(`Algo produced ${this.primitives.length} shapes`);

        // Trigger Redraw
        // Need to wait for next tick for canvas to be ready?
        requestAnimationFrame(() => this.drawOverlay());
    },

    onSettingsSave(newConfig: Partial<TrendlinesSettings>) {
        this.algoConfig = { ...this.algoConfig, ...newConfig };
        this.runAlgo();
    },

    handleResize() {
        const container = this.$refs['chartContainer'] as HTMLElement | undefined;
        const canvas = this.$refs['overlayCanvas'] as HTMLCanvasElement | undefined;
        if (!container || !canvas) return;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Update Chart
        // this.chart.resize(width, height); // autosize: true handles this usually, but explicit is ok

        // Update Canvas (HiDPI support)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        this.drawOverlay();
    },

    // ============================================================
    // THE OVERLAY DRAWING ENGINE
    // ============================================================
    drawOverlay() {
       const canvas = this.$refs['overlayCanvas'] as HTMLCanvasElement | undefined;
       if (!this.chart || !this.candlestickSeries || !canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;

       // Clear Canvas
       // Note: canvas.width is scaled by DPR, so clearing simple rect works
       ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears everything

       // Get Coordinate Conversion Methods
       // We need valid time range to filter primitives?
       // Or usually easier to just try to project all that are within range.
       // Primitives are simple lines/boxes, iterating 100-500 items is fast.

       const timeScale = this.chart.timeScale();

       // ShapeType is a plain object (not `as const`), so `.type` is `string`
       // and can't discriminate the union — cast to the branch's concrete type.
       this.primitives.forEach(shape => {
           if (shape.type === ShapeType.LINE) {
               this.drawLine(ctx, shape as LineObject, timeScale);
           } else if (shape.type === ShapeType.BOX) {
               this.drawBox(ctx, shape as BoxObject, timeScale);
           } else if (shape.type === ShapeType.LABEL) {
               this.drawLabel(ctx, shape as LabelObject, timeScale);
           } else if (shape.type === ShapeType.ARROW) {
               this.drawArrow(ctx, shape as ArrowObject, timeScale);
           } else if (shape.type === ShapeType.SIDE_BAR) {
               this.drawSideBar(ctx, shape as SideBarObject, timeScale);
           }
       });
    },

    // Coordinate Helpers
    timeToX(time: number, timeScale: ITimeScaleApi<Time>) {
        // time is unix * 1000 in primitive? Algo uses original timestamps (ms)
        // Lightweight charts uses seconds for unix.
        // Wait, ohlcvApi returns ms. Lightweight charts expects seconds.
        // In loadData I divided by 1000.
        // So primitives hold ms timestamps. Need to divide by 1000.
        return timeScale.timeToCoordinate((time / 1000) as UTCTimestamp);
    },

    priceToY(price: number) {
        return this.candlestickSeries?.priceToCoordinate(price) ?? null;
    },

    drawLine(ctx: CanvasRenderingContext2D, line: LineObject, timeScale: ITimeScaleApi<Time>) {
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

    drawBox(ctx: CanvasRenderingContext2D, box: BoxObject, timeScale: ITimeScaleApi<Time>) {
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
    
    drawLabel(ctx: CanvasRenderingContext2D, label: LabelObject, timeScale: ITimeScaleApi<Time>) {
        const x = this.timeToX(label.x, timeScale);
        const y = this.priceToY(label.y);

        if (x === null || y === null) return;

        ctx.fillStyle = label.textColor;
        ctx.font = `${label.fontSize}px sans-serif`;
        ctx.textAlign = label.align as CanvasTextAlign;
        ctx.textBaseline = label.valign === 'bottom' ? 'bottom' : (label.valign === 'middle' ? 'middle' : 'top');
        ctx.fillText(label.text, x, y);
    },

    drawArrow(ctx: CanvasRenderingContext2D, arrow: ArrowObject, timeScale: ITimeScaleApi<Time>) {
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

    drawSideBar(ctx: CanvasRenderingContext2D, bar: SideBarObject, _timeScale: ITimeScaleApi<Time>) {
        const y1 = this.priceToY(bar.y1); // Top (price-wise higher, canvas y lower) -- wait, y increases down
        // priceToY: Higher price = Lower Y
        // So y1 (Top Price) should be smaller Y value than y2 (Bottom Price)
        const y2 = this.priceToY(bar.y2);

        if (y1 === null || y2 === null) return;

        // Context is already DPR-scaled, so logical coords 0..clientWidth are valid.
        const fullWidth = (this.$refs['chartContainer'] as HTMLElement).clientWidth;

        const barWidth = fullWidth * bar.widthPct;

        let xStart: number;
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
})
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
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-md);
  padding: 4px 8px;
  color: var(--text-secondary);
  transition: all var(--transition-base);
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
  border-radius: var(--radius-xs);
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
}
</style>
