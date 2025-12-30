# Implementation Plan: Hash Router Widget Refresh Fix

## Overview

Convert the Hash Router widget refresh design into a series of incremental coding tasks that address component reuse and URL parameter consistency issues. Each task builds on previous work and focuses on minimal, surgical changes to avoid breaking existing functionality.

## Tasks

- [x] 1. Implement router-view key for forced component remounting
  - Update App.vue to use route.path as component key
  - Ensure path changes trigger complete component remount
  - Verify query-only changes don't cause unnecessary remounts
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ]* 1.1 Write property test for component remount behavior
  - **Property 2: Component Remount on Path Change**
  - **Validates: Requirements 1.2**

- [ ]* 1.2 Write property test for widget reinitialization
  - **Property 3: Widget Reinitialization on Remount**
  - **Validates: Requirements 1.3**

- [x] 2. Replace focus parameter handling with Vue Router queries
  - Identify all NavigationService.updateQueryParam calls for focus
  - Replace with Vue Router query manipulation in StockOverview.vue
  - Ensure focus parameters appear in hash router format
  - _Requirements: 2.1, 2.2, 2.5_

- [ ]* 2.1 Write property test for hash router query format
  - **Property 5: Hash Router Query Format Consistency**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 2.2 Write property test for focus parameter parsing
  - **Property 10: Focus Parameter Parsing Source**
  - **Validates: Requirements 5.1**

- [x] 3. Implement focus parameter cleanup on navigation
  - Add focus query cleanup when leaving stock-overview
  - Ensure focus doesn't leak to other pages
  - Handle cleanup in route guards or component lifecycle
  - _Requirements: 2.3_

- [ ]* 3.1 Write property test for focus parameter cleanup
  - **Property 6: Focus Parameter Cleanup**
  - **Validates: Requirements 2.3**

- [x] 4. Add NavigationService deprecation warnings
  - Mark updateQueryParam as deprecated for Hash Router usage
  - Add console warnings for Hash Router incompatible usage
  - Document migration path to Vue Router queries
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 4.1 Write unit tests for deprecation warnings
  - Test that deprecated methods show appropriate warnings
  - Verify warning messages are clear and actionable
  - _Requirements: 3.1_

- [ ] 5. Implement URL parameter migration utilities
  - Create utility to handle legacy URL format migration
  - Support both `?focus=X#/route` and `#/route?focus=X` formats
  - Ensure round-trip consistency for URL operations
  - _Requirements: 5.3, 5.4, 5.5_

- [ ]* 5.1 Write property test for URL parser migration compatibility
  - **Property 12: URL Parser Migration Compatibility**
  - **Validates: Requirements 5.3**

- [ ]* 5.2 Write property test for URL serializer format consistency
  - **Property 13: URL Serializer Format Consistency**
  - **Validates: Requirements 5.4**

- [ ]* 5.3 Write property test for URL parameter round-trip
  - **Property 14: URL Parameter Round-trip Consistency**
  - **Validates: Requirements 5.5**

- [x] 6. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement searchParams isolation safeguards
  - Ensure searchParams manipulation doesn't affect hash router queries
  - Add protective measures against accidental searchParams usage
  - Verify existing searchParams usage doesn't break hash router
  - _Requirements: 3.3_

- [ ]* 7.1 Write property test for searchParams isolation
  - **Property 7: SearchParams Isolation**
  - **Validates: Requirements 3.3**

- [ ] 8. Add backward compatibility for existing bookmarks
  - Handle legacy bookmark formats gracefully
  - Ensure existing URLs continue to work
  - Implement migration for old URL formats if needed
  - _Requirements: 4.1, 4.4_

- [ ]* 8.1 Write property test for bookmark compatibility
  - **Property 8: Bookmark Backward Compatibility**
  - **Validates: Requirements 4.1**

- [ ] 9. Optimize performance and API call efficiency
  - Monitor API call patterns during component remounting
  - Ensure remounting doesn't cause excessive API calls
  - Implement caching strategies if needed
  - _Requirements: 4.2, 4.3_

- [ ]* 9.1 Write property test for API call efficiency
  - **Property 9: API Call Efficiency**
  - **Validates: Requirements 4.3**

- [ ] 10. Add comprehensive integration tests
  - Test complete user flow: navigate → change URL → verify widget refresh
  - Test focus parameter behavior across page transitions
  - Test normal navigation behavior preservation
  - _Requirements: 1.4, 2.4_

- [ ]* 10.1 Write property test for navigation behavior preservation
  - **Property 4: Navigation Behavior Preservation**
  - **Validates: Requirements 1.4**

- [ ]* 10.2 Write property test for symbol change widget refresh
  - **Property 1: Symbol Change Widget Refresh**
  - **Validates: Requirements 1.1**

- [ ] 11. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and early problem detection
- Property tests validate universal correctness properties across many inputs
- Unit tests validate specific examples and edge cases
- Focus on surgical changes to minimize risk of breaking existing functionality