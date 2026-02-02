# TypeScript Types and Data Models

This directory contains comprehensive TypeScript interfaces and Zod validation schemas for the Investment Dashboard application.

## Overview

The type system provides:
- **Type Safety**: Complete TypeScript interfaces for all data contracts
- **Runtime Validation**: Zod schemas for data validation at runtime
- **Import/Export Safety**: Validation for user data import/export operations
- **API Contract Enforcement**: Ensures data consistency across the application

## Type Categories

### User State Models
- `UserState`: Complete user application state
- `HoldingData`: Individual stock holding information
- `UserSettings`: User preferences and toggles
- `ImportResult`: Import operation results

### Market Data Models
- `QuotesSnapshot`: Real-time stock price data
- `DailySnapshot`: Daily news, briefs, and macro data
- `MetadataSnapshot`: Stock industry/sector classifications
- `SystemStatus`: System health and job status

### Configuration Models
- `UniverseConfig`: Stock symbol allowlist configuration
- `MacroIndicatorConfig`: Macro economic indicator definitions
- `NewsSourcesConfig`: RSS feed source configurations
- `WishConfig`: External wish channel configuration

## Validation Features

### Symbol Validation
```typescript
// Format validation: trimmed, ≤10 chars, [A-Z0-9.-]
validateSymbolFormat(symbol: string): boolean

// Universe allowlist validation
validateSymbolInUniverse(symbol: string, universe: string[]): boolean

// Duplicate detection (case-insensitive)
validateNoDuplicateSymbol(symbol: string, existing: string[]): boolean
```

### Data Validation
```typescript
// Validate complete user state
validateUserState(data: unknown): ValidationResult<UserState>

// Validate market data snapshots
validateQuotesSnapshot(data: unknown): ValidationResult<QuotesSnapshot>
validateDailySnapshot(data: unknown): ValidationResult<DailySnapshot>
validateMetadataSnapshot(data: unknown): ValidationResult<MetadataSnapshot>
```

### Import/Export Validation
```typescript
// File size validation (≤256KB)
validateImportFileSize(file: File): ValidationResult<File>

// Schema validation with unknown key detection
validateImportData(data: unknown): ValidationResult<UserState>
```

## Usage Examples

### Basic Validation
```typescript
import { validateUserState } from '@/utils/validation'

const userData = {
  schema_version: '1.0.0',
  watchlist: ['ONDS', 'PL'],
  holdings: { 'ONDS': { avg_cost_usd: 42.85 } },
  settings: { /* ... */ },
  cache: {},
  diagnostics: {}
}

const result = validateUserState(userData)
if (result.success) {
  console.log('Valid user state:', result.data)
} else {
  console.error('Validation failed:', result.error)
}
```

### Symbol Validation
```typescript
import { validateSymbolFormat, validateSymbolInUniverse } from '@/utils/validation'

const symbol = 'ONDS'
const universe = ['ONDS', 'PL', 'RKLB', /* ... */]

if (validateSymbolFormat(symbol) && validateSymbolInUniverse(symbol, universe)) {
  console.log('Valid symbol')
}
```

### Holdings Cost Validation
```typescript
import { validateHoldingsCost } from '@/utils/validation'

const result = validateHoldingsCost(42.85)
if (result.success) {
  console.log('Valid cost:', result.data)
} else {
  console.error('Invalid cost:', result.error.message)
}
```

## Error Handling

All validation functions return a `ValidationResult<T>` type:

```typescript
interface ValidationResult<T = any> {
  success: boolean
  data?: T
  error?: ValidationError
}

interface ValidationError {
  message: string
  field?: string
  code?: string
  details?: Record<string, any>
}
```

## Requirements Validation

The validation system enforces all requirements from the specification:

- **Requirements 2.1-2.4**: Universe symbol validation
- **Requirements 5.4**: Import file validation
- **Requirements 8.2**: Schema compliance validation
- **Requirements 3.1**: Holdings cost validation

## Testing

Comprehensive test coverage includes:
- All data model validation
- Symbol format and universe validation
- Import/export validation
- Error handling scenarios
- Edge cases and boundary conditions

Run tests with:
```bash
npm test validation
```

## Type Safety Benefits

1. **Compile-time Safety**: TypeScript catches type errors during development
2. **Runtime Safety**: Zod validates data at runtime
3. **API Consistency**: Ensures data contracts are maintained
4. **Refactoring Safety**: Type system helps with safe code changes
5. **Documentation**: Types serve as living documentation