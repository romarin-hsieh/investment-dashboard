<template>
  <div class="super-investor-stats">
    <div class="section-header" @click="toggleSection('ownership')">
      <h3>Elite Funds</h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading investor data...</span>
    </div>

    <!-- No Data State -->
    <div v-else-if="!hasData" class="no-data-state">
      <p>No super investor data available for this stock.</p>
    </div>

    <!-- Data Content -->
    <div v-else class="stats-content">
      
      <!-- Sub-section 1: Ownership -->
      <div class="stats-subsection ownership-section">
        <div class="subsection-header" @click="toggleSection('ownership')">
             <h4>Ownership</h4>
        </div>
        
        <div v-show="expandedSections.ownership" class="subsection-content">
           <div class="table-responsive">
             <table class="data-table">
               <thead>
                 <tr>
                   <th class="text-left" style="width: 40px;"></th>
                   <th class="text-left">Holder</th>
                   <th class="text-center">% of portfolio</th>
                   <th class="text-center">Recent activity</th>
                   <th class="text-right">Shares</th>
                   <th class="text-right">Value</th>
                 </tr>
               </thead>
               <tbody>
                 <template v-for="(item, index) in ownershipData" :key="index">
                   <tr>
                     <td class="text-center">
                        <button class="expand-btn" @click.stop="toggleHistory(index)" :title="isHistoryExpanded(index) ? 'Hide History' : 'Show History'">
                          {{ isHistoryExpanded(index) ? '−' : '+' }}
                        </button>
                     </td>
                     <td class="text-left font-medium">{{ item.manager }}</td>
                     <td class="text-center">{{ formatPercent(item.percent_portfolio) }}</td>
                     <td class="text-center" :class="getActivityColor(item.recent_activity)">{{ item.recent_activity || '-' }}</td>
                     <td class="text-right">{{ formatNumber(item.shares) }}</td>
                     <td class="text-right">${{ formatNumber(item.value) }}</td>
                   </tr>
                   <!-- Nested History Table -->
                   <tr v-if="isHistoryExpanded(index)" class="history-row">
                      <td colspan="6" class="p-0">
                         <div class="history-container">
                            <table class="history-table">
                              <thead>
                                <tr>
                                  <th>Quarter</th>
                                  <th class="text-right">Shares</th>
                                  <th class="text-center">% of Portfolio</th>
                                  <th class="text-right">Activity</th>
                                  <th class="text-center">% Change to Portfolio</th>
                                  <th class="text-right">Reported Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="(hItem, hIndex) in item.history" :key="hIndex">
                                  <td>{{ hItem.period }}</td>
                                  <td class="text-right">{{ formatNumber(hItem.shares) }}</td>
                                  <td class="text-center">{{ hItem.percent_portfolio ? hItem.percent_portfolio + '%' : '-' }}</td>
                                  <td class="text-right" :class="getActivityColor(hItem.activity)">{{ hItem.activity || '-' }}</td>
                                  <td class="text-center">{{ hItem.percent_change_portfolio ? hItem.percent_change_portfolio + '%' : '-' }}</td>
                                  <td class="text-right">{{ hItem.reported_price }}</td>
                                </tr>
                                <tr v-if="!item.history || item.history.length === 0">
                                   <td colspan="6" class="text-center text-muted p-3">No history data available.</td>
                                </tr>
                              </tbody>
                            </table>
                         </div>
                      </td>
                   </tr>
                 </template>
                 <tr v-if="ownershipData.length === 0">
                   <td colspan="6" class="text-center text-muted">No ownership records found.</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>
      </div>

      <!-- Sub-section 2: Activity -->
      <div class="stats-subsection activity-section">
        <div class="subsection-header" @click="toggleSection('activity')">
             <h4>Activity</h4>
        </div>

        <div v-show="expandedSections.activity" class="subsection-content">
          <div class="controls-area">
             <!-- Filter Controls -->
             <div class="filter-controls">
                <button 
                  v-for="filter in ['All', 'Buys', 'Sells']" 
                  :key="filter"
                  :class="['filter-btn', { active: activityFilter === filter }]"
                  @click="activityFilter = filter"
                >
                  {{ filter }}
                </button>
             </div>
          </div>

          <div class="table-responsive">
             <table class="data-table">
               <thead>
                 <tr>
                   <th class="text-left">Quarter</th>
                   <th class="text-left">Holder</th>
                   <th class="text-center">% change to portfolio</th>
                   <th class="text-center">Activity</th>
                   <th class="text-right">Shares Changed</th>
                 </tr>
               </thead>
               <tbody>
                 <tr v-for="(item, idx) in activityList" :key="idx">
                   <td class="text-left font-medium text-muted">{{ item.quarter }}</td>
                   <td class="text-left font-medium">{{ item.manager }}</td>
                   <td class="text-center">{{ item.portfolio_change ? item.portfolio_change + '%' : '-' }}</td>
                   <td class="text-center">
                      <span :class="['action-text', getActionClass(item.type)]">
                        {{ item.action }}
                      </span>
                   </td>
                   <td class="text-right" :class="getSharesClass(item.type)">
                     {{ item.shares_changed > 0 ? '+' : '' }}{{ formatNumber(item.shares_changed) }}
                   </td>
                 </tr>
                 <tr v-if="activityList.length === 0">
                   <td colspan="5" class="text-center text-muted">No activity found for this filter.</td>
                 </tr>
               </tbody>
             </table>
           </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'SuperInvestorStats',
  props: {
    dataromaData: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      expandedSections: {
        ownership: true,
        activity: true
      },
      activityFilter: 'All', // All, Buys, Sells
      expandedHistoryIndices: [] // Track indices of expanded ownership rows
    }
  },
  computed: {
    hasData() {
      return this.dataromaData && (
        (this.dataromaData.superinvestors && this.dataromaData.superinvestors.length > 0) || 
        (this.dataromaData.activity && Object.keys(this.dataromaData.activity).length > 0)
      );
    },
    ownershipData() {
      return this.dataromaData?.superinvestors || [];
    },
    activityList() {
      if (!this.dataromaData?.activity) return [];
      
      const list = [];
      const filter = this.activityFilter;

      // Flatten the grouped object into a single list
      Object.entries(this.dataromaData.activity).forEach(([quarter, items]) => {
        items.forEach(item => {
           if (filter === 'All' || 
              (filter === 'Buys' && item.type === 'Buy') ||
              (filter === 'Sells' && item.type === 'Sell')) {
             
             list.push({
               quarter: quarter,
               ...item
             });
           }
        });
      });
      
      return list;
    },
    filteredActivityData() {
        return {}; 
    }
  },
  methods: {
    toggleSection(section) {
      this.expandedSections[section] = !this.expandedSections[section];
    },
    formatNumber(num) {
      return new Intl.NumberFormat('en-US').format(num || 0);
    },
    formatPercent(num) {
      if (num === null || num === undefined) return '-';
      return num + '%';
    },
    getActivityColor(activityStr) {
      if (!activityStr) return '';
      if (activityStr.includes('Add') || activityStr.includes('Buy')) return 'text-success';
      if (activityStr.includes('Reduce') || activityStr.includes('Sell')) return 'text-danger';
      return '';
    },
    extractActivity(actionStr) {
      if (!actionStr) return '-';
      return actionStr.split(' ')[0]; 
    },
    getActionClass(type) {
      return type === 'Buy' ? 'text-success' : 'text-danger';
    },
    getSharesClass(type) {
      return type === 'Buy' ? 'text-success' : 'text-danger';
    },
    // History Toggle Methods
    toggleHistory(index) {
      const pos = this.expandedHistoryIndices.indexOf(index);
      if (pos > -1) {
        this.expandedHistoryIndices.splice(pos, 1);
      } else {
        this.expandedHistoryIndices.push(index);
      }
    },
    isHistoryExpanded(index) {
      return this.expandedHistoryIndices.includes(index);
    }
  }
}
</script>

<style scoped>
.super-investor-stats {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-top: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.section-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.stats-subsection {
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.stats-subsection:last-child {
  margin-bottom: 0;
}

.subsection-header {
  background: var(--bg-secondary);
  padding: 10px 15px;
  cursor: pointer;
  user-select: none;
}

.subsection-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.subsection-content {
  padding: 0; /* Remove padding to make table flush or close to edges if desired, but let's check spacing */
  background: var(--bg-card);
}

.controls-area {
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end; /* Align filter to right or start? User didn't specify, likely Left is fine, but Right is common for table tools */
  justify-content: flex-start;
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
  background: transparent;
  padding: 0;
  align-items: center;
}

.filter-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem; /* Match exchange-tag size */
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  font-weight: 500;
}

.filter-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.filter-btn.active {
  background-color: var(--tag-bg-blue);
  color: var(--tag-text-blue);
  font-weight: 600;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th {
  color: var(--text-muted);
  font-weight: 500;
  padding: 12px 15px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.data-table td {
  padding: 12px 15px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color-soft);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.font-medium {
  font-weight: 500;
  color: var(--text-primary);
}

.text-left { text-align: left; }
.text-right { text-align: right; }
.text-center { text-align: center; }

.text-success { color: var(--success-color); }
.text-danger { color: var(--error-color); }
.text-muted { color: var(--text-muted); }

.action-text {
  font-weight: 500;
}

.no-data-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 10px;
  color: var(--text-muted);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* History Table Styles */
.expand-btn {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  width: 20px;
  height: 20px;
  line-height: 1; 
  padding: 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.expand-btn:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.history-row {
  background-color: var(--bg-secondary);
}

.history-container {
  padding: 1rem;
  background-color: var(--bg-secondary-alt, rgba(0, 0, 0, 0.02)); 
  border-bottom: 1px solid var(--border-color);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  background: transparent;
}

.history-table th {
  text-align: left;
  padding: 8px 12px;
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
  opacity: 0.8;
}

.history-table th.text-right { text-align: right; }
.history-table th.text-center { text-align: center; }

.history-table td {
  padding: 8px 12px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color-soft);
}

.history-table tr:last-child td {
  border-bottom: none;
}
</style>
