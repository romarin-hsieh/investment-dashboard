# 交易模型與分析邏輯 (Trading Models & Algorithm Insights)

本文檔旨在記錄系統中**自動化交易分析模型**的背後邏輯、評級標準與文字生成規則。
隨著系統迭代，未來所有的「象限分析」、「策略回測」與「自動化評語」之演算法皆應收錄於此。

---

## 1. MFI Volume Profile Analysis (MFI 籌碼量價模型)

此模型結合了 **Volume Profile (價格結構)** 與 **MFI (資金動能)**，試圖在「支撐/壓力」的關鍵位置上，判斷資金是進場還是離場，從而產生交易訊號。

### 1.1 核心概念 (Core Concepts)
*   **Point of Control (POC)**: 交易量最大的價格點，視為該時段的市場共識價格（強力支撐/壓力）。
*   **Value Area (VA)**: 包含了 70% 總成交量的價格區間，視為「合理價格區」。
*   **Buying/Selling Pressure**: 將 K 線內的成交量依據 MFI 指標拆解為「買盤量」與「賣盤量」。

### 1.2 評級邏輯 (Signal Logic)
系統依據 **市場情緒 (Sentiment)** 與 **當前價格位置 (relative to Value Area)** 的交互關係來判定訊號：

| 訊號 (Signal) | 觸發條件 (Conditions) | 邏輯解讀 (Interpretation) |
| :--- | :--- | :--- |
| **🟢 BUY (買進)** | Sentiment = **Bullish** (買盤佔優) <br>AND Price < **Value Area Low** | **「多頭回檔」**：主力資金在買，且價格低於合理區間 (便宜)，預期回歸均值或向上突破。 |
| **🔴 SELL (賣出)** | Sentiment = **Bearish** (賣盤佔優) <br>AND Price > **Value Area High** | **「空頭反彈」**：主力資金在賣，且價格高於合理區間 (昂貴)，預期回歸均值或向下崩跌。 |
| **🟡 HOLD (持有)** | Price is inside **Value Area** | **「盤整觀望」**：價格處於合理區間內，多空力量均衡，等待方向表態。 |
| **⚪ NEUTRAL (中立)** | 資金流向無明顯優勢 (Buying/Selling Ratio 差距 < 10%) | 市場缺乏明確共識，隨機漫步中。 |

*註：`Buying Ratio > 40%` 定義為 **Bullish**；`Selling Ratio > 40%` 定義為 **Bearish**。*

### 1.3 信心分數 (Confidence Score)
初始分數依據訊號強度給予 (0.5 ~ 0.7)，並透過以下規則加分：
1.  **成交量確認**: 若買盤量 > 賣盤量 1.5 倍 (在 Buy 訊號下)，信心分數 +0.2。
2.  **極端背離**: 若價格遠離 POC 超過 2 個標準差，視為極端值，信心分數 +0.1。

### 1.4 自動化評語 (Generated Analysis)
系統會根據上述狀態，動態組裝分析文字：

*   **機會提示**: "Price below value area with bullish sentiment - potential buying opportunity"
*   **趨勢監控**: "Price in value area with bullish sentiment - monitor for breakout"
*   **籌碼補充**: 當主訊號中立時，會補充觀察到底層籌碼流向："Underlying buy volume is slightly higher, suggesting potential accumulation."

### 1.5 完整評語清單 (Full List of Generated Texts)
為確保前後端與測試一致，以下列出系統可能生成的所有評語原文：

#### A. 明確訊號 (Directional Signals)
| 情境 (Scenario) | 評語 (Text) |
| :--- | :--- |
| **Bullish + Cheap** | "Price below value area with bullish sentiment - potential buying opportunity" |
| **Bullish + Fair** | "Price in value area with bullish sentiment - monitor for breakout" |
| **Bearish + Expensive** | "Price above value area with bearish sentiment - potential selling opportunity" |
| **Bearish + Fair** | "Price in value area with bearish sentiment - monitor for breakdown" |

#### B. 盤整狀態 (Ranges & Consolidation)
當訊號為 **Neutual** 或無明確方向時：
*   **區間震盪**: "Price is consolidating within the Value Area ($Low - $High). Market is in equilibrium."
*   **POC 上方游走**: "Price is ranging above the Point of Control. No clear direction detected yet."
*   **POC 下方游走**: "Price is ranging below the Point of Control. No clear direction detected yet."

#### C. 潛在籌碼流向 (Underlying Volume Flow)
當主訊號不明確時，系統會額外檢查買賣單量的細微差異：
*   **主力吸籌 (Accumulation)**: "Underlying buy volume is slightly higher, suggesting potential accumulation."
    *   *(條件: Buying Volume > Selling Volume * 1.2)*
*   **主力出貨 (Distribution)**: "Underlying sell volume is slightly higher, suggesting potential distribution."
    *   *(條件: Selling Volume > Buying Volume * 1.2)*

---

## 2. (Planned) Quadrant Analysis Models (未來規劃：象限分析模型)
*(預計於下個迭代加入)*
*   **動能/波動率 象限圖**: 判斷股票處於「趨勢爆發」、「盤整收斂」或「反轉前兆」。
*   **基本面/技術面 矩陣**: 結合財報分數與技術指標的綜合評分。
