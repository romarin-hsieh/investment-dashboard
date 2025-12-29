# Implementation Plan: Stock Overview Navigation

## Overview

將 Stock Overview 頁面的快速導覽功能分解為可執行的開發任務。採用漸進式開發方式，先實作核心功能，再逐步新增進階功能。使用純 DOM scroll + Query 參數方案，避免與 Hash Router 衝突。

## Tasks

- [ ] 1. 準備工作和現況確認
  - 確認 StockOverview 組件的當前結構和路由設置
  - 檢查 StockCard 組件的 DOM 結構
  - 確認 groupedStocks 計算邏輯和資料格式
  - _Requirements: 9.1, 9.2_

- [ ] 2. StockCard DOM 錨點設置
  - [ ] 2.1 修改 StockCard.vue 根節點新增 DOM 屬性
    - 新增 `:id="domId"` 屬性
    - 新增 `:data-symbol="quote.symbol"` 屬性
    - 新增 `tabindex="-1"` 屬性
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 2.2 實作 symbol 清理和 ID 生成邏輯
    - 建立 `sanitizeSymbol(symbol)` 方法
    - 建立 `domId` computed property
    - 新增 CSS `scroll-margin-top` 樣式
    - _Requirements: 9.5, 9.4_

- [ ] 3. TOC 資料結構建立
  - [ ] 3.1 在 StockOverview.vue 新增 TOC 相關狀態
    - 新增 `tocTree` computed property
    - 新增 `activeSymbol` reactive data
    - 新增 `searchQuery` reactive data
    - 新增 `expandedSections` reactive data
    - _Requirements: 1.3, 2.1_

  - [ ] 3.2 實作 TOC 樹狀結構生成邏輯
    - 從 `groupedStocks` 生成階層式資料結構
    - 保持與主要顯示順序一致
    - 建立 sector → industry → symbol 階層
    - _Requirements: 1.3, 7.3_

  - [ ]* 3.3 建立效能優化的資料映射
    - 建立 `metadataMap` 和 `dailyDataMap`
    - 避免 groupedStocks 中的重複查找
    - _Requirements: 7.2_

- [ ] 4. 基礎導覽面板組件
  - [ ] 4.1 建立 NavigationPanel.vue 組件
    - 建立基本的 sticky sidebar 佈局
    - 實作 props 和 events 介面
    - 新增基本的 CSS 樣式
    - _Requirements: 1.1, 10.1_

  - [ ] 4.2 建立 TOCTree.vue 組件
    - 實作階層式樹狀結構渲染
    - 支援展開/收合功能
    - 新增 active 狀態樣式
    - _Requirements: 1.3, 1.4_

  - [ ]* 4.3 實作搜尋輸入組件
    - 新增搜尋輸入欄位
    - 實作即時過濾邏輯
    - 新增搜尋結果高亮
    - _Requirements: 2.1, 2.3, 2.5_

- [ ] 5. 點擊跳轉功能
  - [ ] 5.1 建立 NavigationService
    - 實作 `scrollToSymbol(symbol)` 方法
    - 處理 sticky header offset 計算
    - 支援 smooth/instant scrolling 切換
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ] 5.2 整合點擊跳轉到 TOC 組件
    - 處理 TOC 項目點擊事件
    - 呼叫 NavigationService 進行跳轉
    - 新增 focus 管理提升無障礙性
    - _Requirements: 3.1, 3.5_

  - [ ]* 5.3 實作 Query 參數支援
    - 頁面載入時讀取 `?focus=SYMBOL` 參數
    - 點擊跳轉時更新 URL query 參數
    - 處理無效 symbol 的錯誤情況
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 6. ScrollSpy 功能實作
  - [ ] 6.1 建立 ScrollSpyService
    - 使用 IntersectionObserver 監控 StockCard 可見性
    - 實作 active symbol 計算邏輯
    - 處理 rootMargin 和 threshold 設定
    - _Requirements: 4.1, 4.3_

  - [ ] 6.2 整合 ScrollSpy 到 StockOverview
    - 在組件 mounted 後初始化 observer
    - 實作 active symbol 狀態更新
    - 處理資料重新載入時的 observer 重設
    - _Requirements: 4.1, 4.2_

  - [ ]* 6.3 實作自動展開功能
    - active symbol 變更時自動展開對應的 sector/industry
    - 更新 expandedSections 狀態
    - _Requirements: 4.4_

- [ ] 7. 桌面版佈局整合
  - [ ] 7.1 修改 StockOverview.vue 佈局
    - 新增兩欄式 grid/flex 佈局
    - 整合 NavigationPanel 到側邊欄
    - 調整主內容區域寬度
    - _Requirements: 1.1_

  - [ ] 7.2 實作 sticky positioning
    - 計算 header 高度並設定 sticky top 位置
    - 新增 max-height 和 overflow 處理
    - 確保導覽面板不會被 header 遮蓋
    - _Requirements: 1.1_

- [ ] 8. 行動版支援
  - [ ] 8.1 建立 FloatingButton.vue 組件
    - 新增浮動操作按鈕
    - 實作 responsive 顯示/隱藏邏輯
    - 新增適當的 z-index 和定位
    - _Requirements: 6.2_

  - [ ] 8.2 建立 MobileDrawer.vue 組件
    - 實作抽屜/底部面板介面
    - 重用桌面版的 TOC 和搜尋功能
    - 新增觸控手勢支援
    - _Requirements: 6.3, 6.4_

  - [ ]* 8.3 實作自動關閉機制
    - 選擇 symbol 後自動關閉抽屜
    - 點擊外部區域關閉抽屜
    - _Requirements: 6.5_

- [ ] 9. 無障礙功能實作
  - [ ] 9.1 實作鍵盤導覽支援
    - 新增 Tab/Enter/Space 鍵盤事件處理
    - 確保所有互動元素可鍵盤操作
    - 實作適當的 focus 管理
    - _Requirements: 8.1_

  - [ ]* 9.2 新增 ARIA 屬性和語意標記
    - 使用 `<details><summary>` 實作 accordion
    - 新增 `aria-current="location"` 到 active 項目
    - 新增適當的 labels 和 descriptions
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ]* 9.3 實作 reduced motion 支援
    - 檢測 `prefers-reduced-motion` 設定
    - 在 reduced motion 模式下停用 smooth scrolling
    - _Requirements: 8.5_

- [ ] 10. 效能優化和錯誤處理
  - [ ]* 10.1 實作搜尋防抖和效能保護
    - 新增 debounce 到搜尋輸入
    - 限制大量結果的顯示數量
    - _Requirements: 7.4_

  - [ ]* 10.2 新增錯誤處理和降級方案
    - IntersectionObserver 不支援時的 fallback
    - 無效 symbol 的錯誤處理
    - 新增錯誤日誌和使用者提示
    - _Requirements: 5.4_

- [ ] 11. 狀態持久化
  - [ ]* 11.1 實作 localStorage 狀態儲存
    - 儲存 expandedSections 狀態
    - 頁面重新載入時恢復狀態
    - _Requirements: 1.5_

- [ ] 12. 視覺樣式和主題整合
  - [ ] 12.1 實作一致的視覺設計
    - 使用現有的色彩系統和字型
    - 確保 active 狀態樣式一致性
    - 新增適當的 hover 和 focus 效果
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 12.2 實作響應式設計
    - 確保在不同螢幕尺寸下的適配
    - 調整 breakpoint 和佈局切換
    - _Requirements: 6.1_

- [ ] 13. 整合測試和驗證
  - [ ]* 13.1 撰寫 property-based tests
    - **Property 1: TOC 樹狀結構一致性**
    - **Validates: Requirements 1.3, 7.3**

  - [ ]* 13.2 撰寫 property-based tests
    - **Property 2: 搜尋過濾正確性**
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [ ]* 13.3 撰寫 property-based tests
    - **Property 3: 跳轉定位準確性**
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 13.4 撰寫 property-based tests
    - **Property 4: ScrollSpy 同步性**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 13.5 撰寫 property-based tests
    - **Property 5: URL 參數一致性**
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 13.6 撰寫 property-based tests
    - **Property 6: 無障礙導覽完整性**
    - **Validates: Requirements 8.1, 8.3**

  - [ ]* 13.7 撰寫 property-based tests
    - **Property 7: 行動版功能對等性**
    - **Validates: Requirements 6.4, 6.5**

  - [ ]* 13.8 撰寫 property-based tests
    - **Property 8: DOM 錨點唯一性**
    - **Validates: Requirements 9.1, 9.2, 9.5**

- [ ] 14. 最終整合和部署準備
  - [ ] 14.1 整合所有組件到 StockOverview
    - 確保所有功能正常運作
    - 處理組件間的資料流和事件
    - 驗證效能表現
    - _Requirements: All_

  - [ ] 14.2 進行完整的使用者流程測試
    - 測試桌面版完整操作流程
    - 測試行動版完整操作流程
    - 驗證無障礙功能
    - 測試不同瀏覽器相容性

## Notes

- 標記 `*` 的任務為可選任務，可在 MVP 階段跳過以加快開發速度
- 每個任務都參考了對應的需求編號以確保可追溯性
- Property-based tests 使用 Vitest + fast-check，每個測試最少執行 100 次迭代
- 建議按順序執行任務，確保每個階段都有可測試的增量功能
- 在任務 7 完成後會有第一個可用的 MVP 版本
- 效能測試建議使用 200+ 個模擬股票資料進行壓力測試