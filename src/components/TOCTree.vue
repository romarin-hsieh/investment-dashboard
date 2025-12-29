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
  font-weight: 600;
  color: #333;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  text-align: left;
  width: 100%;
  cursor: default; /* 移除 pointer cursor，因為不再可點擊 */
}

/* Industry Styles - Level 1 */
.industry-node {
  margin-bottom: 0.125rem;
}

.industry-label {
  font-weight: 500;
  color: #495057;
  padding: 0.375rem 0.75rem;
  padding-left: 2rem; /* 階層縮排 - Level 1 */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  border-radius: 3px;
  text-align: left;
  width: 100%;
  cursor: default; /* 移除 pointer cursor，因為不再可點擊 */
}

/* Symbol Styles - Level 2 */
.symbol-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.375rem 0.75rem;
  padding-left: 3.25rem; /* 階層縮排 - Level 2 */
  margin-bottom: 0.0625rem;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 0.8rem;
}

.symbol-node:hover {
  background: #e7f3ff;
}

.symbol-node.is-active {
  background: #007bff;
  color: white;
  font-weight: 500;
}

.symbol-node.is-active .exchange-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

/* Text Content Styles */
.label-text {
  flex: 1;
  min-width: 0; /* 允許文字收縮 */
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
  background: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
  border-radius: 2px;
  font-weight: 400;
  flex-shrink: 0; /* 防止 badge 被壓縮 */
}

.item-count {
  font-size: 0.75rem;
  color: #6c757d;
  font-weight: 400;
  flex-shrink: 0;
}

.tree-children {
  margin-top: 0.125rem;
}

/* Focus styles for accessibility */
.symbol-node:focus {
  outline: 2px solid #007bff;
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
    padding-left: 1.5rem; /* 減少小螢幕的縮排 */
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