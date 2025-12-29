<template>
  <div class="mfi-volume-profile-widget">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading MFI Volume Profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <button @click="loadData" class="retry-btn">Retry</button>
    </div>

    <!-- Placeholder Content -->
    <div v-else class="widget-content">
      <div class="placeholder-content">
        <h4>MFI Volume Profile</h4>
        <p>Symbol: {{ symbol }}</p>
        <p>Exchange: {{ exchange }}</p>
        <div class="placeholder-chart">
          <p>📊 Chart will be displayed here</p>
          <p>MFI Volume Profile analysis for {{ symbol }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MFIVolumeProfileWidget',
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    },
    priority: {
      type: Number,
      default: 4
    }
  },
  data() {
    return {
      loading: false,
      error: null
    };
  },
  mounted() {
    this.loadData();
  },
  watch: {
    symbol() {
      this.loadData();
    }
  },
  methods: {
    async loadData() {
      if (this.loading) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        console.log(`📊 Loading MFI Volume Profile for ${this.symbol}...`);
        
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`📊 MFI Volume Profile loaded successfully for ${this.symbol}`);
        
      } catch (error) {
        console.error(`📊 MFI Volume Profile error for ${this.symbol}:`, error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.mfi-volume-profile-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-message {
  margin-bottom: 1rem;
  text-align: center;
  color: #d32f2f;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.retry-btn:hover {
  background: #0056b3;
}

.widget-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
}

.placeholder-content {
  text-align: center;
  padding: 2rem;
}

.placeholder-chart {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 3rem;
  margin-top: 1rem;
  color: #6c757d;
}

.placeholder-chart p {
  margin: 0.5rem 0;
}
</style>