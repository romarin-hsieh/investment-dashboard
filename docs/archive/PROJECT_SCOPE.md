# Project Scope & Charter

## 1. 專案定位 (Project Purpose)
**"The Bloomberg Terminal for the Static Web"**
本專案的目的是打造一個**零維護成本**、**高效能**且**深度客製化**的投資分析儀表板。
它並非為了服務大眾用戶或商業營利，而是為了滿足**個人與核心投資圈**對於「特定交易策略」與「市場全觀」的分析需求。

### 核心價值 (Core Values)
*   **私有化與專屬性**: 針對特定的交易邏輯（如 MFI 籌碼分析、乖離率策略）量身打造，不受限於市面看盤軟體的功能。
*   **極致成本效益 (Cost Efficiency)**: 採用 "Serverless / Static-First" 架構，由 GitHub Pages 託管，除開發成本外，營運成本趨近於零。
*   **速度與體驗 (Performance)**: 透過預計算 (Pre-computation) 與邊緣緩存 (CDN)，提供超越一般動態網站的載入速度。

---

## 2. 專案範疇 (In Scope)

### ✅ A. 進階視覺化 (Advanced Visualization)
*   **TradingView 高度整合**: 支援自定義繪圖、多指標疊加的互動式圖表。
*   **市場全觀**: 熱力圖 (Heatmap)、恐懼貪婪指數 (Fear & Greed)、板塊輪動監控。

### ✅ B. 客製化分析模型 (Custom Trading Models)
*   **算法評語**: 如 MFI Volume Profile 的自動化文字分析（Bullish/Bearish 判定）。
*   **量化指標**: 實作一般看盤軟體未提供的複合指標（如結合情緒與籌碼的自定義訊號）。

### ✅ C. 靜態數據管線 (Static Data Pipeline)
*   **CI/CD 自動化**: 利用 GitHub Actions 每日自動爬取、計算並更新數據。
*   **歷史回朔**: 保存經過清洗的 OHLCV 與指標數據，建立私有的高品質數據庫。

### ✅ D. 無伺服器架構 (Serverless Architecture)
*   **纯前端運作**: 所有邏輯（包含部分輕量級回測）皆在瀏覽器端或編譯期完成。
*   **高可用性**: 依賴 GitHub Pages 的穩定性，無須擔心後端當機。

---

## 3. 範疇之外 (Out of Scope)

### ⛔ A. 即時交易與帳戶 (Live Trading & User Accounts)
*   **不涉及下單**: 本系統僅提供「分析建議」，不串接券商 API 進行自動下單。
*   **無使用者系統**: 不實作登入、註冊、我的最愛（雲端同步）等功能。所有設定僅存在本地瀏覽器 (LocalStorage)。

### ⛔ B. 即時串流數據 (Real-time Streaming via Socket)
*   **非 Tick 級報價**: 本系統不追求毫秒級的報價更新（成本過高且對波段交易無必要）。
*   **數據延遲**: 接受盤中報價有 1-15 分鐘延遲，或僅依賴 Widget 的免費源。

### ⛔ C. 社交與社群功能 (Social Features)
*   **無社群互動**: 不包含留言板、跟單系統、排行榜或分享功能。
*   **單向資訊流**: 資訊由系統流向用戶，不支援用戶生成內容 (UGC)。

### ⛔ D. 複雜回測引擎 (Complex Backtesting Engine)
*   **非寬客平台**: 不提供 Python 級別的動態策略編寫與大規模歷史回測（這應在線下研究完成，本平台僅展示結果）。

---

## 4. 目標受眾 (Target Audience)
1.  **專案擁有者**: 需要一個隨時可訪問、數據乾淨、無廣告干擾的決策面板。
2.  **核心投資夥伴**: 共享相同交易邏輯，需要快速確認市場狀態的小型團體。
