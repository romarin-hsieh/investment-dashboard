<template>
  <div class="vix-indicator-container">
    <div class="widget-header">
      <h3>Fear & Greed Index</h3>
      <div class="vix-subtitle">VIX Volatility Index</div>
    </div>
    
    <div class="vix-content">
      <div class="vix-gauge">
        <div class="gauge-container">
          <div class="gauge-arc">
            <div 
              class="gauge-needle" 
              :style="{ transform: `rotate(${needleRotation}deg)` }"
            ></div>
          </div>
          <div class="gauge-center">
            <div class="vix-value">{{ vixValue }}</div>
            <div class="vix-label">VIX</div>
          </div>
        </div>
      </div>
      
      <div class="vix-status">
        <div class="status-indicator" :class="sentimentClass">
          <div class="status-dot"></div>
          <span class="status-text">{{ sentimentText }}</span>
        </div>
        <div class="vix-description">
          {{ sentimentDescription }}
        </div>
      </div>
      
      <div class="vix-levels">
        <div class="level-item">
          <span class="level-label">Extreme Fear</span>
          <span class="level-range">&gt; 30</span>
        </div>
        <div class="level-item">
          <span class="level-label">Fear</span>
          <span class="level-range">20 - 30</span>
        </div>
        <div class="level-item">
          <span class="level-label">Neutral</span>
          <span class="level-range">12 - 20</span>
        </div>
        <div class="level-item">
          <span class="level-label">Greed</span>
          <span class="level-range">&lt; 12</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VIXIndicator',
  data() {
    return {
      vixValue: 18.45, // Mock data - 在實際應用中會從 API 獲取
      lastUpdate: new Date()
    }
  },
  computed: {
    needleRotation() {
      // 將 VIX 值轉換為儀表盤角度 (0-180度)
      // VIX 範圍通常是 10-50，映射到 0-180度
      const minVix = 10
      const maxVix = 50
      const normalizedVix = Math.max(minVix, Math.min(maxVix, this.vixValue))
      return ((normalizedVix - minVix) / (maxVix - minVix)) * 180
    },
    
    sentimentClass() {
      if (this.vixValue > 30) return 'extreme-fear'
      if (this.vixValue > 20) return 'fear'
      if (this.vixValue > 12) return 'neutral'
      return 'greed'
    },
    
    sentimentText() {
      if (this.vixValue > 30) return 'Extreme Fear'
      if (this.vixValue > 20) return 'Fear'
      if (this.vixValue > 12) return 'Neutral'
      return 'Greed'
    },
    
    sentimentDescription() {
      if (this.vixValue > 30) return 'Market showing signs of panic and extreme volatility'
      if (this.vixValue > 20) return 'Elevated market anxiety and uncertainty'
      if (this.vixValue > 12) return 'Normal market conditions with moderate volatility'
      return 'Low volatility indicating market complacency'
    }
  },
  mounted() {
    // 在實際應用中，這裡會定期更新 VIX 數據
    this.updateVIXData()
  },
  methods: {
    updateVIXData() {
      // Mock 數據更新 - 實際應用中會調用 API
      // 可以整合 TradingView 數據或其他金融數據提供商
      console.log('VIX Indicator loaded with mock data')
    }
  }
}
</script>

<style scoped>
.vix-indicator-container {
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

.vix-subtitle {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.vix-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;
}

/* VIX 儀表盤 */
.vix-gauge {
  display: flex;
  justify-content: center;
  align-items: center;
}

.gauge-container {
  position: relative;
  width: 160px;
  height: 80px;
}

.gauge-arc {
  width: 160px;
  height: 80px;
  border: 8px solid #e9ecef;
  border-bottom: none;
  border-radius: 80px 80px 0 0;
  position: relative;
  background: linear-gradient(to right, 
    #22ab94 0%, 
    #ffc107 25%, 
    #fd7e14 50%, 
    #dc3545 75%, 
    #6f42c1 100%);
  background-clip: padding-box;
}

.gauge-needle {
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 2px;
  height: 70px;
  background: #333;
  transform-origin: bottom center;
  transition: transform 0.5s ease;
  z-index: 2;
}

.gauge-needle::after {
  content: '';
  position: absolute;
  top: -6px;
  left: -4px;
  width: 10px;
  height: 10px;
  background: #333;
  border-radius: 50%;
}

.gauge-center {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.vix-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.vix-label {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

/* 狀態指示器 */
.vix-status {
  text-align: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 1.1rem;
  font-weight: 600;
}

.vix-description {
  font-size: 0.9rem;
  color: #6c757d;
  line-height: 1.4;
  margin-bottom: 1.5rem;
}

/* 情緒狀態顏色 */
.extreme-fear .status-dot {
  background: #6f42c1;
}

.extreme-fear .status-text {
  color: #6f42c1;
}

.fear .status-dot {
  background: #dc3545;
}

.fear .status-text {
  color: #dc3545;
}

.neutral .status-dot {
  background: #ffc107;
}

.neutral .status-text {
  color: #e67e22;
}

.greed .status-dot {
  background: #22ab94;
}

.greed .status-text {
  color: #22ab94;
}

/* VIX 等級說明 */
.vix-levels {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.level-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.85rem;
}

.level-label {
  font-weight: 500;
  color: #495057;
}

.level-range {
  color: #6c757d;
  font-family: monospace;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .vix-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .gauge-container {
    width: 140px;
    height: 70px;
  }
  
  .gauge-arc {
    width: 140px;
    height: 70px;
    border-radius: 70px 70px 0 0;
  }
  
  .gauge-needle {
    height: 60px;
  }
  
  .vix-levels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .vix-indicator-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>