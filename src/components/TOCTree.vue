<template>
  <div class="toc-tree">
    <div
      v-for="sectorNode in nodes"
      :key="sectorNode.id"
      class="tree-node sector-node"
    >
      <!-- Sector Header - 移除 details/summary，直接顯示 -->
      <div class="tree-label sector-label">
        <span class="label-text" :title="sectorNode.label">{{ sectorNode.label }}</span>
        <span class="item-count">({{ getTotalSymbolCount(sectorNode) }})</span>
      </div>
      
      <!-- Industry 和 Symbol 直接顯示，不使用 details -->
      <div class="tree-children">
        <div
          v-for="industryNode in sectorNode.children"
          :key="industryNode.id"
          class="tree-node industry-node"
        >
          <!-- Industry Header - 移除 details/summary，直接顯示 -->
          <div class="tree-label industry-label">
            <span class="label-text" :title="industryNode.label">{{ industryNode.label }}</span>
            <span class="item-count">({{ industryNode.children.length }})</span>
          </div>
          
          <!-- Symbol 列表直接顯示 -->
          <div class="tree-children">
            <button
              v-for="symbolNode in industryNode.children"
              :key="symbolNode.id"
              class="tree-node symbol-node"
              :class="{ 'is-active': symbolNode.symbol === activeSymbol }"
              :aria-current="symbolNode.symbol === activeSymbol ? 'location' : null"
              @click="onSymbolClick(symbolNode.symbol)"
              @keydown.enter="onSymbolClick(symbolNode.symbol)"
              @keydown.space.prevent="onSymbolClick(symbolNode.symbol)"
            >
              <span class="symbol-text" :title="symbolNode.label">{{ symbolNode.label }}</span>
              <span class="exchange-badge">{{ symbolNode.metadata.exchange }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TOCTree',
  props: {
    nodes: {
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
    }
    // 移除 expandedSections prop，因為不再需要
  },
  emits: ['symbol-click'], // 移除 toggle-section emit
  methods: {
    onSymbolClick(symbol) {
      this.$emit('symbol-click', symbol)
    },

    getTotalSymbolCount(sectorNode) {
      return sectorNode.children.reduce((total, industryNode) => {
        return total + industryNode.children.length
      }, 0)
    }
    // 移除 onToggle 和 isSectionExpanded 方法
  }
}
</script>

<style scoped>
.toc-tree {
  font-size: 0.85rem;
}

.tree-node {
  margin: 0;
}

/* Sector Styles - Level 0 */
.sector-node {
  margin-bottom: 0.25rem;
}

.sector-label {
  font-weight: 700;
  color: var(--text-primary);
  background: transparent;
  padding: 0.5rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: none;
  text-align: left;
  width: 100%;
  cursor: default;
  font-size: 0.95rem; /* Slightly larger heading */
  letter-spacing: 0.02em;
  margin-top: 1.5rem; /* Use whitespace for separation */
  margin-bottom: 0.25rem;
  opacity: 0.9;
}

.sector-node:first-child .sector-label {
  margin-top: 0.5rem;
}

/* Industry Styles - Level 1 */
.industry-node {
  margin-bottom: 0.125rem;
}

.industry-label {
  font-weight: 600;
  color: var(--text-secondary);
  padding: 0.5rem 0.75rem;
  padding-left: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: transparent;
  border: none;
  text-align: left;
  width: 100%;
  cursor: default;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
  margin-top: 0.5rem;
}

/* Symbol Styles - Level 2 */
.symbol-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  padding-left: 1.5rem;
  margin-bottom: 2px;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.symbol-node:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.symbol-node.is-active {
  background: var(--bg-secondary);
  color: var(--primary-color);
  font-weight: 600;
  border-left-color: var(--primary-color);
}

.symbol-node.is-active .exchange-badge {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Text Content Styles */
.label-text {
  flex: 1;
  min-width: 0; 
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 0.5rem;
}

.symbol-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  margin-right: 0.5rem;
}

.exchange-badge {
  font-size: 0.7rem;
  padding: 0.125rem 0.25rem;
  background: var(--bg-secondary);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  font-weight: 400;
  flex-shrink: 0; 
}

.item-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
  flex-shrink: 0;
}

.tree-children {
  margin-top: 0.125rem;
}

/* Focus styles for accessibility */
.symbol-node:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .symbol-node {
    transition: none;
  }
}

/* Responsive adjustments */
@media (max-width: 320px) {
  .industry-label {
    padding-left: 1.5rem; 
  }
  
  .symbol-node {
    padding-left: 2.5rem;
  }
  
  .label-text,
  .symbol-text {
    font-size: 0.75rem;
  }
}
</style>