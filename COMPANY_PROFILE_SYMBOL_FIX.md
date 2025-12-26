# Company Profile Symbol & Style Fix - 完成

## 🎯 問題描述

1. **Symbol 問題**: Company Profile widget 在所有股票詳情頁面都顯示 "RDW Profile"，而不是當前頁面對應的股票公司資料
2. **樣式問題**: 修復 symbol 後，widget 顯示灰色背景而不是白色背景

## 🔍 問題根因

### Symbol 問題
在 `TradingViewCompanyProfile.vue` 的 `createCompanyProfile()` 方法中，TradingView widget 的配置使用了硬編碼的 symbol：

```javascript
// ❌ 問題代碼
const config = {
  "symbol": "NYSE:RDW",  // 硬編碼，導致所有頁面都顯示 RDW
  // ...
}
```

### 樣式問題
修復 symbol 後，`colorTheme` 預設值為 `"dark"`，導致灰色背景：

```javascript
// ❌ 樣式問題
colorTheme: {
  type: String,
  default: 'dark'  // 導致灰色背景
}
```

## ✅ 解決方案

### 1. Symbol 修復
修改配置以使用動態的 props 值：

```javascript
// ✅ 修復後的代碼
const config = {
  "symbol": this.fullSymbol,        // 動態使用 props
  "colorTheme": this.colorTheme,    // 使用 props
  "isTransparent": this.isTransparent, // 使用 props
  "locale": this.locale,            // 使用 props
  "width": "100%",
  "height": "100%"
}
```

### 2. 樣式修復
修改預設 colorTheme 並明確傳遞 props：

```javascript
// ✅ Props 預設值修正
colorTheme: {
  type: String,
  default: 'light'  // 從 'dark' 改為 'light'
}
```

```vue
<!-- ✅ StockDetail.vue 中明確指定 -->
<TradingViewCompanyProfile 
  :symbol="symbol" 
  :exchange="exchange" 
  color-theme="light"
  :is-transparent="true"
/>
```

## 📁 修改的檔案

### 1. src/components/TradingViewCompanyProfile.vue
- ✅ 修復硬編碼的 symbol 問題
- ✅ 使用動態的 `this.fullSymbol` 計算屬性
- ✅ 使用所有 props 參數而不是硬編碼值
- ✅ 修改預設 colorTheme 從 'dark' 到 'light'
- ✅ 新增 debug 日誌來追蹤 widget 創建

### 2. src/pages/StockDetail.vue  
- ✅ 移除重複的 import 語句
- ✅ 確認 props 正確傳遞給 TradingViewCompanyProfile
- ✅ 明確指定 color-theme="light" 和 :is-transparent="true"

## 🔧 技術細節

### fullSymbol 計算屬性
```javascript
computed: {
  fullSymbol() {
    return `${this.exchange}:${this.symbol}`
  }
}
```

### Props 傳遞
```vue
<!-- StockDetail.vue 中的使用 -->
<TradingViewCompanyProfile 
  :symbol="symbol" 
  :exchange="exchange" 
  color-theme="light"
  :is-transparent="true"
/>
```

### 交易所映射
StockDetail.vue 中的 exchange 計算屬性會根據 metadata 或 symbol 推測正確的交易所：
- NASDAQ: NFLX, AAPL, NVDA, TSLA, META, etc.
- NYSE: RDW, TSM, CRM, ORCL, etc.

## 📊 預期效果

修復後，每個股票詳情頁面的 Company Profile 會：

| 股票頁面 | 顯示的 Profile | Symbol 格式 | 背景顏色 |
|---------|---------------|-------------|----------|
| NFLX | Netflix Profile | NASDAQ:NFLX | 白色 |
| AAPL | Apple Profile | NASDAQ:AAPL | 白色 |
| RDW | Redwire Profile | NYSE:RDW | 白色 |
| TSM | TSMC Profile | NYSE:TSM | 白色 |

## 🧪 測試

使用 `test-company-profile-style-fix.html` 測試頁面來驗證修復：

1. **測試不同股票**：
   - NASDAQ: NFLX, AAPL, NVDA, TSLA, META
   - NYSE: RDW, TSM, CRM, ORCL

2. **驗證步驟**：
   - 導航到股票詳情頁面
   - 滾動到 Company Profile 區段
   - 確認顯示正確的公司資料
   - 確認白色背景（不是灰色）
   - 檢查瀏覽器 console 的 debug 日誌

3. **預期結果**：
   - 每個股票頁面顯示對應的公司 profile
   - 白色背景，深色文字
   - Console 顯示正確的 symbol 格式和 colorTheme: "light"
   - 沒有 JavaScript 錯誤

## 🚀 部署狀態

修復已完成，可以立即部署到正式環境：

```bash
git add src/components/TradingViewCompanyProfile.vue src/pages/StockDetail.vue
git commit -m "fix: use dynamic symbol and light theme in TradingView Company Profile widget"
git push origin main
```

## 🔍 Debug 日誌

修復後，瀏覽器 console 會顯示：
```
🏢 Creating Company Profile widget for NASDAQ:NFLX {
  symbol: "NASDAQ:NFLX", 
  colorTheme: "light", 
  isTransparent: true, 
  locale: "en", 
  width: "100%", 
  height: "100%"
}
TradingView Company Profile loaded successfully
```

這確認了 widget 使用正確的 symbol 和 light theme 進行創建。