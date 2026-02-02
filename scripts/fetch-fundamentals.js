import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('yahoo-finance2');
const YahooFinance = pkg.default;
const yahooFinance = new YahooFinance();



// ESM path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../public/data/fundamentals');
const SYMBOLS_FILE = path.join(__dirname, '../public/data/symbols_metadata.json');
const DELAY_MS = 1500; // Conservative delay

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Yahoo Finance Fetcher
async function fetchYahooData(symbol) {
    // Modules to fetch
    const queryOptions = {
        modules: [
            'summaryProfile',
            'price',
            'defaultKeyStatistics',
            'financialData',
            'earnings',
            'majorHoldersBreakdown',
            'insiderTransactions',
            'institutionOwnership',
            'recommendationTrend',
            'upgradeDowngradeHistory'
        ]
    };

    console.log(`Fetching ${symbol}...`);
    try {
        // yahoo-finance2 automatically handles crumb/cookie
        // But we might need to suppress logging if it's too verbose
        const result = await yahooFinance.quoteSummary(symbol, queryOptions);

        if (!result) {
            throw new Error('Empty result from yahooFinance.quoteSummary');
        }

        // Add last updated timestamp & Source
        // We create a wrapper object to match the structure expected by the frontend (optional, but good for metadata)
        // Or we can just save the result, and frontend adapts.
        // The previous script saved `quoteSummary.result[0]`.
        // `yahooFinance.quoteSummary` returns usually the merged result object if modules are requested?
        // Let's verify: yahoo-finance2 returns the object directly with module keys.

        const output = {
            ...result,
            lastUpdated: new Date().toISOString(),
            source: 'Static Build (yahoo-finance2)'
        };

        return output;
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        return null;
    }
}

// Main Process
async function main() {
    console.log('Starting Stock Data Fetcher (yahoo-finance2)...');

    // Parse command line args for specific symbols
    const args = process.argv.slice(2);
    let targetSymbols = [];
    if (args.length > 0) {
        targetSymbols = args.map(s => s.toUpperCase());
        console.log(`Filtering for symbols: ${targetSymbols.join(', ')}`);
    }

    // Load symbols from Master Config
    let symbols = [];
    try {
        const configFile = path.join(__dirname, '../public/config/stocks.json');
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

        if (config.stocks && Array.isArray(config.stocks)) {
            // Filter enabled stocks
            symbols = config.stocks
                .filter(s => s.enabled !== false)
                .map(s => s.symbol);
        } else {
            throw new Error('Invalid config format: missing stocks array');
        }

        // Apply filter if args present
        if (targetSymbols.length > 0) {
            symbols = symbols.filter(s => targetSymbols.includes(s));
        }

        console.log(`Loaded ${symbols.length} symbols to fetch from public/config/stocks.json.`);
    } catch (err) {
        console.error('Failed to load symbols metadata:', err.message);
        process.exit(1);
    }

    let successCount = 0;

    // Suppress yahoo-finance2 console spam if necessary
    // yahooFinance.suppressNotices(['yahooSurvey']);

    for (const symbol of symbols) {
        const data = await fetchYahooData(symbol);

        if (data) {
            const filePath = path.join(OUTPUT_DIR, `${symbol}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            successCount++;
            console.log(`✅ Saved ${symbol} data`);
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        // Also a small random jitter to look more human
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    }

    console.log(`\nCompleted! Successfully fetched ${successCount}/${symbols.length} symbols.`);
}

main();
