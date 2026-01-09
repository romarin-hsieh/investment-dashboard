import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('yahoo-finance2');
const YahooFinance = pkg.default;
const yahooFinance = new YahooFinance();

async function debug() {
    const symbol = 'ONDS';
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
        const result = await yahooFinance.quoteSummary(symbol, queryOptions);
        console.log('Result Keys:', Object.keys(result));

        if (result.financialData) {
            console.log('financialData present:', result.financialData);
        } else {
            console.log('financialData MISSING');
        }

        if (result.price) {
            console.log('price present:', result.price);
        }

    } catch (e) {
        console.error(e);
    }
}

debug();
