/**
 * Zod validation schemas for Investment Dashboard data models
 * Provides runtime validation for all data contracts
 */

import { z } from 'zod'
import type {
  UserState,
  QuotesSnapshot,
  DailySnapshot,
  MetadataSnapshot,
  SystemStatus,
  UniverseConfig,
  MacroIndicatorConfig,
  NewsSourcesConfig,
  WishConfig,
  VersionConfig,
  ValidationResult
} from '@/types'

// ============================================================================
// Custom datetime validator that accepts ISO strings with timezone
const DateTimeString = z.string().refine(
  (val) => {
    try {
      const date = new Date(val)
      return !isNaN(date.getTime()) && val.includes('T')
    } catch {
      return false
    }
  },
  { message: 'Invalid datetime format' }
)
// ============================================================================

const StaleLevel = z.enum(['fresh', 'stale', 'very_stale'])
const MarketState = z.enum(['open', 'closed', 'pre', 'post']).nullable()
const PriceType = z.enum(['latest', 'close', 'last_known'])
const BriefSource = z.enum(['llm', 'fallback'])
const QualityFlag = z.enum(['good', 'stale', 'degraded', 'disabled_scrape'])
const ConfidenceLevel = z.union([z.literal(0.50), z.literal(0.75), z.literal(0.90)])
const SystemStatusType = z.enum(['operational', 'degraded', 'maintenance', 'outage'])
const JobStatusType = z.enum(['success', 'failed', 'running', 'pending'])

// ============================================================================
// User State Validation Schemas
// ============================================================================

const HoldingDataSchema = z.object({
  avg_cost_usd: z.number().positive().finite(),
  shares: z.number().positive().finite().optional()
})

const UserSettingsSchema = z.object({
  scraping_enabled: z.boolean(),
  degradation_enabled: z.boolean(),
  ga_enabled: z.boolean(),
  clarity_enabled: z.boolean()
})

const ImportResultSchema = z.object({
  timestamp: DateTimeString,
  success: z.boolean(),
  error: z.string().optional(),
  changes_applied: z.number().nonnegative(),
  dry_run: z.boolean()
})

const DiagnosticsDataSchema = z.object({
  last_import_result: ImportResultSchema.optional()
})

// Forward declarations for recursive types
const DailySnapshotSchema: z.ZodType<DailySnapshot> = z.lazy(() => DailySnapshotSchemaImpl)
const QuotesSnapshotSchema: z.ZodType<QuotesSnapshot> = z.lazy(() => QuotesSnapshotSchemaImpl)
const MetadataSnapshotSchema: z.ZodType<MetadataSnapshot> = z.lazy(() => MetadataSnapshotSchemaImpl)

const CacheDataSchema = z.object({
  last_daily_snapshot: DailySnapshotSchema.optional(),
  last_quotes_snapshot: QuotesSnapshotSchema.optional(),
  last_metadata: MetadataSnapshotSchema.optional()
})

export const UserStateSchema = z.object({
  schema_version: z.string(),
  watchlist: z.array(z.string().max(10).regex(/^[A-Z0-9.-]+$/)),
  holdings: z.record(z.string(), HoldingDataSchema),
  settings: UserSettingsSchema,
  cache: CacheDataSchema,
  diagnostics: DiagnosticsDataSchema
})

// ============================================================================
// Quote Data Validation Schemas
// ============================================================================

const QuoteItemSchema = z.object({
  symbol: z.string().max(10).regex(/^[A-Z0-9.-]+$/),
  price_usd: z.number().nullable(),
  price_type: PriceType,
  market_state: MarketState,
  is_delayed: z.boolean(),
  stale_level: StaleLevel,
  error: z.string().nullable(),
  change_percent: z.number().optional(),
  volume: z.number().nonnegative().optional()
})

const QuotesMetadataSchema = z.object({
  total_symbols: z.number().nonnegative(),
  successful_updates: z.number().nonnegative(),
  failed_updates: z.number().nonnegative(),
  average_delay_minutes: z.number().nonnegative().optional(),
  next_update: DateTimeString.optional()
})

const QuotesSnapshotSchemaImpl = z.object({
  as_of: DateTimeString,
  provider: z.string(),
  market_session: z.string().optional(),
  items: z.array(QuoteItemSchema),
  metadata: QuotesMetadataSchema.optional()
})

// ============================================================================
// Daily Snapshot Validation Schemas
// ============================================================================

const NewsItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  published_at: DateTimeString,
  source: z.string().min(1),
  summary: z.string().optional()
})

const SymbolDataSchema = z.object({
  symbol: z.string().max(10).regex(/^[A-Z0-9.-]+$/),
  short_brief_zh: z.string(),
  brief_truncated: z.boolean(),
  brief_source: BriefSource,
  news_top10: z.array(NewsItemSchema),
  news_insufficient: z.boolean(),
  gaps: z.array(z.string())
})

const MarketsIndicatorSchema = z.object({
  id: z.string().min(1),
  value: z.number().nullable(),
  as_of: DateTimeString,
  source_name: z.string().min(1),
  quality_flag: QualityFlag
})

const MacroDataSchema = z.object({
  items: z.array(MarketsIndicatorSchema).length(10, 'Must have exactly 10 markets indicators')
})

const GenerationMetadataSchema = z.object({
  total_processing_time_ms: z.number().nonnegative(),
  news_sources_attempted: z.number().nonnegative(),
  news_sources_successful: z.number().nonnegative(),
  total_articles_collected: z.number().nonnegative(),
  articles_after_deduplication: z.number().nonnegative(),
  llm_brief_generation_success_rate: z.number().min(0).max(1),
  macro_indicators_updated: z.number().nonnegative(),
  macro_indicators_failed: z.number().nonnegative()
})

const DailySnapshotSchemaImpl = z.object({
  as_of_date_taipei: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generated_at_utc: DateTimeString,
  universe: z.array(z.string()).length(10, 'Universe must have exactly 10 symbols'),
  per_symbol: z.array(SymbolDataSchema).length(10, 'Must have data for exactly 10 symbols'),
  macro: MacroDataSchema,
  generation_metadata: GenerationMetadataSchema.optional()
})

// ============================================================================
// Metadata Validation Schemas
// ============================================================================

const SymbolMetadataSchema = z.object({
  symbol: z.string().max(10).regex(/^[A-Z0-9.-]+$/),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  confidence: ConfidenceLevel,
  sources: z.array(z.string()).min(1),
  last_verified_at: DateTimeString,
  market_cap_category: z.string().optional(),
  exchange: z.string().optional()
})

const ConfidenceDistributionSchema = z.object({
  high_confidence_0_90: z.number().nonnegative(),
  medium_confidence_0_75: z.number().nonnegative(),
  low_confidence_0_50: z.number().nonnegative()
})

const RefreshMetadataSchema = z.object({
  last_refresh_duration_ms: z.number().nonnegative(),
  symbols_updated: z.number().nonnegative(),
  symbols_failed: z.number().nonnegative(),
  confidence_improvements: z.number().nonnegative(),
  new_sources_added: z.number().nonnegative()
})

const MetadataSnapshotSchemaImpl = z.object({
  ttl_days: z.number().positive(),
  as_of: DateTimeString,
  next_refresh: DateTimeString.optional(),
  items: z.array(SymbolMetadataSchema).length(10, 'Must have metadata for exactly 10 symbols'),
  industry_grouping: z.record(z.string(), z.array(z.string())).optional(),
  confidence_distribution: ConfidenceDistributionSchema.optional(),
  data_sources: z.record(z.string(), z.number().nonnegative()).optional(),
  refresh_metadata: RefreshMetadataSchema.optional()
})

// ============================================================================
// System Status Validation Schemas
// ============================================================================

const JobStatusSchema = z.object({
  last_run: DateTimeString,
  next_run: DateTimeString,
  status: JobStatusType,
  duration_ms: z.number().nonnegative(),
  symbols_updated: z.number().nonnegative().optional(),
  symbols_processed: z.number().nonnegative().optional(),
  errors: z.array(z.string()),
  provider: z.string().optional()
})

const FreshnessInfoSchema = z.object({
  age_minutes: z.number().nonnegative().optional(),
  age_hours: z.number().nonnegative().optional(),
  age_days: z.number().nonnegative().optional(),
  staleness: StaleLevel
})

const QuotaInfoSchema = z.object({
  used_minutes: z.number().nonnegative(),
  total_minutes: z.number().nonnegative(),
  reset_date: z.string() // Just a date string, not datetime
})

const StorageInfoSchema = z.object({
  data_files_mb: z.number().nonnegative(),
  total_repo_mb: z.number().nonnegative()
})

const ApiLimitInfoSchema = z.object({
  calls_today: z.number().nonnegative(),
  daily_limit: z.number().nonnegative(),
  reset_time: DateTimeString
})

const SystemHealthSchema = z.object({
  github_actions_quota: QuotaInfoSchema.optional(),
  storage_usage: StorageInfoSchema.optional(),
  api_limits: z.record(z.string(), ApiLimitInfoSchema).optional()
})

const DegradationStatusSchema = z.object({
  enabled: z.boolean(),
  active_fallbacks: z.array(z.string()),
  cache_hits_last_hour: z.number().nonnegative()
})

export const SystemStatusSchema = z.object({
  description: z.string(),
  last_updated: DateTimeString,
  system_status: SystemStatusType,
  jobs: z.record(z.string(), JobStatusSchema),
  data_freshness: z.record(z.string(), FreshnessInfoSchema),
  system_health: SystemHealthSchema,
  degradation_status: DegradationStatusSchema
})

// ============================================================================
// Configuration Validation Schemas
// ============================================================================

const ValidationRulesSchema = z.object({
  max_length: z.number().positive(),
  allowed_chars: z.string(),
  case_sensitive: z.boolean()
})

export const UniverseConfigSchema = z.object({
  description: z.string(),
  version: z.string(),
  last_updated: z.string(),
  symbols: z.array(z.string().max(10).regex(/^[A-Z0-9.-]+$/)).length(10, 'Universe must have exactly 10 symbols'),
  validation: ValidationRulesSchema
})

const MarketsIndicatorDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  scrape_only: z.boolean(),
  data_source: z.string().min(1),
  update_frequency: z.string().min(1),
  unit: z.string().min(1)
})

const ScrapingSettingsSchema = z.object({
  default_enabled: z.boolean(),
  timeout_seconds: z.number().positive(),
  retry_attempts: z.number().nonnegative(),
  user_agent: z.string().min(1)
})

export const MarketsIndicatorConfigSchema = z.object({
  description: z.string(),
  version: z.string(),
  last_updated: z.string(),
  indicators: z.array(MarketsIndicatorDefinitionSchema).length(10, 'Must have exactly 10 markets indicators'),
  scraping_settings: ScrapingSettingsSchema
})

// ============================================================================
// Validation Utility Functions
// ============================================================================

export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          details: error.errors
        }
      }
    }
    return {
      success: false,
      error: {
        message: 'Unknown validation error',
        details: { error: String(error) }
      }
    }
  }
}

export function validateUserState(data: unknown): ValidationResult<UserState> {
  return validateData(UserStateSchema, data)
}

export function validateQuotesSnapshot(data: unknown): ValidationResult<QuotesSnapshot> {
  return validateData(QuotesSnapshotSchema, data)
}

export function validateDailySnapshot(data: unknown): ValidationResult<DailySnapshot> {
  return validateData(DailySnapshotSchema, data)
}

export function validateMetadataSnapshot(data: unknown): ValidationResult<MetadataSnapshot> {
  return validateData(MetadataSnapshotSchema, data)
}

export function validateSystemStatus(data: unknown): ValidationResult<SystemStatus> {
  return validateData(SystemStatusSchema, data)
}

export function validateUniverseConfig(data: unknown): ValidationResult<UniverseConfig> {
  return validateData(UniverseConfigSchema, data)
}

export function validateMarketsIndicatorConfig(data: unknown): ValidationResult<MarketsIndicatorConfig> {
  return validateData(MarketsIndicatorConfigSchema, data)
}

// ============================================================================
// Symbol Validation Functions
// ============================================================================

export function validateSymbolFormat(symbol: string): boolean {
  const symbolSchema = z.string().max(10).regex(/^[A-Z0-9.-]+$/)
  const trimmedSymbol = symbol.trim()
  // Check if symbol was already trimmed (no leading/trailing spaces)
  if (trimmedSymbol !== symbol) return false
  return symbolSchema.safeParse(trimmedSymbol).success
}

export function validateSymbolInUniverse(symbol: string, universe: string[]): boolean {
  return universe.includes(symbol.toUpperCase())
}

export function validateNoDuplicateSymbol(symbol: string, existingSymbols: string[]): boolean {
  const normalizedSymbol = symbol.toUpperCase()
  const normalizedExisting = existingSymbols.map(s => s.toUpperCase())
  return !normalizedExisting.includes(normalizedSymbol)
}

export function validateHoldingsCost(cost: number): ValidationResult<number> {
  const costSchema = z.number().positive()
  const result = costSchema.safeParse(cost)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return {
      success: false,
      error: {
        message: 'Cost must be positive',
        details: result.error.errors
      }
    }
  }
}

// ============================================================================
// Import/Export Validation
// ============================================================================

export function validateImportFileSize(file: File): ValidationResult<File> {
  const maxSizeBytes = 256 * 1024 // 256KB
  if (file.size > maxSizeBytes) {
    return {
      success: false,
      error: {
        message: `File size ${Math.round(file.size / 1024)}KB exceeds maximum of 256KB`,
        code: 'FILE_TOO_LARGE'
      }
    }
  }
  return { success: true, data: file }
}

export function validateImportData(data: unknown): ValidationResult<UserState> {
  // First check if it's a valid object with known top-level keys
  const allowedKeys = ['schema_version', 'watchlist', 'holdings', 'settings', 'cache', 'diagnostics']
  
  if (typeof data !== 'object' || data === null) {
    return {
      success: false,
      error: {
        message: 'Import data must be a valid JSON object',
        code: 'INVALID_FORMAT'
      }
    }
  }
  
  const dataKeys = Object.keys(data as object)
  const unknownKeys = dataKeys.filter(key => !allowedKeys.includes(key))
  
  if (unknownKeys.length > 0) {
    return {
      success: false,
      error: {
        message: `Unknown keys found: ${unknownKeys.join(', ')}`,
        code: 'UNKNOWN_KEYS',
        details: { unknownKeys }
      }
    }
  }
  
  // Then validate the full schema
  return validateUserState(data)
}