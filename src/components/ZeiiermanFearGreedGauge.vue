<template>
  <div class="fear-greed-gauge-container">
    <div class="widget-header">
      <h3>Fear & Greed Index Gauge</h3>
      <div class="chart-info">
        <span class="chart-description">Based on Zeiierman's Algorithm</span>
      </div>
    </div>
    
    <div class="market-fng-gauge__meter-container">
      <!-- Left Side: Current Sentiment + Gauge -->
      <div class="left-side">
        <!-- Current Sentiment Status - Above gauge, left side only -->
        <div class="current-sentiment" :class="sentimentClass">
          <div class="sentiment-indicator">
            <div class="sentiment-dot"></div>
            <span class="sentiment-text">{{ currentSentiment }}</span>
          </div>
          <div class="sentiment-description">{{ sentimentDescription }}</div>
        </div>
        
        <!-- Semicircle Gauge -->
        <div class="gauge-wrapper">
        <svg class="gauge-svg" viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
          <!-- Background Arc with Color Zones -->
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <!-- 極度恐懼 (0-25): 降低飽和度的紅色 -->
              <stop offset="0%" style="stop-color:#e57373;stop-opacity:1" />
              <stop offset="12.5%" style="stop-color:#ef5350;stop-opacity:1" />
              <stop offset="25%" style="stop-color:#ffb74d;stop-opacity:1" />
              
              <!-- 恐懼 (25-45): 降低飽和度的橙色 -->
              <stop offset="35%" style="stop-color:#ffcc80;stop-opacity:1" />
              <stop offset="45%" style="stop-color:#ffd54f;stop-opacity:1" />
              
              <!-- 中性 (45-55): 降低飽和度的黃色 -->
              <stop offset="50%" style="stop-color:#fff176;stop-opacity:1" />
              <stop offset="55%" style="stop-color:#fff59d;stop-opacity:1" />
              
              <!-- 貪婪 (55-75): 降低飽和度的綠色 -->
              <stop offset="65%" style="stop-color:#aed581;stop-opacity:1" />
              <stop offset="75%" style="stop-color:#81c784;stop-opacity:1" />
              
              <!-- 極度貪婪 (75-100): 降低飽和度的深綠色 -->
              <stop offset="87.5%" style="stop-color:#66bb6a;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#4db6ac;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Main Arc -->
          <path
            d="M 40 200 A 160 160 0 0 1 360 200"
            fill="none"
            stroke="url(#gaugeGradient)"
            stroke-width="20"
            stroke-linecap="round"
          />
          
          <!-- Needle -->
          <g class="needle-group">
            <line
              :x1="200"
              :y1="200"
              :x2="needleX"
              :y2="needleY"
              stroke="#333"
              stroke-width="4"
              stroke-linecap="round"
              class="gauge-needle"
            />
            <!-- Needle Center -->
            <circle cx="200" cy="200" r="8" fill="#333" />
            <circle cx="200" cy="200" r="4" fill="#fff" />
          </g>
          
          <!-- Value Display -->
          <text x="200" y="230" text-anchor="middle" class="gauge-value">{{ fearGreedValue.toFixed(0) }}</text>
        </svg>
        
        <!-- Labels -->
        <div class="gauge-labels">
          <div class="label-item extreme-fear">
            <span class="label-text">Extreme Fear</span>
            <span class="label-range">0-25</span>
          </div>
          <div class="label-item fear">
            <span class="label-text">Fear</span>
            <span class="label-range">25-45</span>
          </div>
          <div class="label-item neutral">
            <span class="label-text">Neutral</span>
            <span class="label-range">45-55</span>
          </div>
          <div class="label-item greed">
            <span class="label-text">Greed</span>
            <span class="label-range">55-75</span>
          </div>
          <div class="label-item extreme-greed">
            <span class="label-text">Extreme Greed</span>
            <span class="label-range">75-100</span>
          </div>
        </div>
      </div>
      </div>
      
      <!-- Right Side: Component Breakdown -->
      <div class="components-section">
        <h4>Index Components</h4>
        <div class="components-grid">
          <div class="component-item">
            <span class="component-name">S&P 500 vs 125-day MA</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.sp125 + '%' }"></div>
              <span class="component-value">{{ components.sp125 }}</span>
            </div>
          </div>
          <div class="component-item">
            <span class="component-name">52-Week High/Low Strength</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.hl52 + '%' }"></div>
              <span class="component-value">{{ components.hl52 }}</span>
            </div>
          </div>
          <div class="component-item">
            <span class="component-name">Market Breadth (McClellan)</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.mcsi + '%' }"></div>
              <span class="component-value">{{ components.mcsi }}</span>
            </div>
          </div>
          <div class="component-item">
            <span class="component-name">Put/Call Ratio</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.putCall + '%' }"></div>
              <span class="component-value">{{ components.putCall }}</span>
            </div>
          </div>
          <div class="component-item">
            <span class="component-name">VIX vs 50-day MA</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.vix50 + '%' }"></div>
              <span class="component-value">{{ components.vix50 }}</span>
            </div>
          </div>
          <div class="component-item">
            <span class="component-name">Safe Haven Demand</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.safe + '%' }"></div>
              <span class="component-value">{{ components.safe }}</span>
            </div>
          </div>
          <div class="component-item">
            <span class="component-name">Junk Bond Demand</span>
            <div class="component-bar">
              <div class="component-fill" :style="{ width: components.yieldSpread + '%' }"></div>
              <span class="component-value">{{ components.yieldSpread }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ZeiiermanFearGreedGauge',
  data() {
    return {
      // Mock data based on Zeiierman's algorithm components - Adjusted for index value of 58
      components: {
        sp125: 65,        // S&P 500 vs 125-day moving average
        hl52: 52,         // 52-week high/low strength  
        mcsi: 60,         // McClellan Summation Index (Market Breadth)
        putCall: 45,      // Put/Call ratio (inverted)
        vix50: 55,        // VIX vs 50-day MA (inverted)
        safe: 62,         // Safe Haven Demand (Stock vs Bond performance)
        yieldSpread: 67   // Junk Bond Demand (Yield spread)
      },
      lastUpdate: new Date()
    }
  },
  computed: {
    fearGreedValue() {
      // Calculate average of all components (Zeiierman's method)
      const values = Object.values(this.components)
      const average = values.reduce((sum, val) => sum + val, 0) / values.length
      return average
    },
    
    needleAngle() {
      // Convert 0-100 value to -90 to +90 degrees (180 degree arc)
      return (this.fearGreedValue - 50) * 1.8
    },
    
    needleX() {
      const angle = this.needleAngle * (Math.PI / 180)
      return 200 + 140 * Math.sin(angle)
    },
    
    needleY() {
      const angle = this.needleAngle * (Math.PI / 180)
      return 200 - 140 * Math.cos(angle)
    },
    
    currentSentiment() {
      if (this.fearGreedValue <= 25) return 'Extreme Fear'
      if (this.fearGreedValue <= 45) return 'Fear'
      if (this.fearGreedValue <= 55) return 'Neutral'
      if (this.fearGreedValue <= 75) return 'Greed'
      return 'Extreme Greed'
    },
    
    sentimentClass() {
      if (this.fearGreedValue <= 25) return 'extreme-fear'
      if (this.fearGreedValue <= 45) return 'fear'
      if (this.fearGreedValue <= 55) return 'neutral'
      if (this.fearGreedValue <= 75) return 'greed'
      return 'extreme-greed'
    },
    
    sentimentDescription() {
      if (this.fearGreedValue <= 25) return 'Market showing extreme pessimism and panic selling conditions'
      if (this.fearGreedValue <= 45) return 'Elevated market anxiety with defensive investor positioning'
      if (this.fearGreedValue <= 55) return 'Balanced market sentiment with mixed investor signals'
      if (this.fearGreedValue <= 75) return 'Optimistic market conditions with increased risk appetite'
      return 'Excessive market euphoria indicating potential overvaluation'
    }
  },
  mounted() {
    // 不执行自动更新，保持固定的58值
    console.log('Zeiierman Fear & Greed Index loaded with fixed value:', this.fearGreedValue)
  },
  methods: {
    // 保留方法以备将来需要手动更新
    updateComponents() {
      // 在生产环境中，这里会获取真实的市场数据
      this.lastUpdate = new Date()
      console.log('Zeiierman Fear & Greed Index:', this.fearGreedValue)
    }
  }
}
</script>

<style scoped>
.fear-greed-gauge-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden; /* Prevent container overflow */
  position: relative;
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

.market-fng-gauge__meter-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  align-items: start;
  overflow: hidden; /* Prevent grid overflow */
}

/* Left Side Container */
.left-side {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 100%;
  overflow: hidden;
}

/* Current Sentiment - Now positioned in left side only */
.current-sentiment {
  text-align: center;
  padding: 1.25rem;
  border-radius: 12px;
  background: #f8f9fa;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  max-width: 100%;
  overflow: hidden;
}

/* Gauge Styles */
.gauge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
}

.gauge-svg {
  width: 100%;
  max-width: 400px;
  height: auto;
  overflow: visible; /* Allow SVG elements to be visible */
}

.gauge-value {
  font-size: 24px;
  font-weight: 700;
  fill: #333;
}

.needle-group {
  transition: all 0.8s ease-in-out;
}

/* Labels */
.gauge-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 400px;
  margin-top: 1rem;
  font-size: 0.75rem;
  overflow: hidden;
}

.label-item {
  text-align: center;
  flex: 1;
  min-width: 0; /* Allow flex items to shrink */
}

.label-text {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.label-range {
  display: block;
  font-size: 0.7rem;
  opacity: 0.7;
}

.label-item.extreme-fear .label-text { color: #a67c7c; }
.label-item.fear .label-text { color: #b8956f; }
.label-item.neutral .label-text { color: #b8b56f; }
.label-item.greed .label-text { color: #7ca67c; }
.label-item.extreme-greed .label-text { color: #7ca688; }

/* Components Section - Right side styling */
.components-section {
  max-width: 100%;
  overflow: hidden;
}

.components-section h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.components-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 100%;
}

.component-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 100%;
}

.component-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
  word-wrap: break-word;
}

.component-bar {
  position: relative;
  height: 24px;
  background: #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
}

.component-fill {
  height: 100%;
  background: linear-gradient(90deg, #c67373 0%, #d4956f 25%, #d4c56f 50%, #7ca67c 75%, #7ca688 100%);
  border-radius: 12px;
  transition: width 0.8s ease;
}

.component-value {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
  text-shadow: 0 0 3px rgba(255,255,255,0.8);
}

.sentiment-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.sentiment-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.sentiment-text {
  font-size: 1.4rem;
  font-weight: 700;
}

.sentiment-description {
  font-size: 0.95rem;
  color: #6c757d;
  line-height: 1.5;
}

/* Sentiment Colors */
.extreme-fear {
  background: linear-gradient(135deg, #f5f0f0, #f8f5f5);
  border-color: #a67c7c;
}
.extreme-fear .sentiment-dot { background: #a67c7c; }
.extreme-fear .sentiment-text { color: #a67c7c; }

.fear {
  background: linear-gradient(135deg, #f5f3f0, #f8f6f5);
  border-color: #b8956f;
}
.fear .sentiment-dot { background: #b8956f; }
.fear .sentiment-text { color: #b8956f; }

.neutral {
  background: linear-gradient(135deg, #f5f5f0, #f8f8f5);
  border-color: #b8b56f;
}
.neutral .sentiment-dot { background: #b8b56f; }
.neutral .sentiment-text { color: #a6a35f; }

.greed {
  background: linear-gradient(135deg, #f0f5f0, #f5f8f5);
  border-color: #7ca67c;
}
.greed .sentiment-dot { background: #7ca67c; }
.greed .sentiment-text { color: #7ca67c; }

.extreme-greed {
  background: linear-gradient(135deg, #f0f5f2, #f5f8f6);
  border-color: #7ca688;
}
.extreme-greed .sentiment-dot { background: #7ca688; }
.extreme-greed .sentiment-text { color: #6f9577; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .market-fng-gauge__meter-container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .left-side {
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .chart-info {
    align-items: flex-start;
  }
  
  .gauge-labels {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .label-item {
    display: flex;
    justify-content: space-between;
    width: 200px;
  }
  
  .current-sentiment {
    padding: 1rem;
  }
  
  .sentiment-text {
    font-size: 1.2rem;
  }
  
  .market-fng-gauge__meter-container {
    gap: 1.5rem;
  }
  
  .left-side {
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .fear-greed-gauge-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .current-sentiment {
    padding: 0.75rem;
  }
  
  .sentiment-text {
    font-size: 1.1rem;
  }
  
  .sentiment-description {
    font-size: 0.85rem;
  }
  
  .market-fng-gauge__meter-container {
    gap: 1rem;
  }
  
  .left-side {
    gap: 0.75rem;
  }
}
</style>