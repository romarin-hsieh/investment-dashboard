/**
 * 技術指標核心測試
 * 驗證 YAML 規格符合性
 */

import { calculateAllIndicators, calculateRSI, calculateMACD, calculateADX } from './technicalIndicatorsCore.js';

// 測試數據 - 模擬 OHLCV
const testData = {
  open: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129],
  high: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130],
  low: [99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128],
  close: [100.5, 101.5, 102.5, 103.5, 104.5, 105.5, 106.5, 107.5, 108.5, 109.5, 110.5, 111.5, 112.5, 113.5, 114.5, 115.5, 116.5, 117.5, 118.5, 119.5, 120.5, 121.5, 122.5, 123.5, 124.5, 125.5, 126.5, 127.5, 128.5, 129.5],
  volume: [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900]
};

/**
 * 測試序列對齊
 */
function testSeriesAlignment() {
  console.log('🧪 測試序列對齊...');
  
  const results = calculateAllIndicators(testData);
  const inputLength = testData.close.length;
  
  let allAligned = true;
  for (const [key, series] of Object.entries(results)) {
    if (series.length !== inputLength) {
      console.error(`❌ ${key}: 長度不一致 - 期望 ${inputLength}, 實際 ${series.length}`);
      allAligned = false;
    }
  }
  
  if (allAligned) {
    console.log('✅ 所有序列與輸入對齊');
  }
  
  return allAligned;
}

/**
 * 測試 NaN 處理
 */
function testNaNHandling() {
  console.log('🧪 測試 NaN 處理...');
  
  const results = calculateAllIndicators(testData);
  
  // 檢查 MA5 前 4 個值應該是 NaN
  const ma5 = results.MA_5;
  let nanCorrect = true;
  
  for (let i = 0; i < 4; i++) {
    if (!isNaN(ma5[i])) {
      console.error(`❌ MA5[${i}]: 期望 NaN, 實際 ${ma5[i]}`);
      nanCorrect = false;
    }
  }
  
  // 檢查第 5 個值不應該是 NaN
  if (isNaN(ma5[4])) {
    console.error(`❌ MA5[4]: 期望有值, 實際 NaN`);
    nanCorrect = false;
  }
  
  if (nanCorrect) {
    console.log('✅ NaN 處理正確');
  }
  
  return nanCorrect;
}

/**
 * 測試 RSI 邊界條件
 */
function testRSIBounds() {
  console.log('🧪 測試 RSI 邊界條件...');
  
  const rsi = calculateRSI(testData.close, 14);
  let boundsCorrect = true;
  
  for (let i = 0; i < rsi.length; i++) {
    if (!isNaN(rsi[i])) {
      if (rsi[i] < 0 || rsi[i] > 100) {
        console.error(`❌ RSI[${i}]: 超出範圍 [0,100] - 值: ${rsi[i]}`);
        boundsCorrect = false;
      }
    }
  }
  
  if (boundsCorrect) {
    console.log('✅ RSI 邊界條件正確');
  }
  
  return boundsCorrect;
}

/**
 * 測試 ADX 完整實現
 */
function testADXImplementation() {
  console.log('🧪 測試 ADX 完整實現...');
  
  const adxResult = calculateADX(testData.high, testData.low, testData.close, 14);
  const { adx, plusDI, minusDI } = adxResult;
  
  let adxCorrect = true;
  
  // 檢查返回的三個序列長度一致
  if (adx.length !== plusDI.length || adx.length !== minusDI.length) {
    console.error('❌ ADX 序列長度不一致');
    adxCorrect = false;
  }
  
  // 檢查 ADX 不為負數
  for (let i = 0; i < adx.length; i++) {
    if (!isNaN(adx[i]) && adx[i] < 0) {
      console.error(`❌ ADX[${i}]: 不應為負數 - 值: ${adx[i]}`);
      adxCorrect = false;
    }
  }
  
  if (adxCorrect) {
    console.log('✅ ADX 實現正確');
  }
  
  return adxCorrect;
}

/**
 * 測試 MACD 參數驗證
 */
function testMACDParameters() {
  console.log('🧪 測試 MACD 參數驗證...');
  
  const macdResult = calculateMACD(testData.close, 12, 26, 9);
  const { macd, signal, histogram } = macdResult;
  
  let macdCorrect = true;
  
  // 檢查三個序列長度一致
  if (macd.length !== signal.length || macd.length !== histogram.length) {
    console.error('❌ MACD 序列長度不一致');
    macdCorrect = false;
  }
  
  // 檢查 histogram = macd - signal
  for (let i = 0; i < macd.length; i++) {
    if (!isNaN(macd[i]) && !isNaN(signal[i]) && !isNaN(histogram[i])) {
      const expectedHist = macd[i] - signal[i];
      const diff = Math.abs(histogram[i] - expectedHist);
      if (diff > 1e-10) {
        console.error(`❌ MACD Histogram[${i}]: 計算錯誤 - 期望 ${expectedHist}, 實際 ${histogram[i]}`);
        macdCorrect = false;
        break;
      }
    }
  }
  
  if (macdCorrect) {
    console.log('✅ MACD 實現正確');
  }
  
  return macdCorrect;
}

/**
 * 輸出樣本數據
 */
function outputSampleData() {
  console.log('📊 輸出樣本數據...');
  
  const results = calculateAllIndicators(testData);
  
  console.log('最後 5 個值:');
  const keys = ['MA_5', 'SMA_5', 'RSI_14', 'MACD_12_26_9'];
  
  for (const key of keys) {
    const series = results[key];
    const last5 = series.slice(-5).map(v => isNaN(v) ? 'NaN' : v.toFixed(4));
    console.log(`${key}: [${last5.join(', ')}]`);
  }
}

/**
 * 運行所有測試
 */
function runAllTests() {
  console.log('🚀 開始技術指標核心測試...\n');
  
  const tests = [
    testSeriesAlignment,
    testNaNHandling,
    testRSIBounds,
    testADXImplementation,
    testMACDParameters
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      if (test()) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ 測試失敗: ${test.name} - ${error.message}`);
    }
    console.log('');
  }
  
  console.log(`📈 測試結果: ${passedTests}/${tests.length} 通過`);
  
  if (passedTests === tests.length) {
    console.log('🎉 所有測試通過！技術指標核心符合 YAML 規格');
  } else {
    console.log('⚠️ 部分測試失敗，需要修正');
  }
  
  outputSampleData();
}

// 如果直接運行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testSeriesAlignment, testNaNHandling, testRSIBounds, testADXImplementation, testMACDParameters };