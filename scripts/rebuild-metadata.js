import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNDAMENTALS_DIR = path.join(__dirname, '../public/data/fundamentals');
const STOCKS_CONFIG_PATH = path.join(__dirname, '../public/config/stocks.json');
const OUTPUT_FILE = path.join(__dirname, '../public/data/symbols_metadata.json');

// Helper to determine market cap category
function getMarketCapCategory(marketCap) {
    if (!marketCap) return 'Unknown';
    if (marketCap >= 200e9) return 'mega_cap';
    if (marketCap >= 10e9) return 'large_cap';
    if (marketCap >= 2e9) return 'mid_cap';
    if (marketCap >= 300e6) return 'small_cap';
    return 'micro_cap';
}

function formatMarketCap(marketCap) {
    if (!marketCap) return 'Unknown';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
}

async function rebuildMetadata() {
    console.log('🚀 Starting metadata rebuild from local fundamentals...');

    try {
        // 1. Load symbols list
        const stocksConfig = JSON.parse(await fs.readFile(STOCKS_CONFIG_PATH, 'utf8'));
        const symbols = stocksConfig.stocks.map(s => s.symbol);
        console.log(`📋 Found ${symbols.length} symbols in configuration.`);

        // 1b. Load existing metadata as backup
        let existingMetadata = {};
        try {
            // We want to read the current metadata file to use as fallback
            // Note: If this script is run multiple times, it uses previous run's output as fallback.
            // This is generally fine, but we should be aware.
            // Since we restored Feb 3 version before this, we have a good baseline.
            const existingContent = await fs.readFile(OUTPUT_FILE, 'utf8');
            const existingJson = JSON.parse(existingContent);
            if (existingJson.items) {
                existingJson.items.forEach(item => {
                    if (item.sector !== 'Unknown' && item.industry !== 'Unknown') {
                        existingMetadata[item.symbol] = item;
                    }
                });
            }
            console.log(`💾 Loaded ${Object.keys(existingMetadata).length} existing valid metadata items for fallback.`);
        } catch (e) {
            console.log('⚠️ Could not load existing metadata for fallback (might be corrupted or missing).');
        }

        const metadataItems = [];
        let successCount = 0;
        let failCount = 0;

        // 2. Process each symbol
        for (const symbol of symbols) {
            const filePath = path.join(FUNDAMENTALS_DIR, `${symbol}.json`);
            let item = null;

            try {
                const fileContent = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(fileContent);

                // Extract fields
                const profile = data.summaryProfile || {};
                const price = data.price || {};

                const sector = profile.sector || 'Unknown';
                const industry = profile.industry || 'Unknown';
                const marketCap = price.marketCap || 0;

                // Normalize exchange name for TradingView widget compatibility
                let exchange = price.exchangeName || 'Unknown';
                const exchangeCode = price.exchange || '';

                // Code-based mapping (most reliable)
                const codeMapping = {
                    'ASE': 'AMEX', 'PCX': 'AMEX',
                    'NMS': 'NASDAQ', 'NGM': 'NASDAQ', 'NCM': 'NASDAQ',
                    'NYQ': 'NYSE',
                };
                if (codeMapping[exchangeCode]) {
                    exchange = codeMapping[exchangeCode];
                } else if (exchange.toLowerCase().includes('amex') || exchange.toLowerCase().includes('american')) {
                    exchange = 'AMEX';
                } else if (exchange.toLowerCase().includes('nasdaq')) {
                    exchange = 'NASDAQ';
                } else if (exchange.toLowerCase().includes('nyse')) {
                    exchange = 'NYSE';
                }

                item = {
                    symbol: symbol,
                    sector: sector,
                    industry: industry,
                    confidence: (sector !== 'Unknown' && industry !== 'Unknown') ? 1.0 : 0.0,
                    sources: ['yfinance_local_build'],
                    last_verified_at: new Date().toISOString(),
                    market_cap_category: getMarketCapCategory(marketCap),
                    exchange: exchange,
                    country: profile.country || 'Unknown',
                    website: profile.website || '',
                    employee_count: profile.fullTimeEmployees || null,
                    business_summary: profile.longBusinessSummary || '',
                    market_cap: marketCap,
                    market_cap_formatted: formatMarketCap(marketCap),
                    api_source: 'local_fundamentals'
                };

                successCount++;

            } catch (err) {
                // If file missing or parse error, try fallback
                if (existingMetadata[symbol]) {
                    console.log(`⚠️ Using existing fallback data for ${symbol}`);
                    item = existingMetadata[symbol];
                    item.confidence = 0.8; // Lower confidence since it's old
                    item.sources.push('fallback_restored');
                    successCount++;
                } else {
                    console.error(`❌ Failed to read data for ${symbol} and no fallback: ${err.message}`);
                    failCount++;
                    item = {
                        symbol: symbol,
                        sector: 'Unknown',
                        industry: 'Unknown',
                        confidence: 0.0,
                        sources: ['failed_rebuild'],
                        last_verified_at: new Date().toISOString(),
                        market_cap_category: 'Unknown'
                    };
                }
            }

            // Refine with Manual fix or existing fallback check for partial unknowns
            // If fetch succeeded (item exists) but yielded "Unknown", check if backup has better data.
            if (item.sector === 'Unknown' && existingMetadata[symbol]) {
                console.log(`⚠️ Patching ${symbol} sector from fallback (fetch yielded Unknown)`);
                item.sector = existingMetadata[symbol].sector;
                item.industry = existingMetadata[symbol].industry;
                item.confidence = 0.9;
                item.sources.push('fallback_patch');
            }


            // Manual fix for sector/industry if STILL Unknown (override even fallback if manual is better?)
            if (item.sector === 'Unknown') {
                // Minimal fallback map for strictly new symbols if somehow missing from fundamentals
                const fallbacks = {
                    'FTNT': { sector: 'Technology', industry: 'Software - Infrastructure' },
                    'GLW': { sector: 'Technology', industry: 'Electronic Components' },
                    'WDC': { sector: 'Technology', industry: 'Computer Hardware' },
                    'CSCO': { sector: 'Technology', industry: 'Communication Equipment' }
                }
                if (fallbacks[symbol]) {
                    console.log(`⚠️ Applying manual fallback for ${symbol}`);
                    item.sector = fallbacks[symbol].sector;
                    item.industry = fallbacks[symbol].industry;
                    item.confidence = 1.0;
                    item.sources.push('manual_patch');
                }
            }

            metadataItems.push(item);
        }

        // 3. Construct final object
        const finalMetadata = {
            ttl_days: 7,
            as_of: new Date().toISOString(),
            next_refresh: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: metadataItems
        };

        // 4. Save
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalMetadata, null, 2), 'utf8');
        console.log(`\n✨ Rebuild complete.`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`💾 Saved to ${OUTPUT_FILE}`);

        // Also generate stats
        generateStats(metadataItems);

    } catch (error) {
        console.error('🔥 Critical error:', error);
    }
}

function generateStats(items) {
    const unknownSector = items.filter(i => i.sector === 'Unknown').length;
    const unknownIndustry = items.filter(i => i.industry === 'Unknown').length;
    console.log(`\n📊 Stats:`);
    console.log(`   Total Items: ${items.length}`);
    console.log(`   Unknown Sector: ${unknownSector}`);
    console.log(`   Unknown Industry: ${unknownIndustry}`);
}

rebuildMetadata();
