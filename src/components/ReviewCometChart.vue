<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import Plotly from 'plotly.js-dist-min';
import { quantDataService } from '@/services/QuantDataService.js';

const props = defineProps({
  symbol: { type: String, required: true },
  theme: { type: String, default: 'dark' } // 'dark' or 'light'
});

// Use shallowRef for performance (don't make the massive data object reactive)
const cometData = shallowRef(null);
const loading = ref(true);
const error = ref(null);

// Chart Refs
const chart3D = ref(null);
const chartStockTop = ref(null);
const chartStockSide = ref(null);
const chartSectorTop = ref(null);
const chartSectorSide = ref(null);

// Popover State
const activePopover = ref(null);

const togglePopover = (id) => {
    if (activePopover.value === id) activePopover.value = null;
    else activePopover.value = id;
};

// Theme Config
const getThemeColors = () => {
    const isDark = props.theme === 'dark';
    return {
        bg: isDark ? '#1E222D' : '#FFFFFF', 
        text: isDark ? '#D1D4DC' : '#131722',
        subText: isDark ? '#787B86' : '#5D606B', 
        grid: isDark ? '#2A2E39' : '#E0E3EB',
        border: isDark ? '#2A2E39' : '#E0E3EB', 
        containerBorder: isDark ? '#2A2E39' : '#E0E3EB',
        accent: '#2962FF'
    };
};

const getCommentary = (d) => {
    if (d.commentary && d.commentary.length > 5) return d.commentary;
    const sig = d.signal;
    const x = d.coordinates.x_trend;
    const y = d.coordinates.y_momentum;
    const z = d.coordinates.z_structure;
    
    if (sig === 'LAUNCHPAD') return `Setup Detected: Structure is tight (Z=${z.toFixed(2)}) while Trend is positive. Potential breakout imminent.`;
    if (sig === 'DIP_BUY') return `Retracement Opportunity: Momentum cooled off but main Trend remains intact (X=${x.toFixed(2)}).`;
    if (sig === 'CLIMAX') return `Caution: Momentum is overheated (Y=${y.toFixed(2)}). Risk of reversal high.`;
    return `Neutral State: Waiting for clearer signal. Current Trend Strength: ${x.toFixed(2)}.`;
};

const fetchData = async () => {
    try {
        loading.value = true;
        // Introduce small delay to let UI render skeleton before heavy processing
        await new Promise(r => setTimeout(r, 10));
        
        const tickerData = await quantDataService.getTickerData(props.symbol);
        
        if (tickerData) {
            cometData.value = tickerData;
            error.value = null;
        } else {
            error.value = "Data not found for this symbol.";
            cometData.value = null;
        }
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
        // Wait for DOM to update (removal of Skeleton) before rendering
        nextTick(() => {
            if (cometData.value && !error.value) renderChartsSequentially();
        });
    }
};

const historicalMetrics = computed(() => {
    if (!cometData.value || !cometData.value.trace) return null;
    const trace = cometData.value.trace;
    const len = trace.length;
    const getPoint = (idx) => {
        if (idx < 0) return { x_trend: 0, y_momentum: 0, z_structure: 0 };
        return trace[idx];
    };
    return {
        now: getPoint(len - 1),
        d5: getPoint(len - 6),
        d20: getPoint(len - 21)
    };
});

const commonLayout = (title, xaxis, yaxis) => {
    const c = getThemeColors();
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: c.text, size: 10 },
        margin: { l: 30, r: 10, b: 30, t: 10 },
        showlegend: false,
        xaxis: { 
            title: xaxis, range: [-3, 3], showgrid: true, gridcolor: c.grid, zerolinecolor: c.grid, tickfont: { size: 9 }, anchor: 'y'
        },
        yaxis: { 
            title: yaxis, range: [0, 1.1], showgrid: true, gridcolor: c.grid, zerolinecolor: c.grid, tickfont: { size: 9 }, anchor: 'x'
        },
        autosize: true
    };
};

// Staggered Rendering to prevent UI Freeze
const renderChartsSequentially = async () => {
    if (!cometData.value) return;
    const d = cometData.value;
    const history = d.trace || [];
    const sector = d.sector_trace || [];
    const validSector = sector.length > 0 ? sector : [];
    const c = getThemeColors();
    
    // Helper to wait for UI frame
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

    // 1. Stock Top (Priority 1)
    if (chartStockTop.value) {
        Plotly.newPlot(chartStockTop.value, [
            { x: history.map(p => p.x_trend), y: history.map(p => p.y_momentum), mode: 'lines', line: { color: '#2962FF', width: 2 }, type: 'scatter', hoverinfo: 'none' },
            { x: [d.coordinates.x_trend], y: [d.coordinates.y_momentum], mode: 'markers', marker: { size: 8, color: '#F23645' }, type: 'scatter' }
        ], { ...commonLayout('Stock Top', 'Trend (X)', 'Momentum (Y)'), shapes: [
            { type: 'line', x0: -3, x1: 3, y0: 0.5, y1: 0.5, line: { color: c.grid, width: 1, dash: 'dot' } },
            { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }
        ] }, { displayModeBar: false, responsive: true });
    }
    
    await nextFrame();

    // 2. Stock Side
    if (chartStockSide.value) {
        Plotly.newPlot(chartStockSide.value, [
            { x: history.map(p => p.x_trend), y: history.map(p => p.z_structure), mode: 'lines', line: { color: '#8E24AA', width: 2 }, type: 'scatter', hoverinfo: 'none' },
            { x: [d.coordinates.x_trend], y: [d.coordinates.z_structure], mode: 'markers', marker: { size: 8, color: '#F23645' }, type: 'scatter' }
        ], { ...commonLayout('Stock Side', 'Trend (X)', 'Structure (Z)'), shapes: [{ type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }] }, { displayModeBar: false, responsive: true });
    }

    await nextFrame();

    // 3. Sector Top
    if (chartSectorTop.value && validSector.length > 0) {
        const last = validSector[validSector.length-1];
        Plotly.newPlot(chartSectorTop.value, [
            { x: validSector.map(p => p.x_trend), y: validSector.map(p => p.y_momentum), mode: 'lines', line: { color: '#888888', width: 2, dash: 'dot' }, type: 'scatter', hoverinfo: 'none' },
            { x: [last.x_trend], y: [last.y_momentum], mode: 'markers', marker: { size: 6, color: '#888888' }, type: 'scatter' }
        ], { ...commonLayout('Sector Top', 'Trend (X)', 'Momentum (Y)'), shapes: [
            { type: 'line', x0: -3, x1: 3, y0: 0.5, y1: 0.5, line: { color: c.grid, width: 1, dash: 'dot' } },
            { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }
        ] }, { displayModeBar: false, responsive: true });
    }

    await nextFrame();

    // 4. Sector Side
    if (chartSectorSide.value && validSector.length > 0) {
        const last = validSector[validSector.length-1];
        Plotly.newPlot(chartSectorSide.value, [
            { x: validSector.map(p => p.x_trend), y: validSector.map(p => p.z_structure), mode: 'lines', line: { color: '#888888', width: 2, dash: 'dot' }, type: 'scatter', hoverinfo: 'none' },
            { x: [last.x_trend], y: [last.z_structure], mode: 'markers', marker: { size: 6, color: '#888888' }, type: 'scatter' }
        ], { ...commonLayout('Sector Side', 'Trend (X)', 'Structure (Z)'), shapes: [{ type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } }] }, { displayModeBar: false, responsive: true });
    }

    await nextFrame();

    // 5. 3D Chart (Heaviest)
    if (chart3D.value) {
        Plotly.newPlot(chart3D.value, [
            { x: history.map(p => p.x_trend), y: history.map(p => p.y_momentum), z: history.map(p => p.z_structure), mode: 'lines', line: { color: '#2962FF', width: 4 }, type: 'scatter3d', hoverinfo: 'none' },
            { x: [d.coordinates.x_trend], y: [d.coordinates.y_momentum], z: [d.coordinates.z_structure], mode: 'markers', marker: { size: 5, color: '#F23645' }, type: 'scatter3d' },
            { type: "mesh3d", x: [-3, 3, 3, -3], y: [0, 0, 1, 1], z: [0.8, 0.8, 0.8, 0.8], color: '#FFD700', opacity: 0.1 }
        ], {
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: c.text, size: 9 }, margin: { l: 0, r: 0, b: 0, t: 0 }, showlegend: false,
            scene: { xaxis: { title: 'X', range: [-3, 3], gridcolor: c.grid }, yaxis: { title: 'Y', range: [0, 1], gridcolor: c.grid }, zaxis: { title: 'Z', range: [0, 1], gridcolor: c.grid }, camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } } }
        }, { displayModeBar: false, responsive: true });
    }
};

watch(() => props.symbol, fetchData);
watch(() => props.theme, () => {
   renderChartsSequentially();
});

onMounted(() => {
    fetchData();
    window.addEventListener('resize', renderChartsSequentially);
});
onUnmounted(() => {
    window.removeEventListener('resize', renderChartsSequentially);
});
</script>

<template>
  <div class="review-comet-container" :class="theme">
    <!-- Skeleton Loader -->
    <div v-if="loading" class="grid-wrapper skeleton-wrapper">
         <div class="grid-cell skeleton-cell" v-for="i in 6" :key="i"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !cometData" class="error-state">
        <span class="no-data-msg">Quant Analysis Not Available for {{ symbol }}</span>
    </div>
    
    <!-- Main Content -->
    <div v-else class="grid-wrapper">
        <!-- 1. Signal Card -->
        <div class="grid-cell card-cell">
            <div class="inner-card">
                <div class="card-header">
                    <h4>Signal Status</h4>
                    <span class="signal-badge" :class="cometData.signal.toLowerCase()">
                        {{ cometData.signal.replace('_', ' ') }}
                    </span>
                </div>
                
                <div class="commentary">{{ getCommentary(cometData) }}</div>
                
                <!-- Historical Metrics Table -->
                <div class="metrics-table" v-if="historicalMetrics">
                    <div class="table-row header">
                        <span class="col-lbl">Metric</span>
                        <span class="col-val">Now</span>
                        <span class="col-val">5D</span>
                        <span class="col-val">20D</span>
                    </div>
                    <div class="table-row dashed">
                        <span class="col-lbl">X (Trend)</span>
                        <span class="col-val highlight">{{ historicalMetrics.now.x_trend.toFixed(2) }}</span>
                        <span class="col-val muted">{{ historicalMetrics.d5.x_trend.toFixed(2) }}</span>
                        <span class="col-val muted">{{ historicalMetrics.d20.x_trend.toFixed(2) }}</span>
                    </div>
                    <div class="table-row dashed">
                        <span class="col-lbl">Y (Momtm)</span>
                        <span class="col-val highlight">{{ historicalMetrics.now.y_momentum.toFixed(2) }}</span>
                        <span class="col-val muted">{{ historicalMetrics.d5.y_momentum.toFixed(2) }}</span>
                        <span class="col-val muted">{{ historicalMetrics.d20.y_momentum.toFixed(2) }}</span>
                    </div>
                    <div class="table-row dashed">
                        <span class="col-lbl">Z (Struct)</span>
                        <span class="col-val highlight">{{ historicalMetrics.now.z_structure.toFixed(2) }}</span>
                        <span class="col-val muted">{{ historicalMetrics.d5.z_structure.toFixed(2) }}</span>
                        <span class="col-val muted">{{ historicalMetrics.d20.z_structure.toFixed(2) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. Stock Top -->
        <div class="grid-cell chart-box">
            <div class="box-header">
                <span>Trend Velocity</span>
                <button class="info-btn" @click.stop="togglePopover('stock-top')">?</button>
                 <div v-if="activePopover === 'stock-top'" class="popover">
                    <strong>Trend (X) vs Momentum (Y)</strong>
                    <p>X > 0: Uptrend</p><p>Y > 0.8: Overheated</p>
                    <p>High Y = Fast Movement</p>
                </div>
            </div>
            <div class="chart-canvas" ref="chartStockTop"></div>
        </div>

        <!-- 3. Sector Top -->
        <div class="grid-cell chart-box">
            <div class="box-header"><span>Sector Velocity</span></div>
            <div class="chart-canvas" ref="chartSectorTop"></div>
        </div>

        <!-- 4. 3D Chart -->
        <div class="grid-cell chart-box">
             <div class="box-header"><span>3D Interactive</span></div>
             <div class="chart-canvas" ref="chart3D"></div>
        </div>

        <!-- 5. Stock Side -->
        <div class="grid-cell chart-box">
            <div class="box-header">
                <span>Squeeze Potential</span>
                 <button class="info-btn" @click.stop="togglePopover('stock-side')">?</button>
                 <div v-if="activePopover === 'stock-side'" class="popover">
                     <strong>Trend (X) vs Structure (Z)</strong>
                    <p>Z > 0.8: Squeeze (Yellow)</p>
                    <p>High Z = Tight Structure (Explosive Potential)</p>
                </div>
            </div>
            <div class="chart-canvas" ref="chartStockSide"></div>
        </div>

        <!-- 6. Sector Side -->
        <div class="grid-cell chart-box">
            <div class="box-header"><span>Sector Potential</span></div>
            <div class="chart-canvas" ref="chartSectorSide"></div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.review-comet-container {
    padding: 1.5rem; 
    background: transparent;
}

.grid-wrapper {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 1.5rem; 
    width: 100%;
}

.grid-cell {
    background: inherit;
    aspect-ratio: 1 / 1;
    display: flex;
    flex-direction: column;
}

/* Skeleton Styles */
.skeleton-wrapper .skeleton-cell {
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 8px;
    border: 1px solid rgba(128,128,128,0.1);
}
@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Theme Colors */
.review-comet-container.dark .grid-cell { background: #1E222D; }
.review-comet-container.light .grid-cell { background: #FFFFFF; }

/* Subtler Borders */
.chart-box, .card-cell {
    border: 1px solid; 
    border-radius: 4px;
}

/* Theme Borders */
.review-comet-container.dark .chart-box, 
.review-comet-container.dark .card-cell {
    border-color: rgba(42, 46, 57, 0.6); 
}
.review-comet-container.light .chart-box, 
.review-comet-container.light .card-cell {
    border-color: rgba(224, 227, 235, 0.8);
}

.box-header {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    opacity: 0.9;
    border-bottom: 1px solid;
    border-color: rgba(128, 128, 128, 0.2);
    display: flex; 
    justify-content: space-between;
    align-items: center;
    position: relative; /* Anchor for Popover */
    z-index: 100; /* Ensure header is above chart content */
}

.chart-canvas {
    flex: 1;
    width: 100%;
    height: 100%;
}

/* Card Internals - Tech Signal Style */
.inner-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 1.2rem;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid;
    border-color: rgba(128, 128, 128, 0.2); 
}

.card-header h4 { margin: 0; font-size: 0.9rem; font-weight: 600; }

.metrics-table {
    display: flex;
    flex-direction: column;
    width: 100%;
    font-size: 0.85rem;
}

.table-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
    padding: 8px 4px;
    align-items: center;
}

.table-row.header {
    font-weight: 600;
    opacity: 0.6;
    font-size: 0.75rem;
    padding-bottom: 4px;
}

.table-row.dashed {
    border-bottom: 1px dashed;
    border-color: inherit;
}

/* Dashed lines color adaptation */
.review-comet-container.dark .table-row.dashed { border-color: #2A2E39; }
.review-comet-container.light .table-row.dashed { border-color: #E0E3EB; }

.col-val { text-align: right; font-family: 'Roboto Mono', monospace; }
.col-val.highlight { font-weight: bold; color: #2962FF; }
.col-val.muted { opacity: 0.6; font-size: 0.8rem; }

.commentary {
    /* margin-top: auto; Removed to allow being pushed to top */
    margin-bottom: 0.8rem; /* Add spacing below */
    font-size: 0.85rem;
    line-height: 1.4;
    font-weight: 500;
    color: var(--text-color); /* Improve contrast */
    background: rgba(41, 98, 255, 0.08); /* Highlight bg */
    border-left: 3px solid #2962FF; /* Accent bar */
    padding: 0.75rem;
    border-radius: 4px;
}

.signal-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: bold;
    color: #fff;
    letter-spacing: 0.5px;
}
.signal-badge.dip_buy { background: #089981; }
.signal-badge.launchpad { background: #FFD700; color: #000; }
.signal-badge.climax { background: #F23645; }
.signal-badge.wait { background: #787B86; }

/* Popover */
.info-btn {
    opacity: 0.6; /* Increased base opacity */
    transition: all 0.2s;
    border-radius: 50%;
    border: 1px solid currentColor;
    width: 18px; height: 18px; /* Bigger hit area */
    font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
}
.info-btn:hover { opacity: 1; background: rgba(128,128,128, 0.1); }

.popover {
    position: absolute; top: 30px; right: 10px;
    background: var(--bg-card, #1E222D);
    border: 1px solid var(--border-color, #2A2E39);
    padding: 0.8rem; border-radius: 4px; 
    z-index: 10000; /* Super high Z-index */
    width: 180px; font-size: 0.75rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Responsive */
@media(max-width: 1200px) {
    .grid-wrapper { grid-template-columns: repeat(2, 1fr); }
}
@media(max-width: 600px) {
    .grid-wrapper { grid-template-columns: 1fr; }
}
</style>


