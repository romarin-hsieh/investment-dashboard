<script setup>
import { onMounted, ref, watch, nextTick } from 'vue';
import Plotly from 'plotly.js-dist-min';

const props = defineProps({
  dataPoint: { type: Object, required: true },
  historyTrace: { type: Array, default: () => [] },
  sectorTrace: { type: Array, default: () => [] }
});

const container3D = ref(null);
const container2DTop = ref(null);
const container2DSide = ref(null);
const containerSectorTop = ref(null);
const containerSectorSide = ref(null);

const commonLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#D1D4DC' },
    margin: { l: 40, r: 20, b: 40, t: 40 },
    showlegend: false
};

const renderCharts = () => {
    if (!props.dataPoint) return;
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
        marker: { size: 10, color: '#F23645', line: { color: 'white', width: 2 } },
        type: 'scatter3d', name: 'Current'
    };

    const validHistory = props.historyTrace.filter(p => p.x_trend !== undefined);
    const tailTrace = {
        x: validHistory.map(p => p.x_trend),
        y: validHistory.map(p => p.y_momentum),
        z: validHistory.map(p => p.z_structure),
        mode: 'lines',
        line: { color: '#2962FF', width: 5, opacity: 0.6 },
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
        title: '3D Kinetic State (Stock Only)',
        scene: {
            xaxis: { title: 'X: Trend', range: [-3, 3] },
            yaxis: { title: 'Y: Momentum', range: [0, 1] },
            zaxis: { title: 'Z: Structure', range: [0, 1] },
            camera: { eye: { x: 1.6, y: 1.6, z: 1.6 } }
        },
        height: 600,
        margin: { l: 0, r: 0, b: 0, t: 30 },
    };

    Plotly.newPlot(container3D.value, [tailTrace, currentTrace, squeezeZone], layout, { responsive: true });
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
        mode: 'lines+markers',
        marker: { size: 4 },
        line: { color: '#2962FF', width: 2, shape: 'spline' },
        type: 'scatter'
    };
    const topCurrent = {
        x: [x], y: [y], mode: 'markers',
        marker: { size: 12, color: '#F23645', line: { color: 'white', width: 2 } },
        type: 'scatter'
    };
    const layoutTop = {
        ...commonLayout,
        title: 'STOCK: Trend (X) vs Momentum (Y)',
        xaxis: { title: 'X (Trend)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Y (Momentum)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
            { type: 'line', x0: -3, x1: 3, y0: 0.2, y1: 0.2, line: { color: '#089981', width: 1, dash: 'dash' } }, 
            { type: 'line', x0: -3, x1: 3, y0: 0.8, y1: 0.8, line: { color: '#F23645', width: 1, dash: 'dash' } } 
        ],
        height: 280
    };
    Plotly.newPlot(container2DTop.value, [topTrace, topCurrent], layoutTop, { responsive: true });

    // --- Stock Side View (Trend vs Structure) ---
    const sideTrace = {
        x: props.historyTrace.map(p => p.x_trend),
        y: props.historyTrace.map(p => p.z_structure),
        mode: 'lines+markers',
        marker: { size: 4 },
        line: { color: '#8E24AA', width: 2, shape: 'spline' },
        type: 'scatter'
    };
    const sideCurrent = {
        x: [x], y: [z], mode: 'markers',
        marker: { size: 12, color: '#F23645', line: { color: 'white', width: 2 } },
        type: 'scatter'
    };
    const layoutSide = {
        ...commonLayout,
        title: 'STOCK: Trend (X) vs Structure (Z)',
        xaxis: { title: 'X (Trend)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Z (Structure)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
             { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } },
             { type: 'line', x0: -3, x1: 3, y0: 0.8, y1: 0.8, line: { color: '#FFD700', width: 2, dash: 'dash' } }
        ],
        height: 280
    };
    Plotly.newPlot(container2DSide.value, [sideTrace, sideCurrent], layoutSide, { responsive: true });
};

const renderSector2D = () => {
    if (!containerSectorTop.value || !containerSectorSide.value) return;
    
    // Safety check just in case
    const validSector = props.sectorTrace && props.sectorTrace.length > 0 
        ? props.sectorTrace.filter(p => p.x_trend !== undefined) 
        : [];
        
    if (validSector.length === 0) return;

    const last = validSector[validSector.length - 1];

    // --- Sector Top View ---
    const ghostTraceTop = {
        x: validSector.map(p => p.x_trend),
        y: validSector.map(p => p.y_momentum),
        mode: 'lines',
        line: { color: '#AAAAAA', width: 2, dash: 'dot' }, // Dot for ghost
        type: 'scatter', name: 'Sector'
    };
    const ghostHeadTop = {
        x: [last.x_trend], y: [last.y_momentum], mode: 'markers',
        marker: { size: 8, color: '#AAAAAA', opacity: 0.8 }, type: 'scatter'
    };
    
    const layoutTop = {
        ...commonLayout,
        title: 'SECTOR: Trend (X) vs Momentum (Y)',
        xaxis: { title: 'X (Trend)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Y (Momentum)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        height: 280
    };
    Plotly.newPlot(containerSectorTop.value, [ghostTraceTop, ghostHeadTop], layoutTop, { responsive: true });

    // --- Sector Side View ---
    const ghostTraceSide = {
        x: validSector.map(p => p.x_trend),
        y: validSector.map(p => p.z_structure),
        mode: 'lines',
        line: { color: '#AAAAAA', width: 2, dash: 'dot' },
        type: 'scatter', name: 'Sector'
    };
    const ghostHeadSide = {
        x: [last.x_trend], y: [last.z_structure], mode: 'markers',
        marker: { size: 8, color: '#AAAAAA', opacity: 0.8 }, type: 'scatter'
    };

    const layoutSide = {
        ...commonLayout,
        title: 'SECTOR: Trend (X) vs Structure (Z)',
        xaxis: { title: 'X (Trend)', range: [-3, 3], showgrid: true, gridcolor: '#2A2E39' },
        yaxis: { title: 'Z (Structure)', range: [0, 1.1], showgrid: true, gridcolor: '#2A2E39' },
        shapes: [
             { type: 'rect', x0: -3, x1: 3, y0: 0.8, y1: 1.1, fillcolor: '#FFD700', opacity: 0.1, line: { width: 0 } },
             { type: 'line', x0: -3, x1: 3, y0: 0.8, y1: 0.8, line: { color: '#FFD700', width: 2, dash: 'dash' } }
        ],
        height: 280
    };
    Plotly.newPlot(containerSectorSide.value, [ghostTraceSide, ghostHeadSide], layoutSide, { responsive: true });
};

watch(() => props.dataPoint, () => {
    renderCharts();
}, { deep: true });

onMounted(() => {
    nextTick(() => {
        renderCharts();
    });
});
</script>

<template>
  <div class="chart-dashboard-wrapper">
    <!-- Main 3D Chart (Left) -->
    <div class="main-3d-panel">
        <div ref="container3D" class="plotly-container"></div>
    </div>
    
    <!-- Stock 2D Panel (Middle) -->
    <div class="side-2d-panels">
        <div class="panel-2d">
            <div ref="container2DTop" class="plotly-container"></div>
        </div>
        <div class="panel-2d">
            <div ref="container2DSide" class="plotly-container"></div>
        </div>
    </div>

    <!-- Sector 2D Panel (Right) -->
    <div class="side-2d-panels">
        <div class="panel-2d">
            <div ref="containerSectorTop" class="plotly-container"></div>
        </div>
        <div class="panel-2d">
            <div ref="containerSectorSide" class="plotly-container"></div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.chart-dashboard-wrapper {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr; /* 3 Column Layout */
  gap: 1rem;
  width: 100%;
  height: 600px;
  background: #131722;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.main-3d-panel {
  width: 100%;
  height: 100%;
  border-right: 1px solid #2A2E39;
}

.side-2d-panels {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  border-right: 1px solid #2A2E39; /* Separator */
}
.side-2d-panels:last-child {
    border-right: none;
}

.panel-2d {
  flex: 1;
  width: 100%;
  height: 50%;
  min-height: 0;
}

.plotly-container {
  width: 100%;
  height: 100%;
}

@media (max-width: 1200px) {
  .chart-dashboard-wrapper {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .main-3d-panel {
    height: 500px;
    border-right: none;
    border-bottom: 1px solid #2A2E39;
  }
  
  .side-2d-panels {
    height: auto;
    border-right: none;
    border-bottom: 1px solid #2A2E39;
  }
  
  .panel-2d {
    height: 300px;
  }
}
</style>
