# Investment Dashboard Research Prompt

## Overview
This document contains the research methodology and prompt configuration used for generating daily investment briefs and market analysis.

## Brief Generation Strategy

### Chinese Brief Requirements
- **Length**: 50-100 Unicode characters
- **Language**: Traditional Chinese (繁體中文)
- **Tone**: Professional, objective, informative
- **Content Focus**: 
  - Recent price movement and key levels
  - Relevant news impact
  - Technical or fundamental highlights
  - Risk factors or opportunities

### Fallback Template
When LLM generation fails, the system uses a deterministic template:

```
{symbol} 股價 {price_change}，成交量 {volume_status}。
近期關注 {key_level} 支撐/阻力位。
```

## News Processing Guidelines

### Source Prioritization
1. **Tier 1**: Reuters, Bloomberg (highest credibility)
2. **Tier 2**: CNBC, MarketWatch (good coverage)  
3. **Tier 3**: Yahoo Finance, Seeking Alpha (supplementary)

### Content Filtering
- **Include**: Market-moving news, earnings, analyst updates, regulatory changes
- **Exclude**: Promotional content, opinion pieces without data backing
- **Deduplication**: Based on normalized title + date + source domain

## Macro Indicators Context

### Quality Flags
- **OK**: Fresh data from official source
- **APPROX**: Estimated or delayed official data  
- **DEGRADED**: Proxy indicator or stale data
- **DISABLED_SCRAPE**: Scraping disabled by user setting

### Scraping Strategy
- **Default**: Scraping OFF (respects website policies)
- **User Control**: Toggle available in Settings
- **Fallback**: Use last-known-good values when scraping disabled

## Risk Management

### Data Quality
- Always display data freshness timestamps
- Mark stale data with clear indicators
- Provide degraded service rather than complete failure
- Maintain last-known-good snapshots

### Content Safety
- Render all external content as text only (no HTML injection)
- Validate all URLs (http/https schemes only)
- Sanitize user inputs before processing
- No PII storage or transmission

## Version Information
- **Prompt Version**: 1.0.0
- **Last Updated**: 2025-01-22
- **Review Cycle**: Monthly or as needed for market changes

---

*This prompt configuration is designed for POC usage and may be updated based on performance metrics and user feedback.*