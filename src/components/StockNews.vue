<template>
  <div class="stock-news">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>{{ $t('stockNews.loading', { symbol }) }}</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="news.length === 0" class="no-news-state">
      <span class="info-icon">ℹ️</span>
      <span>{{ $t('stockNews.empty', { symbol }) }}</span>
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
          <span class="read-more">{{ $t('stockNews.readMore') }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script>
import { formatDate as i18nDate } from '@/utils/dateFormat'

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
      if (!timestamp) return this.$t('stockNews.unknownDate');

      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return this.$t('stockNews.minutesAgo', { n: diffMinutes });
      } else if (diffHours < 24) {
        return this.$t('stockNews.hoursAgo', { n: diffHours });
      } else if (diffDays < 7) {
        return this.$t('stockNews.daysAgo', { n: diffDays });
      } else {
        return i18nDate(date, { 
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
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--text-base);
  padding: var(--space-12);
  text-align: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--grey-100);
  border-top: 2px solid var(--blue-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  color: var(--danger-solid);
}

.error-icon, .info-icon {
  font-size: var(--text-md);
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-4);
  padding: var(--space-3);
}

.news-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-base) ease;
  box-shadow: var(--shadow-sm);
}

.news-item:hover {
  border-color: var(--blue-500);
  box-shadow: 0 2px 8px rgba(0,123,255,0.15);
  transform: translateY(-1px);
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.news-title {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.news-date {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  font-weight: var(--weight-medium);
}

.news-content {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.news-text {
  flex: 1;
}

.news-summary {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0 0 var(--space-2) 0;
}

.news-meta {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.news-publisher {
  font-size: var(--text-xs);
  color: var(--blue-500);
  font-weight: var(--weight-semibold);
}

.news-type {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-xs);
  text-transform: uppercase;
  font-weight: var(--weight-medium);
}

.news-thumbnail {
  flex-shrink: 0;
  width: 70px;
  height: 50px;
  border-radius: var(--radius-xs);
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
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-color);
}

.read-more {
  font-size: var(--text-sm);
  color: var(--blue-500);
  font-weight: var(--weight-semibold);
  transition: color var(--transition-base);
}

.news-item:hover .read-more {
  color: var(--blue-700);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .news-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: var(--space-2);
  }
  
  .news-item {
    padding: var(--space-4);
  }
  
  .news-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .news-content {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .news-thumbnail {
    width: 100%;
    height: 120px;
  }
  
  .news-title {
    font-size: var(--text-base);
  }
  
  .news-summary {
    font-size: var(--text-sm);
  }
}

@media (max-width: 480px) {
  .news-grid {
    padding: var(--space-1);
  }
  
  .news-item {
    padding: var(--space-3);
  }
  
  .news-title {
    font-size: var(--text-base);
  }
  
  .news-summary {
    font-size: var(--text-sm);
  }
  
  .news-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
}
</style>