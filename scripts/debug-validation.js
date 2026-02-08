
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// --- Copied from src/utils/validation.ts (simplified for reproduction) ---

const DateTimeString = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/));
const ConfidenceLevel = z.number().refine(val => [0, 0.5, 0.75, 0.9, 1].includes(val), {
    message: "Confidence must be 0, 0.5, 0.75, 0.9, or 1"
});

const SymbolMetadataSchema = z.object({
    symbol: z.string().max(10).regex(/^[A-Z0-9.-]+$/),
    sector: z.string().nullable(),
    industry: z.string().nullable(),
    confidence: ConfidenceLevel,
    sources: z.array(z.string()).min(1),
    last_verified_at: DateTimeString,
    market_cap_category: z.string().nullable().optional(),
    exchange: z.string().nullable().optional()
});

const ConfidenceDistributionSchema = z.object({
    high_confidence_0_90: z.number().nonnegative().optional(),
    medium_confidence_0_75: z.number().nonnegative().optional(),
    low_confidence_0_50: z.number().nonnegative().optional()
});

const RefreshMetadataSchema = z.object({
    last_refresh_duration_ms: z.number().nonnegative().optional(),
    symbols_updated: z.number().nonnegative().optional(),
    symbols_failed: z.number().nonnegative().optional(),
    confidence_improvements: z.number().nonnegative().optional(),
    new_sources_added: z.number().nonnegative().optional()
});

const MetadataSnapshotSchemaImpl = z.object({
    ttl_days: z.number().positive(),
    as_of: DateTimeString,
    next_refresh: DateTimeString.optional(),
    items: z.array(SymbolMetadataSchema).min(1, 'Must have metadata for at least 1 symbol'),
    industry_grouping: z.record(z.string(), z.array(z.string())).optional(),
    confidence_distribution: ConfidenceDistributionSchema.optional(),
    data_sources: z.record(z.string(), z.number().nonnegative()).optional(),
    refresh_metadata: RefreshMetadataSchema.optional()
});

// --- Test Execution ---

const metadataPath = path.join(process.cwd(), 'public/data/symbols_metadata.json');

try {
    console.log('Reading symbols_metadata.json...');
    const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('Validating metadata...');

    // Try to validate the whole thing
    const result = MetadataSnapshotSchemaImpl.safeParse(data);

    if (!result.success) {
        console.error('❌ Validation Failed!');
        console.error(JSON.stringify(result.error.format(), null, 2));

        // Validate individual items to find the culprit
        console.log('\n--- Checking individual items ---');
        if (Array.isArray(data.items)) {
            data.items.forEach((item, index) => {
                const itemResult = SymbolMetadataSchema.safeParse(item);
                if (!itemResult.success) {
                    console.error(`Item ${index} (${item.symbol}) failed:`);
                    console.error(JSON.stringify(itemResult.error.format(), null, 2));
                }
            });
        }
    } else {
        console.log('✅ Validation Succeeded!');
    }

} catch (err) {
    console.error('Check failed:', err);
}
