<template>
  <div class="market-indices-container">
    <div class="widget-header">
      <h3>Index Insight</h3>
      <p class="widget-description">Real-time performance of global stock indices</p>
    </div>
    <div class="indices-grid">
      <div 
        v-for="index in marketIndices" 
        :key="index.symbol"
        class="index-card"
      >
        <div class="index-info">
          <h4 class="index-name">{{ index.name }}</h4>
          <p class="index-symbol">{{ index.symbol }}</p>
        </div>
        <div class="index-values">
          <div class="index-price">{{ formatPrice(index.price) }}</div>
          <div 
            class="index-change"
            :class="getChangeClass(index.change)"
          >
            {{ formatChange(index.change) }} ({{ formatPercent(index.changePercent) }})
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MarketIndices',
  data() {
    return {
      marketIndices: [
        {
          name: 'S&P 500',
          symbol: 'SPX',
          price: 4756.50,
          change: 23.45,
          changePercent: 0.49
        },
        {
          name: 'Dow Jones',
          symbol: 'DJI',
          price: 37863.80,
          change: -45.20,
          changePercent: -0.12
        },
        {
          name: 'NASDAQ',
          symbol: 'IXIC',
          price: 14944.70,
          change: 78.90,
          changePercent: 0.53
        },
        {
          name: 'Russell 2000',
          symbol: 'RUT',
          price: 2027.30,
          change: 12.15,
          changePercent: 0.60
        },
        {
          name: 'FTSE 100',
          symbol: 'UKX',
          price: 7685.20,
          change: -15.80,
          changePercent: -0.21
        },
        {
          name: 'Nikkei 225',
          symbol: 'NKY',
          price: 33486.90,
          change: 156.40,
          changePercent: 0.47
        },
        {
          name: 'DAX',
          symbol: 'DAX',
          price: 16751.64,
          change: 89.23,
          changePercent: 0.54
        },
        {
          name: 'Shanghai Composite',
          symbol: 'SHCOMP',
          price: 2974.93,
          change: -8.45,
          changePercent: -0.28
        }
      ]
    }
  },
  methods: {
    formatPrice(price) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price)
    },

    formatChange(change) {
      const sign = change >= 0 ? '+' : ''
      return `${sign}${this.formatPrice(Math.abs(change))}`
    },

    formatPercent(percent) {
      const sign = percent >= 0 ? '+' : ''
      return `${sign}${percent.toFixed(2)}%`
    },

    getChangeClass(change) {
      if (change > 0) return 'positive'
      if (change < 0) return 'negative'
      return 'neutral'
    }
  }
}
</script>

<style scoped>
.market-indices-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.widget-header {
  background: #f8f9fa;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.widget-description {
  font-size: 0.9rem;
  color: #6c757d;
  margin: 0;
}

.indices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1px;
  background: #e9ecef;
}

.index-card {
  background: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.index-card:hover {
  background: #f8f9fa;
}

.index-info {
  flex: 1;
}

.index-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.index-symbol {
  font-size: 0.8rem;
  color: #6c757d;
  margin: 0;
  font-family: 'Courier New', monospace;
}

.index-values {
  text-align: right;
}

.index-price {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.index-change {
  font-size: 0.85rem;
  font-weight: 500;
}

.index-change.positive {
  color: #22ab94;
}

.index-change.negative {
  color: #f7525f;
}

.index-change.neutral {
  color: #6c757d;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .indices-grid {
    grid-template-columns: 1fr;
  }
  
  .index-card {
    padding: 0.75rem 1rem;
  }
  
  .index-name {
    font-size: 0.9rem;
  }
  
  .index-price {
    font-size: 0.95rem;
  }
}
</style>