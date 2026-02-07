#!/usr/bin/env node
/**
 * Data Validation Script - Validates generated data files
 * 資料驗證腳本 - 驗證生成的資料檔案
 *
 * Run after data generation to ensure data integrity.
 * 在資料生成後執行以確保資料完整性。
 *
 * Usage / 使用方式:
 *   node scripts/validate-data.js
 *   node scripts/validate-data.js --verbose
 *   node scripts/validate-data.js --fix (attempt auto-fix)
 *
 * @module scripts/validate-data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent / ESM __dirname 等效
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration / 配置
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const CONFIG_DIR = path.join(__dirname, '..', 'public', 'config');
const VERBOSE = process.argv.includes('--verbose');
const AUTO_FIX = process.argv.includes('--fix');

// Validation results / 驗證結果
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
    fixes: []
};

/**
 * Log utility / 日誌工具
 */
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📋',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        fix: '🔧'
    }[type] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
}

function logVerbose(message) {
    if (VERBOSE) {
        console.log(`   ${message}`);
    }
}

/**
 * Check if file exists / 檢查檔案是否存在
 */
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

/**
 * Read and parse JSON file / 讀取並解析 JSON 檔案
 */
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, data: JSON.parse(content) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Validate OHLCV data structure / 驗證 OHLCV 資料結構
 */
function validateOhlcvFile(symbol, filePath) {
    const result = readJsonFile(filePath);
    if (!result.success) {
        results.errors.push(`${symbol}: Failed to parse OHLCV JSON - ${result.error}`);
        return false;
    }

    const data = result.data;
    const errors = [];

    // Check required fields / 檢查必要欄位
    if (!data.symbol) errors.push('Missing symbol');
    if (data.symbol && data.symbol !== symbol) errors.push(`Symbol mismatch: expected ${symbol}, got ${data.symbol}`);
    if (!data.ohlcv || !Array.isArray(data.ohlcv)) errors.push('Missing or invalid ohlcv array');

    // Check OHLCV data points / 檢查 OHLCV 資料點
    if (data.ohlcv && Array.isArray(data.ohlcv)) {
        logVerbose(`  ${symbol}: ${data.ohlcv.length} OHLCV data points`);

        if (data.ohlcv.length < 50) {
            errors.push(`Insufficient OHLCV data: ${data.ohlcv.length} points (expected >= 50)`);
        }

        // Sample validation of data points / 抽樣驗證資料點
        for (let i = 0; i < Math.min(5, data.ohlcv.length); i++) {
            const point = data.ohlcv[i];
            if (!point.date) errors.push(`OHLCV[${i}]: Missing date`);
            if (typeof point.open !== 'number') errors.push(`OHLCV[${i}]: Invalid open`);
            if (typeof point.high !== 'number') errors.push(`OHLCV[${i}]: Invalid high`);
            if (typeof point.low !== 'number') errors.push(`OHLCV[${i}]: Invalid low`);
            if (typeof point.close !== 'number') errors.push(`OHLCV[${i}]: Invalid close`);
            if (typeof point.volume !== 'number') errors.push(`OHLCV[${i}]: Invalid volume`);
        }
    }

    if (errors.length > 0) {
        results.errors.push(`${symbol} OHLCV: ${errors.join('; ')}`);
        return false;
    }

    return true;
}

/**
 * Validate Fundamentals data / 驗證 Fundamentals 資料
 */
function validateFundamentalsFile(symbol, filePath) {
    const result = readJsonFile(filePath);
    if (!result.success) {
        results.errors.push(`${symbol}: Failed to parse Fundamentals JSON - ${result.error}`);
        return false;
    }

    const data = result.data;
    const errors = [];

    // Fundamentals files use Yahoo Finance API format
    // Fundamentals 檔案使用 Yahoo Finance API 格式
    const hasEarnings = !!data.earnings;
    const hasRecommendation = !!data.recommendationTrend;

    if (!hasEarnings && !hasRecommendation) {
        errors.push('Missing required fields (earnings or recommendationTrend)');
    }

    // Check file size for completeness / 檢查檔案大小確保完整性
    const stats = fs.statSync(filePath);
    if (stats.size < 1000) {
        errors.push(`File size too small (${stats.size} bytes), may be incomplete`);
    }

    logVerbose(`  ${symbol}: size=${Math.round(stats.size / 1024)}KB, earnings=${hasEarnings}`);

    if (errors.length > 0) {
        results.errors.push(`${symbol} Fundamentals: ${errors.join('; ')}`);
        return false;
    }

    return true;
}

/**
 * Validate Metadata file / 驗證 Metadata 檔案
 */
function validateMetadataFile(filePath, fileName) {
    const result = readJsonFile(filePath);
    if (!result.success) {
        results.errors.push(`${fileName}: Failed to parse - ${result.error}`);
        return false;
    }

    const data = result.data;
    const errors = [];

    // Check required structure / 檢查必要結構
    if (!data.as_of) errors.push('Missing as_of timestamp');
    if (!data.items || !Array.isArray(data.items)) errors.push('Missing or invalid items array');

    // Check items / 檢查項目
    if (data.items && Array.isArray(data.items)) {
        logVerbose(`  ${fileName}: ${data.items.length} symbol entries`);

        data.items.forEach((item, index) => {
            if (!item.symbol) errors.push(`items[${index}]: Missing symbol`);
            if (!item.sector && !item.industry) {
                errors.push(`items[${index}] (${item.symbol || 'unknown'}): Missing both sector and industry`);
            }
        });
    }

    if (errors.length > 0) {
        results.errors.push(`${fileName}: ${errors.join('; ')}`);
        return false;
    }

    return true;
}

/**
 * Validate Technical Indicators / 驗證技術指標
 */
function validateTechnicalIndicatorsFile(symbol, filePath) {
    const result = readJsonFile(filePath);
    if (!result.success) {
        results.errors.push(`${symbol}: Failed to parse Technical Indicators JSON - ${result.error}`);
        return false;
    }

    const data = result.data;
    const errors = [];

    // Check for required indicator fields / 檢查必要指標欄位
    const requiredIndicators = ['rsi', 'macd', 'sma', 'ema'];
    requiredIndicators.forEach(indicator => {
        if (data[indicator] === undefined) {
            errors.push(`Missing ${indicator} indicator`);
        }
    });

    logVerbose(`  ${symbol}: Technical indicators validated`);

    if (errors.length > 0) {
        results.errors.push(`${symbol} Technical: ${errors.join('; ')}`);
        return false;
    }

    return true;
}

/**
 * Validate stocks.json config / 驗證 stocks.json 配置
 */
function validateStocksConfig() {
    log('Validating stocks.json config...', 'info');

    const configPath = path.join(CONFIG_DIR, 'stocks.json');
    if (!fileExists(configPath)) {
        results.errors.push('stocks.json: File not found');
        results.failed++;
        return null;
    }

    const result = readJsonFile(configPath);
    if (!result.success) {
        results.errors.push(`stocks.json: Failed to parse - ${result.error}`);
        results.failed++;
        return null;
    }

    const data = result.data;
    const errors = [];

    if (!data.stocks || !Array.isArray(data.stocks)) {
        errors.push('Missing or invalid stocks array');
    }

    // Extract enabled symbols / 提取已啟用的股票代號
    const symbols = [];
    if (data.stocks && Array.isArray(data.stocks)) {
        data.stocks.forEach((stock, index) => {
            if (!stock.symbol) {
                errors.push(`stocks[${index}]: Missing symbol`);
            } else {
                // Check symbol format / 檢查代號格式
                if (!/^[A-Z0-9.-]+$/.test(stock.symbol)) {
                    errors.push(`stocks[${index}]: Invalid symbol format: ${stock.symbol}`);
                }
                if (stock.enabled !== false) {
                    symbols.push(stock.symbol);
                }
            }
        });
    }

    if (errors.length > 0) {
        results.errors.push(`stocks.json: ${errors.join('; ')}`);
        results.failed++;
        return null;
    }

    log(`Found ${symbols.length} enabled symbols in stocks.json`, 'success');
    results.passed++;
    return symbols;
}

/**
 * Main validation routine / 主驗證流程
 */
async function main() {
    console.log('\n════════════════════════════════════════════════════════');
    log('Starting Data Validation / 開始資料驗證', 'info');
    console.log('════════════════════════════════════════════════════════\n');

    // Step 1: Validate stocks.json and get symbols
    // 步驟 1: 驗證 stocks.json 並取得股票代號
    const symbols = validateStocksConfig();
    if (!symbols) {
        log('Cannot proceed without valid stocks.json', 'error');
        process.exit(1);
    }

    // Step 2: Validate OHLCV files
    // 步驟 2: 驗證 OHLCV 檔案
    log('\nValidating OHLCV data files...', 'info');
    symbols.forEach(symbol => {
        const ohlcvPath = path.join(DATA_DIR, `${symbol}.json`);
        if (!fileExists(ohlcvPath)) {
            results.errors.push(`${symbol}: OHLCV file not found`);
            results.failed++;
        } else if (validateOhlcvFile(symbol, ohlcvPath)) {
            results.passed++;
            logVerbose(`  ${symbol}: OHLCV OK`);
        } else {
            results.failed++;
        }
    });

    // Step 3: Validate Fundamentals files
    // 步驟 3: 驗證 Fundamentals 檔案
    log('\nValidating Fundamentals data files...', 'info');
    const fundamentalsDir = path.join(DATA_DIR, 'fundamentals');
    if (fileExists(fundamentalsDir)) {
        symbols.forEach(symbol => {
            const fundPath = path.join(fundamentalsDir, `${symbol}.json`);
            if (!fileExists(fundPath)) {
                results.warnings++;
                logVerbose(`  ${symbol}: Fundamentals file not found (warning)`);
            } else if (validateFundamentalsFile(symbol, fundPath)) {
                results.passed++;
                logVerbose(`  ${symbol}: Fundamentals OK`);
            } else {
                results.failed++;
            }
        });
    } else {
        log('Fundamentals directory not found', 'warning');
        results.warnings++;
    }

    // Step 4: Validate Technical Indicators files
    // 步驟 4: 驗證技術指標檔案
    log('\nValidating Technical Indicators data files...', 'info');
    const techDir = path.join(DATA_DIR, 'technical-indicators');
    if (fileExists(techDir)) {
        symbols.forEach(symbol => {
            const techPath = path.join(techDir, `${symbol}.json`);
            if (!fileExists(techPath)) {
                results.warnings++;
                logVerbose(`  ${symbol}: Technical indicators file not found (warning)`);
            } else if (validateTechnicalIndicatorsFile(symbol, techPath)) {
                results.passed++;
                logVerbose(`  ${symbol}: Technical OK`);
            } else {
                results.failed++;
            }
        });
    } else {
        log('Technical indicators directory not found', 'warning');
        results.warnings++;
    }

    // Step 5: Validate Metadata files
    // 步驟 5: 驗證 Metadata 檔案
    log('\nValidating Metadata files...', 'info');
    const metadataFiles = ['symbols_metadata.json', 'sector_industry.json'];
    metadataFiles.forEach(fileName => {
        const filePath = path.join(DATA_DIR, fileName);
        if (!fileExists(filePath)) {
            results.warnings++;
            logVerbose(`  ${fileName}: Not found (warning)`);
        } else if (validateMetadataFile(filePath, fileName)) {
            results.passed++;
            log(`${fileName}: Valid`, 'success');
        } else {
            results.failed++;
        }
    });

    // Summary / 摘要
    console.log('\n════════════════════════════════════════════════════════');
    log('Validation Complete / 驗證完成', 'info');
    console.log('════════════════════════════════════════════════════════');
    console.log(`\n📊 Results Summary / 結果摘要:`);
    console.log(`   ✅ Passed:   ${results.passed}`);
    console.log(`   ❌ Failed:   ${results.failed}`);
    console.log(`   ⚠️  Warnings: ${results.warnings}`);

    if (results.errors.length > 0) {
        console.log('\n❌ Errors / 錯誤:');
        results.errors.forEach(err => console.log(`   - ${err}`));
    }

    if (results.fixes.length > 0) {
        console.log('\n🔧 Auto-fixes applied / 自動修復:');
        results.fixes.forEach(fix => console.log(`   - ${fix}`));
    }

    console.log('\n');

    // Exit code based on results / 根據結果回傳退出碼
    if (results.failed > 0) {
        process.exit(1);
    }
    process.exit(0);
}

// Run / 執行
main().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
});
