# 在瀏覽器 Console 中清除技術指標快取

## 操作步驟

1. **打開投資儀表板頁面**
   - 訪問你的投資儀表板（通常是首頁或股票詳情頁）

2. **打開開發者工具**
   - 按 `F12` 或 `Ctrl + Shift + I`
   - 或右鍵點擊頁面 → 「檢查」

3. **切換到 Console 標籤**
   - 在開發者工具中點擊「Console」標籤

4. **執行清除快取命令**

### 清除所有技術指標快取
```javascript
// 清除所有技術指標快取
function clearAllTechnicalCache() {
    const keysToRemove = [];
    
    // 找出所有技術指標快取
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('technical_indicators_')) {
            keysToRemove.push(key);
        }
    }
    
    // 刪除快取
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`✅ 已清除 ${keysToRemove.length} 個技術指標快取項目`);
    console.log('請重新整理頁面以載入新的計算結果');
    
    return keysToRemove.length;
}

// 執行清除
clearAllTechnicalCache();
```

### 清除特定股票快取
```javascript
// 清除特定股票的快取（例如 AAPL）
function clearSymbolCache(symbol) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `technical_indicators_${symbol.toUpperCase()}_${today}`;
    
    localStorage.removeItem(cacheKey);
    console.log(`✅ 已清除 ${symbol.toUpperCase()} 的技術指標快取`);
}

// 使用範例
clearSymbolCache('AAPL');  // 清除 AAPL 的快取
clearSymbolCache('TSLA');  // 清除 TSLA 的快取
```

### 檢查快取狀態
```javascript
// 檢查目前的快取狀態
function checkCacheStatus() {
    const cacheKeys = [];
    const symbols = new Set();
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('technical_indicators_')) {
            cacheKeys.push(key);
            
            // 提取股票代號
            const parts = key.split('_');
            if (parts.length >= 3) {
                const symbol = parts[2].split('_')[0];
                symbols.add(symbol);
            }
        }
    }
    
    console.log(`📊 快取統計：`);
    console.log(`- 快取項目數量: ${cacheKeys.length}`);
    console.log(`- 已快取的股票: ${Array.from(symbols).join(', ')}`);
    console.log(`- 快取鍵值:`, cacheKeys);
    
    return { count: cacheKeys.length, symbols: Array.from(symbols), keys: cacheKeys };
}

// 檢查快取
checkCacheStatus();
```

## 使用建議

1. **先檢查快取狀態** - 了解目前有哪些快取
2. **清除所有快取** - 確保 ADX 修正生效
3. **重新整理頁面** - 載入新的計算結果
4. **驗證 ADX 顯示** - 確認不再顯示 "N/A"

## 注意事項

- 清除快取後，技術指標會重新計算，可能需要幾秒鐘載入時間
- 如果 ADX 仍顯示 "N/A"，請檢查 Console 中的錯誤訊息
- 新的 ADX 計算包含詳細的調試日誌，可以幫助診斷問題