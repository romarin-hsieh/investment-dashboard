# Requirements Document

## Introduction

This feature extends the existing Technical Indicators display to include 6 additional yfinance-based indicators: Volume metrics, Market Cap, and Beta values. The implementation uses GitHub Actions to generate daily snapshots, avoiding CORS issues and browser-side yfinance calls while maintaining compatibility with the existing 12 indicators.

## Glossary

- **Technical_Indicators_Display**: The UI component showing technical analysis metrics for stocks
- **YFinance_Indicators**: The 6 new indicators sourced from yfinance API
- **Completed_Trading_Day**: The most recent trading day that has fully concluded
- **Volume_Metrics**: Trading volume and 5-day average volume indicators
- **Beta_Metrics**: Beta coefficients for 3-month, 1-year, and 5-year periods
- **GitHub_Actions_Pipeline**: Automated workflow that generates daily indicator snapshots
- **Summary_JSON**: Daily snapshot file containing all yfinance indicators for multiple symbols

## Requirements

### Requirement 1: Volume Indicators

**User Story:** As a trader, I want to see current volume metrics and trends, so that I can assess trading activity and liquidity.

#### Acceptance Criteria

1. WHEN displaying technical indicators, THE Technical_Indicators_Display SHALL show the last completed trading day volume
2. WHEN displaying volume data, THE Technical_Indicators_Display SHALL include percentage change versus the previous trading day
3. WHEN displaying technical indicators, THE Technical_Indicators_Display SHALL show 5-day average volume
4. WHEN displaying 5-day average volume, THE Technical_Indicators_Display SHALL include percentage change versus the previous 5-day period
5. WHEN volume data is unavailable, THE Technical_Indicators_Display SHALL display placeholder text "—"

### Requirement 2: Market Capitalization Display

**User Story:** As an investor, I want to see market capitalization data, so that I can understand the company's size and market value.

#### Acceptance Criteria

1. WHEN displaying technical indicators, THE Technical_Indicators_Display SHALL show current market capitalization
2. WHEN displaying market cap, THE Technical_Indicators_Display SHALL format values using appropriate units (K/M/B/T)
3. WHEN market cap data is unavailable, THE Technical_Indicators_Display SHALL display placeholder text "—"

### Requirement 3: Beta Coefficient Indicators

**User Story:** As a portfolio manager, I want to see beta coefficients for different time periods, so that I can assess systematic risk and correlation with market movements.

#### Acceptance Criteria

1. WHEN displaying technical indicators, THE Technical_Indicators_Display SHALL show 3-month beta coefficient
2. WHEN displaying technical indicators, THE Technical_Indicators_Display SHALL show 1-year beta coefficient  
3. WHEN displaying technical indicators, THE Technical_Indicators_Display SHALL show 5-year beta coefficient
4. WHEN displaying beta values, THE Technical_Indicators_Display SHALL format to 2 decimal places
5. WHEN beta data is unavailable, THE Technical_Indicators_Display SHALL display placeholder text "—"

### Requirement 4: Data Accuracy and Timing

**User Story:** As a trader, I want accurate and timely indicator data, so that I can make informed trading decisions.

#### Acceptance Criteria

1. WHEN generating volume indicators, THE GitHub_Actions_Pipeline SHALL use only completed trading days
2. WHEN determining completed trading days, THE GitHub_Actions_Pipeline SHALL use conservative logic to avoid intraday data
3. WHEN calculating 5-day averages, THE GitHub_Actions_Pipeline SHALL compare the most recent 5 trading days against the previous 5 trading days
4. WHEN displaying indicators, THE Technical_Indicators_Display SHALL include timestamp information showing data freshness
5. WHEN market is closed on weekends or holidays, THE GitHub_Actions_Pipeline SHALL use the last completed trading day

### Requirement 5: Data Generation and Storage

**User Story:** As a system administrator, I want automated data generation, so that indicators are updated daily without manual intervention.

#### Acceptance Criteria

1. WHEN the daily workflow runs, THE GitHub_Actions_Pipeline SHALL generate yfinance indicators for all universe symbols
2. WHEN generating data, THE GitHub_Actions_Pipeline SHALL create a single summary JSON file containing all symbols
3. WHEN storing data, THE GitHub_Actions_Pipeline SHALL maintain a 30-day retention policy for historical files
4. WHEN data generation fails for a symbol, THE GitHub_Actions_Pipeline SHALL record the failure in notes field
5. WHEN updating status, THE GitHub_Actions_Pipeline SHALL update the status.json file with generation timestamps

### Requirement 6: Frontend Integration and Performance

**User Story:** As a user, I want fast loading indicators, so that I can quickly access technical analysis data.

#### Acceptance Criteria

1. WHEN loading stock overview page, THE Technical_Indicators_Display SHALL fetch yfinance data only once per session
2. WHEN yfinance data is unavailable, THE Technical_Indicators_Display SHALL continue showing existing 12 indicators
3. WHEN displaying all indicators, THE Technical_Indicators_Display SHALL maintain consistent visual formatting
4. WHEN data is cached, THE Technical_Indicators_Display SHALL use version-based cache busting for updates
5. WHEN integrating new indicators, THE Technical_Indicators_Display SHALL preserve existing indicator functionality

### Requirement 7: Error Handling and Fallbacks

**User Story:** As a user, I want reliable indicator display, so that temporary data issues don't break the interface.

#### Acceptance Criteria

1. WHEN yfinance API is unavailable, THE GitHub_Actions_Pipeline SHALL log errors and continue with available data
2. WHEN summary JSON is missing, THE Technical_Indicators_Display SHALL show placeholders for new indicators only
3. WHEN individual symbol data is missing, THE Technical_Indicators_Display SHALL show "—" for that symbol's new indicators
4. WHEN beta calculation has insufficient data points, THE GitHub_Actions_Pipeline SHALL return null and record in notes
5. WHEN network requests fail, THE Technical_Indicators_Display SHALL retry once before showing fallback content

### Requirement 8: Data Schema and Format Consistency

**User Story:** As a developer, I want consistent data formats, so that the frontend can reliably parse and display indicators.

#### Acceptance Criteria

1. WHEN generating summary JSON, THE GitHub_Actions_Pipeline SHALL include exchange timezone information
2. WHEN storing timestamps, THE GitHub_Actions_Pipeline SHALL use ISO 8601 format with timezone offsets
3. WHEN formatting percentage changes, THE GitHub_Actions_Pipeline SHALL round to 1 decimal place
4. WHEN storing beta coefficients, THE GitHub_Actions_Pipeline SHALL include benchmark symbol reference
5. WHEN data is incomplete, THE GitHub_Actions_Pipeline SHALL use null values rather than empty strings