
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../public/data/dashboard_status.json');

try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('✅ Loaded dashboard_status.json');
    console.log('Total items:', data.data.length);

    const panw = data.data.find(d => d.ticker === 'PANW');

    if (panw) {
        console.log('✅ PANW Found!');
        console.log('Coordinates:', panw.coordinates);
        console.log('Trace length:', panw.trace.length);
    } else {
        console.error('❌ PANW NOT FOUND in dashboard_status.json');
        // List some found tickers to verify
        console.log('Found tickers (first 10):', data.data.slice(0, 10).map(d => d.ticker).join(', '));
    }
} catch (err) {
    console.error('❌ Failed:', err.message);
}
