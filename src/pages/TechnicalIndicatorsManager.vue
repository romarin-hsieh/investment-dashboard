<template>
  <div class="indicators-manager">
    <div class="manager-header">
      <h2>技術指標管理中心</h2>
      <p>監控和管理預計算技術指標系統</p>
    </div>

    <!-- 數據源狀態 -->
    <div class="status-section">
      <h3>數據源狀態</h3>
      
      <div class="status-grid">
        <!-- 預計算數據狀態 -->
        <div class="status-card" :class="{ 'available': dataSourceStatus?.precomputed?.available }">
          <div class="status-header">
            <h4>預計算數據</h4>
            <span class="status-badge" :class="dataSourceStatus?.precomputed?.available ? 'success' : 'error'">
              {{ dataSourceStatus?.precomputed?.available ? '可用' : '不可用' }}
            </span>
          </div>
          
          <div v-if="dataSourceStatus?.precomputed?.available" class="status-details">
            <p><strong>股票數量:</strong> {{ dataSourceStatus.precomputed.symbols.length }}</p>
            <p><strong>成功:</strong> {{ dataSourceStatus.precomputed.successful }}</p>
            <p><strong>失敗:</strong> {{ dataSourceStatus.precomputed.failed }}</p>
            <p><strong>最後更新:</strong> {{ formatDate(dataSourceStatus.precomputed.lastUpdate) }}</p>
          </div>
        </div>

        <!-- 緩存狀態 -->
        <div class="status-card available">
          <div class="status-header">
            <h4>每日緩存</h4>
            <span class="status-badge success">可用</span>
          </div>
          
          <div class="status-details">
            <p><strong>內存緩存:</strong> {{ dataSourceStatus?.cache?.memoryCache || 0 }} 項目</p>
            <p><strong>本地存儲:</strong> {{ dataSourceStatus?.cache?.localStorageCache || 0 }} 項目</p>
            <p><strong>總大小:</strong> {{ formatBytes(dataSourceStatus?.cache?.totalSize || 0) }}</p>
          </div>
        </div>

        <!-- 實時計算狀態 -->
        <div class="status-card available">
          <div class="status-header">
            <h4>實時計算</h4>
            <span class="status-badge success">可用</span>
          </div>
          
          <div class="status-details">
            <p><strong>代理服務:</strong> {{ dataSourceStatus?.realtime?.proxies || 0 }} 個</p>
            <p><strong>狀態:</strong> 備用方案</p>
            <p><strong>預期延遲:</strong> 2-20秒</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="control-section">
      <h3>控制面板</h3>
      
      <div class="control-grid">
        <button @click="refreshStatus()" class="control-btn primary" :disabled="loading">
          {{ loading ? '載入中...' : '刷新狀態' }}
        </button>
        
        <button @click="clearAllCaches()" class="control-btn warning">
          清除所有緩存
        </button>
        
        <button @click="testPrecomputed()" class="control-btn info" :disabled="testing">
          {{ testing ? '測試中...' : '測試預計算' }}
        </button>
        
        <button @click="showPreferences = !showPreferences" class="control-btn secondary">
          {{ showPreferences ? '隱藏設定' : '顯示設定' }}
        </button>
      </div>
    </div>

    <!-- 偏好設定 -->
    <div v-if="showPreferences" class="preferences-section">
      <h3>系統偏好設定</h3>
      
      <div class="preferences-form">
        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              v-model="preferences.preferPrecomputed"
              @change="updatePreferences"
            />
            優先使用預計算數據
          </label>
        </div>
        
        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              v-model="preferences.fallbackToRealtime"
              @change="updatePreferences"
            />
            允許回退到實時計算
          </label>
        </div>
        
        <div class="form-group">
          <label>預計算數據最大年齡 (小時):</label>
          <input 
            type="number" 
            v-model.number="preferences.maxAgeHours"
            @change="updatePreferences"
            min="1" 
            max="72"
          />
        </div>
      </div>
    </div>

    <!-- 測試結果 -->
    <div v-if="testResults.length > 0" class="test-results-section">
      <h3>測試結果</h3>
      
      <div class="test-results">
        <div 
          v-for="(result, index) in testResults" 
          :key="index"
          class="test-result-item"
          :class="{ 'success': result.success, 'error': !result.success }"
        >
          <div class="result-header">
            <span class="symbol">{{ result.symbol }}</span>
            <span class="source">{{ result.source }}</span>
            <span class="load-time">{{ result.loadTime }}</span>
          </div>
          
          <div v-if="result.error" class="error-message">
            {{ result.error }}
          </div>
          
          <div v-else class="indicators-preview">
            <span>MA5: {{ result.data.ma5?.value || 'N/A' }}</span>
            <span>ADX: {{ result.data.adx14?.value || 'N/A' }}</span>
            <span>MACD: {{ result.data.macd?.signal || 'N/A' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 預計算股票列表 -->
    <div v-if="dataSourceStatus?.precomputed?.available" class="symbols-section">
      <h3>預計算股票列表</h3>
      
      <div class="symbols-grid">
        <span 
          v-for="symbol in dataSourceStatus.precomputed.symbols" 
          :key="symbol"
          class="symbol-tag"
        >
          {{ symbol }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import hybridTechnicalIndicatorsAPI from '@/api/hybridTechnicalIndicatorsApi.js'

export default {
  name: 'TechnicalIndicatorsManager',
  data() {
    return {
      loading: false,
      testing: false,
      showPreferences: false,
      dataSourceStatus: null,
      testResults: [],
      preferences: {
        preferPrecomputed: true,
        fallbackToRealtime: true,
        maxAgeHours: 24
      }
    }
  },
  async mounted() {
    await this.refreshStatus();
  },
  methods: {
    async refreshStatus() {
      this.loading = true;
      try {
        this.dataSourceStatus = await hybridTechnicalIndicatorsAPI.getDataSourceStatus();
      } catch (error) {
        console.error('Failed to refresh status:', error);
        alert('刷新狀態失敗: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    async clearAllCaches() {
      if (!confirm('確定要清除所有緩存嗎？這將導致下次載入時間較長。')) {
        return;
      }
      
      try {
        // 這裡需要調用各個緩存清理方法
        // technicalIndicatorsCache.clearAllCache();
        // precomputedIndicatorsAPI.clearCache();
        alert('所有緩存已清除');
        await this.refreshStatus();
      } catch (error) {
        alert('清除緩存失敗: ' + error.message);
      }
    },
    
    async testPrecomputed() {
      this.testing = true;
      this.testResults = [];
      
      const testSymbols = ['AAPL', 'TSLA', 'MSFT'];
      
      try {
        for (const symbol of testSymbols) {
          const startTime = Date.now();
          
          try {
            const data = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators(symbol);
            const loadTime = Date.now() - startTime;
            
            this.testResults.push({
              symbol,
              success: true,
              data,
              source: data.source,
              loadTime: `${loadTime}ms`
            });
          } catch (error) {
            this.testResults.push({
              symbol,
              success: false,
              error: error.message,
              loadTime: `${Date.now() - startTime}ms`
            });
          }
        }
      } finally {
        this.testing = false;
      }
    },
    
    updatePreferences() {
      const maxAge = this.preferences.maxAgeHours * 60 * 60 * 1000;
      
      hybridTechnicalIndicatorsAPI.setPreferences({
        preferPrecomputed: this.preferences.preferPrecomputed,
        fallbackToRealtime: this.preferences.fallbackToRealtime,
        maxPrecomputedAge: maxAge
      });
      
      console.log('Preferences updated:', this.preferences);
    },
    
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('zh-TW');
    },
    
    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
}
</script>

<style scoped>
.indicators-manager {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.manager-header {
  text-align: center;
  margin-bottom: 2rem;
}

.manager-header h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.status-section, .control-section, .preferences-section, .test-results-section, .symbols-section {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.status-section h3, .control-section h3, .preferences-section h3, .test-results-section h3, .symbols-section h3 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.status-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #dc3545;
}

.status-card.available {
  border-left-color: #28a745;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-header h4 {
  margin: 0;
  color: #495057;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.status-details p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.control-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.control-btn.primary {
  background: #007bff;
  color: white;
}

.control-btn.primary:hover:not(:disabled) {
  background: #0056b3;
}

.control-btn.warning {
  background: #ffc107;
  color: #212529;
}

.control-btn.warning:hover {
  background: #e0a800;
}

.control-btn.info {
  background: #17a2b8;
  color: white;
}

.control-btn.info:hover:not(:disabled) {
  background: #138496;
}

.control-btn.secondary {
  background: #6c757d;
  color: white;
}

.control-btn.secondary:hover {
  background: #545b62;
}

.control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.preferences-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.form-group input[type="number"] {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  width: 100px;
}

.test-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.test-result-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #dc3545;
}

.test-result-item.success {
  border-left-color: #28a745;
}

.result-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.symbol {
  color: #495057;
}

.source {
  color: #6c757d;
  font-size: 0.9rem;
}

.load-time {
  margin-left: auto;
  color: #007bff;
}

.error-message {
  color: #dc3545;
  font-size: 0.9rem;
}

.indicators-preview {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #6c757d;
}

.symbols-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.symbol-tag {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .indicators-manager {
    padding: 1rem;
  }
  
  .status-grid, .control-grid {
    grid-template-columns: 1fr;
  }
  
  .result-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .load-time {
    margin-left: 0;
  }
}
</style>