
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../public/data/technical-indicators/2026-02-03_PANW.json');

try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('✅ Loaded JSON');
    console.log('Keys:', Object.keys(data));
    if (data.market) {
        console.log('✅ Market Object found:', data.market);
    } else {
        console.error('❌ Market Object MISSING');
    }

    if (data.fundamentals) {
        console.log('✅ Fundamentals found. Market Cap:', data.fundamentals.price?.marketCap || 'N/A (in price module)', 'Shares:', data.fundamentals.defaultKeyStatistics?.sharesOutstanding || 'N/A');
    }
} catch (err) {
    console.error('❌ Failed:', err.message);
}
