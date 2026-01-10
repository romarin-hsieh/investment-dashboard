
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('yahoo-finance2');

// Mimic fetch-fundamentals.js pattern
const YahooFinance = pkg.default;
const yahooFinance = new YahooFinance();

async function main() {
    const symbol = 'AVGO';
    const queryOptions = {
        modules: [
            'summaryProfile',
            'price',
            'defaultKeyStatistics',
            'financialData',
            'summaryDetail'
        ]
    };

    console.log(`Fetching ${symbol}...`);
    try {
        const result = await yahooFinance.quoteSummary(symbol, queryOptions);
        // console.log('Result Keys:', Object.keys(result));

        if (result.financialData) {
            console.log('--- FinancialData ---');
            console.log('profitMargins:', result.financialData.profitMargins);
        }

        if (result.defaultKeyStatistics) {
            console.log('--- DefaultKeyStatistics ---');
            console.log('profitMargins:', result.defaultKeyStatistics.profitMargins);
        }

        if (result.summaryDetail) {
            console.log('--- SummaryDetail ---');
            // sometimes margins are here?
            console.log('Keys:', Object.keys(result.summaryDetail).filter(k => k.includes('Margin')));
        }

    } catch (e) {
        console.error(e);
    }
}

main();
