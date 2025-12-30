# Design Document

## Overview

This design addresses two critical issues in the Hash Router + TradingView widget integration:
1. Manual URL symbol changes not refreshing widget content due to Vue component reuse
2. Incorrect focus query parameter placement causing URL inconsistency and cross-page leakage

The solution uses minimal, surgical changes to force component remounting and correct query parameter handling while maintaining backward compatibility.

## Architecture

### Current Problem Architecture

```
User changes URL: #/symbols/NVDA → #/symbols/ONDS
         ↓
Vue Router detects route change (same component, different params)
         ↓
StockDetail component is REUSED (not remounted)
         ↓
TradingView widgets remain with old symbol (NVDA)
         ↓
Only reactive header updates, widgets show stale data
```

### Proposed Solution Architecture

```
User changes URL: #/symbols/NVDA → #/symbols/ONDS
         ↓
Vue Router with route.path key detects path change
         ↓
StockDetail component is DESTROYED and RECREATED
         ↓
All TradingView widgets reinitialize with new symbol (ONDS)
         ↓
Complete page refresh with correct data
```

## Components and Interfaces

### 1. App.vue Router View Enhancement

**Current Implementation:**
```vue
<router-view />
```

**New Implementation:**
```vue
<router-view v-slot="{ Component, route }">
  <component :is="Component" :key="route.path" />
</router-view>
```

**Key Design Decision:** Use `route.path` as key instead of full route object to avoid unnecessary remounts on query-only changes.

### 2. StockOverview Focus Parameter Handling

**Current Implementation:**
```javascript
// Uses window.location.search manipulation
navigationService.updateQueryParam(symbol)
// Results in: ?focus=ONDS#/stock-overview
```

**New Implementation:**
```javascript
// Uses Vue Router hash query
this.$router.replace({
  query: { ...this.$route.query, focus: symbol }
})
// Results in: #/stock-overview?focus=ONDS
```

### 3. NavigationService Deprecation Strategy

**Approach:** Mark existing methods as deprecated rather than breaking changes.

```javascript
// Add deprecation warnings
updateQueryParam(key, value) {
  console.warn('DEPRECATED: updateQueryParam() should not be used with Hash Router. Use Vue Router query instead.');
  // Existing implementation for backward compatibility
}
```

## Data Models

### URL State Model

```typescript
interface URLState {
  path: string;           // e.g., "/stock-overview/symbols/NVDA"
  hashQuery: {           // Query parameters within hash
    focus?: string;      // e.g., "ONDS"
    [key: string]: any;
  };
  searchParams: {        // Legacy search parameters (to be avoided)
    [key: string]: any;
  };
}
```

### Component Lifecycle Model

```typescript
interface ComponentLifecycle {
  // Before fix: Component reuse
  onRouteChange: 'REUSE_COMPONENT' | 'REMOUNT_COMPONENT';
  
  // After fix: Forced remount on path change
  remountTrigger: 'route.path' | 'route.fullPath' | 'none';
  
  // Widget refresh behavior
  widgetRefresh: 'AUTOMATIC' | 'MANUAL' | 'NONE';
}
```

## Error Handling

### 1. Widget Loading Failures

```javascript
// Enhanced error handling in widget components
async loadWidget() {
  try {
    await this.initializeTradingViewWidget();
  } catch (error) {
    console.error('Widget loading failed:', error);
    // Graceful fallback or retry logic
    this.showFallbackContent = true;
  }
}
```

### 2. URL Parameter Migration

```javascript
// Handle legacy URL formats during transition
function migrateLegacyURL(url) {
  // Convert ?focus=X#/route to #/route?focus=X
  const urlObj = new URL(url);
  if (urlObj.searchParams.has('focus') && urlObj.hash) {
    const focus = urlObj.searchParams.get('focus');
    urlObj.searchParams.delete('focus');
    // Add to hash query instead
    const hashUrl = new URL(urlObj.hash.substring(1), window.location.origin);
    hashUrl.searchParams.set('focus', focus);
    return `${urlObj.origin}${urlObj.pathname}#${hashUrl.pathname}${hashUrl.search}`;
  }
  return url;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Symbol Change Widget Refresh
*For any* valid symbol pair (oldSymbol, newSymbol), when the URL changes from `/symbols/oldSymbol` to `/symbols/newSymbol`, all TradingView widgets should reload and display data for newSymbol
**Validates: Requirements 1.1**

### Property 2: Component Remount on Path Change  
*For any* URL symbol parameter change, the StockDetail component should remount completely (destroy then recreate)
**Validates: Requirements 1.2**

### Property 3: Widget Reinitialization on Remount
*For any* component remount operation, all widgets should reinitialize with the correct symbol configuration from the new route
**Validates: Requirements 1.3**

### Property 4: Navigation Behavior Preservation
*For any* normal navigation operation (clicking links), the behavior should remain identical to pre-fix behavior
**Validates: Requirements 1.4**

### Property 5: Hash Router Query Format Consistency
*For any* symbol click in stock overview, the focus parameter should appear in format `#/stock-overview?focus=SYMBOL` and never as `?focus=SYMBOL#/route`
**Validates: Requirements 2.1, 2.2**

### Property 6: Focus Parameter Cleanup
*For any* navigation away from stock-overview page, focus query parameters should be automatically cleared from the URL
**Validates: Requirements 2.3**

### Property 7: SearchParams Isolation
*For any* searchParams manipulation operation, hash router query parameters should remain unaffected
**Validates: Requirements 3.3**

### Property 8: Bookmark Backward Compatibility
*For any* existing bookmark URL format, the system should continue to work correctly after the fix
**Validates: Requirements 4.1**

### Property 9: API Call Efficiency
*For any* component remount operation, the number of API calls should not exceed the number required for initial page load
**Validates: Requirements 4.3**

### Property 10: Focus Parameter Parsing Source
*For any* focus parameter parsing operation, the system should read from hash router query and never from searchParams
**Validates: Requirements 5.1**

### Property 11: Focus State Serialization Format
*For any* focus state serialization operation, the output should always use hash router query format `#/route?focus=X`
**Validates: Requirements 5.2**

### Property 12: URL Parser Migration Compatibility
*For any* URL in legacy format `?focus=X#/route` or correct format `#/route?focus=X`, the parser should extract the focus parameter correctly
**Validates: Requirements 5.3**

### Property 13: URL Serializer Format Consistency
*For any* URL serialization operation, the output should always use correct hash router format regardless of input format
**Validates: Requirements 5.4**

### Property 14: URL Parameter Round-trip Consistency
*For any* valid focus parameter value, parsing then serializing then parsing should produce an equivalent result
**Validates: Requirements 5.5**

## Testing Strategy

### Unit Tests
- Test component remounting behavior with different route changes
- Test URL parameter parsing and serialization
- Test NavigationService deprecation warnings
- Test backward compatibility with existing bookmarks

### Property-Based Tests
Each correctness property listed above should be implemented as a property-based test with minimum 100 iterations. Tests should be tagged with:
- **Feature: hash-router-widget-refresh-fix, Property 1: Symbol Change Widget Refresh**
- **Feature: hash-router-widget-refresh-fix, Property 2: Component Remount on Path Change**
- etc.

### Integration Tests
- Test complete user flow: navigate → change URL → verify widget refresh
- Test focus parameter behavior across different page transitions
- Test performance impact of component remounting
- Test TradingView widget initialization and cleanup

### Manual Testing Scenarios
1. **Symbol Change Test**: Navigate to `/symbols/NVDA`, manually change to `/symbols/ONDS`, verify widgets refresh
2. **Focus Parameter Test**: Click symbols in overview, verify URL format is `#/route?focus=X`
3. **Background Tab Test**: Set focus, switch tabs, return, verify URL format remains correct
4. **Navigation Test**: Ensure normal clicking/navigation still works efficiently

## Performance Considerations

### Component Remounting Impact
- **Positive**: Ensures widgets always show correct data
- **Negative**: Slight performance cost of component recreation
- **Mitigation**: Use `route.path` key to avoid remounting on query-only changes

### Widget Reinitialization
- **Current**: Widgets may show stale data indefinitely
- **After Fix**: Widgets reinitialize on symbol change (desired behavior)
- **Optimization**: Existing widget caching and loading optimizations remain intact

### Memory Management
- **Component Cleanup**: Vue automatically handles component destruction
- **Widget Cleanup**: TradingView widgets are properly cleaned up on component unmount
- **Event Listeners**: Existing cleanup logic in widget components handles this

## Migration Strategy

### Phase 1: Core Fix Implementation
1. Update App.vue with router-view key
2. Replace focus parameter handling in StockOverview
3. Add deprecation warnings to NavigationService

### Phase 2: Testing and Validation
1. Comprehensive testing of all scenarios
2. Performance impact assessment
3. User acceptance testing

### Phase 3: Cleanup (Optional)
1. Remove deprecated NavigationService methods
2. Clean up any remaining searchParams usage
3. Update documentation

## Rollback Plan

All changes are designed to be easily reversible:
1. **App.vue**: Single line change, can revert to `<router-view />`
2. **StockOverview.vue**: Replace Vue Router calls with original NavigationService calls
3. **NavigationService.js**: Remove deprecation warnings

Each component can be rolled back independently without affecting others.