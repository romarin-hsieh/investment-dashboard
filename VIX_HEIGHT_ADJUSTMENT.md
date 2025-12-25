# VIX Index 高度調整

## 調整內容

將 VIX Index widget 的高度從 600px 調整為 400px，使其更緊湊。

### 修改項目：

1. **LazyTradingViewWidget 組件高度**：
   ```vue
   height="400px"  <!-- 從 600px 改為 400px -->
   ```

2. **VIX 配置中的高度**：
   ```javascript
   "height": 400,  // 從 600 改為 400
   ```

3. **CSS 容器樣式**：
   ```css
   .vix-container {
     min-height: 420px; /* 從 620px 改為 420px */
   }

   .vix-container :global(.tradingview-widget-container) {
     min-height: 400px !important; /* 從 600px 改為 400px */
     height: 400px !important;
   }

   .vix-container :global(.tradingview-widget-container__widget) {
     min-height: 400px !important; /* 從 600px 改為 400px */
     height: 400px !important;
   }
   ```

## 新的高度層級：

```
VIX Container (420px) 
└── Lazy Widget (400px)
    └── TradingView Container (400px)
        └── TradingView Widget (400px)
            └── 完整的圖表內容
```

## 效果：

- ✅ VIX widget 更緊湊，節省頁面空間
- ✅ 保持所有功能完整可用
- ✅ 圖表內容仍然完整顯示
- ✅ 響應式設計保持正常

調整完成！VIX Index 現在使用 400px 高度，更加緊湊。