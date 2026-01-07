
const yahooFinance = require('yahoo-finance2').default;

async function checkTrend(symbol) {
    try {
        const queryOptions = { modules: ['recommendationTrend'] };
        const result = await yahooFinance.quoteSummary(symbol, queryOptions);
        const trend = result.recommendationTrend.trend;
        console.log(`Trend length for ${symbol}: ${trend.length}`);
        console.log(JSON.stringify(trend, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkTrend('AAPL');
