/**
 * TypeScript interfaces for Investment Dashboard data contracts
 * Based on design document specifications
 */

// ============================================================================
// User State Models
// ============================================================================

export interface UserState {
  schema_version: string
  watchlist: string[] // Subset of Universe symbols
  holdings: Record<string, HoldingData>
  settings: UserSettings
  cache: CacheData
  diagnostics: DiagnosticsData
}

export interface HoldingData {
  avg_cost_usd: number
  shares?: number // Optional for future use
}

export interface UserSettings {
  scraping_enabled: boolean
  degradation_enabled: boolean
  ga_enabled: boolean
  clarity_enabled: boolean
}

export interface CacheData {
  last_daily_snapshot?: DailySnapshot
  last_quotes_snapshot?: QuotesSnapshot
  last_metadata?: MetadataSnapshot
}

export interface DiagnosticsData {
  last_import_result?: ImportResult
}

export interface ImportResult {
  timestamp: string
  success: boolean
  error?: string
  changes_applied: number
  dry_run: boolean
}

// ============================================================================
// Quote Data Models
// ============================================================================

export interface QuotesSnapshot {
  as_of: string // ISO timestamp with timezone
  provider: string
  market_session?: string
  items: QuoteItem[]
  metadata?: QuotesMetadata
}

export interface QuoteItem {
  symbol: string
  price_usd: number | null
  price_type: 'latest' | 'close' | 'last_known' | 'after_hours'
  market_state: 'open' | 'closed' | 'pre' | 'post' | null
  is_delayed: boolean
  stale_level: 'fresh' | 'stale' | 'very_stale'
  error: string | null
  change_percent?: number
  change_amount?: number
  volume?: number
  close_price?: number
  after_hours_price?: number | null
  after_hours_change_percent?: number | null
  after_hours_change_amount?: number | null
}

export interface QuotesMetadata {
  total_symbols: number
  successful_updates: number
  failed_updates: number
  average_delay_minutes?: number
  next_update?: string
}

// ============================================================================
// Daily Snapshot Models
// ============================================================================

export interface DailySnapshot {
  as_of_date_taipei: string // YYYY-MM-DD
  generated_at_utc: string
  universe: string[]
  per_symbol: SymbolData[]
  macro: MacroData
  generation_metadata?: GenerationMetadata
}

export interface SymbolData {
  symbol: string
  short_brief_zh: string
  brief_truncated: boolean
  brief_source: 'llm' | 'fallback'
  news_top10: NewsItem[]
  news_insufficient: boolean
  gaps: string[]
}

export interface NewsItem {
  title: string
  url: string
  published_at: string
  source: string
  summary?: string
}

export interface MacroData {
  items: MarketsIndicator[] // Exactly 10 items
}

export interface MarketsIndicator {
  id: string
  value: number | null
  as_of: string
  source_name: string
  quality_flag: 'good' | 'stale' | 'degraded' | 'disabled_scrape'
}

export interface GenerationMetadata {
  total_processing_time_ms: number
  news_sources_attempted: number
  news_sources_successful: number
  total_articles_collected: number
  articles_after_deduplication: number
  llm_brief_generation_success_rate: number
  macro_indicators_updated: number
  macro_indicators_failed: number
}

// ============================================================================
// Metadata Models
// ============================================================================

export interface MetadataSnapshot {
  ttl_days: number
  as_of: string
  next_refresh?: string
  items: SymbolMetadata[]
  industry_grouping?: Record<string, string[]>
  confidence_distribution?: ConfidenceDistribution
  data_sources?: Record<string, number>
  refresh_metadata?: RefreshMetadata
}

export interface SymbolMetadata {
  symbol: string
  sector: string | null
  industry: string | null
  confidence: 0.50 | 0.75 | 0.90 // Specific confidence levels
  sources: string[]
  last_verified_at: string
  market_cap_category?: string
  exchange?: string
}

export interface ConfidenceDistribution {
  high_confidence_0_90: number
  medium_confidence_0_75: number
  low_confidence_0_50: number
}

export interface RefreshMetadata {
  last_refresh_duration_ms: number
  symbols_updated: number
  symbols_failed: number
  confidence_improvements: number
  new_sources_added: number
}

// ============================================================================
// System Status Models
// ============================================================================

export interface SystemStatus {
  description: string
  last_updated: string
  system_status: 'operational' | 'degraded' | 'maintenance' | 'outage'
  jobs: Record<string, JobStatus>
  data_freshness: Record<string, FreshnessInfo>
  system_health: SystemHealth
  degradation_status: DegradationStatus
}

export interface JobStatus {
  last_run: string
  next_run: string
  status: 'success' | 'failed' | 'running' | 'pending'
  duration_ms: number
  symbols_updated?: number
  symbols_processed?: number
  errors: string[]
  provider?: string
}

export interface FreshnessInfo {
  age_minutes?: number
  age_hours?: number
  age_days?: number
  staleness: 'fresh' | 'stale' | 'very_stale'
}

export interface SystemHealth {
  github_actions_quota?: QuotaInfo
  storage_usage?: StorageInfo
  api_limits?: Record<string, ApiLimitInfo>
}

export interface QuotaInfo {
  used_minutes: number
  total_minutes: number
  reset_date: string
}

export interface StorageInfo {
  data_files_mb: number
  total_repo_mb: number
}

export interface ApiLimitInfo {
  calls_today: number
  daily_limit: number
  reset_time: string
}

export interface DegradationStatus {
  enabled: boolean
  active_fallbacks: string[]
  cache_hits_last_hour: number
}

// ============================================================================
// Configuration Models
// ============================================================================

export interface UniverseConfig {
  description: string
  version: string
  last_updated: string
  symbols: string[]
  validation: ValidationRules
}

export interface ValidationRules {
  max_length: number
  allowed_chars: string
  case_sensitive: boolean
}

export interface MarketsIndicatorConfig {
  description: string
  version: string
  last_updated: string
  indicators: MarketsIndicatorDefinition[]
  scraping_settings: ScrapingSettings
}

export interface MarketsIndicatorDefinition {
  id: string
  name: string
  description: string
  scrape_only: boolean
  data_source: string
  update_frequency: string
  unit: string
}

export interface ScrapingSettings {
  default_enabled: boolean
  timeout_seconds: number
  retry_attempts: number
  user_agent: string
}

export interface NewsSourcesConfig {
  description: string
  version: string
  last_updated: string
  sources: NewsSource[]
  collection_settings: CollectionSettings
}

export interface NewsSource {
  id: string
  name: string
  rss_url: string
  enabled: boolean
  priority: number
  language: string
  update_frequency: string
  max_articles: number
  note?: string
}

export interface CollectionSettings {
  total_max_articles: number
  deduplication: DeduplicationSettings
  content_filtering: ContentFilteringSettings
  timeout_seconds: number
  retry_attempts: number
}

export interface DeduplicationSettings {
  enabled: boolean
  similarity_threshold: number
  fields: string[]
}

export interface ContentFilteringSettings {
  min_title_length: number
  max_title_length: number
  blocked_keywords: string[]
  required_keywords: string[]
}

export interface WishConfig {
  description: string
  version: string
  last_updated: string
  wish_channel: WishChannel
  alternative_channels: WishChannel[]
  validation: ValidationRules
  ui_settings: WishUISettings
}

export interface WishChannel {
  type: string
  url_template: string
  button_text: string
  description: string
  enabled?: boolean
}

export interface WishUISettings {
  show_alternative_channels: boolean
  confirmation_message: string
  modal_title: string
  modal_description: string
}

export interface VersionConfig {
  description: string
  version: string
  build_date: string
  commit_hash: string
  branch: string
  environment: string
  build_number: number
  features: Record<string, boolean>
  api_endpoints: ApiEndpoints
}

export interface ApiEndpoints {
  config_base: string
  data_base: string
  static_hosting: boolean
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  error?: ValidationError
}

export interface ValidationError {
  message: string
  field?: string
  code?: string
  details?: Record<string, any>
}

// ============================================================================
// Utility Types
// ============================================================================

export type StaleLevel = 'fresh' | 'stale' | 'very_stale'
export type MarketState = 'open' | 'closed' | 'pre' | 'post'
export type PriceType = 'latest' | 'close' | 'last_known'
export type BriefSource = 'llm' | 'fallback'
export type QualityFlag = 'good' | 'stale' | 'degraded' | 'disabled_scrape'
export type ConfidenceLevel = 0.50 | 0.75 | 0.90
export type SystemStatusType = 'operational' | 'degraded' | 'maintenance' | 'outage'
export type JobStatusType = 'success' | 'failed' | 'running' | 'pending'