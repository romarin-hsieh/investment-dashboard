<template>
  <div class="mfi-volume-profile-canvas" ref="container">
    <canvas 
      ref="canvas" 
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @click="onCanvasClick"
    ></canvas>
    
    <!-- Tooltip -->
    <div 
      v-if="tooltip.visible" 
      class="profile-tooltip"
      :style="{ 
        left: tooltip.x + 'px', 
        top: tooltip.y + 'px' 
      }"
    >
      <div class="tooltip-header">
        Price: {{ formatPrice(tooltip.data.priceLevel) }}
      </div>
      <div class="tooltip-body">
        <div>Total Volume: {{ formatVolume(tooltip.data.volume) }}</div>
        <div>Buy Volume: {{ formatVolume(tooltip.data.positiveVolume) }} ({{ formatPct(tooltip.data.positiveVolume / tooltip.data.volume * 100) }}%)</div>
        <div>Sell Volume: {{ formatVolume(tooltip.data.negativeVolume) }} ({{ formatPct(tooltip.data.negativeVolume / tooltip.data.volume * 100) }}%)</div>
        <div>Neutral: {{ formatVolume(tooltip.data.neutralVolume) }} ({{ formatPct(tooltip.data.neutralVolume / tooltip.data.volume * 100) }}%)</div>
        <div>MFI(avg): {{ Math.round(tooltip.data.mfiAverage) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MFIVolumeProfileCanvas',
  props: {
    profile: {
      type: Array,
      required: true
    },
    pointOfControl: {
      type: Object,
      default: null
    },
    valueArea: {
      type: Object,
      default: null
    },
    currentPrice: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: 600
    },
    width: {
      type: Number,
      default: 340
    },
    showAllLabelsOnDesktop: {
      type: Boolean,
      default: true
    },
    priceDecimals: {
      type: Number,
      default: 2
    }
  },
  data() {
    return {
      canvas: null,
      ctx: null,
      resizeObserver: null,
      tooltip: {
        visible: false,
        x: 0,
        y: 0,
        data: null,
        pinned: false
      },
      // Layout constants
      padding: {
        left: 80,   // Price labels
        right: 90,  // Volume labels
        top: 10,
        bottom: 10
      }
    };
  },
  computed: {
    maxVolume() {
      return Math.max(...this.profile.map(bin => bin.volume));
    },
    totalVolume() {
      return this.profile.reduce((sum, bin) => sum + bin.volume, 0);
    },
    rowHeight() {
      const availableHeight = this.height - this.padding.top - this.padding.bottom;
      return Math.max(10, Math.floor(availableHeight / this.profile.length));
    },
    barWidth() {
      return this.width - this.padding.left - this.padding.right;
    },
    labelEvery() {
      // Show labels every N rows if rows are too dense
      return Math.max(1, Math.ceil(12 / this.rowHeight));
    },
    isDesktop() {
      return window.innerWidth >= 1024;
    }
  },
  mounted() {
    this.initCanvas();
    this.setupResizeObserver();
    this.draw();
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  watch: {
    profile: {
      handler() {
        this.$nextTick(() => this.draw());
      },
      deep: true
    },
    height() {
      this.$nextTick(() => {
        this.updateCanvasSize();
        this.draw();
      });
    },
    width() {
      this.$nextTick(() => {
        this.updateCanvasSize();
        this.draw();
      });
    }
  },
  methods: {
    initCanvas() {
      this.canvas = this.$refs.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.updateCanvasSize();
    },
    
    updateCanvasSize() {
      if (!this.canvas) return;
      
      const dpr = window.devicePixelRatio || 1;
      
      // Set actual canvas size
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      
      // Set display size
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      
      // Scale context for high DPI
      this.ctx.scale(dpr, dpr);
    },
    
    setupResizeObserver() {
      if (!this.$refs.container) return;
      
      this.resizeObserver = new ResizeObserver(entries => {
        if (entries.length > 0) {
          const { width, height } = entries[0].contentRect;
          if (width !== this.width || height !== this.height) {
            this.$emit('resize', { width, height });
          }
        }
      });
      
      this.resizeObserver.observe(this.$refs.container);
    },
    
    draw() {
      if (!this.ctx || !this.profile.length) return;
      
      // Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
      
      // Draw value area background
      this.drawValueAreaBackground();
      
      // Draw volume bars
      this.drawVolumeBars();
      
      // Draw POC marker
      this.drawPOCMarker();
      
      // Draw current price line
      this.drawCurrentPriceLine();
      
      // Draw labels
      this.drawLabels();
    },
    
    drawValueAreaBackground() {
      if (!this.valueArea) return;
      
      const startRow = this.findRowForPrice(this.valueArea.high);
      const endRow = this.findRowForPrice(this.valueArea.low);
      
      if (startRow >= 0 && endRow >= 0) {
        this.ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
        const y = this.padding.top + startRow * this.rowHeight;
        const height = (endRow - startRow + 1) * this.rowHeight;
        this.ctx.fillRect(0, y, this.width, height);
      }
    },
    
    drawVolumeBars() {
      this.profile.forEach((bin, index) => {
        const y = this.padding.top + index * this.rowHeight;
        const barMaxWidth = this.barWidth;
        const totalBarWidth = bin.volume > 0 ? (bin.volume / this.maxVolume) * barMaxWidth : 0;
        
        if (totalBarWidth > 0) {
          // Calculate segment widths
          const sellWidth = bin.volume > 0 ? (bin.negativeVolume / bin.volume) * totalBarWidth : 0;
          const neutralWidth = bin.volume > 0 ? (bin.neutralVolume / bin.volume) * totalBarWidth : 0;
          const buyWidth = bin.volume > 0 ? (bin.positiveVolume / bin.volume) * totalBarWidth : 0;
          
          let currentX = this.padding.left;
          
          // Draw sell segment (red)
          if (sellWidth > 0) {
            this.ctx.fillStyle = '#F44336';
            this.ctx.fillRect(currentX, y, sellWidth, this.rowHeight - 1);
            currentX += sellWidth;
          }
          
          // Draw neutral segment (gray)
          if (neutralWidth > 0) {
            this.ctx.fillStyle = '#9E9E9E';
            this.ctx.fillRect(currentX, y, neutralWidth, this.rowHeight - 1);
            currentX += neutralWidth;
          }
          
          // Draw buy segment (green)
          if (buyWidth > 0) {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(currentX, y, buyWidth, this.rowHeight - 1);
          }
          
          // Draw MFI heat overlay
          this.drawMFIHeatOverlay(bin, this.padding.left, y, totalBarWidth);
        }
      });
    },
    
    drawMFIHeatOverlay(bin, x, y, width) {
      if (bin.mfiAverage <= 0 || width <= 0) return;
      
      // Map MFI to color (30 = green, 70 = red)
      const mfi = Math.max(0, Math.min(100, bin.mfiAverage));
      let r, g, b;
      
      if (mfi <= 50) {
        // Green to yellow (30-50)
        const ratio = (mfi - 30) / 20;
        r = Math.floor(76 + (255 - 76) * ratio);
        g = Math.floor(175 + (255 - 175) * ratio);
        b = Math.floor(80 + (0 - 80) * ratio);
      } else {
        // Yellow to red (50-70)
        const ratio = (mfi - 50) / 20;
        r = 255;
        g = Math.floor(255 - 255 * ratio);
        b = 0;
      }
      
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
      this.ctx.fillRect(x, y, width, this.rowHeight - 1);
    },
    
    drawPOCMarker() {
      if (!this.pointOfControl) return;
      
      const rowIndex = this.findRowForPrice(this.pointOfControl.priceLevel);
      if (rowIndex >= 0) {
        const y = this.padding.top + rowIndex * this.rowHeight;
        
        // Draw left marker
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(5, y + 2, 8, this.rowHeight - 4);
        
        // Draw right marker
        this.ctx.fillRect(this.width - 13, y + 2, 8, this.rowHeight - 4);
      }
    },
    
    drawCurrentPriceLine() {
      if (!this.currentPrice) return;
      
      const rowIndex = this.findRowForPrice(this.currentPrice);
      if (rowIndex >= 0) {
        const y = this.padding.top + rowIndex * this.rowHeight + this.rowHeight / 2;
        
        this.ctx.strokeStyle = '#FF5722';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, y);
        this.ctx.lineTo(this.width - this.padding.right, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    },
    
    drawLabels() {
      this.ctx.fillStyle = '#333';
      this.ctx.font = '11px Arial';
      this.ctx.textAlign = 'left';
      
      this.profile.forEach((bin, index) => {
        const y = this.padding.top + index * this.rowHeight + this.rowHeight / 2;
        
        // Show labels based on density
        const shouldShowLabel = (index % this.labelEvery === 0) || 
                               (this.isDesktop && this.showAllLabelsOnDesktop && this.rowHeight >= 12);
        
        if (shouldShowLabel) {
          // Left side - price label
          this.ctx.textAlign = 'right';
          this.ctx.fillText(this.formatPrice(bin.priceLevel), this.padding.left - 5, y + 3);
          
          // Right side - volume label
          this.ctx.textAlign = 'left';
          const volumeText = `${this.formatVolume(bin.volume)} [${Math.round(bin.mfiAverage)}]`;
          this.ctx.fillText(volumeText, this.width - this.padding.right + 5, y + 3);
        }
      });
    },
    
    findRowForPrice(price) {
      return this.profile.findIndex(bin => 
        price >= bin.minPrice && price <= bin.maxPrice
      );
    },
    
    getRowFromY(y) {
      const relativeY = y - this.padding.top;
      const rowIndex = Math.floor(relativeY / this.rowHeight);
      return rowIndex >= 0 && rowIndex < this.profile.length ? rowIndex : -1;
    },
    
    onMouseMove(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const rowIndex = this.getRowFromY(y);
      
      if (rowIndex >= 0 && !this.tooltip.pinned) {
        this.tooltip = {
          visible: true,
          x: Math.min(x + 10, this.width - 200),
          y: Math.max(10, y - 80),
          data: this.profile[rowIndex],
          pinned: false
        };
      } else if (!this.tooltip.pinned) {
        this.tooltip.visible = false;
      }
    },
    
    onMouseLeave() {
      if (!this.tooltip.pinned) {
        this.tooltip.visible = false;
      }
    },
    
    onCanvasClick(event) {
      const rect = this.canvas.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const rowIndex = this.getRowFromY(y);
      
      if (rowIndex >= 0) {
        // Toggle pin tooltip
        if (this.tooltip.pinned && this.tooltip.data === this.profile[rowIndex]) {
          this.tooltip.pinned = false;
          this.tooltip.visible = false;
        } else {
          this.tooltip = {
            visible: true,
            x: Math.min(event.clientX - rect.left + 10, this.width - 200),
            y: Math.max(10, event.clientY - rect.top - 80),
            data: this.profile[rowIndex],
            pinned: true
          };
        }
      } else {
        this.tooltip.pinned = false;
        this.tooltip.visible = false;
      }
    },
    
    // Formatting utilities
    formatVolume(volume) {
      if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
      if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
      if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
      return Math.round(volume).toString();
    },
    
    formatPrice(price) {
      return price.toFixed(this.priceDecimals);
    },
    
    formatPct(pct) {
      return pct === 0 ? '0' : pct.toFixed(1);
    }
  }
};
</script>

<style scoped>
.mfi-volume-profile-canvas {
  position: relative;
  width: 100%;
  height: 100%;
}

canvas {
  cursor: crosshair;
  display: block;
}

.profile-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  z-index: 1000;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-header {
  font-weight: 600;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 4px;
}

.tooltip-body div {
  margin-bottom: 2px;
}

.tooltip-body div:last-child {
  margin-bottom: 0;
}
</style>