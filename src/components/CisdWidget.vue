<template>
  <div class="cisd-widget">
    <!-- Floating Settings Button (Top-Right, avoiding Y-Axis) -->
    <button class="settings-floating-btn" @click="showSettings = true" :title="$t('cisd.settingsButtonTitle')">
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
      :title="$t('cisd.modalTitle')"
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
import { CisdAlgo, type OhlcvData as CisdOhlcvData, type CisdSettings } from '@/utils/technical-analysis/CisdAlgo';
import { ShapeType, type LineObject, type BoxObject, type LabelObject, type FilledAreaObject } from '@/utils/technical-analysis/StandardPrimitives';
import { useTheme } from '@/composables/useTheme';
import { getToken } from '@/utils/designTokens';
// Components
import GenericSettingsModal from '@/components/GenericSettingsModal.vue';

/** The drawable primitives the CISD algo emits (plus BoxObject the renderer supports). */
type CisdShape = LineObject | BoxObject | LabelObject | FilledAreaObject;

export default defineComponent({
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
      chart: null as IChartApi | null,
      candlestickSeries: null as ISeriesApi<'Candlestick'> | null,
      primitives: [] as CisdShape[], // List of Drawables from Algo

      // Algorithm + Config
      algo: null as CisdAlgo | null,
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
        bullishColor: getToken('--chart-up-alt'),
        bearishColor: getToken('--chart-down-alt'),
        backgroundFill: true
      },
      
      // Settings Schema
      settingsSchema: [
        { key: 'runBarsThreshold', label: this.$t('cisd.schema.barsThreshold'), type: 'number', min: 1, group: this.$t('cisd.schema.groupInputs') },
        { key: 'cisdFilter', label: this.$t('cisd.schema.cisdFilter'), type: 'checkbox', group: this.$t('cisd.schema.groupInputs') },
        { key: 'cisdFilterLength', label: this.$t('cisd.schema.filterLength'), type: 'number', min: 1, group: this.$t('cisd.schema.groupInputs') },
        { key: 'invalidateCISD', label: this.$t('cisd.schema.invalidateOnChoch'), type: 'checkbox', group: this.$t('cisd.schema.groupInputs') },

        { key: 'bullishColor', label: this.$t('cisd.schema.bullishColor'), type: 'text', group: this.$t('cisd.schema.groupStyle') },
        { key: 'bearishColor', label: this.$t('cisd.schema.bearishColor'), type: 'text', group: this.$t('cisd.schema.groupStyle') },
        { key: 'backgroundFill', label: this.$t('cisd.schema.backgroundFill'), type: 'checkbox', group: this.$t('cisd.schema.groupStyle') },
        { key: 'baseLevel', label: this.$t('cisd.schema.showBaseLevel'), type: 'checkbox', group: this.$t('cisd.schema.groupStyle') },
        { key: 'labelsSize', label: this.$t('cisd.schema.labelsSize'), type: 'number', min: 8, group: this.$t('cisd.schema.groupStyle') },

        { key: 'level1', label: this.$t('cisd.schema.showLevel', { n: 1 }), type: 'checkbox', group: this.$t('cisd.schema.groupLevels') },
        { key: 'level1Mult', label: this.$t('cisd.schema.levelMultiplier', { n: 1 }), type: 'number', step: 0.1, group: this.$t('cisd.schema.groupLevels') },
        { key: 'level2', label: this.$t('cisd.schema.showLevel', { n: 2 }), type: 'checkbox', group: this.$t('cisd.schema.groupLevels') },
        { key: 'level2Mult', label: this.$t('cisd.schema.levelMultiplier', { n: 2 }), type: 'number', step: 0.1, group: this.$t('cisd.schema.groupLevels') },
        { key: 'level3', label: this.$t('cisd.schema.showLevel', { n: 3 }), type: 'checkbox', group: this.$t('cisd.schema.groupLevels') },
        { key: 'level3Mult', label: this.$t('cisd.schema.levelMultiplier', { n: 3 }), type: 'number', step: 0.1, group: this.$t('cisd.schema.groupLevels') },
      ],

      resizeObserver: null as ResizeObserver | null,
      ohlcvData: null as CisdOhlcvData | null
    };
  },
  mounted() {
    this.initChart();
    this.loadData();
    
    this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
    });
    this.resizeObserver.observe(this.$refs.chartContainer as Element);
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
      this.chart = createChart(this.$refs.chartDiv as HTMLElement, chartOptions);
      this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor: getToken('--chart-up'),
          downColor: getToken('--chart-down'),
          borderVisible: false,
          wickUpColor: getToken('--chart-up'),
          wickDownColor: getToken('--chart-down')
      });
      // Subscribe to visible range changes to redraw overlay
      this.chart.timeScale().subscribeVisibleTimeRangeChange(() => this.drawOverlay());
      this.handleResize();
    },

    getChartOptions(): DeepPartial<ChartOptions> {
        const textColor = getToken('--text-primary');
        const gridColor = getToken('--chart-grid');
        const bgColor = 'transparent';

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
            const data = await ohlcvApi.getOhlcv(this.symbol, '1d', '5y');
            if (!data || !data.timestamps) return;
            // ohlcvApi's OhlcvData is loose (optional / nullable arrays); the algo
            // needs the strict all-number shape, hence the cast at this boundary.
            this.ohlcvData = data as CisdOhlcvData;

            const timestamps = data.timestamps;
            const open = data.open ?? [];
            const high = data.high ?? [];
            const low = data.low ?? [];
            const close = data.close ?? [];
            const chartData: CandlestickData[] = timestamps.map((t, i) => ({
                time: (t / 1000) as UTCTimestamp,
                open: open[i],
                high: high[i],
                low: low[i],
                close: close[i] as number
            }));

            this.candlestickSeries?.setData(chartData);
            this.runAlgo();
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
            this.algo = new CisdAlgo(ohlcv);
        }

        this.primitives = this.algo.calculate(this.algoConfig);
        console.log(`CISD Algo produced ${this.primitives.length} shapes`);

        requestAnimationFrame(() => this.drawOverlay());
    },

    onSettingsSave(newConfig: Partial<CisdSettings>) {
        this.algoConfig = { ...this.algoConfig, ...newConfig };
        this.runAlgo();
    },

    handleResize() {
        const container = this.$refs.chartContainer as HTMLElement | undefined;
        const canvas = this.$refs.overlayCanvas as HTMLCanvasElement | undefined;
        if (!container || !canvas) return;
        const width = container.clientWidth;
        const height = container.clientHeight;

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

    drawOverlay() {
       const canvas = this.$refs.overlayCanvas as HTMLCanvasElement | undefined;
       if (!this.chart || !this.candlestickSeries || !canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;

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
       
       // ShapeType is a plain object (not `as const`), so `.type` is `string`
       // and can't discriminate the union — cast to the branch's concrete type.
       this.primitives.forEach(shape => {
           if (shape.type === ShapeType.LINE) {
               this.drawLine(ctx, shape as LineObject, timeScale);
           } else if (shape.type === ShapeType.BOX) {
               this.drawBox(ctx, shape as BoxObject, timeScale);
           } else if (shape.type === ShapeType.LABEL) {
               this.drawLabel(ctx, shape as LabelObject, timeScale);
           } else if (shape.type === ShapeType.FILLED_AREA) {
               this.drawFilledArea(ctx, shape as FilledAreaObject, timeScale);
           }
       });
       
       ctx.restore();
    },
    
    timeToX(time: number, timeScale: ITimeScaleApi<Time>) {
        return timeScale.timeToCoordinate((time / 1000) as UTCTimestamp);
    },

    priceToY(price: number) {
        return this.candlestickSeries?.priceToCoordinate(price) ?? null;
    },

    drawFilledArea(ctx: CanvasRenderingContext2D, area: FilledAreaObject, timeScale: ITimeScaleApi<Time>) {
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
    
    drawLabel(ctx: CanvasRenderingContext2D, label: LabelObject, timeScale: ITimeScaleApi<Time>) {
        const x = this.timeToX(label.x, timeScale);
        const y = this.priceToY(label.y);

        if (x === null || y === null) return;

        ctx.fillStyle = label.textColor;
        ctx.font = `${label.fontSize}px sans-serif`;
        ctx.textAlign = label.align as CanvasTextAlign;
        ctx.textBaseline = 'middle';
        ctx.fillText(label.text, x, y);
    }
  }
})
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
  pointer-events: none; 
  z-index: 2;
}
</style>
