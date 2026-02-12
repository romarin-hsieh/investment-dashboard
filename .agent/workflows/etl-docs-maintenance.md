---
description: ETL 資料排程與腳本異動時自動維護 docs/DATA_OPERATIONS.md
---

# ETL Documentation Maintenance Workflow

> 當修改 ETL 相關檔案時，Agent 必須自動同步更新文件。

## 觸發條件

當以下任何檔案被修改（新增、刪除或異動）時，本 workflow 生效：

- `.github/workflows/*.yml` — 所有 GitHub Actions Workflow
- `scripts/*.js` — 所有 Node.js ETL 腳本
- `scripts/*.py` — 所有 Python ETL 腳本
- `scripts/production/*.py` — Production 輔助腳本
- `scripts/core/*.py` — Quant 核心模組
- `config/stocks.json` — 股票設定主檔

## 必要動作

### 1. 讀取現有文件
// turbo
```
先閱讀 docs/DATA_OPERATIONS.md 了解當前文件結構。
```

### 2. 判斷影響範圍

根據修改的檔案類型，判斷需更新的章節：

| 修改檔案 | 需更新章節 |
|---------|-----------|
| `.github/workflows/*.yml` | §3 (排程表) + §6 (Workflow 說明) |
| 新增/刪除 `scripts/*.js` 或 `scripts/*.py` | §10 (腳本清單) |
| 修改 `generate-daily-technical-indicators.js` 的指標 | §4.2 (指標清單) |
| 修改 `generate-real-ohlcv-yfinance.py` 的 schema | §4.1 (OHLCV Format) |
| 修改 Workflow 的 cron schedule | §3.2 (排程表) |
| 修改 Dataroma tickers 陣列 | §6.3 (Dataroma Pipeline) |
| 修改 `config/stocks.json` 結構 | §1 (Config Schema) |
| 新增/修改環境需求 (npm/pip packages) | §11.3 / §11.4 |

### 3. 更新文件

根據上述判斷，同步修改 `docs/DATA_OPERATIONS.md` 的對應章節。

### 4. 更新 Changelog

在 `docs/DATA_OPERATIONS.md` 底部的 `📝 Changelog` 表格中新增一行，記錄本次變更：

```markdown
| YYYY-MM-DD | 描述具體變更內容 |
```

## 注意事項

- **不需要**每次都重寫整份文件，只更新受影響的章節即可
- 文件中的 Mermaid 圖表如有結構性變化（新增/刪除 Workflow step），也需同步更新
- 如果新增了新的 Workflow YAML，需在 §3.2 排程表新增一行，並在 §6 新增對應的小節
- 如果刪除了腳本，需從 §10 腳本清單中移除，並檢查 §11 的本地測試指令是否需調整
