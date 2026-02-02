
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments manually since 'util.parseArgs' might not be available in older Node 18 environments or just for simplicity
const args = process.argv.slice(2);
let retentionDays = 30;
let verbose = false;

args.forEach(arg => {
    if (arg.startsWith('--retention-days=')) {
        retentionDays = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--verbose') {
        verbose = true;
    }
});

if (isNaN(retentionDays) || retentionDays < 1) {
    console.error('Invalid retention-days. Using default: 30');
    retentionDays = 30;
}

const TARGET_DIR = path.join(__dirname, '../public/data/technical-indicators');

function cleanup() {
    if (!fs.existsSync(TARGET_DIR)) {
        console.log(`Target directory does not exist: ${TARGET_DIR}`);
        return;
    }

    console.log(`Cleanup started. Retention period: ${retentionDays} days.`);
    console.log(`Target directory: ${TARGET_DIR}`);

    const now = new Date();
    const cutoffTime = now.getTime() - (retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    let keptCount = 0;
    let errorCount = 0;

    try {
        const files = fs.readdirSync(TARGET_DIR);

        files.forEach(file => {
            const filePath = path.join(TARGET_DIR, file);
            try {
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    if (stats.mtimeMs < cutoffTime) {
                        if (verbose) console.log(`Deleting old file: ${file} (Last modified: ${stats.mtime.toISOString()})`);
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    } else {
                        keptCount++;
                    }
                }
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
                errorCount++;
            }
        });

        console.log(`Cleanup completed.`);
        console.log(`- Deleted: ${deletedCount}`);
        console.log(`- Kept: ${keptCount}`);
        console.log(`- Errors: ${errorCount}`);

    } catch (err) {
        console.error('Failed to read directory:', err);
        process.exit(1);
    }
}

cleanup();
