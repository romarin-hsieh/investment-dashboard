# Implementation Plan: YFinance Technical Indicators

## Overview

This implementation plan extends the existing Technical Indicators system with 6 additional yfinance-based indicators. The approach leverages the existing infrastructure (GitHub Actions, JSON data files, hybrid API) while adding new data sources and UI elements. The implementation is designed to be non-breaking and gracefully degrade when data is unavailable.

## Tasks

- [x] 1. Enhance Python data generation core
  - Extend yfinance_indicators_core.py with volume and beta calculations
  - Implement completed trading day logic with conservative date handling
  - Add comprehensive error handling and logging
  - _Requirements: 4.1, 4.2, 4.5, 7.1, 7.4_

- [x] 1.1 Write property test for completed trading day logic
  - **Property 5: Completed trading day data integrity**
  - **Validates: Requirements 4.1, 4.2, 4.5**

- [x] 1.2 Write property test for five-day average calculations
  - **Property 6: Five-day average calculation accuracy**
  - **Validates: Requirements 4.3**

- [ ] 2. Update data generation workflow
  - Modify generate-yfinance-indicators.py to merge data into existing technical-indicators JSON
  - Update latest_index.json with yfinance indicator metadata
  - Implement 30-day file retention policy
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2.1 Write property test for data generation completeness
  - **Property 7: Data generation completeness**
  - **Validates: Requirements 5.1, 5.4**

- [ ] 2.2 Write property test for file retention policy
  - **Property 8: File retention policy compliance**
  - **Validates: Requirements 5.3**

- [ ] 3. Enhance GitHub Actions workflow
  - Update daily-data-update.yml to include yfinance indicators generation
  - Add status.json updates with yfinance generation timestamps
  - Implement error handling for workflow failures
  - _Requirements: 5.5, 8.1, 8.2_

- [ ] 3.1 Write unit tests for workflow status updates
  - Test status.json update accuracy and timestamp formatting
  - _Requirements: 5.5, 8.2_

- [ ] 4. Checkpoint - Verify data generation pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Extend frontend data access layer
  - Enhance hybridTechnicalIndicatorsAPI to merge yfinance data from indicators.yf block
  - Implement session-based caching for yfinance data
  - Add cache busting logic for data updates
  - _Requirements: 6.1, 6.4, 6.5_

- [ ] 5.1 Write property test for session caching behavior
  - **Property 10: Session-based caching efficiency**
  - **Validates: Requirements 6.1, 6.4**

- [ ] 5.2 Write property test for non-regression guarantee
  - **Property 13: Non-regression guarantee**
  - **Validates: Requirements 6.5**

- [ ] 6. Update TechnicalIndicators.vue component
  - Enable conditional rendering for yfinance indicators (already implemented)
  - Implement specialized formatting functions for volume, market cap, and beta
  - Add error handling for missing yfinance data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6.1 Write property test for volume indicators display
  - **Property 1: Volume indicators display completeness**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 6.2 Write property test for market cap formatting
  - **Property 2: Market capitalization display formatting**
  - **Validates: Requirements 2.1, 2.2**

- [ ] 6.3 Write property test for beta coefficients display
  - **Property 3: Beta coefficients display completeness**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 6.4 Write property test for graceful degradation
  - **Property 4: Graceful degradation for missing data**
  - **Validates: Requirements 1.5, 2.3, 3.5, 6.2, 7.2, 7.3**

- [ ] 7. Implement comprehensive error handling
  - Add retry logic for network failures in frontend
  - Implement graceful degradation when yfinance data unavailable
  - Add error logging and user feedback mechanisms
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 7.1 Write property test for error handling resilience
  - **Property 11: Error handling resilience**
  - **Validates: Requirements 7.1, 7.4, 7.5**

- [ ] 8. Ensure data format consistency
  - Implement ISO 8601 timestamp formatting across all components
  - Add percentage rounding to 1 decimal place
  - Ensure null values for incomplete data rather than empty strings
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8.1 Write property test for data format consistency
  - **Property 12: Data format consistency**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 9. Integration testing and validation
  - Test complete data flow from generation to display
  - Verify compatibility with existing technical indicators
  - Test performance impact of new indicators
  - _Requirements: 4.4, 6.3, 6.5_

- [ ] 9.1 Write integration tests for complete data pipeline
  - Test end-to-end flow from yfinance API to UI display
  - _Requirements: 4.4, 6.3_

- [ ] 10. Final checkpoint - Comprehensive system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation leverages existing infrastructure to minimize breaking changes
- All new indicators gracefully degrade when data is unavailable
- The design maintains full compatibility with existing 12 technical indicators