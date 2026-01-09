import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('yahoo-finance2');
const YahooFinance = pkg.default;
const yahooFinance = new YahooFinance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../public/data/fundamentals');

async function fixIonq() {
    const symbol = 'IONQ';
    console.log(`Fetching missing data for ${symbol} with validation skipping...`);

    const queryOptions = {
        modules: [
            'summaryProfile', 'price', 'defaultKeyStatistics',
            'financialData', 'earnings', 'majorHoldersBreakdown',
            'insiderTransactions', 'institutionOwnership',
            'recommendationTrend', 'upgradeDowngradeHistory'
        ]
    };

    try {
        // Suppress validation errors
        // yahoo-finance2 v2+ style:
        // yahooFinance.suppressNotices(['yahooSurvey']);
        // But validation errors are often thrown.
        // We can try catching inside.
        // We can also try { validateResult: false } if supported by the version

        let result;
        try {
            result = await yahooFinance.quoteSummary(symbol, queryOptions, { validateResult: false });
        } catch (innerErr) {
            console.log("Validation error caught, but data might be available in error object or try simpler fetch.");
            // Sometimes error object contains the partial result? Not reliably.
            // Try fetching fewer modules if full fails?
            throw innerErr;
        }

        if (result) {
            const output = {
                ...result,
                lastUpdated: new Date().toISOString(),
                source: 'Manual Fix (yahoo-finance2) - Skipped Validation'
            };
            fs.writeFileSync(path.join(OUTPUT_DIR, `${symbol}.json`), JSON.stringify(output, null, 2));
            console.log(`✅ Successfully saved ${symbol}.json`);
        } else {
            console.error('Failed to fetch data (empty result).');
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
        // Fallback: Fetch basic modules only
        console.log('Retrying with basic modules...');
        try {
            const basicOptions = { modules: ['price', 'summaryProfile'] };
            const basicResult = await yahooFinance.quoteSummary(symbol, basicOptions, { validateResult: false });
            if (basicResult) {
                fs.writeFileSync(path.join(OUTPUT_DIR, `${symbol}.json`), JSON.stringify(basicResult, null, 2));
                console.log(`✅ Saved BASIC data for ${symbol}.json`);
            }
        } catch (e2) {
            console.error('Basic fetch also failed.');
        }
    }
}

fixIonq();
