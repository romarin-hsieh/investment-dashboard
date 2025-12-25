// 即時 ADX 調試 - 在瀏覽器 Console 中執行

console.log('=== ADX 即時調試開始 ===');

// 1. 測試 API 數據獲取
async function debugADXLive() {
    try {
        // 動態導入模組
        const { default: yahooFinanceAPI } = await import('./src/utils/yahooFinanceApi.js');
        const { calculateADX } = await import('./src/utils/technicalIndicatorsCore.js');
        
        console.log('✅ 模組載入成功');
        
        // 測試 AAPL 數據
        console.log('🔍 正在獲取 AAPL 數據...');
        const data = await yahooFinanceAPI.fetchTechnicalIndicatorsFromAPI('AAPL');
        
        console.log('📊 API 回應:', data);
        
        if (data.error) {
            console.error('❌ API 錯誤:', data.error);
            return;
        }
        
        // 檢查數據質量
        console.log('📈 數據質量檢查:');
        console.log('- 數據點數量:', data.dataPoints);
        console.log('- 價格範圍:', data.priceRange);
        console.log('- ADX 結果:', data.adx14);
        
        // 檢查完整序列數據
        if (data.fullSeries && data.fullSeries.ADX_14) {
            const adxSeries = data.fullSeries.ADX_14;
            const validADX = adxSeries.filter(v => !isNaN(v));
            
            console.log('🔢 ADX 序列分析:');
            console.log('- 總長度:', adxSeries.length);
            console.log('- 有效值數量:', validADX.length);
            console.log('- 前10個值:', adxSeries.slice(0, 10));
            console.log('- 後10個值:', adxSeries.slice(-10));
            console.log('- 有效值樣本:', validADX.slice(0, 5));
            
            if (validADX.length === 0) {
                console.error('❌ 沒有有效的 ADX 值！');
                
                // 檢查原始 OHLC 數據
                if (data.fullSeries) {
                    console.log('🔍 檢查原始數據...');
                    
                    // 模擬 ADX 計算
                    const ohlcv = {
                        high: data.fullSeries.high || [],
                        low: data.fullSeries.low || [],
                        close: data.fullSeries.close || [],
                        open: data.fullSeries.open || [],
                        volume: data.fullSeries.volume || []
                    };
                    
                    console.log('📊 OHLC 數據檢查:');
                    console.log('- High 長度:', ohlcv.high.length);
                    console.log('- Low 長度:', ohlcv.low.length);
                    console.log('- Close 長度:', ohlcv.close.length);
                    
                    if (ohlcv.high.length > 0) {
                        const validOHLC = ohlcv.high.filter((h, i) => 
                            !isNaN(h) && !isNaN(ohlcv.low[i]) && !isNaN(ohlcv.close[i])
                        ).length;
                        
                        console.log('- 有效 OHLC 數據點:', validOHLC);
                        console.log('- 前5個 High:', ohlcv.high.slice(0, 5));
                        console.log('- 前5個 Low:', ohlcv.low.slice(0, 5));
                        console.log('- 前5個 Close:', ohlcv.close.slice(0, 5));
                        
                        if (validOHLC >= 28) {
                            console.log('🧮 手動測試 ADX 計算...');
                            const manualADX = calculateADX(ohlcv.high, ohlcv.low, ohlcv.close, 14);
                            console.log('手動 ADX 結果:', manualADX);
                            
                            const manualValidADX = manualADX.adx.filter(v => !isNaN(v));
                            console.log('手動計算有效 ADX 值:', manualValidADX.length);
                            console.log('手動計算 ADX 樣本:', manualValidADX.slice(0, 3));
                        } else {
                            console.error('❌ 有效 OHLC 數據不足:', validOHLC, '< 28');
                        }
                    }
                }
            } else {
                console.log('✅ ADX 計算成功，但可能在格式化時出問題');
                console.log('最後一個有效 ADX 值:', validADX[validADX.length - 1]);
            }
        } else {
            console.error('❌ 沒有找到 fullSeries.ADX_14 數據');
        }
        
    } catch (error) {
        console.error('❌ 調試過程發生錯誤:', error);
        console.error('錯誤堆疊:', error.stack);
    }
}

// 執行調試
debugADXLive();