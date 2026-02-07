<template>
  <div class="stock-news">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading latest news for {{ symbol }}...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
    </div>
    
    <div v-else-if="news.length === 0" class="no-news-state">
      <span class="info-icon">ℹ️</span>
      <span>No recent news available for {{ symbol }}</span>
    </div>
    
    <div v-else class="news-grid">
      <article 
        v-for="(article, index) in news" 
        :key="index"
        class="news-item"
        @click="openArticle(article.link)"
      >
        <div class="news-header">
          <h4 class="news-title">{{ article.title }}</h4>
          <span class="news-date">{{ formatDate(article.providerPublishTime) }}</span>
        </div>
        
        <div class="news-content">
          <div class="news-text">
            <p class="news-summary">{{ truncateText(article.summary, 150) }}</p>
            <div class="news-meta">
              <span class="news-publisher">{{ article.publisher }}</span>
              <span v-if="article.type" class="news-type">{{ article.type }}</span>
            </div>
          </div>
          
          <div v-if="article.thumbnail" class="news-thumbnail">
            <img 
              :src="article.thumbnail.resolutions[0]?.url" 
              :alt="article.title"
              @error="handleImageError"
            />
          </div>
        </div>
        
        <div class="news-footer">
          <span class="read-more">Read more →</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StockNews',
  props: {
    symbol: {
      type: String,
      required: true
    },
    newsCount: {
      type: Number,
      default: 20
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      news: []
    }
  },
  mounted() {
    this.loadNews()
  },
  watch: {
    symbol() {
      this.loadNews()
    }
  },
  methods: {
    async loadNews() {
      this.loading = true;
      this.error = null;
      this.news = [];
      
      try {
        console.log(`Loading news for ${this.symbol}...`);
        
        // 使用 Yahoo Finance API 獲取新聞
        const response = await this.fetchYahooNews(this.symbol);
        
        if (response && response.length > 0) {
          // Ensure sorting by publish time descending (Newest first)
          this.news = response.sort((a, b) => (b.providerPublishTime || 0) - (a.providerPublishTime || 0))
                             .slice(0, this.newsCount);
          console.log(`Loaded ${this.news.length} news articles for ${this.symbol}`);
        } else {
          this.news = [];
        }
        
      } catch (error) {
        console.error(`Failed to load news for ${this.symbol}:`, error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchYahooNews(symbol) {
      // 使用 CORS 代理服務
      const corsProxies = [
        'https://yfinance-proxy.romarinhsieh.workers.dev/?',
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
      ];
      
      for (const proxy of corsProxies) {
        try {
          const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-US&region=US&quotesCount=1&newsCount=${this.newsCount}&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=true&enableEnhancedTrivialQuery=true`;
          
          let url = '';
          // Special handling for custom Cloudflare Worker: DO NOT ENCODE
          if (proxy.includes('workers.dev')) {
             url = `${proxy}${targetUrl}`;
          } else {
             url = `${proxy}${encodeURIComponent(targetUrl)}`;
          }
          
          console.log(`Fetching news from: ${url}`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data && data.news && data.news.length > 0) {
            return data.news;
          }
          
        } catch (error) {
          console.warn(`Proxy failed for news:`, error.message);
          continue;
        }
      }
      
      throw new Error('All news proxies failed');
    },
    
    formatDate(timestamp) {
      if (!timestamp) return 'Unknown date';
      
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    },
    
    truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength).trim() + '...';
    },
    
    openArticle(link) {
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    },
    
    handleImageError(event) {
      event.target.style.display = 'none';
    }
  }
}
</script>

<style scoped>
.stock-news {
  min-height: 200px;
}

.loading-state, .error-state, .no-news-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #6c757d;
  font-size: 0.9rem;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  color: #dc3545;
}

.error-icon, .info-icon {
  font-size: 1.1rem;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  padding: 0.75rem;
}

.news-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.news-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0,123,255,0.15);
  transform: translateY(-1px);
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.news-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.news-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  font-weight: 500;
}

.news-content {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.news-text {
  flex: 1;
}

.news-summary {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0 0 0.5rem 0;
}

.news-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.news-publisher {
  font-size: 0.75rem;
  color: #007bff;
  font-weight: 600;
}

.news-type {
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
  font-weight: 500;
}

.news-thumbnail {
  flex-shrink: 0;
  width: 70px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.news-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.news-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.read-more {
  font-size: 0.8rem;
  color: #007bff;
  font-weight: 600;
  transition: color 0.2s;
}

.news-item:hover .read-more {
  color: #0056b3;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .news-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.5rem;
  }
  
  .news-item {
    padding: 1rem;
  }
  
  .news-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .news-content {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .news-thumbnail {
    width: 100%;
    height: 120px;
  }
  
  .news-title {
    font-size: 0.95rem;
  }
  
  .news-summary {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .news-grid {
    padding: 0.25rem;
  }
  
  .news-item {
    padding: 0.75rem;
  }
  
  .news-title {
    font-size: 0.9rem;
  }
  
  .news-summary {
    font-size: 0.8rem;
  }
  
  .news-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>