<template>
  <div class="custom-fear-greed-container">
    <div class="widget-header">
      <h3>Fear & Greed Index</h3>
      <div class="chart-info">
        <span class="chart-description">Based on Zeiierman's Algorithm</span>
      </div>
    </div>
    
    <div class="fear-greed-content">
      <!-- Semicircle Gauge -->
      <div class="gauge-container">
        <svg class="gauge-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
          <!-- Background Arc -->
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e9ecef"
            stroke-width="12"
            stroke-linecap="round"
          />
          
          <!-- Colored Segments with Lower Saturation -->
          <path
            d="M 20 100 A 80 80 0 0 1 52 40"
            fill="none"
            stroke="#e57373"
            stroke-width="12"
            stroke-linecap="round"
            class="extreme-fear-arc"
          />
          <path
            d="M 52 40 A 80 80 0 0 1 84 20"
            fill="none"
            stroke="#ffb74d"
            stroke-width="12"
            stroke-linecap="round"
            class="fear-arc"
          />
          <path
            d="M 84 20 A 80 80 0 0 1 116 20"
            fill="none"
            stroke="#fff176"
            stroke-width="12"
            stroke-linecap="round"
            class="neutral-arc"
          />
          <path
            d="M 116 20 A 80 80 0 0 1 148 40"
            fill="none"
            stroke="#81c784"
            stroke-width="12"
            stroke-linecap="round"
            class="greed-arc"
          />
          <path
            d="M 148 40 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#4db6ac"
            stroke-width="12"
            stroke-linecap="round"
            class="extreme-greed-arc"
          />
          
          <!-- Needle -->
          <line
            :x1="100"
            :y1="100"
            :x2="needleX"
            :y2="needleY"
            stroke="#333"
            stroke-width="3"
            stroke-linecap="round"
            class="gauge-needle"
          />
          
          <!-- Center Circle -->
          <circle cx="100" cy="100" r="6" fill="#333" />
          
          <!-- Value Display -->
          <text x="100" y="115" text-anchor="middle" class="gauge-value">{{ fearGreedValue }}</text>
        </svg>
        
        <!-- Labels -->
        <div class="gauge-labels">
          <span class="label extreme-fear">Extreme Fear</span>
          <span class="label fear">Fear</span>
          <span class="label neutral">Neutral</span>
          <span class="label greed">Greed</span>
          <span class="label extreme-greed">Extreme Greed</span>
        </div>
      </div>
      
      <!-- Status Information -->
      <div class="status-info">
        <div class="current-status">
          <div class="status-indicator" :class="currentSentimentClass">
            <div class="status-dot"></div>
            <span class="status-text">{{ currentSentiment }}</span>
          </div>
          <div class="status-description">{{ sentimentDescription }}</div>
        </div>
        
        <!-- Component Breakdown -->
        <div class="components-breakdown">
          <h4>Index Components</h4>
          <div class="component-item">
            <span class="component-name">S&P 500 vs 125-day MA</span>
            <span class="component-value">{{ components.sp125 }}</span>
          </div>
          <div class="component-item">
            <span class="component-name">52-Week High/Low</span>
            <span class="component-value">{{ components.hl52 }}</span>
          </div>
          <div class="component-item">
            <span class="component-name">Put/Call Ratio</span>
            <span class="component-value">{{ components.putCall }}</span>
          </div>
          <div class="component-item">
            <span class="component-name">VIX vs 50-day MA</span>
            <span class="component-value">{{ components.vix50 }}</span>
          </div>
          <div class="component-item">
            <span class="component-name">Market Breadth</span>
            <span class="component-value">{{ components.breadth }}</span>
          </div>
          <div class="component-item">
            <span class="component-name">Safe Haven Demand</span>
            <span class="component-value">{{ components.safeHaven }}</span>
          </div>
          <div class="component-item">
            <span class="component-name">Junk Bond Demand</span>
            <span class="component-value">{{ components.junkBond }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomFearGreedGauge',
  data() {
    return {
      // Mock data based on Zeiierman's algorithm components
      components: {
        sp125: 65,    // S&P 500 vs 125-day moving average
        hl52: 45,     // 52-week high/low strength
        putCall: 35,  // Put/Call ratio (inverted)
        vix50: 40,    // VIX vs 50-day MA (inverted)
        breadth: 55,  // McClellan Summation Index
        safeHaven: 60, // Stock vs Bond performance
        junkBond: 50  // Junk bond vs Treasury yield spread
      }
    }
  },
  computed: {
    fearGreedValue() {
      // Calculate average of all components (Zeiierman's method)
      const values = Object.values(this.components)
      const average = values.reduce((sum, val) => sum + val, 0) / values.length
      return Math.round(average)
    },
    
    needleAngle() {
      // Convert 0-100 value to -90 to +90 degrees
      return (this.fearGreedValue - 50) * 1.8
    },
    
    needleX() {
      const angle = this.needleAngle * (Math.PI / 180)
      return 100 + 70 * Math.sin(angle)
    },
    
    needleY() {
      const angle = this.needleAngle * (Math.PI / 180)
      return 100 - 70 * Math.cos(angle)
    },
    
    currentSentiment() {
      if (this.fearGreedValue <= 20) return 'Extreme Fear'
      if (this.fearGreedValue <= 40) return 'Fear'
      if (this.fearGreedValue <= 60) return 'Neutral'
      if (this.fearGreedValue <= 80) return 'Greed'
      return 'Extreme Greed'
    },
    
    currentSentimentClass() {
      if (this.fearGreedValue <= 20) return 'extreme-fear'
      if (this.fearGreedValue <= 40) return 'fear'
      if (this.fearGreedValue <= 60) return 'neutral'
      if (this.fearGreedValue <= 80) return 'greed'
      return 'extreme-greed'
    },
    
    sentimentDescription() {
      if (this.fearGreedValue <= 20) return 'Market showing extreme pessimism and panic selling'
      if (this.fearGreedValue <= 40) return 'Elevated market anxiety with defensive positioning'
      if (this.fearGreedValue <= 60) return 'Balanced market sentiment with mixed signals'
      if (this.fearGreedValue <= 80) return 'Optimistic market conditions with risk appetite'
      return 'Excessive market euphoria and potential overvaluation'
    }
  },
  mounted() {
    // Simulate real-time updates
    this.updateComponents()
    setInterval(this.updateComponents, 30000) // Update every 30 seconds
  },
  methods: {
    updateComponents() {
      // Mock real-time data updates
      // In production, this would fetch real market data
      const variation = () => Math.random() * 10 - 5 // ±5 variation
      
      Object.keys(this.components).forEach(key => {
        const newValue = this.components[key] + variation()
        this.components[key] = Math.max(0, Math.min(100, Math.round(newValue)))
      })
      
      console.log('Fear & Greed Index updated:', this.fearGreedValue)
    }
  }
}
</script>

<style scoped>
.custom-fear-greed-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.chart-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.chart-description {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.fear-greed-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

/* Gauge Styles */
.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge-svg {
  width: 100%;
  max-width: 300px;
  height: auto;
}

.gauge-value {
  font-size: 16px;
  font-weight: 700;
  fill: #333;
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 300px;
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.label {
  font-weight: 500;
}

.label.extreme-fear { color: #dc3545; }
.label.fear { color: #fd7e14; }
.label.neutral { color: #ffc107; }
.label.greed { color: #28a745; }
.label.extreme-greed { color: #22ab94; }

/* Status Information */
.status-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.current-status {
  text-align: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 1.2rem;
  font-weight: 600;
}

.status-description {
  font-size: 0.9rem;
  color: #6c757d;
  line-height: 1.4;
}

/* Sentiment Colors */
.extreme-fear .status-dot { background: #dc3545; }
.extreme-fear .status-text { color: #dc3545; }
.fear .status-dot { background: #fd7e14; }
.fear .status-text { color: #fd7e14; }
.neutral .status-dot { background: #ffc107; }
.neutral .status-text { color: #e67e22; }
.greed .status-dot { background: #28a745; }
.greed .status-text { color: #28a745; }
.extreme-greed .status-dot { background: #22ab94; }
.extreme-greed .status-text { color: #22ab94; }

/* Components Breakdown */
.components-breakdown h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.5rem;
}

.component-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f8f9fa;
  font-size: 0.85rem;
}

.component-name {
  color: #495057;
  font-weight: 500;
}

.component-value {
  color: #6c757d;
  font-family: monospace;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .fear-greed-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .chart-info {
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .custom-fear-greed-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .gauge-labels {
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
}
</style>