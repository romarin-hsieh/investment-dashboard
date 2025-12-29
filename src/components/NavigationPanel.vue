<template>
  <div class="navigation-panel" :class="{ 'is-visible': isVisible }">
    <div class="panel-header">
      <h3>Quick Navigation</h3>
      <div class="search-container">
        <input
          v-model="localSearchQuery"
          type="text"
          placeholder="Search stocks, sectors, industries..."
          class="search-input"
          aria-label="Search stocks"
          @input="onSearchChange"
        />
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <div class="panel-content">
      <TOCTree
        :nodes="filteredTocTree"
        :active-symbol="activeSymbol"
        :search-query="localSearchQuery"
        @symbol-click="onSymbolClick"
      />
    </div>
  </div>
</template>

<script>
import TOCTree from './TOCTree.vue'

export default {
  name: 'NavigationPanel',
  components: {
    TOCTree
  },
  props: {
    tocTree: {
      type: Array,
      default: () => []
    },
    activeSymbol: {
      type: String,
      default: ''
    },
    searchQuery: {
      type: String,
      default: ''
    },
    isVisible: {
      type: Boolean,
      default: true
    }
    // 移除 expandedSections prop
  },
  emits: ['symbol-click', 'search-change'], // 移除 toggle-section emit
  data() {
    return {
      localSearchQuery: this.searchQuery
    }
  },
  computed: {
    filteredTocTree() {
      if (!this.localSearchQuery.trim()) {
        return this.tocTree
      }

      const query = this.localSearchQuery.toLowerCase().trim()
      
      return this.tocTree.map(sectorNode => {
        const filteredSector = { ...sectorNode, children: [] }
        
        sectorNode.children.forEach(industryNode => {
          const filteredIndustry = { ...industryNode, children: [] }
          
          industryNode.children.forEach(symbolNode => {
            // 搜尋匹配：sector, industry, symbol, company name
            const matches = [
              sectorNode.label,
              industryNode.label,
              symbolNode.label,
              symbolNode.symbol
            ].some(text => text.toLowerCase().includes(query))
            
            if (matches) {
              filteredIndustry.children.push(symbolNode)
            }
          })
          
          if (filteredIndustry.children.length > 0) {
            filteredSector.children.push(filteredIndustry)
          }
        })
        
        return filteredSector.children.length > 0 ? filteredSector : null
      }).filter(Boolean)
    }
  },
  watch: {
    searchQuery(newValue) {
      this.localSearchQuery = newValue
    }
  },
  methods: {
    onSymbolClick(symbol) {
      this.$emit('symbol-click', symbol)
    },

    onSearchChange() {
      this.$emit('search-change', this.localSearchQuery)
    }
    // 移除 onToggleSection 方法
  }
}
</script>

<style scoped>
.navigation-panel {
  position: sticky;
  top: 80px; /* Account for header height */
  height: calc(100vh - 100px);
  width: 350px; /* 從 300px 增加到 350px */
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.search-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.85rem;
  background: white;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

/* 響應式設計 */
@media (max-width: 1023px) {
  .navigation-panel {
    display: none;
  }
}

/* 滾動條樣式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>