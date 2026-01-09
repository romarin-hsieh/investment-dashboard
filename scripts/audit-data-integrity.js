import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNDAMENTALS_DIR = path.join(__dirname, '../public/data/fundamentals');
const TECH_DIR = path.join(__dirname, '../public/data/technical-indicators');
const METADATA_PATH = path.join(__dirname, '../public/data/symbols_metadata.json');
const INDEX_PATH = path.join(TECH_DIR, 'latest_index.json');

function audit() {
    console.log('Starting Comprehensive Data Audit...');

    // 1. Load Expected Symbols
    if (!fs.existsSync(METADATA_PATH)) {
        console.error('CRITICAL: symbols_metadata.json missing!');
        return;
    }
    const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
    let symbols = [];
    if (metadata.items) symbols = metadata.items.map(i => i.symbol);
    else if (Array.isArray(metadata)) symbols = metadata;
    // Handle other formats if necessary, but assuming items array based on previous context

    console.log(`Expected Symbols: ${symbols.length}`);

    // 2. data/fundamentals Check
    const fundFiles = fs.readdirSync(FUNDAMENTALS_DIR);
    const missingFund = symbols.filter(s => !fundFiles.includes(`${s}.json`));

    // 3. data/technical-indicators Check (latest date)
    // We need to find the latest date prefix used in the directory or rely on the index
    // Let's rely on file existence matching the pattern
    const techFiles = fs.readdirSync(TECH_DIR);

    // Find the most recent date prefix
    const dates = [...new Set(techFiles
        .filter(f => f.match(/^\d{4}-\d{2}-\d{2}_/))
        .map(f => f.split('_')[0]))].sort();
    const latestDate = dates[dates.length - 1];

    console.log(`Latest Technical Date found: ${latestDate}`);

    const missingTech = symbols.filter(s => !fs.existsSync(path.join(TECH_DIR, `${latestDate}_${s}.json`)));

    // 4. Index Check
    let indexSymbols = [];
    if (fs.existsSync(INDEX_PATH)) {
        const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
        indexSymbols = index.symbols;
    } else {
        console.error('CRITICAL: latest_index.json missing!');
    }
    const missingIndex = symbols.filter(s => !indexSymbols.includes(s));


    // Report
    console.log('\n--- AUDIT RESULTS ---');

    if (missingFund.length === 0) console.log('✅ Fundamentals: All present.');
    else console.error(`❌ Missing Fundamentals (${missingFund.length}): ${missingFund.join(', ')}`);

    if (missingTech.length === 0) console.log('✅ Technicals: All present for ' + latestDate);
    else console.error(`❌ Missing Technicals (${missingTech.length}): ${missingTech.join(', ')}`);

    if (missingIndex.length === 0) console.log('✅ Index: All present.');
    else console.error(`❌ Missing from Index (${missingIndex.length}): ${missingIndex.join(', ')}`);

    if (missingFund.length + missingTech.length + missingIndex.length === 0) {
        console.log('\n🎉 SYSTEM HEALTHY: All data is consistent and present.');
    } else {
        console.log('\n⚠️ SYSTEM COMPROMISED: Data gaps detected.');
    }
}

audit();
