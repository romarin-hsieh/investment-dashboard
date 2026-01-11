
import fs from 'fs';
import path from 'path';

// 1. Fear & Greed Components (4)
const indexComponents = [
    { name: 'FOREXCOM:SPXUSD', startPrice: 4800, volatility: 0.008, trend: 0.0003 },
    { name: 'TVC:VIX', startPrice: 13, volatility: 0.05, trend: 0 },
    { name: 'NASDAQ:TLT', startPrice: 95, volatility: 0.008, trend: 0.0001 },
    { name: 'NASDAQ:JNK', startPrice: 92, volatility: 0.003, trend: 0.0001 },
];

// 2. Portfolio/Watchlist Stocks (67) from stocks.json
// Extracted manually to ensure correctness
const portfolioStocks = [
    'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
    'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
    'IONQ', 'PLTR', 'HIMS', 'TSLA', 'VST', 'KTOS', 'MELI', 'SOFI', 'RBRK', 'EOSE',
    'CEG', 'TMDX', 'GRAB', 'RBLX', 'IREN', 'OKLO', 'PATH', 'INTR', 'SE', 'KSPI',
    'LUNR', 'HOOD', 'APP', 'CHYM', 'NU', 'COIN', 'CRCL', 'IBKR', 'CCJ', 'UUUU',
    'VRT', 'ETN', 'MSFT', 'ADBE', 'FIG', 'PANW', 'CRWD', 'DDOG', 'DUOL', 'ZETA',
    'AXON', 'ALAB', 'LRCX', 'BWXT', 'UMAC', 'MP', 'RR',
    'SNDK', 'MU', 'BE'
];

// Combine all
const allSymbols = [
    ...indexComponents,
    ...portfolioStocks.map(s => ({ name: s, startPrice: 10 + Math.random() * 200, volatility: 0.02, trend: 0.0005 }))
];

// End date strictly set to 2026-01-09 (Friday)
const endDate = new Date('2026-01-09T00:00:00Z');
const tradingDays = 850; // ~3.5 years, enough for all indicators including 1Y diffs + buffers

// Pre-calculate trading days (timestamps)
const timestamps = [];
let currentDate = new Date(endDate);
let daysGenerated = 0;

while (daysGenerated < tradingDays) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) { // Skip weekends
        timestamps.unshift(currentDate.getTime());
        daysGenerated++;
    }
    currentDate.setDate(currentDate.getDate() - 1);
}

const dir = 'public/data/ohlcv';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

console.log(`Generating data for ${allSymbols.length} symbols ending exactly on ${endDate.toISOString().split('T')[0]} (${daysGenerated} points)...`);

allSymbols.forEach(sym => {
    // Generate random walk
    let price = sym.startPrice;

    const data = {
        symbol: sym.name,
        timestamps: timestamps,
        open: [], high: [], low: [], close: [], volume: []
    };

    timestamps.forEach(ts => {
        const changePercent = sym.trend + (Math.random() - 0.5) * sym.volatility * 2;
        const change = price * changePercent;
        price += change;
        if (price < 0.5) price = 0.5; // Floor

        const open = price;
        const high = price * (1 + Math.random() * sym.volatility);
        const low = price * (1 - Math.random() * sym.volatility);
        const close = low + Math.random() * (high - low);

        data.open.push(Number(open.toFixed(2)));
        data.high.push(Number(high.toFixed(2)));
        data.low.push(Number(low.toFixed(2)));
        data.close.push(Number(close.toFixed(2)));
        data.volume.push(Math.floor(100000 + Math.random() * 2000000));
    });

    // Sanitize filename for Windows (colon -> underscore)
    const safeName = sym.name.replace(/:/g, '_');
    fs.writeFileSync(path.join(dir, `${safeName}.json`), JSON.stringify(data));
    // console.log(`Generated ${safeName}.json`); // Reduce noise
});

console.log('✅ Data generation complete!');
