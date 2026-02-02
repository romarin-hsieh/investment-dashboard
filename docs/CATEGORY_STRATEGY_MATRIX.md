# Factor-Based Strategy Matrix (Multi-Label Tagging)

**Objective**: 改採用「多重標籤 (Multi-Label)」矩陣分析。不再將股票強制歸類於單一籃子，而是根據其具備的屬性 (Tags) 來決定策略參數。同一支股票可能同時具備 `[Growth]` 與 `[Blue Chip]` 標籤。

---

## 1. Tag Definitions (標籤定義矩陣)

我們將根據 `yfinance` 的基本面數據 (info) 為每支股票自動打上標籤。

| Tag Category | Tag Name | Criteria (量化標準) | Data Source |
| :--- | :--- | :--- | :--- |
| **Market Cap** (市值等級) | `[MEGA_CAP]` | Market Cap > $200B | `marketCap` |
| | `[LARGE_CAP]` | $10B < Market Cap < $200B | `marketCap` |
| | `[SMALL_CAP]` | Market Cap < $10B | `marketCap` |
| **Valuation** (估值風格) | `[VALUE]` | Trailing P/E < 20 **OR** Forward P/E < 15 | `trailingPE`, `forwardPE` |
| | `[GROWTH]` | Revenue Growth > 15% **OR** Trailing P/E > 40 | `revenueGrowth` |
| **Quality** (品質/防禦) | `[BLUE_CHIP]` | In Dow 30 List **OR** In S&P 100 | Static List (DIA/OEF) |
| | `[DIVIDEND]` | Dividend Yield > 3% | `dividendYield` |

> *Note: 一支股票可以同時擁有 `[MEGA_CAP]`, `[GROWTH]`, `[BLUE_CHIP]` (e.g., Microsoft).*

---

## 2. Dynamic Strategy Mapping (v2.1 Data-Driven)

驗證結果顯示 (參見 `TAG_VALIDATION_REPORT`)：過度強調「均值回歸」會導致錯失大型趨勢，而「趨勢確認」過於嚴格則會錯失成長股的最佳買點。因此我們修正為 **v2.1 參數**。

### A. The "Growth" Engine (若具備 `[GROWTH]` or `[SMALL_CAP]`)
*   **Logic**: 提早進場 (Early Trend Entry)。
*   **Validation**: 敏感度分析顯示，成長股在 $X > 0.4$ 時報酬率最高 (+126%)，優於標準的 $X > 0.5$ (+118%)。
*   **Behavior**:
    *   **Early Entry**: 只要 $X > 0.4$ 且 $Y < 0.3$ (稍微超賣) 即觸發 `DIP_BUY`。
    *   **Loose Exit**: 使用兩倍寬度的 Volatility Stop，容忍洗盤。
    *   **VIX Filter**: 嚴格。$VIX > 28$ 強制離場 (小型股對系統風險極敏感)。

### B. The "Value/Income" Engine (若具備 `[VALUE]` or `[DIVIDEND]`)
*   **Logic**: 順勢操作 (Trend-Biased)。
*   **Validation**: 原始假設的「深度回歸 ($Y < 0.1$)」導致 WFC 等銀行股報酬率為負 (-13%)。價值股在牛市中應視為緩漲股操作。
*   **Behavior**:
    *   **Baseline Parameters**: 回歸標準設定 ($X > 0.5, Y < 0.2$)。
    *   **Dividend Check**: 若殖利率 > 4%，則放寬止損 (視為領息部位)。
    *   **Avoid Traps**: 當 $X < -0.5$ (明確空頭) 時，絕對禁止攤平 (No catching falling knives)。

### C. The "Blue Chip" Anchor (若具備 `[BLUE_CHIP]` or `[MEGA_CAP]`)
*   **Logic**: 穩定配置 (Balanced).
*   **Behavior**:
    *   使用標準 v2.0 參數。這在 AAPL 上表現極佳 (+381%)。

---

## 3. Implementation Workflow

1.  **Data Ingestion**: 下載所有 ETF (VUG, VTV, IWM...) 成分股，形成一個約 60-80 檔的 **"Master Pool"**。
2.  **Tagging Process**: 執行 `scripts/data/tag_engine.py`，讀取基本面並生成 `ticker_tags.json`。
    *   e.g., `{"NVDA": ["MEGA_CAP", "GROWTH"], "KO": ["LARGE_CAP", "VALUE", "DIVIDEND"]}`
3.  **Backtest Analysis**: `category_backtest.py` 不再依賴固定清單，而是依據 Tags 分組跑回測。
    *   "Show me performance of all tickers with `[GROWTH]` tag."
