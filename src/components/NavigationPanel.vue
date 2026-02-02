<template>
  <div class="navigation-panel" :class="{ 'is-visible': isVisible }">
    <div class="panel-header">
      <h3>Quick Navigation</h3>
      <div class="search-container">
        <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="localSearchQuery"
          type="text"
          placeholder="Search..."
          class="search-input"
          aria-label="Search stocks"
          @input="onSearchChange"
        />
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
  top: 84px; /* Exact header height (64px) + 20px gap */
  height: calc(100vh - 104px) !important; /* Force exact viewport fit */
  width: 300px;
  align-self: flex-start;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  z-index: 10;
  transition: none !important; /* Kill drift jitter */
  will-change: transform; /* Opt-in for compositor */
}

.panel-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.search-container {
  display: flex;
  align-items: center;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  background: var(--bg-primary); /* Slightly distinct from card bg */
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.search-input::placeholder {
    color: var(--text-muted);
    font-size: 0.85rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--shadow-color); /* Soft ring if shadow-color defined, or fallback */
}



.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--bg-card);
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
  background: var(--bg-secondary);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
</style>