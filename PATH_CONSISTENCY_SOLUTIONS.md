# 本地與正式環境路徑一致性解決方案

## 🎯 問題分析

### 當前路徑差異
- **本地環境**: `http://localhost:3000/config/stocks.json`
- **正式環境**: `https://romarin-hsieh.github.io/investment-dashboard/config/stocks.json`

### 問題根源
GitHub Pages 部署在子路徑 `/investment-dashboard/` 下，而本地開發在根路徑，導致資源路徑不一致。

---

## 💡 解決方案

### 🥇 方案一：使用 Vite Base URL 配置 (推薦)

**優點**: 
- ✅ 統一處理所有資源路徑
- ✅ 自動適配不同環境
- ✅ 無需手動路徑檢測
- ✅ 符合 Vite 最佳實踐

**實作步驟**:

1. **修改 vite.config.js**:
```javascript
export default defineConfig({
  base: process.env.NODE_ENV === 'production' 
    ? '/investment-dashboard/' 
    : '/',
  // ... 其他配置
})
```

2. **移除手動路徑檢測**:
```javascript
// stocksConfigService.js 簡化為
getConfigUrl() {
  return '/config/stocks.json'  // Vite 會自動處理 base path
}
```

3. **更新所有資源路徑**:
```javascript
// 所有 fetch 調用都使用相對路徑
fetch('/data/quotes/latest.json')
fetch('/data/symbols_metadata.json')
```

---

### 🥈 方案二：環境變數配置

**優點**:
- ✅ 靈活配置不同環境
- ✅ 易於維護
- ✅ 支援多環境部署

**實作步驟**:

1. **創建 .env 文件**:
```bash
# .env.development
VITE_BASE_PATH=/

# .env.production  
VITE_BASE_PATH=/investment-dashboard/
```

2. **修改路徑服務**:
```javascript
getConfigUrl() {
  const basePath = import.meta.env.VITE_BASE_PATH || '/'
  return `${basePath}config/stocks.json`
}
```

---

### 🥉 方案三：動態路徑檢測增強

**優點**:
- ✅ 無需配置文件
- ✅ 自動適應環境
- ✅ 向後兼容

**實作步驟**:

1. **增強路徑檢測邏輯**:
```javascript
getConfigUrl() {
  const { hostname, pathname } = window.location
  
  // 生產環境檢測
  if (hostname === 'romarin-hsieh.github.io') {
    return '/investment-dashboard/config/stocks.json'
  }
  
  // 本地開發環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/config/stocks.json'
  }
  
  // 其他環境 fallback
  return pathname.includes('/investment-dashboard/') 
    ? '/investment-dashboard/config/stocks.json'
    : '/config/stocks.json'
}
```

2. **添加錯誤重試機制**:
```javascript
async loadConfig() {
  const urls = [
    this.getConfigUrl(),
    '/investment-dashboard/config/stocks.json',  // fallback 1
    '/config/stocks.json'                        // fallback 2
  ]
  
  for (const url of urls) {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.warn(`Failed to load from ${url}:`, error)
    }
  }
  
  throw new Error('Failed to load config from all URLs')
}
```

---

### 🏆 方案四：統一 Base Path 服務

**優點**:
- ✅ 集中管理所有路徑
- ✅ 易於維護和擴展
- ✅ 支援複雜路徑邏輯

**實作步驟**:

1. **創建 basePathService.js**:
```javascript
class BasePathService {
  constructor() {
    this.basePath = this.detectBasePath()
  }
  
  detectBasePath() {
    const { hostname, pathname } = window.location
    
    if (hostname === 'romarin-hsieh.github.io') {
      return '/investment-dashboard'
    }
    
    return ''
  }
  
  getResourceUrl(path) {
    return `${this.basePath}${path.startsWith('/') ? path : '/' + path}`
  }
}

export const basePathService = new BasePathService()
```

2. **統一使用**:
```javascript
// 在所有服務中使用
import { basePathService } from '@/utils/basePathService'

const configUrl = basePathService.getResourceUrl('/config/stocks.json')
const quotesUrl = basePathService.getResourceUrl('/data/quotes/latest.json')
```

---

## 🎯 推薦實作方案

### 立即修復 (方案三增強版)

```javascript
// src/utils/stocksConfigService.js
getConfigUrl() {
  const { hostname, pathname } = window.location
  
  // GitHub Pages 環境
  if (hostname === 'romarin-hsieh.github.io') {
    return '/investment-dashboard/config/stocks.json'
  }
  
  // 本地開發環境
  return '/config/stocks.json'
}

async loadConfig() {
  const primaryUrl = this.getConfigUrl()
  const fallbackUrls = [
    '/investment-dashboard/config/stocks.json',
    '/config/stocks.json'
  ].filter(url => url !== primaryUrl)
  
  // 嘗試主要 URL
  try {
    const response = await fetch(`${primaryUrl}?t=${Date.now()}`)
    if (response.ok) {
      const config = await response.json()
      console.log(`✅ Loaded config from: ${primaryUrl}`)
      return config
    }
  } catch (error) {
    console.warn(`❌ Primary URL failed: ${primaryUrl}`, error)
  }
  
  // 嘗試 fallback URLs
  for (const url of fallbackUrls) {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`)
      if (response.ok) {
        const config = await response.json()
        console.log(`✅ Loaded config from fallback: ${url}`)
        return config
      }
    } catch (error) {
      console.warn(`❌ Fallback URL failed: ${url}`, error)
    }
  }
  
  // 最終 fallback 到內建配置
  console.error('❌ All URLs failed, using fallback config')
  return this.getFallbackConfig()
}
```

### 長期解決方案 (方案一)

修改 `vite.config.js` 使用 base URL 配置，這是最標準的做法。

---

## 📋 實作優先級

1. **立即**: 實作增強的動態路徑檢測 (方案三)
2. **短期**: 考慮使用 Vite base URL 配置 (方案一)  
3. **長期**: 建立統一的 base path 服務 (方案四)

---

## 🔧 測試驗證

### 本地測試
```bash
npm run dev
# 驗證: http://localhost:3000/#/stock-overview
```

### 生產測試
```bash
npm run build
npm run preview
# 驗證: http://localhost:4173/investment-dashboard/#/stock-overview
```

### GitHub Pages 測試
```
https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview
```

---

## 📝 總結

**推薦順序**:
1. 🥇 **Vite Base URL** - 最標準的解決方案
2. 🥈 **增強路徑檢測** - 快速修復當前問題
3. 🥉 **環境變數配置** - 適合複雜部署需求

選擇方案一可以一勞永逸解決路徑問題，並符合 Vite 的最佳實踐。