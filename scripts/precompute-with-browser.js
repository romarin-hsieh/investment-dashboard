
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import logic from existing code (if possible) or reimplement core parts
// Since we can't easily import ES modules that depend on browser globals, 
// we'll implement a standalone robust script.

const RAW_DATA_DIR = path.join(__dirname, '../public/data/technical-indicators');
const SYMBOLS_PATH = path.join(__dirname, '../public/data/symbols_metadata.json');
const SENTIMENT_DIR = path.join(__dirname, '../public/data');

// Ensure sentiment output directory exists
if (!fs.existsSync(SENTIMENT_DIR)) {
    fs.mkdirSync(SENTIMENT_DIR, { recursive: true });
}

async function fetchFearGreedIndex(browser) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Fetching CNN Fear & Greed Index...');
    try {
        await page.goto('https://edition.cnn.com/markets/fear-and-greed', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for the gauge to load using the selector found
        try {
            await page.waitForSelector('.market-fng-gauge__dial-number-value', { timeout: 15000 });
        } catch (e) {
            console.warn('Timeout waiting for gauge selector, attempting extraction anyway...');
        }

        const data = await page.evaluate(() => {
            const getValue = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.innerText.trim() : null;
            };

            const mainValue = getValue('.market-fng-gauge__dial-number-value');
            const mainSentiment = getValue('.market-fng-gauge__label');
            const lastUpdated = getValue('.market-fng-gauge__timestamp');

            const indicators = Array.from(document.querySelectorAll('.market-fng-indicator')).map(ind => {
                const nameEl = ind.querySelector('.market-fng-indicator__name');
                const sentimentEl = ind.querySelector('.market-fng-indicator__value-label');
                return {
                    name: nameEl ? nameEl.innerText.trim() : 'Unknown',
                    sentiment: sentimentEl ? sentimentEl.innerText.trim() : 'Unknown'
                };
            });

            return {
                value: mainValue ? parseInt(mainValue, 10) : null,
                sentiment: mainSentiment,
                lastUpdated: lastUpdated,
                indicators: indicators,
                timestamp: new Date().toISOString()
            };
        });

        if (data.value !== null) {
            console.log(`Fetched Fear & Greed Index: ${data.value} (${data.sentiment})`);
            return data;
        } else {
            console.error('Failed to extract Fear & Greed Index value');
            return null;
        }

    } catch (e) {
        console.error(`Error fetching Fear & Greed Index: ${e.message}`);
        return null;
    } finally {
        await page.close();
    }
}

// Ensure output directory exists
if (!fs.existsSync(RAW_DATA_DIR)) {
    fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
}

async function loadSymbols() {
    const content = fs.readFileSync(SYMBOLS_PATH, 'utf-8');
    const data = JSON.parse(content);

    let symbols = [];
    if (data.items && Array.isArray(data.items)) {
        symbols = data.items.map(s => s.symbol);
    } else if (Array.isArray(data)) {
        if (typeof data[0] === 'string') symbols = data;
        else if (data[0].symbol) symbols = data.map(s => s.symbol);
    } else {
        // Fallback for categorized object
        Object.values(data).forEach(list => {
            if (Array.isArray(list)) list.forEach(item => symbols.push(item.symbol));
        });
    }
    return [...new Set(symbols)];
}

async function fetchYahooData(page, symbol) {
    console.log(`Navigating to Yahoo Finance for ${symbol} (seeding cookies)...`);
    try {
        await page.goto(`https://finance.yahoo.com/quote/${symbol}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
        console.warn(`Main page navigation failed for ${symbol}, proceeding anyway: ${e.message}`);
    }

    // Helper to fetch JSON via navigation
    const fetchJsonViaNav = async (url) => {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            // Extract JSON from body
            const content = await page.evaluate(() => document.body.innerText);
            try {
                return JSON.parse(content);
            } catch (e) {
                return { error: `JSON Parse check: ${content.substring(0, 100)}...` };
            }
        } catch (e) {
            return { error: e.message };
        }
    };

    // 1. Try to scrape QuoteSummary from global state (Bypass API 401)
    console.log(`Scraping QuoteSummary from page state for ${symbol}...`);
    let quoteSummaryData = await page.evaluate(async () => {
        try {
            // Wait for YAHOO global to be hydrated
            const start = Date.now();
            while (!window.YAHOO && Date.now() - start < 15000) {
                await new Promise(r => setTimeout(r, 200));
            }
            if (!window.YAHOO) return { error: 'Timeout waiting for window.YAHOO' };
            if (!window.YAHOO.context) return { error: 'window.YAHOO.context missing' };

            // Strategy: Stringify context to ensure all properties (even non-enumerable ones if captured) 
            // are serialized, then parse back to traverse.
            const jsonStr = JSON.stringify(window.YAHOO.context);
            const rootObj = JSON.parse(jsonStr);

            // Helper to recursively find key
            const findKey = (obj, key, depth = 0) => {
                if (depth > 20) return null;
                if (!obj || typeof obj !== 'object') return null;

                if (obj[key]) return obj[key];

                for (const k of Object.keys(obj)) {
                    const val = obj[k];
                    // Check if value is a stringified JSON containing the key
                    if (typeof val === 'string' && val.includes(key) && (val.startsWith('{') || val.startsWith('['))) {
                        try {
                            const parsed = JSON.parse(val);
                            if (parsed[key]) return parsed[key];
                            // Recurse into parsed string object
                            const found = findKey(parsed, key, depth + 1);
                            if (found) return found;
                        } catch (e) { }
                    }
                    // Recursive object check
                    if (typeof val === 'object') {
                        const found = findKey(val, key, depth + 1);
                        if (found) return found;
                    }
                }
                return null;
            };

            const innerSummary = findKey(rootObj, 'quoteSummary');
            if (innerSummary) {
                // Determine structure
                if (innerSummary.result) return { quoteSummary: innerSummary };
                return { quoteSummary: { result: [innerSummary] } };
            }

            return null;
        } catch (e) {
            return { error: e.toString() };
        }
    });

    // Fallback: QuoteSummary API
    if (!quoteSummaryData || quoteSummaryData.error) {
        console.log(`Fallback: Fetching QuoteSummary API for ${symbol}...`);
        const modules = [
            'financialData', 'earnings', 'majorHoldersBreakdown',
            'insiderTransactions', 'institutionOwnership', 'recommendationTrend',
            'upgradeDowngradeHistory', 'earningsTrend', 'earningsHistory'
        ].join(',');
        const quoteUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
        const apiData = await fetchJsonViaNav(quoteUrl);
        if (!apiData.error && apiData.quoteSummary && apiData.quoteSummary.result) {
            quoteSummaryData = apiData;
        } else {
            // If both failed, keep the error or empty
            if (!quoteSummaryData) quoteSummaryData = apiData;
        }
    }

    // Chart Data (v8 API usually works)
    console.log(`Fetching Chart data for ${symbol}...`);
    // Increased range to 2y
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y&indicators=quote&includePrePost=false`;
    const chartData = await fetchJsonViaNav(chartUrl);

    return { quoteSummaryData, chartData };
}

// Technical Indicator Calculations (Ported simplified version or just use what we get from chart)
// Note: We need to calculate MA, RSI, etc. 
// Ideally we import `technicalIndicatorsCore.js` but it might be tricky in Node if not module-ready.
// We will rely on loading the existing module if possible, or simple recalculation.
// Let's copy calculateSimpleMA and RSI for robustness or try to import.
// For now, I will extract close prices and volume.

import * as indicators from '../src/utils/technicalIndicatorsCore.js';
// Note: importing local JS file in Node requires it to be ESM or handled. 
// project package.json says "type": "module"? I should check. 
// Assuming ESM is ON.

async function processSymbol(browser, symbol) {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    // Set User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        const { quoteSummaryData, chartData } = await fetchYahooData(page, symbol);

        if (quoteSummaryData.error || chartData.error || chartData?.chart?.error) {
            console.error(`Error fetching data for ${symbol}:`,
                quoteSummaryData.error || chartData.error || JSON.stringify(chartData?.chart?.error));
            // Proceed to save what we have? Or skip?
            // If chart data is missing, we can't do technicals.
        }


        const quoteProb = quoteSummaryData?.quoteSummary?.result?.[0];
        console.log(`Debug ${symbol}: quoteSummaryData keys:`, Object.keys(quoteSummaryData || {}));
        if (quoteSummaryData.quoteSummary) {
            console.log(`Debug ${symbol}: quoteSummary keys:`, Object.keys(quoteSummaryData.quoteSummary));
            if (quoteSummaryData.quoteSummary.error) {
                console.log(`Debug ${symbol}: quoteSummary error:`, JSON.stringify(quoteSummaryData.quoteSummary.error));
            }
        } else {
            console.log(`Debug ${symbol}: quoteSummary property missing. Full data:`, JSON.stringify(quoteSummaryData).substring(0, 200));
        }
        const chartRes = chartData?.chart?.result?.[0];

        if (!chartRes) {
            console.error(`No chart data for ${symbol}`);
            return; // Skip
        }

        // Process Indicators (using the same logic as YahooFinanceAPI)

        // Extract OHLCV
        const quote = chartRes.indicators.quote[0];
        const timestamps = chartRes.timestamp || [];
        const closes = quote.close || [];
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const volumes = quote.volume || [];

        // Safety check
        if (!closes.length || !volumes.length) {
            console.error(`Empty data for ${symbol}`);
            return;
        }

        // Calculate Technicals using imported module
        // calculateAllIndicators expects {open, high, low, close, volume}
        const ohlcv = {
            timestamps: timestamps,
            open: opens,
            high: highs,
            low: lows,
            close: closes,
            volume: volumes
        };

        const computed = indicators.calculateAllIndicators(ohlcv);
        const yfParams = {
            marketCap: quoteProb?.price?.marketCap?.raw || chartRes?.meta?.marketCap,
            beta_10d: 'N/A', // Need calculation
            beta_3mo: 'N/A',
            beta_1y: quoteProb?.defaultKeyStatistics?.beta?.fmt || 'N/A'
            // ... extract others
        };

        // Construct Fundamentals object
        const fundamentals = quoteProb ? {
            summaryProfile: quoteProb.summaryProfile,
            price: quoteProb.price,
            defaultKeyStatistics: quoteProb.defaultKeyStatistics,
            financialData: quoteProb.financialData,
            earnings: quoteProb.earnings,
            majorHoldersBreakdown: quoteProb.majorHoldersBreakdown,
            insiderTransactions: quoteProb.insiderTransactions,
            institutionOwnership: quoteProb.institutionOwnership,
            recommendationTrend: quoteProb.recommendationTrend,
            earningsTrend: quoteProb.earningsTrend,
            earningsHistory: quoteProb.earningsHistory
        } : {};

        // Final Object
        const finalData = {
            symbol,
            date: new Date().toISOString().split('T')[0],
            computedAt: new Date().toISOString(),
            indicators: {
                ...computed,
                yf: {
                    ...yfParams,
                    volume_last_day: volumes[volumes.length - 1],
                },
                fundamentals // KEY ADDITION
            }
        };

        // Save Technical Indicators (Dated)
        const filename = `${new Date().toISOString().split('T')[0]}_${symbol}.json`;
        fs.writeFileSync(path.join(RAW_DATA_DIR, filename), JSON.stringify(finalData, null, 2));

        // Save OHLCV (Undated, UpperCase) for MFI Widget compatibility
        // Format: { ohlcv: [[t,o,h,l,c,v], ...] }
        const ohlcvData = {
            symbol: symbol,
            ohlcv: ohlcv // Assuming ohlcv variable is available here (it was used for indicators)
        };
        // Ensure ohlcv directory exists
        const ohlcvDir = path.join(RAW_DATA_DIR, '..', 'ohlcv');
        if (!fs.existsSync(ohlcvDir)) fs.mkdirSync(ohlcvDir, { recursive: true });

        fs.writeFileSync(path.join(ohlcvDir, `${symbol.toUpperCase()}.json`), JSON.stringify(ohlcvData, null, 2));

        console.log(`Saved ${symbol} data (Indicators + OHLCV).`);

    } catch (e) {
        console.error(`Failed ${symbol}: ${e.message}`);
        console.error(e.stack);
    } finally {
        await page.close();
    }
}

async function main() {
    let symbols = await loadSymbols();

    if (process.argv.includes('--test')) {
        console.log('Test mode: Processing only ALAB');
        symbols = ['ALAB'];
    }

    console.log(`Found ${symbols.length} symbols.`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For GitHub Actions
    });

    // Chunking to avoid resource exhaustion
    const successfulSymbols = [];

    // Chunking to avoid resource exhaustion
    const CHUNK_SIZE = 5;
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async s => {
            try {
                await processSymbol(browser, s);
                return s;
            } catch (err) {
                console.error(`Error processing ${s}:`, err);
                return null;
            }
        }));

        results.forEach(s => {
            if (s) successfulSymbols.push(s);
        });

        // delay
        await new Promise(r => setTimeout(r, 1000));
    }

    // Fetch Fear & Greed Index (CNN)
    const fearGreedData = await fetchFearGreedIndex(browser);
    if (fearGreedData) {
        fs.writeFileSync(path.join(SENTIMENT_DIR, 'market-sentiment.json'), JSON.stringify(fearGreedData, null, 2));
        console.log('Saved market-sentiment.json');
    }

    await browser.close();

    // Generate Index
    console.log('Generating latest_index.json...');
    const indexData = {
        generatedAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        totalSymbols: successfulSymbols.length,
        successful: successfulSymbols.length,
        failed: symbols.length - successfulSymbols.length,
        symbols: successfulSymbols.sort(),
        failedSymbols: [] // TODO: Track actual failures better if needed
    };

    fs.writeFileSync(path.join(RAW_DATA_DIR, 'latest_index.json'), JSON.stringify(indexData, null, 2));
    // Also save dated index for history
    const dateStr = new Date().toISOString().split('T')[0];
    fs.writeFileSync(path.join(RAW_DATA_DIR, `${dateStr}_index.json`), JSON.stringify(indexData, null, 2));

    console.log(`Done. Index generated with ${successfulSymbols.length} symbols.`);
}

main().catch(console.error);
