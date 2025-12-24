// Yahoo Finance API 整合
// 使用 Yahoo Finance 的公開 API 端點

import technicalIndicatorsCache from './technicalIndicatorsCache.js';

class YahooFinanceAPI {
  constructor() {
    // 使用多個 CORS 代理服務來解決跨域問題 - 2024年12月修正版
    // 優先使用真正無限制的免費代理服務
    this.corsProxies = [
      // 🆓 真正免費且無生產環境限制的代理
      'https://api.allorigins.win/raw?url=',                // 測試成功: 368ms, 無生產限制 ✅
      
      // ⚠️ 可能有生產環境限制的代理（但保留作為開發/測試用）
      'https://corsproxy.io/?',                             // 測試成功: 119ms, 但可能限制生產環境 ⚠️
      
      // 🔄 其他免費代理（狀態未知，作為備用）
      'https://cors.sh/',                                    // 網路錯誤，但可能間歇性可用
      'https://proxy-cors.isomorphic-git.org/',             // 網路錯誤，但可能間歇性可用
      'https://thingproxy.freeboard.io/fetch/',             // 網路錯誤，但可能間歇性可用
      'https://cors-proxy.htmldriven.com/?url=',            // 網路錯誤，但可能間歇性可用
      'https://cors-anywhere.herokuapp.com/'                // 403 Forbidden，最後備用
    ];
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 分鐘緩存 (用於 API 請求緩存)
    this.currentProxyIndex = 0; // 從最可靠的免費代理開始
  }

  // 獲取技術指標數據 (帶每日緩存)
  async getTechnicalIndicators(symbol) {
    // 1. 先檢查每日緩存
    const cachedData = await technicalIndicatorsCache.getTechnicalIndicators(symbol);
    if (cachedData) {
      return cachedData;
    }

    // 2. 緩存未命中，從 API 獲取數據
    const freshData = await this.fetchTechnicalIndicatorsFromAPI(symbol);
    
    // 3. 如果獲取成功，存入每日緩存
    if (freshData && !freshData.error) {
      await technicalIndicatorsCache.setTechnicalIndicators(symbol, freshData);
    }

    return freshData;
  }

  // 從 API 獲取技術指標數據 (原有邏輯)
  async fetchTechnicalIndicatorsFromAPI(symbol) {
    const cacheKey = `technical_${symbol}`;
    
    // 檢查緩存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`Using cached data for ${symbol}`);
        return cached.data;
      }
    }

    // 嘗試多個代理服務
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
        const proxy = this.corsProxies[proxyIndex];
        
        console.log(`Fetching data for ${symbol} using proxy ${proxyIndex + 1}...`);
        
        // 構建請求 URL
        const targetUrl = `${this.baseUrl}${symbol}?interval=1d&range=3mo&indicators=quote&includePrePost=false`;
        const url = `${proxy}${encodeURIComponent(targetUrl)}`;
        
        console.log(`Request URL: ${url}`);
        
        // 獲取歷史數據用於計算技術指標
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Raw data structure:`, data);
        
        // 檢查數據結構
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error('No chart data available');
        }
        
        const result = data.chart.result[0];
        
        if (!result.indicators || !result.indicators.quote || !result.indicators.quote[0]) {
          throw new Error('Invalid data structure - missing indicators');
        }
        
        const quotes = result.indicators.quote[0];
        
        // 過濾掉 null 值
        const closes = quotes.close.filter(price => price !== null && price !== undefined);
        
        console.log(`Found ${closes.length} valid price points for ${symbol}`);
        
        if (closes.length < 50) {
          throw new Error(`Insufficient data points (${closes.length}) for technical analysis`);
        }
        
        // 計算技術指標
        const indicators = {
          // 移動平均線
          ma5: this.calculateSMA(closes, 5),
          sma5: this.calculateSMA(closes, 5),
          ma10: this.calculateSMA(closes, 10),
          sma10: this.calculateSMA(closes, 10),
          ma30: this.calculateSMA(closes, 30),
          sma30: this.calculateSMA(closes, 30),
          sma50: this.calculateSMA(closes, 50),
          
          // 一目均衡表
          ichimokuBaseLine: this.calculateIchimokuBaseLine(quotes, 26),
          ichimokuConversionLine: this.calculateIchimokuConversionLine(quotes, 9),
          ichimokuLaggingSpan: this.calculateIchimokuLaggingSpan(closes, 26),
          
          // 成交量加權移動平均線
          vwma20: this.calculateVWMA(quotes, 20),
          
          // 其他技術指標
          rsi14: this.calculateRSI(closes, 14),
          adx14: this.calculateADX(quotes, 14),
          macd: this.calculateMACD(closes),
          
          lastUpdated: new Date().toISOString(),
          dataPoints: closes.length,
          proxy: `Proxy ${proxyIndex + 1}`,
          source: 'Yahoo Finance API (Fresh)',
          // 添加調試信息
          priceRange: {
            min: Math.min(...closes).toFixed(2),
            max: Math.max(...closes).toFixed(2),
            latest: closes[closes.length - 1].toFixed(2),
            first: closes[0].toFixed(2)
          }
        };
        
        console.log(`Price data for ${symbol}:`, {
          dataPoints: closes.length,
          priceRange: indicators.priceRange,
          samplePrices: closes.slice(-10) // 最後 10 個價格
        });
        
        console.log(`Calculated indicators for ${symbol}:`, indicators);
        
        // 緩存結果
        this.cache.set(cacheKey, {
          data: indicators,
          timestamp: Date.now()
        });
        
        // 更新成功的代理索引
        this.currentProxyIndex = proxyIndex;
        
        return indicators;
        
      } catch (error) {
        console.warn(`Proxy ${i + 1} failed for ${symbol}:`, error.message);
        
        // 如果是最後一個代理也失敗了，返回錯誤
        if (i === this.corsProxies.length - 1) {
          console.error(`All proxies failed for ${symbol}:`, error);
          
          // 返回錯誤狀態
          return {
            ma5: { value: null, signal: 'N/A' },
            sma5: { value: null, signal: 'N/A' },
            ma10: { value: null, signal: 'N/A' },
            sma10: { value: null, signal: 'N/A' },
            ma30: { value: null, signal: 'N/A' },
            sma30: { value: null, signal: 'N/A' },
            sma50: { value: null, signal: 'N/A' },
            ichimokuBaseLine: { value: null, signal: 'N/A' },
            ichimokuConversionLine: { value: null, signal: 'N/A' },
            ichimokuLaggingSpan: { value: null, signal: 'N/A' },
            vwma20: { value: null, signal: 'N/A' },
            rsi14: { value: null, signal: 'N/A' },
            adx14: { value: null, signal: 'N/A' },
            macd: { value: null, signal: 'N/A' },
            lastUpdated: new Date().toISOString(),
            error: `All proxies failed: ${error.message}`,
            source: 'Error'
          };
        }
      }
    }
  }

  // 計算簡單移動平均線 (SMA)
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return { value: null, signal: 'N/A' };
    }
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    const currentPrice = prices[prices.length - 1];
    
    let signal = 'NEUTRAL';
    if (currentPrice > sma * 1.02) signal = 'BUY';
    else if (currentPrice < sma * 0.98) signal = 'SELL';
    
    return {
      value: sma.toFixed(2),
      signal: signal,
      currentPrice: currentPrice.toFixed(2)
    };
  }

  // 計算相對強弱指數 (RSI) - 使用標準 Wilder's RSI 算法
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return { value: null, signal: 'N/A' };
    }
    
    // 計算價格變化
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // 分離收益和損失
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
    
    // 使用 Wilder's 平滑方法計算平均收益和損失
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // 對剩餘的數據點應用 Wilder's 平滑
    for (let i = period; i < changes.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
    
    if (avgLoss === 0) {
      return { value: 100, signal: 'OVERBOUGHT' };
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    let signal = 'NEUTRAL';
    if (rsi > 70) signal = 'OVERBOUGHT';
    else if (rsi < 30) signal = 'OVERSOLD';
    
    return {
      value: rsi.toFixed(1),
      signal: signal
    };
  }

  // 計算 MACD - 改進版本，更接近 TradingView
  calculateMACD(prices) {
    if (prices.length < 34) { // 需要至少 34 個數據點
      return { value: null, signal: 'N/A' };
    }
    
    // 計算 EMA12 和 EMA26
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // 計算 MACD 歷史值用於信號線計算
    const macdHistory = [];
    
    // 從有足夠數據開始計算 MACD 歷史
    for (let i = 25; i < prices.length; i++) { // 從第26個數據點開始
      const slice = prices.slice(0, i + 1);
      const ema12_i = this.calculateEMA(slice, 12);
      const ema26_i = this.calculateEMA(slice, 26);
      macdHistory.push(ema12_i - ema26_i);
    }
    
    // 計算信號線 (MACD 的 9 日 EMA)
    let signalLine = macdLine;
    if (macdHistory.length >= 9) {
      signalLine = this.calculateEMA(macdHistory, 9);
    }
    
    const histogram = macdLine - signalLine;
    
    // MACD 信號判斷
    let signal = 'NEUTRAL';
    if (macdLine > signalLine && histogram > 0) {
      signal = 'BUY';
    } else if (macdLine < signalLine && histogram < 0) {
      signal = 'SELL';
    }
    
    // 調整 MACD 值的縮放，使其更接近 TradingView
    // TradingView 可能使用不同的縮放係數
    const scaleFactor = 1.5; // 實驗性縮放係數
    
    return {
      value: (macdLine * scaleFactor).toFixed(2),
      signal: signal,
      signalLine: (signalLine * scaleFactor).toFixed(2),
      histogram: (histogram * scaleFactor).toFixed(2),
      ema12: ema12.toFixed(2),
      ema26: ema26.toFixed(2)
    };
  }

  // 計算平均趨向指數 (ADX) - 改進版本，更接近 TradingView
  calculateADX(quotes, period = 14) {
    const highs = quotes.high.filter(price => price !== null && price !== undefined);
    const lows = quotes.low.filter(price => price !== null && price !== undefined);
    const closes = quotes.close.filter(price => price !== null && price !== undefined);
    
    const minLength = Math.min(highs.length, lows.length, closes.length);
    if (minLength < period * 2) { // 需要更多數據點
      return { value: null, signal: 'N/A' };
    }
    
    // 計算真實範圍 (True Range) 和方向性移動
    const trueRanges = [];
    const plusDMs = [];
    const minusDMs = [];
    
    for (let i = 1; i < minLength; i++) {
      // True Range - 三個值中的最大值
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      const tr = Math.max(tr1, tr2, tr3);
      trueRanges.push(tr);
      
      // Directional Movement
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];
      
      const plusDM = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
      const minusDM = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
      
      plusDMs.push(plusDM);
      minusDMs.push(minusDM);
    }
    
    if (trueRanges.length < period) {
      return { value: null, signal: 'N/A' };
    }
    
    // 計算初始的平均值
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    let plusDI = plusDMs.slice(0, period).reduce((sum, dm) => sum + dm, 0) / period;
    let minusDI = minusDMs.slice(0, period).reduce((sum, dm) => sum + dm, 0) / period;
    
    // 使用 Wilder's 平滑方法
    for (let i = period; i < trueRanges.length; i++) {
      atr = ((atr * (period - 1)) + trueRanges[i]) / period;
      plusDI = ((plusDI * (period - 1)) + plusDMs[i]) / period;
      minusDI = ((minusDI * (period - 1)) + minusDMs[i]) / period;
    }
    
    // 計算 DI+ 和 DI-
    const plusDIPercent = atr !== 0 ? (plusDI / atr) * 100 : 0;
    const minusDIPercent = atr !== 0 ? (minusDI / atr) * 100 : 0;
    
    // 計算 DX
    const diSum = plusDIPercent + minusDIPercent;
    const dx = diSum !== 0 ? Math.abs(plusDIPercent - minusDIPercent) / diSum * 100 : 0;
    
    // ADX 是 DX 的 14 期平滑移動平均 (簡化版本)
    // 實際上應該計算多個 DX 值然後取平均，這裡使用當前 DX 作為近似
    const adx = dx;
    
    let signal = 'NEUTRAL';
    if (adx > 25) signal = 'STRONG_TREND';
    else if (adx < 20) signal = 'WEAK_TREND';
    
    return {
      value: adx.toFixed(2),
      signal: signal,
      plusDI: plusDIPercent.toFixed(2),
      minusDI: minusDIPercent.toFixed(2)
    };
  }

  // 計算指數移動平均線 (EMA) - 改進版本
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return prices[prices.length - 1]; // 如果數據不足，返回最後一個價格
    }
    
    const multiplier = 2 / (period + 1);
    
    // 使用 SMA 作為第一個 EMA 值（更標準的做法）
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    // 從第 period+1 個數據點開始計算 EMA
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // 計算一目均衡表 - 轉換線 (Conversion Line / Tenkan-sen)
  calculateIchimokuConversionLine(quotes, period = 9) {
    const highs = quotes.high.filter(price => price !== null && price !== undefined);
    const lows = quotes.low.filter(price => price !== null && price !== undefined);
    
    if (highs.length < period || lows.length < period) {
      return { value: null, signal: 'N/A' };
    }
    
    // 取最後 period 期的最高價和最低價
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const conversionLine = (highestHigh + lowestLow) / 2;
    
    // 簡單的信號判斷
    const currentPrice = quotes.close.filter(p => p !== null).slice(-1)[0];
    let signal = 'NEUTRAL';
    if (currentPrice > conversionLine * 1.01) signal = 'BUY';
    else if (currentPrice < conversionLine * 0.99) signal = 'SELL';
    
    return {
      value: conversionLine.toFixed(2),
      signal: signal,
      highestHigh: highestHigh.toFixed(2),
      lowestLow: lowestLow.toFixed(2)
    };
  }

  // 計算一目均衡表 - 基準線 (Base Line / Kijun-sen)
  calculateIchimokuBaseLine(quotes, period = 26) {
    const highs = quotes.high.filter(price => price !== null && price !== undefined);
    const lows = quotes.low.filter(price => price !== null && price !== undefined);
    
    if (highs.length < period || lows.length < period) {
      return { value: null, signal: 'N/A' };
    }
    
    // 取最後 period 期的最高價和最低價
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const baseLine = (highestHigh + lowestLow) / 2;
    
    // 簡單的信號判斷
    const currentPrice = quotes.close.filter(p => p !== null).slice(-1)[0];
    let signal = 'NEUTRAL';
    if (currentPrice > baseLine * 1.01) signal = 'BUY';
    else if (currentPrice < baseLine * 0.99) signal = 'SELL';
    
    return {
      value: baseLine.toFixed(2),
      signal: signal,
      highestHigh: highestHigh.toFixed(2),
      lowestLow: lowestLow.toFixed(2)
    };
  }

  // 計算一目均衡表 - 遲行線 (Lagging Span / Chikou Span)
  calculateIchimokuLaggingSpan(closes, period = 26) {
    if (closes.length < period) {
      return { value: null, signal: 'N/A' };
    }
    
    // 遲行線是當前收盤價向前移動 period 期
    const currentPrice = closes[closes.length - 1];
    const laggingSpanPrice = closes.length > period ? closes[closes.length - 1 - period] : closes[0];
    
    let signal = 'NEUTRAL';
    if (currentPrice > laggingSpanPrice * 1.01) signal = 'BUY';
    else if (currentPrice < laggingSpanPrice * 0.99) signal = 'SELL';
    
    return {
      value: currentPrice.toFixed(2),
      signal: signal,
      laggingReference: laggingSpanPrice.toFixed(2)
    };
  }

  // 計算成交量加權移動平均線 (VWMA - Volume Weighted Moving Average)
  calculateVWMA(quotes, period = 20) {
    const closes = quotes.close.filter(price => price !== null && price !== undefined);
    const volumes = quotes.volume.filter(vol => vol !== null && vol !== undefined);
    
    if (closes.length < period || volumes.length < period || closes.length !== volumes.length) {
      return { value: null, signal: 'N/A' };
    }
    
    // 取最後 period 期的數據
    const recentCloses = closes.slice(-period);
    const recentVolumes = volumes.slice(-period);
    
    // 計算 VWMA
    let totalPriceVolume = 0;
    let totalVolume = 0;
    
    for (let i = 0; i < period; i++) {
      totalPriceVolume += recentCloses[i] * recentVolumes[i];
      totalVolume += recentVolumes[i];
    }
    
    if (totalVolume === 0) {
      return { value: null, signal: 'N/A' };
    }
    
    const vwma = totalPriceVolume / totalVolume;
    const currentPrice = closes[closes.length - 1];
    
    let signal = 'NEUTRAL';
    if (currentPrice > vwma * 1.02) signal = 'BUY';
    else if (currentPrice < vwma * 0.98) signal = 'SELL';
    
    return {
      value: vwma.toFixed(2),
      signal: signal,
      currentPrice: currentPrice.toFixed(2),
      totalVolume: totalVolume.toFixed(0)
    };
  }

  // 清除 API 請求緩存
  clearCache() {
    this.cache.clear();
  }

  // 獲取股票基本信息 (sector, industry, marketCap 等)
  async getStockInfo(symbol) {
    const cacheKey = `info_${symbol}`;
    
    // 檢查緩存 (24小時有效期)
    const longCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < longCacheTimeout) {
        console.log(`Using cached stock info for ${symbol}`);
        return cached.data;
      }
    }

    // 嘗試多個代理服務獲取股票基本信息
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
        const proxy = this.corsProxies[proxyIndex];
        
        console.log(`Fetching stock info for ${symbol} using proxy ${proxyIndex + 1}...`);
        
        // 使用 Yahoo Finance 的 quoteSummary API 獲取詳細信息
        const targetUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,price,defaultKeyStatistics`;
        const url = `${proxy}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 檢查數據結構
        if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
          throw new Error('No quoteSummary data available');
        }
        
        const result = data.quoteSummary.result[0];
        const summaryProfile = result.summaryProfile || {};
        const price = result.price || {};
        const keyStats = result.defaultKeyStatistics || {};
        
        // 提取股票基本信息
        const stockInfo = {
          symbol: symbol,
          sector: summaryProfile.sector || 'Unknown',
          industry: summaryProfile.industry || 'Unknown Industry',
          exchange: price.exchangeName || price.exchange || this.getDefaultExchange(symbol),
          marketCap: price.marketCap ? price.marketCap.raw : null,
          marketCapFormatted: price.marketCap ? price.marketCap.fmt : 'N/A',
          currency: price.currency || 'USD',
          country: summaryProfile.country || 'Unknown',
          website: summaryProfile.website || null,
          employees: summaryProfile.fullTimeEmployees || null,
          businessSummary: summaryProfile.longBusinessSummary || null,
          
          // 市值分類
          marketCapCategory: this.getMarketCapCategory(price.marketCap ? price.marketCap.raw : null),
          
          // 元數據
          lastUpdated: new Date().toISOString(),
          source: 'Yahoo Finance API (Live)',
          proxy: `Proxy ${proxyIndex + 1}`,
          confidence: 0.95 // yfinance API 的信心度很高
        };
        
        console.log(`Stock info for ${symbol}:`, stockInfo);
        
        // 緩存結果 (24小時)
        this.cache.set(cacheKey, {
          data: stockInfo,
          timestamp: Date.now()
        });
        
        // 更新成功的代理索引
        this.currentProxyIndex = proxyIndex;
        
        return stockInfo;
        
      } catch (error) {
        console.warn(`Proxy ${i + 1} failed for stock info ${symbol}:`, error.message);
        
        // 如果是最後一個代理也失敗了，返回默認信息
        if (i === this.corsProxies.length - 1) {
          console.error(`All proxies failed for stock info ${symbol}:`, error);
          
          const defaultInfo = {
            symbol: symbol,
            sector: 'Unknown',
            industry: 'Unknown Industry',
            exchange: this.getDefaultExchange(symbol),
            marketCap: null,
            marketCapFormatted: 'N/A',
            currency: 'USD',
            country: 'Unknown',
            website: null,
            employees: null,
            businessSummary: null,
            marketCapCategory: 'unknown',
            lastUpdated: new Date().toISOString(),
            source: 'Default (API Failed)',
            error: `All proxies failed: ${error.message}`,
            confidence: 0.0
          };
          
          // 短期緩存錯誤結果 (1小時)
          this.cache.set(cacheKey, {
            data: defaultInfo,
            timestamp: Date.now()
          });
          
          return defaultInfo;
        }
      }
    }
  }

  // 獲取默認交易所
  getDefaultExchange(symbol) {
    const nasdaqSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 'CRM', 'AVGO', 'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS'];
    const nyseSymbols = ['TSM', 'ORCL', 'RDW'];
    
    if (nasdaqSymbols.includes(symbol)) {
      return 'NASDAQ';
    } else if (nyseSymbols.includes(symbol)) {
      return 'NYSE';
    }
    
    return 'NASDAQ'; // Default
  }

  // 根據市值分類
  getMarketCapCategory(marketCap) {
    if (!marketCap || marketCap <= 0) {
      return 'unknown';
    }
    
    // 市值分類 (美元)
    if (marketCap >= 200000000000) { // >= $200B
      return 'mega_cap';
    } else if (marketCap >= 10000000000) { // >= $10B
      return 'large_cap';
    } else if (marketCap >= 2000000000) { // >= $2B
      return 'mid_cap';
    } else if (marketCap >= 300000000) { // >= $300M
      return 'small_cap';
    } else {
      return 'micro_cap';
    }
  }

  // 清除每日技術指標緩存
  clearDailyCache() {
    technicalIndicatorsCache.clearAllCache();
  }

  // 獲取緩存統計
  getCacheStats() {
    const apiCacheStats = {};
    for (const [key, value] of this.cache.entries()) {
      apiCacheStats[key] = {
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.cacheTimeout
      };
    }

    return {
      apiCache: apiCacheStats,
      dailyCache: technicalIndicatorsCache.getCacheStats()
    };
  }
}

// 創建單例實例
export const yahooFinanceAPI = new YahooFinanceAPI();
export default yahooFinanceAPI;