
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
        // Go to main page to get cookies
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

    // QuoteSummary
    console.log(`Fetching QuoteSummary for ${symbol}...`);
    const modules = [
        'summaryProfile', 'price', 'defaultKeyStatistics',
        'financialData', 'earnings', 'majorHoldersBreakdown',
        'insiderTransactions', 'institutionOwnership', 'recommendationTrend',
        'upgradeDowngradeHistory'
    ].join(',');
    const quoteUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
    const quoteSummaryData = await fetchJsonViaNav(quoteUrl);

    // Chart Data
    console.log(`Fetching Chart data for ${symbol}...`);
    // Try v8 chart API
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo&indicators=quote&includePrePost=false`;
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
            recommendationTrend: quoteProb.recommendationTrend
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

        // Save
        const filename = `${new Date().toISOString().split('T')[0]}_${symbol}.json`;

        fs.writeFileSync(path.join(RAW_DATA_DIR, filename), JSON.stringify(finalData, null, 2));
        console.log(`Saved ${symbol} data.`);

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
        console.log('Test mode: Processing only UUUU and NVDA');
        symbols = ['UUUU', 'NVDA'];
    }

    console.log(`Found ${symbols.length} symbols.`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For GitHub Actions
    });

    // Chunking to avoid resource exhaustion
    const CHUNK_SIZE = 5;
    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(s => processSymbol(browser, s)));
        // delay
        await new Promise(r => setTimeout(r, 1000));
    }

    await browser.close();
    console.log('Done.');
}

main().catch(console.error);
