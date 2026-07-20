# Investment Dashboard

[English](README.md) | **繁體中文**

[![Tests](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/test.yml/badge.svg)](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/test.yml)
[![Deploy](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/deploy.yml/badge.svg)](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/deploy.yml)

供個人使用的靜態單頁股票研究應用程式。每日由 GitHub Actions 管線預先計算市場資料與量化訊號並輸出為 JSON，瀏覽器直接載入並渲染這些檔案。全程無後端伺服器、無資料庫、無執行期成本。

**線上版本：** https://romarin-hsieh.github.io/investment-dashboard/
**介面語言：** 英文 / 繁體中文 · 淺色與深色主題 · 桌面優先

---

## 目的

本產品將每日的盤前研究壓縮為單一流程：掃描個人自選的 **138 檔美股**、依趨勢／動能／結構分類，再深入任一標的檢視技術指標、法人部位與基本面 —— 所有資料皆為一次性隔夜計算、納入版本控制。

貫穿一切設計的核心約束是：**以零託管成本運作，並維持一日一次的資料節奏。** 那些對股市應用而言看似罕見的取捨（不做即時報價串流、不做帳號、以靜態 JSON 作為資料層），都直接源自這項約束，並且以架構決策紀錄（ADR）明文記載，而非留作隱性假設。

本產品是分析工具。它呈現描述性訊號，不執行交易，也不產生投資建議。

---

## 產品範疇（Scope）

**範疇內（In scope）**

- 對精選標的池的每日節奏分析（138 檔，透過 [ADR-0012](docs/architecture/adr/0012-self-service-add-symbol.md) 自助擴充）
- 預先計算的技術指標、市場情境與產業輪動脈絡、法人持股（Dataroma 13F）與內部人情緒、個股基本面
- 雙語介面（英／繁中）、淺／深主題、鍵盤導覽
- 營運可觀測性：管線狀態、資料新鮮度、快取狀態

**範疇外（Out of scope）—— 刻意排除，而非尚未完成**

| 排除項 | 理由 |
|---|---|
| 交易下單／券商整合 | 純分析。不持有任何憑證、無下單路由風險、無法規面。 |
| 即時報價串流 | 產品決策週期為每日。串流會強制引入後端、WebSocket 與常態成本，卻無法提升決策價值；盤中走勢由內嵌的 TradingView widget 涵蓋。 |
| 使用者帳號／多租戶 | 單一操作者、靜態託管；靜態站台無法保存伺服端機密，導入認證基礎設施亦違反零成本約束。 |
| 任何形式的後端服務 | 資料是一日一次的批次產物。伺服器只會增加攻擊面與帳單，對新鮮度毫無提升（[ADR-0001](docs/architecture/adr/0001-static-first-architecture.md)）。 |
| 投資建議／推薦 | 訊號是有明確公式的描述性統計量（[規格](docs/specs/TECHNICAL_INDICATORS.md)），而非指示。 |

完整產品定義與驗收標準：[PRD](docs/product/PRD.md)（非目標見 §4）。

---

## 核心功能

| 區塊 | 提供內容 |
|---|---|
| **市場總覽** | 市場情境分類、恐懼與貪婪指數、產業輪動、指數與波動度脈絡 —— 進入任何個股決策前的由上而下判讀。 |
| **動能狀態篩選** | 將每一檔標的投影於三軸（趨勢／動能／結構），並歸類為具名狀態（Launchpad、Climax、Dip-Buy…）。其存在目的，是讓 138 檔標的能在數分鐘內完成分流，而非逐張看圖。 |
| **個股詳情** | 單一標的頁：TradingView 走勢圖、涵蓋實務主流指標族群的面板（趨勢：MA／一目均衡／SAR · 動能：RSI／Stochastic／CCI／MACD · 量能：OBV／MFI／CMF · 波動：ATR／Beta）、樞紐點、K 線型態。指標集的選擇準則是「可辨識、可與 TradingView 交叉驗證」，而非追求新穎。 |
| **MFI 量能分布** | 依價位拆解成交量，區分可能的法人流與散戶流；標記控制點（POC）與價值區，用以判斷某價位是否具備法人支撐。 |
| **法人動向追蹤** | 追蹤標的之法人持股（Dataroma 13F）與內部人交易情緒。 |
| **營運頁面** | 管線狀態、資料新鮮度與快取管理 —— 資料型產品唯有在其陳舊程度可被觀測時才值得信任。 |

訊號定義：[詞彙表](docs/product/GLOSSARY.md) · 量化方法論：[策略白皮書](docs/specs/QUANT_STRATEGY_DOSSIER.md)。

---

## 架構

```
GitHub Actions（隔夜 ETL）             GitHub Pages                    瀏覽器
┌─────────────────────────┐   commit   ┌──────────────┐    HTTPS   ┌─────────────────────┐
│ Python + Node 管線：     │ ─────────▶ │ 資料倉庫     │ ─────────▶ │ Vue 3 SPA           │
│ OHLCV、指標、快照、      │            │（靜態 JSON） │            │ 三層快取：          │
│ 13F、總經                │            └──────────────┘            │ 記憶體+localStorage │
└─────────────────────────┘                                        │ → 靜態 JSON         │
                                                                   │ → 即時 API 後援     │
                                                                   └─────────────────────┘
```

資料為單向流動：管線將納入版本控制的 JSON 寫入獨立的資料倉庫；應用程式透過三層快取讀取（瀏覽器內 → 靜態檔 → 經 CORS proxy 的 Yahoo Finance 即時後援）。因此數字最多可能有約 24 小時的延遲；當最後更新超過新鮮度窗口時，介面會顯示陳舊橫幅。

### 設計決策與取捨

以下每項決策都有可信的替代方案；其推理記錄於對應 ADR。

| 決策 | 曾考慮的替代方案 | 為何勝出 |
|---|---|---|
| 靜態優先、無後端（[ADR-0001](docs/architecture/adr/0001-static-first-architecture.md)） | Node／serverless API 層 | 資料是每日批次產物 —— 伺服器對新鮮度毫無提升，卻新增成本、維運與攻擊面。靜態 JSON 快照亦可在 git 中審閱。 |
| 獨立資料倉庫（[ADR-0008](docs/architecture/adr/0008-separate-data-repository.md)） | 將資料 commit 進應用程式倉庫 | 每晚的資料 commit 會淹沒程式碼歷史，並使應用部署與資料推送耦合。分離後兩個倉庫各有其節奏與保留策略。 |
| 三層快取（[ADR-0003](docs/architecture/adr/0003-three-tier-cache-model.md)） | 一律抓取靜態檔 | 重複瀏覽由記憶體／localStorage 於約 0 ms 解析；即時 API 層僅作為管線尚未產出檔案時的後援。 |
| i18n 訊息預編譯（[ADR-0009](docs/architecture/adr/0009-i18n-message-precompilation-csp.md)） | 執行期訊息編譯器 | 執行期編譯器需要 CSP `unsafe-eval`。建置期預編譯得以維持嚴格 CSP —— 這是硬性要求，因為應用會渲染第三方市場資料。 |
| 漸進式 TypeScript 遷移（[ADR-0014](docs/architecture/adr/0014-typescript-unification.md)） | 一次性重寫，或維持 JS | 逾百檔的一次性重寫無法審閱且易生迴歸。改採：先設下嚴格的 `vue-tsc` CI 閘門，再以葉節點優先、可證明行為不變的小批次遷移 —— 那支 1,256 行的指標核心，在遷移前已由 91 案特性化測試套件釘住。 |
| 覆蓋率棘輪取代固定門檻（[ADR-0013](docs/architecture/adr/0013-component-test-coverage-policy.md)） | 全域固定覆蓋率門檻 | 固定門檻不是卡住無關 PR 於歷史缺口，就是低到形同虛設。以「量測值減一」設定的逐檔下限只會上升，覆蓋率因此無處可退而不觸發 CI 失敗。 |

全部 14 份 ADR：[docs/architecture/adr/](docs/architecture/adr/README.md)。

---

## 工程實務

本專案由單人維護，這反而提高了自動化的標準：CI 就是實質上的審閱者。每一次 push 與 pull request 都必須通過：

1. **型別閘門** —— `strict` 模式下的 `vue-tsc --noEmit`；設定檔絕不為了讓變更通過而放寬。
2. **測試套件與覆蓋率棘輪** —— Vitest + Vue Test Utils；全域與逐檔覆蓋率下限只升不降。套件包含兩道矩陣守衛：英／繁中訊息鍵一致性，以及一道從實際 CSS 逐一計算所有 AA 關鍵 token 配對、於雙主題下驗證的對比度檢查。
3. **套件體積預算** —— 逐 chunk 與總體 gzip 預算，附每個 PR 的差異留言（[ADR-0007](docs/architecture/adr/0007-bundle-size-budgets.md)）。

測試取徑，依槓桿高低排序：

- **特性化（golden-master）套件** 用於確定性數學 —— 期望值由實際實作產生，因此重構期間任何行為漂移都會明確失敗。這正是 TypeScript 指標核心遷移得以「可證明」而非「憑信心」的原因。
- **缺陷釘定回歸測試** —— 每個 bug 修正都附一個測試，該測試在修正前的程式碼上失敗，並點名它所防止的使用者可見症狀。
- **結構性矩陣守衛** —— i18n 一致性與 token 對比度是程式碼庫的可計算性質，因此整批斷言而非抽樣。

### 已知限制

本專案定期執行對抗性自我稽核；當前發現公開發表，而非粉飾：

- [UI/UX 與無障礙稽核（2026-07-20）](docs/audits/2026-07-20-adversarial-uiux-audit.md) —— 18 項經驗證的發現，其中最嚴重者：分頁標籤在深色模式下的對比度不足、三個誤報管線健康狀態的營運頁面、遺漏於導覽的孤兒路由，以及一個未虛擬化的 138 卡片總覽頁。
- [測試設計與覆蓋率策略（2026-07-20）](docs/audits/2026-07-20-test-strategy.md) —— 外部資料擷取層與所有路由層頁面幾乎未受測試；該文件依風險排序後續五個測試 PR。

---

## 開始使用

需要 Node 20+。Python 3.11+ 僅在本機執行資料管線時需要。

```bash
git clone https://github.com/romarin-hsieh/investment-dashboard.git
cd investment-dashboard
npm install
npm run seed-data    # 從資料倉庫填入 public/data/（資料不 commit 於本倉庫）
npm run dev          # http://localhost:3000
```

首次執行 `seed-data` 為必要步驟 —— 缺少資料檔時應用不會渲染任何內容（[設定指南](docs/contributing/DATA_REPO_SETUP.md)）。

| 指令 | 用途 |
|---|---|
| `npm run dev` | Vite 開發伺服器（port 3000） |
| `npm run build` | 產出至 `dist/` 的正式建置 |
| `npm run typecheck` | `vue-tsc --noEmit`（CI 型別閘門） |
| `npm test` | 單次執行完整 Vitest 套件 |
| `npm run test:coverage` | 套件加上 v8 覆蓋率報告 |

---

## 資料管線

正式資料由 GitHub Actions 每晚重新產生（[`daily-data-update.yml`](.github/workflows/daily-data-update.yml)、[`update-metadata.yml`](.github/workflows/update-metadata.yml)、[`dataroma-stock-update.yml`](.github/workflows/dataroma-stock-update.yml)）並推送至資料倉庫。本機重新產生，用於預覽管線變更：

```bash
npm run update-daily        # OHLCV + 技術指標 + 每日與報價快照
npm run fetch:fundamentals  # 基本面（正式環境為獨立工作流程）
npm run update:sentiment    # 內部人情緒（正式環境為獨立工作流程）
```

排程與維護程序：[DATA_OPERATIONS.md](docs/operations/DATA_OPERATIONS.md) · 事件處理手冊：[RUNBOOK.md](docs/operations/RUNBOOK.md) · 服務目標：[SLA.md](docs/operations/SLA.md)。

---

## 倉庫結構

```
src/
  pages/         路由層視圖（市場總覽、個股總覽／詳情、營運頁面）
  components/    可重用 UI（StockCard、指標面板、量能分布、圖表 widget）
  composables/   useTheme、useLocale、useKeyboardShortcuts
  services/      導覽、scroll-spy、OHLCV 與量化資料存取
  api/           外部資料擷取（Yahoo Finance client、預算指標讀取器）
  utils/         指標數學、快取、驗證、metadata、設計 token 輔助函式
  locales/       en.json、zh-TW.json（建置期編譯）
  styles/        設計 token；主題、圓角／陰影／間距／字級尺標
scripts/         隔夜 ETL（Python + Node）與資料工具
docs/            PRD、14 份 ADR、規格、手冊、稽核 —— 由 docs/INDEX.md 起
public/data/     預先計算的 JSON，由資料倉庫填入（不 commit）
```

---

## 文件

[docs/INDEX.md](docs/INDEX.md) 是導覽中樞。高流量入口：

- [PRD](docs/product/PRD.md) —— 產品定義、使用者、非目標
- [架構總覽](docs/architecture/OVERVIEW.md) 與 [ADR 索引](docs/architecture/adr/README.md)
- [資料字典](docs/specs/DATA_DICTIONARY.md) —— `public/data/` 每個檔案的 schema
- [新增標的](docs/operations/ADD_NEW_SYMBOL.md) —— 自助式擴充標的池流程
- [稽核](docs/audits/) —— 對抗性 UI/UX 與測試策略審視

## 貢獻

小而聚焦的 pull request，對 `main` 以 squash 合併。維持每一道 CI 閘門為綠；當變更修正 bug 時，回歸測試須於同一 PR 落地。閘門絕不為了讓變更通過而放寬 —— 修程式碼，不修閘門。
