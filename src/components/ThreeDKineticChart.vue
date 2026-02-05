<script setup>
import { onMounted, ref, watch, nextTick, computed } from 'vue';
import Plotly from 'plotly.js-dist-min';

const props = defineProps({
  dataPoint: { type: Object, required: true },
  historyTrace: { type: Array, default: () => [] },
  sectorTrace: { type: Array, default: () => [] },
  signal: { type: String, default: 'WAIT' },
  commentary: { type: String, default: '' },
  ticker: { type: String, default: 'STOCK' }
});

const container3D = ref(null);
const container2DTop = ref(null);
const container2DSide = ref(null);
const containerSectorTop = ref(null);
const containerSectorSide = ref(null);

const activePopover = ref(null);
const togglePopover = (id) => {
    if (activePopover.value === id) activePopover.value = null;
    else activePopover.value = id;
};

// Compute Metrics (Now, 5D, 20D)
const historicalMetrics = computed(() => {
    const trace = props.historyTrace;
    const len = trace.length;
    // Helper to safely get point
    const getPoint = (idx) => {
        if (idx < 0 || idx >= len) return { x_trend: 0, y_momentum: 0, z_structure: 0 };
        return trace[idx];
    };
    
    // If we have history, use it. If not, fallback to dataPoint for "Now"
    const now = len > 0 ? getPoint(len - 1) : props.dataPoint;
    const d5 = getPoint(len - 6);
    const d20 = getPoint(len - 21);
    
    return { now, d5, d20 };
});

const isDataEmpty = computed(() => {
    return !props.dataPoint || Object.keys(props.dataPoint).length === 0;
});

const commonLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#D1D4DC', size: 10 },
    margin: { l: 30, r: 10, b: 30, t: 10 },
    showlegend: false
};

const renderCharts = () => {
    if (isDataEmpty.value) return;
    render3D();
    renderStock2D();
    renderSector2D();
};

const render3D = () => {
    if (!container3D.value) return;

    const x = props.dataPoint.x_trend;
    const y = props.dataPoint.y_momentum;
    const z = props.dataPoint.z_structure;

    const currentTrace = {
        x: [x], y: [y], z: [z],
        mode: 'markers',
        marker: { size: 5, color: '#F23645' }, // Smaller marker to match refined style
        type: 'scatter3d', name: 'Current'
    };

    const validHistory = props.historyTrace.filter(p => p.x_trend !== undefined);
    const tailTrace = {
        x: validHistory.map(p => p.x_trend),
        y: validHistory.map(p => p.y_momentum),
        z: validHistory.map(p => p.z_structure),
        mode: 'lines',
        line: { color: '#2962FF', width: 4 },
        type: 'scatter3d', name: 'Path'
    };

    const squeezeZone = {
        type: "mesh3d",
        x: [-3, 3, 3, -3, -3, 3, 3, -3],
        y: [0, 0, 1, 1, 0, 0, 1, 1],
        z: [0.8, 0.8, 0.8, 0.8, 1, 1, 1, 1],
        opacity: 0.1, color: '#FFD700', name: 'Squeeze'
    };

    const layout = {
        ...commonLayout,
        margin: { l: 0, r: 0, b: 0, t: 0 },
        scene: {
            xaxis: { title: 'X', range: [-3, 3], gridcolor: '#2A2E39' },
            yaxis: { title: 'Y', range: [0, 1], gridcolor: '#2A2E39' },
            zaxis: { title: 'Z', range: [0, 1], gridcolor: '#2A2E39' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
        },
        height: undefined, // Let container dictate
        autosize: true
    };

    Plotly.newPlot(container3D.value, [tailTrace, currentTrace, squeezeZone], layout, { displayModeBar: false, responsive: true });
};

const renderStock2D = () => {
    if (!container2DTop.value || !container2DSide.value) return;

    const x = props.dataPoint.x_trend;
    const y = props.dataPoint.y_momentum;
    const z = props.dataPoint.z_structure;

    // --- Stock Top View (Trend vs Momentum) ---
    const topTrace = {
        x: props.historyTrace.map(p => p.x_trend),
        y: props.historyTrace.map(p => p.y_momentum),
        mode: 'lines',
        line: { color: '#2962FF', width: 2 },
        type: 'scatter', hoverinfo: 'none'
    };
    const topCurrent = {
        x: [x], y: [y], mode: 'markers',
        marker: { size: 8, color: '#F23645' }, type: 'scatter'
    };
    const layoutTop = {
        ...commonLayout,
        xaxis: { title: 'Trend (X)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Momentum (Y)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
            { type: 'line', x0: -3, x1: 3, y0: 0.5, y1: 0.5, line: { color: '#2A2E39', width: 1, dash: 'dot' } }, 
            { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }
        ],
        autosize: true
    };
    Plotly.newPlot(container2DTop.value, [topTrace, topCurrent], layoutTop, { displayModeBar: false, responsive: true });

    // --- Stock Side View (Trend vs Structure) ---
    const sideTrace = {
        x: props.historyTrace.map(p => p.x_trend),
        y: props.historyTrace.map(p => p.z_structure),
        mode: 'lines',
        line: { color: '#8E24AA', width: 2 },
        type: 'scatter', hoverinfo: 'none'
    };
    const sideCurrent = {
        x: [x], y: [z], mode: 'markers',
        marker: { size: 8, color: '#F23645' }, type: 'scatter'
    };
    const layoutSide = {
        ...commonLayout,
        xaxis: { title: 'Trend (X)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Structure (Z)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
             { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }
        ],
        autosize: true
    };
    Plotly.newPlot(container2DSide.value, [sideTrace, sideCurrent], layoutSide, { displayModeBar: false, responsive: true });
};

const renderSector2D = () => {
    if (!containerSectorTop.value || !containerSectorSide.value) return;
    
    const validSector = props.sectorTrace && props.sectorTrace.length > 0 
        ? props.sectorTrace.filter(p => p.x_trend !== undefined) 
        : [];
        
    // Ghost render even if empty? Better not.
    if (validSector.length === 0) return;

    const last = validSector[validSector.length - 1];

    // --- Sector Top View ---
    const ghostTraceTop = {
        x: validSector.map(p => p.x_trend),
        y: validSector.map(p => p.y_momentum),
        mode: 'lines',
        line: { color: '#888888', width: 2, dash: 'dot' },
        type: 'scatter', hoverinfo: 'none'
    };
    const ghostHeadTop = {
        x: [last.x_trend], y: [last.y_momentum], mode: 'markers',
        marker: { size: 6, color: '#888888' }, type: 'scatter'
    };
    
    const layoutTop = {
        ...commonLayout,
        xaxis: { title: 'Trend (X)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Momentum (Y)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
             { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }
        ],
        autosize: true
    };
    Plotly.newPlot(containerSectorTop.value, [ghostTraceTop, ghostHeadTop], layoutTop, { displayModeBar: false, responsive: true });

    // --- Sector Side View ---
    const ghostTraceSide = {
        x: validSector.map(p => p.x_trend),
        y: validSector.map(p => p.z_structure),
        mode: 'lines',
        line: { color: '#888888', width: 2, dash: 'dot' },
        type: 'scatter', hoverinfo: 'none'
    };
    const ghostHeadSide = {
        x: [last.x_trend], y: [last.z_structure], mode: 'markers',
        marker: { size: 6, color: '#888888' }, type: 'scatter'
    };

    const layoutSide = {
        ...commonLayout,
        xaxis: { title: 'Trend (X)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Structure (Z)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
             { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }
        ],
        autosize: true
    };
    Plotly.newPlot(containerSectorSide.value, [ghostTraceSide, ghostHeadSide], layoutSide, { displayModeBar: false, responsive: true });
};

watch(() => props.dataPoint, () => {
    nextTick(renderCharts);
}, { deep: true });

onMounted(() => {
    nextTick(renderCharts);
    window.addEventListener('resize', renderCharts);
});

// Note: Removed onUnmounted in <script setup>, usually handled automatically or good practice to remove listner.
// Adding it back for safety.
import { onUnmounted } from 'vue';
onUnmounted(() => {
      window.removeEventListener('resize', renderCharts);
});
</script>

<template>
  <div class="chart-dashboard-wrapper">
    <!-- 1. Signal Card (Top Left) -->
    <div class="grid-cell card-cell">
        <div class="inner-card">
            <div class="card-header">
                <h4>Signal Status</h4>
                <span class="signal-badge" :class="(signal || 'WAIT').toLowerCase()">
                    {{ (signal || 'WAIT').replace('_', ' ') }}
                </span>
            </div>
            
            <div class="commentary" v-if="commentary">{{ commentary }}</div>
            <div class="commentary" v-else>
                <!-- Fallback commentary if none provided -->
               {{ signal === 'WAIT' ? 'Neutral State' : `${signal} Detected` }}
            </div>
            
            <!-- Historical Metrics -->
            <div class="metrics-table">
                <div class="table-row header">
                    <span class="col-lbl">Metric</span>
                    <span class="col-val">Now</span>
                    <span class="col-val">5D</span>
                    <span class="col-val">20D</span>
                </div>
                <div class="table-row dashed">
                    <span class="col-lbl">X (Trend)</span>
                    <span class="col-val highlight">{{ historicalMetrics.now.x_trend?.toFixed(2) }}</span>
                    <span class="col-val muted">{{ historicalMetrics.d5.x_trend?.toFixed(2) }}</span>
                    <span class="col-val muted">{{ historicalMetrics.d20.x_trend?.toFixed(2) }}</span>
                </div>
                <div class="table-row dashed">
                    <span class="col-lbl">Y (Momtm)</span>
                    <span class="col-val highlight">{{ historicalMetrics.now.y_momentum?.toFixed(2) }}</span>
                    <span class="col-val muted">{{ historicalMetrics.d5.y_momentum?.toFixed(2) }}</span>
                    <span class="col-val muted">{{ historicalMetrics.d20.y_momentum?.toFixed(2) }}</span>
                </div>
                <div class="table-row dashed">
                    <span class="col-lbl">Z (Struct)</span>
                    <span class="col-val highlight">{{ historicalMetrics.now.z_structure?.toFixed(2) }}</span>
                    <span class="col-val muted">{{ historicalMetrics.d5.z_structure?.toFixed(2) }}</span>
                    <span class="col-val muted">{{ historicalMetrics.d20.z_structure?.toFixed(2) }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. Stock Top (Trend Velocity) (Top Middle) -->
    <div class="grid-cell chart-box">
        <div class="box-header">
            <span>Trend Velocity</span>
             <button class="info-btn" @click.stop="togglePopover('stock-top')">?</button>
             <div v-if="activePopover === 'stock-top'" class="popover">
                <strong>Trend (X) vs Momentum (Y)</strong>
                <p>X > 0: Uptrend</p><p>Y > 0.8: Overheated</p>
            </div>
        </div>
        <div ref="container2DTop" class="plotly-container"></div>
    </div>

    <!-- 3. Sector Top (Sector Velocity) (Top Right) -->
    <div class="grid-cell chart-box">
        <div class="box-header"><span>Sector Velocity</span></div>
        <div ref="containerSectorTop" class="plotly-container"></div>
    </div>
    
    <!-- 4. 3D Interactive (Bottom Left) -->
    <div class="grid-cell chart-box">
         <div class="box-header"><span>3D Interactive</span></div>
         <div ref="container3D" class="plotly-container"></div>
    </div>

    <!-- 5. Stock Side (Squeeze Potential) (Bottom Middle) -->
    <div class="grid-cell chart-box">
        <div class="box-header">
            <span>Squeeze Potential</span>
             <button class="info-btn" @click.stop="togglePopover('stock-side')">?</button>
             <div v-if="activePopover === 'stock-side'" class="popover">
                 <strong>Trend (X) vs Structure (Z)</strong>
                <p>Z > 0.8: Squeeze (Yellow)</p>
            </div>
        </div>
        <div ref="container2DSide" class="plotly-container"></div>
    </div>

    <!-- 6. Sector Side (Sector Potential) (Bottom Right) -->
    <div class="grid-cell chart-box">
        <div class="box-header"><span>Sector Potential</span></div>
        <div ref="containerSectorSide" class="plotly-container"></div>
    </div>

  </div>
</template>

<style scoped>
.chart-dashboard-wrapper {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 Column Layout */
  grid-template-rows: repeat(2, 1fr);    /* 2 Row Layout */
  gap: 1rem;
  width: 100%;
  height: 600px;
  background: #131722;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.grid-cell {
    background: inherit;
    /* aspect-ratio: 1 / 1; Removed strict ratio to fill grid */
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
}

.chart-box, .card-cell {
    border: 1px solid rgba(42, 46, 57, 0.6);
    border-radius: 4px;
    background: #1E222D; /* Card bg */
}

.box-header {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
    font-weight: 500;
    opacity: 0.9;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    display: flex; 
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 10;
}

.plotly-container {
  width: 100%;
  height: 100%;
  flex: 1;
}

/* Internal Card Styles */
.inner-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0.8rem;
    gap: 1rem;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2); 
}

.card-header h4 { margin: 0; font-size: 0.9rem; font-weight: 600; color: #D1D4DC; }

.signal-badge {
    padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: #fff;
    text-transform: uppercase;
}
.signal-badge.dip_buy { background: #089981; }
.signal-badge.launchpad { background: #FFD700; color: #000; }
.signal-badge.climax { background: #F23645; }
.signal-badge.wait { background: #787B86; }

.commentary {
    font-size: 0.8rem;
    font-weight: 500;
    color: #D1D4DC;
    background: rgba(41, 98, 255, 0.08);
    border-left: 3px solid #2962FF;
    padding: 0.6rem;
    border-radius: 4px;
}

/* Metrics Table */
.metrics-table {
    display: flex; flex-direction: column; width: 100%; font-size: 0.8rem;
    margin-top: auto; /* Push to bottom */
}
.table-row {
    display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr;
    padding: 6px 4px; align-items: center;
}
.table-row.header { font-weight: 600; opacity: 0.6; font-size: 0.7rem; border-bottom: 1px solid rgba(128,128,128,0.2); }
.table-row.dashed { border-bottom: 1px dashed rgba(128,128,128,0.2); }
.col-val { text-align: right; font-family: 'Roboto Mono', monospace; }
.col-val.highlight { font-weight: bold; color: #2962FF; }
.col-val.muted { opacity: 0.6; }

/* Popover */
.info-btn {
    opacity: 0.6; border-radius: 50%; border: 1px solid currentColor;
    width: 16px; height: 16px; font-size: 10px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: #D1D4DC;
    background: transparent;
}
.popover {
    position: absolute; top: 25px; right: 5px;
    background: #2A2E39; border: 1px solid #787B86;
    padding: 0.8rem; border-radius: 4px; 
    z-index: 100; width: 150px; font-size: 0.75rem; color: #D1D4DC;
}

@media (max-width: 1200px) {
  .chart-dashboard-wrapper {
    grid-template-columns: repeat(2, 1fr); /* 2 Cols */
    grid-template-rows: repeat(3, 1fr);    /* 3 Rows */
    height: auto;
  }
  .grid-cell { height: 300px; }
}

@media (max-width: 768px) {
  .chart-dashboard-wrapper {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
