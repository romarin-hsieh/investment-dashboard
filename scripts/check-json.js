import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../public/data/fundamentals/ONDS.json');

try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('Keys in ONDS.json:', Object.keys(data));
    if (data.financialData) {
        console.log('financialData is PRESET.');
    } else {
        console.log('financialData is MISSING.');
    }
} catch (e) {
    console.error(e);
}
