// ADX Debug Test Script
import { calculateADX, wilderSmoothing } from './src/utils/technicalIndicatorsCore.js';

// Test 1: Simple sample data
console.log('=== ADX Debug Test ===');

// Generate sample OHLC data
function generateSampleOHLC(days) {
    const data = {
        high: [],
        low: [],
        close: []
    };
    
    let basePrice = 100;
    
    for (let i = 0; i < days; i++) {
        const change = (Math.random() - 0.5) * 4; // ±2% change
        basePrice += change;
        
        const dayHigh = basePrice + Math.random() * 2;
        const dayLow = basePrice - Math.random() * 2;
        const dayClose = dayLow + Math.random() * (dayHigh - dayLow);
        
        data.high.push(dayHigh);
        data.low.push(dayLow);
        data.close.push(dayClose);
    }
    
    return data;
}

// Test with 50 days of data (should be sufficient for ADX 14)
const sampleData = generateSampleOHLC(50);
console.log('Sample data length:', sampleData.high.length);
console.log('First 5 high values:', sampleData.high.slice(0, 5));
console.log('First 5 low values:', sampleData.low.slice(0, 5));
console.log('First 5 close values:', sampleData.close.slice(0, 5));

// Calculate ADX
console.log('\n=== Calculating ADX ===');
const adxResult = calculateADX(sampleData.high, sampleData.low, sampleData.close, 14);

console.log('ADX result structure:', Object.keys(adxResult));
console.log('ADX array length:', adxResult.adx.length);
console.log('First 10 ADX values:', adxResult.adx.slice(0, 10));
console.log('Last 10 ADX values:', adxResult.adx.slice(-10));

// Count valid values
const validADX = adxResult.adx.filter(val => !isNaN(val));
console.log('Valid ADX values:', validADX.length);
console.log('Valid ADX sample:', validADX.slice(0, 5));

// Test Wilder smoothing directly
console.log('\n=== Testing Wilder Smoothing ===');
const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const wilderResult = wilderSmoothing(testData, 14);
console.log('Wilder smoothing test input:', testData);
console.log('Wilder smoothing result:', wilderResult);
console.log('Valid Wilder values:', wilderResult.filter(val => !isNaN(val)));

// Test with flat data (edge case)
console.log('\n=== Testing with Flat Data ===');
const flatData = {
    high: new Array(50).fill(100),
    low: new Array(50).fill(99),
    close: new Array(50).fill(99.5)
};

const flatADX = calculateADX(flatData.high, flatData.low, flatData.close, 14);
console.log('Flat data ADX valid values:', flatADX.adx.filter(val => !isNaN(val)).length);
console.log('Flat data last ADX:', flatADX.adx[flatADX.adx.length - 1]);

// Test minimum data requirement
console.log('\n=== Testing Minimum Data Requirement ===');
const minData = generateSampleOHLC(28); // 14 * 2
const minADX = calculateADX(minData.high, minData.low, minData.close, 14);
console.log('Minimum data (28 days) valid ADX:', minADX.adx.filter(val => !isNaN(val)).length);
console.log('Minimum data last ADX:', minADX.adx[minADX.adx.length - 1]);

console.log('\n=== Debug Complete ===');