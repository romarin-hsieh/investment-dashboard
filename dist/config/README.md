# Configuration Files

This directory contains static JSON configuration files for the Investment Dashboard POC.

## Files Overview

### `universe.json`
- **Purpose**: Defines the fixed list of 10 trackable stock symbols
- **Symbols**: ONDS, PL, RKLB, ASTS, RIVN, MDB, ORCL, TSM, AVAV, RDW
- **Validation**: Symbol format rules and constraints
- **Requirements**: 2.1, 2.2, 2.3, 2.4

### `macro_indicators.json`
- **Purpose**: Configuration for 10 macro economic indicators
- **Features**: Scrape-only flags, data sources, update frequencies
- **Indicators**: S&P 500, NASDAQ, VIX, Treasury yields, DXY, Gold, Oil, Bitcoin, Unemployment, Fed Funds Rate
- **Requirements**: 6.5

### `news_sources.json`
- **Purpose**: RSS feed configurations for financial news collection
- **Sources**: Reuters, Bloomberg, CNBC, MarketWatch, Yahoo Finance, Seeking Alpha
- **Features**: Deduplication settings, content filtering, priority levels
- **Requirements**: 6.4

### `wish.json`
- **Purpose**: External wish channel for non-Universe symbol requests
- **Channel**: GitHub Issues integration
- **Features**: URL templates, validation rules, UI settings
- **Requirements**: 2.2, 2.5

### `version.json`
- **Purpose**: Build metadata and version information
- **Content**: Commit hash, build date, feature flags, API endpoints
- **Generated**: Automatically during build process
- **Requirements**: 5.3

## Usage

These configuration files are:
- Served statically via GitHub Pages
- Fetched by the frontend application at runtime
- Used to configure system behavior without code changes
- Validated by automated tests

## Modification

To modify configurations:
1. Edit the JSON files directly
2. Run tests to validate: `npm test`
3. Commit changes to trigger deployment
4. Configuration takes effect immediately after deployment

## Security

- No sensitive information stored in configuration files
- All URLs use HTTPS schemes only
- Input validation applied to all user-provided data
- Content Security Policy enforced