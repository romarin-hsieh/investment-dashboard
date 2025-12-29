# Requirements Document

## Introduction

為 Stock Overview 頁面新增快速導覽功能，提供 Sticky TOC（Table of Contents）和 ScrollSpy 功能，讓使用者能快速跳轉到特定股票並追蹤當前閱讀位置。

## Glossary

- **TOC**: Table of Contents，目錄導覽面板
- **ScrollSpy**: 滾動監聽功能，根據當前視窗位置高亮對應的導覽項目
- **StockCard**: 顯示個別股票資訊的卡片組件
- **Sector**: 股票行業分類（如 Technology, Financial Services）
- **Industry**: 股票子行業分類（如 Semiconductors, Software - Infrastructure）
- **Hash_Router**: Vue Router 的 hash 模式路由
- **DOM_Anchor**: DOM 元素的 ID 錨點，用於頁面內跳轉

## Requirements

### Requirement 1: 側邊導覽面板

**User Story:** As a user, I want to see a sticky navigation panel on the side, so that I can quickly access different sections of the stock overview.

#### Acceptance Criteria

1. WHEN viewing the Stock Overview page on desktop (>= 1024px), THE Navigation_Panel SHALL display as a sticky sidebar
2. THE Navigation_Panel SHALL contain a search input field for filtering stocks
3. THE Navigation_Panel SHALL display a hierarchical tree structure: Sector → Industry → Symbol
4. THE Navigation_Panel SHALL support collapsible sections with expand/collapse functionality
5. THE Navigation_Panel SHALL remember the expand/collapse state using localStorage

### Requirement 2: 搜尋功能

**User Story:** As a user, I want to search for stocks by sector, industry, symbol, or company name, so that I can quickly find specific stocks.

#### Acceptance Criteria

1. WHEN typing in the search input, THE Navigation_Panel SHALL filter the tree structure in real-time
2. THE Search_Function SHALL match against sector names, industry names, stock symbols, and company names
3. WHEN search results are displayed, THE Navigation_Panel SHALL highlight matching text
4. WHEN clearing the search input, THE Navigation_Panel SHALL restore the full tree structure
5. THE Search_Input SHALL have proper accessibility labels for screen readers

### Requirement 3: 點擊跳轉功能

**User Story:** As a user, I want to click on any stock symbol in the navigation, so that I can smoothly scroll to that stock's card.

#### Acceptance Criteria

1. WHEN clicking a symbol in the TOC, THE System SHALL scroll smoothly to the corresponding StockCard
2. THE System SHALL NOT modify the URL hash anchor to avoid router conflicts
3. THE System SHALL handle sticky header offset to ensure the target card is fully visible
4. WHEN `prefers-reduced-motion: reduce` is set, THE System SHALL use instant scrolling instead of smooth scrolling
5. THE System SHALL focus the target StockCard for accessibility after scrolling

### Requirement 4: ScrollSpy 功能

**User Story:** As a user, I want the navigation to highlight my current reading position as I scroll, so that I know which section I'm viewing.

#### Acceptance Criteria

1. WHEN scrolling through the page, THE Navigation_Panel SHALL highlight the currently visible stock symbol
2. THE ScrollSpy SHALL update the active state within 200ms of scrolling
3. WHEN multiple stocks are visible, THE System SHALL highlight the stock with the highest intersection ratio
4. THE ScrollSpy SHALL automatically expand parent sectors and industries to show the active symbol
5. THE Active_Symbol SHALL use `aria-current="location"` for accessibility

### Requirement 5: 分享定位功能

**User Story:** As a user, I want to share a link that directly navigates to a specific stock, so that others can view the same stock immediately.

#### Acceptance Criteria

1. WHEN accessing a URL with `?focus=SYMBOL` parameter, THE System SHALL scroll to that symbol on page load
2. WHEN clicking a symbol in the TOC, THE System SHALL optionally update the URL query parameter
3. THE URL SHALL maintain the format `/#/stock-overview?focus=SYMBOL` without using hash anchors
4. THE System SHALL handle invalid or non-existent symbols gracefully
5. THE Query_Parameter SHALL use the original stock symbol, not the sanitized DOM ID

### Requirement 6: 行動裝置支援

**User Story:** As a mobile user, I want to access the navigation through a floating button, so that I can navigate without taking up screen space.

#### Acceptance Criteria

1. WHEN viewing on mobile devices (< 1024px), THE Navigation_Panel SHALL be hidden by default
2. THE System SHALL display a floating action button for navigation access
3. WHEN tapping the floating button, THE System SHALL open a drawer or bottom sheet with the TOC
4. THE Mobile_Drawer SHALL contain the same search and navigation functionality as the desktop version
5. WHEN selecting a symbol in mobile, THE Drawer SHALL automatically close after navigation

### Requirement 7: 效能最佳化

**User Story:** As a user with many stocks (200+), I want the navigation to remain responsive, so that scrolling and highlighting don't cause lag.

#### Acceptance Criteria

1. THE ScrollSpy SHALL use IntersectionObserver for efficient scroll monitoring
2. THE System SHALL build metadata maps to avoid O(n²) lookups in groupedStocks computation
3. THE Navigation_Tree SHALL be generated from existing groupedStocks order to maintain consistency
4. THE System SHALL debounce scroll events to prevent excessive callback execution
5. THE System SHALL handle rapid symbol clicking without causing scroll conflicts

### Requirement 8: 無障礙功能

**User Story:** As a user with accessibility needs, I want to navigate using keyboard and screen readers, so that I can access all functionality.

#### Acceptance Criteria

1. THE Navigation_Panel SHALL be fully keyboard navigable using Tab, Enter, and Space keys
2. THE Accordion_Sections SHALL use semantic HTML (`<details><summary>`) where possible
3. THE Active_Items SHALL use appropriate ARIA attributes (`aria-current`, `aria-expanded`)
4. THE Search_Input SHALL have visible or invisible labels for screen readers
5. THE System SHALL respect `prefers-reduced-motion` settings for all animations

### Requirement 9: DOM 錨點設置

**User Story:** As a developer, I want each stock card to have proper DOM anchors, so that programmatic scrolling works reliably.

#### Acceptance Criteria

1. THE StockCard SHALL have a unique DOM ID in the format `sym-{sanitized_symbol}`
2. THE StockCard SHALL include `data-symbol` attribute with the original symbol
3. THE StockCard SHALL have `tabindex="-1"` for programmatic focus
4. THE StockCard SHALL use `scroll-margin-top` CSS to handle sticky header offset
5. THE Symbol_Sanitization SHALL replace non-alphanumeric characters with underscores

### Requirement 10: 視覺一致性

**User Story:** As a user, I want the navigation panel to match the existing design system, so that it feels integrated with the application.

#### Acceptance Criteria

1. THE Navigation_Panel SHALL use the same color scheme and typography as the existing interface
2. THE Active_States SHALL use consistent highlighting styles with other components
3. THE Search_Input SHALL follow the same styling patterns as other form inputs
4. THE Mobile_Drawer SHALL use the same visual design language as existing modals
5. THE Floating_Button SHALL integrate seamlessly with the current UI without visual conflicts