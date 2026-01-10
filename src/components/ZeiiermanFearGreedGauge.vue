<template>
  <div class="fear-greed-gauge-container">
    <div class="widget-header">
      <h3>Fear & Greed Index Gauge</h3>
      <div class="chart-info">
        <span class="chart-description">Source: CNN Money</span>
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
              :stroke="needleColor"
              stroke-width="4"
              stroke-linecap="round"
              class="gauge-needle"
            />
            <!-- Needle Center -->
            <circle cx="200" cy="200" r="8" :fill="needleColor" />
            <circle cx="200" cy="200" r="4" :fill="needleDotColor" />
          </g>
          
          <!-- Value Display -->
          <text x="200" y="230" text-anchor="middle" class="gauge-value" :fill="textColor">{{ fearGreedValue.toFixed(0) }}</text>
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
import { withBase } from '@/utils/baseUrl';
import { useTheme } from '@/composables/useTheme.js';

export default {
  name: 'ZeiiermanFearGreedGauge',
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      fearGreedValue: 50, // Default start value
      currentSentimentText: 'Neutral',
      loading: true,
      error: false,
      lastUpdate: new Date(),
      // Default placeholder components
      components: {
        sp125: 50,
        hl52: 50,
        mcsi: 50,
        putCall: 50,
        vix50: 50,
        safe: 50,
        yieldSpread: 50
      },
      // Mapping for indicator names to our component keys
      indicatorMap: {
        'MARKET MOMENTUM': 'sp125',
        'STOCK PRICE STRENGTH': 'hl52',
        'STOCK PRICE BREADTH': 'mcsi',
        'PUT AND CALL OPTIONS': 'putCall',
        'MARKET VOLATILITY': 'vix50',
        'SAFE HAVEN DEMAND': 'safe',
        'JUNK BOND DEMAND': 'yieldSpread'
      }
    }
  },
  computed: {
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
      // Use API text if available, otherwise calculate
      if (this.currentSentimentText && !this.loading) return this.currentSentimentText;
      
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
    },
    needleColor() {
        return this.theme === 'dark' ? '#E6E1DC' : '#333333';
    },
    needleDotColor() {
        return this.theme === 'dark' ? '#333333' : '#ffffff';
    },
    textColor() {
        return this.theme === 'dark' ? '#E6E1DC' : '#333333';
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const url = withBase('data/market-sentiment.json?t=' + Date.now());
        const response = await fetch(url);
        if (!response.ok) throw new Error('Data not found');
        
        const data = await response.json();
        
        // Update main value
        if (data.value !== null) {
          this.fearGreedValue = data.value;
        }
        
        if (data.sentiment) {
          this.currentSentimentText = data.sentiment;
        }

        if (data.lastUpdated) {
           this.lastUpdate = data.lastUpdated; // Keep as string or parse date
        }

        // Map indicators to components
        if (data.indicators && Array.isArray(data.indicators)) {
          data.indicators.forEach(ind => {
            const key = this.indicatorMap[ind.name.toUpperCase()];
            if (key) {
              this.components[key] = this.sentimentToValue(ind.sentiment);
            }
          });
        }
        
        this.error = false;
      } catch (err) {
        console.error('Failed to load FearGreed data:', err);
        this.error = true;
        // Keep defaults if failed
      } finally {
        this.loading = false;
      }
    },

    sentimentToValue(sentiment) {
      if (!sentiment) return 50;
      const s = sentiment.toUpperCase();
      if (s.includes('EXTREME FEAR')) return 15;
      if (s.includes('EXTREME GREED')) return 85;
      if (s.includes('FEAR')) return 35;
      if (s.includes('GREED')) return 65;
      return 50; // Neutral
    }
  }
}
</script>

<style scoped>
.fear-greed-gauge-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden; /* Prevent container overflow */
  position: relative;
  box-shadow: var(--shadow-sm);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.chart-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.chart-description {
  font-size: 0.85rem;
  color: var(--text-muted);
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
  background: var(--bg-secondary);
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
  fill: var(--text-primary);
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
  color: var(--text-muted);
}

.label-item.extreme-fear .label-text { color: #e57373; }
.label-item.fear .label-text { color: #ffb74d; }
.label-item.neutral .label-text { color: #fff176; }
.label-item.greed .label-text { color: #81c784; }
.label-item.extreme-greed .label-text { color: #4db6ac; }

/* Components Section - Right side styling */
.components-section {
  max-width: 100%;
  overflow: hidden;
}

.components-section h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-secondary);
  word-wrap: break-word;
}

.component-bar {
  position: relative;
  height: 24px;
  background: var(--bg-secondary);
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
  color: #333; /* Always dark text on bar? Or adaptive? The bar has colors so dark text is probably safer */
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
  color: var(--text-primary);
}

.sentiment-description {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Sentiment Colors - Simplified for theme compatibility */
/* Use backgrounds with opacity or borders */

.extreme-fear {
  border-color: #e57373;
  background: rgba(229, 115, 115, 0.1); 
}
.extreme-fear .sentiment-dot { background: #e57373; }
.extreme-fear .sentiment-text { color: #e57373; }

.fear {
  border-color: #ffb74d;
  background: rgba(255, 183, 77, 0.1); 
}
.fear .sentiment-dot { background: #ffb74d; }
.fear .sentiment-text { color: #ffb74d; }

.neutral {
  border-color: #fff176;
  background: rgba(255, 241, 118, 0.1); 
}
.neutral .sentiment-dot { background: #fff176; }
.neutral .sentiment-text { color: #d4a900; } /* Darker yellow for text visibility */

.greed {
  border-color: #81c784;
  background: rgba(129, 199, 132, 0.1); 
}
.greed .sentiment-dot { background: #81c784; }
.greed .sentiment-text { color: #81c784; }

.extreme-greed {
  border-color: #4db6ac;
  background: rgba(77, 182, 172, 0.1); 
}
.extreme-greed .sentiment-dot { background: #4db6ac; }
.extreme-greed .sentiment-text { color: #4db6ac; }

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