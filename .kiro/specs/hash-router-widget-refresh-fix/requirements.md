# Requirements Document

## Introduction

修復 Hash Router 環境下的兩個關鍵問題：(1) 手動修改 URL symbol 後頁面內容不重整，(2) focus query 參數位置錯誤導致跨頁殘留。

## Glossary

- **Hash Router**: Vue Router 使用 `createWebHashHistory()` 的路由模式
- **TradingView Widget**: 第三方 JavaScript widget，透過 script 注入方式載入
- **Component Reuse**: Vue Router 在相同路由但不同參數時重用元件實例
- **Focus Query**: 用於標記當前聚焦股票的 URL 查詢參數

## Requirements

### Requirement 1: Symbol Change Widget Refresh

**User Story:** As a user, I want TradingView widgets to refresh when I manually change the symbol in the URL, so that I can see the correct data for the new symbol.

#### Acceptance Criteria

1. WHEN a user manually changes the symbol in URL from `/symbols/NVDA` to `/symbols/ONDS` THEN all TradingView widgets SHALL reload with new symbol data
2. WHEN the URL symbol parameter changes THEN the StockDetail component SHALL remount completely
3. WHEN component remounts THEN all widgets SHALL reinitialize with correct symbol configuration
4. WHEN normal navigation occurs (clicking links) THEN the behavior SHALL remain unchanged
5. THE system SHALL use `route.path` as component key to force remount on path changes

### Requirement 2: Hash Router Query Parameter Consistency

**User Story:** As a user, I want focus query parameters to appear in the correct URL format, so that URLs remain consistent and don't leak across pages.

#### Acceptance Criteria

1. WHEN a user clicks on a symbol in stock overview THEN the focus parameter SHALL appear as `#/stock-overview?focus=SYMBOL`
2. WHEN focus query is set THEN it SHALL NOT appear as `?focus=SYMBOL#/route` format
3. WHEN navigating away from stock-overview THEN focus query parameters SHALL be cleared automatically
4. WHEN returning from background tabs THEN URLs SHALL maintain correct hash router format
5. THE system SHALL use Vue Router query methods instead of `window.location.search` manipulation

### Requirement 3: NavigationService Deprecation

**User Story:** As a developer, I want to prevent future misuse of searchParams with Hash Router, so that URL consistency issues don't reoccur.

#### Acceptance Criteria

1. WHEN NavigationService.updateQueryParam is called THEN it SHALL be marked as deprecated for Hash Router usage
2. WHEN focus updates are needed THEN Vue Router query methods SHALL be used instead
3. WHEN searchParams manipulation occurs THEN it SHALL NOT affect hash router query parameters
4. THE system SHALL provide clear migration path from searchParams to hash router queries
5. ALL existing calls to updateQueryParam for focus SHALL be replaced with Vue Router methods

### Requirement 4: Backward Compatibility

**User Story:** As a user, I want existing navigation and bookmarks to continue working, so that the fix doesn't break current functionality.

#### Acceptance Criteria

1. WHEN existing bookmarks are accessed THEN they SHALL continue to work correctly
2. WHEN normal page navigation occurs THEN performance SHALL not be significantly impacted
3. WHEN components remount THEN data loading SHALL be efficient and not cause excessive API calls
4. THE system SHALL maintain all existing routing behavior except for the specific bugs being fixed
5. WHEN rollback is needed THEN changes SHALL be easily reversible

## Parser and Serializer Requirements

### Requirement 5: URL Parameter Parsing

**User Story:** As a system, I want to correctly parse and serialize hash router parameters, so that URL state management is consistent.

#### Acceptance Criteria

1. WHEN parsing focus parameters THEN the system SHALL read from hash router query not searchParams
2. WHEN serializing focus state THEN the system SHALL write to hash router query format
3. THE URL Parser SHALL handle both legacy `?focus=X#/route` and correct `#/route?focus=X` formats for migration
4. THE URL Serializer SHALL always output correct hash router format `#/route?focus=X`
5. FOR ALL valid focus parameter operations, parsing then serializing then parsing SHALL produce equivalent results (round-trip property)