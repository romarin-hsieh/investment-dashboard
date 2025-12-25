// Focused ADX Debug - Check data requirements and calculation steps

// Simulate the ADX calculation step by step to identify the issue

console.log('=== ADX Debug Analysis ===');

// Step 1: Check minimum data requirements
console.log('\n1. Data Requirements Analysis:');
console.log('ADX(14) requires:');
console.log('- Minimum data points: period * 2 = 28');
console.log('- For Wilder smoothing: first 14 points for initial SMA');
console.log('- For ADX smoothing: additional 14 points');
console.log('- Total minimum: 28 data points');

// Step 2: Simulate Wilder smoothing with insufficient data
console.log('\n2. Wilder Smoothing Test:');

function wilderSmoothing(values, period) {
  if (period <= 0) throw new Error('Period must be positive');
  
  const result = new Array(values.length);
  
  // 初始化階段
  for (let i = 0; i < period - 1; i++) {
    result[i] = NaN;
  }
  
  if (values.length < period) {
    console.log(`❌ Insufficient data: ${values.length} < ${period}`);
    return result;
  }
  
  // 第一個值使用 SMA
  let sum = 0;
  let count = 0;
  
  for (let j = 0; j < period; j++) {
    if (!isNaN(values[j])) {
      sum += values[j];
      count++;
    }
  }
  
  console.log(`SMA initialization: sum=${sum}, count=${count}, period=${period}`);
  result[period - 1] = count === period ? sum / period : NaN;
  console.log(`First Wilder value at index ${period - 1}: ${result[period - 1]}`);
  
  // Wilder 遞迴平滑
  for (let i = period; i < values.length; i++) {
    if (isNaN(result[i - 1]) || isNaN(values[i])) {
      result[i] = NaN;
    } else {
      result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
    }
  }
  
  return result;
}

// Test with different data lengths
const testData1 = Array.from({length: 10}, (_, i) => i + 1); // 10 points
const testData2 = Array.from({length: 14}, (_, i) => i + 1); // 14 points  
const testData3 = Array.from({length: 28}, (_, i) => i + 1); // 28 points

console.log('\nTest 1 - 10 data points:');
const result1 = wilderSmoothing(testData1, 14);
console.log('Valid values:', result1.filter(v => !isNaN(v)).length);

console.log('\nTest 2 - 14 data points:');
const result2 = wilderSmoothing(testData2, 14);
console.log('Valid values:', result2.filter(v => !isNaN(v)).length);

console.log('\nTest 3 - 28 data points:');
const result3 = wilderSmoothing(testData3, 14);
console.log('Valid values:', result3.filter(v => !isNaN(v)).length);
console.log('Last 5 values:', result3.slice(-5));

// Step 3: Simulate ADX calculation requirements
console.log('\n3. ADX Calculation Requirements:');
console.log('ADX needs TWO Wilder smoothing operations:');
console.log('1. First smoothing: TR, +DM, -DM → requires 14 points minimum');
console.log('2. Second smoothing: DX → requires another 14 points');
console.log('3. Total requirement: 14 + 14 = 28 points minimum');

// Step 4: Check typical API data length
console.log('\n4. Typical API Data Analysis:');
console.log('Yahoo Finance API typically returns:');
console.log('- 3 months data ≈ 65 trading days (sufficient)');
console.log('- But if weekends/holidays are included, actual trading days may be less');
console.log('- Market closures, data gaps can reduce effective data points');

// Step 5: Identify the most likely issue
console.log('\n5. Most Likely Issues:');
console.log('❌ Issue 1: Insufficient trading days in API response');
console.log('❌ Issue 2: NaN values in OHLC data breaking Wilder smoothing');
console.log('❌ Issue 3: Data quality issues (null/undefined values)');
console.log('❌ Issue 4: Weekend/holiday data points with null values');

console.log('\n=== Recommended Fix ===');
console.log('1. Increase API data range from 3mo to 6mo');
console.log('2. Add data validation and NaN filtering');
console.log('3. Add debug logging to track data quality');
console.log('4. Implement fallback for insufficient data');

export { wilderSmoothing };