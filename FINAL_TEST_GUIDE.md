# 🧪 Static Service 最終測試指南

## 📋 測試環境準備

### ✅ 快取清理完成
- 🗑️ 清理了 dist 目錄中的舊建置檔案
- 🔄 重新生成了乾淨的測試資料
- 📊 更新了 sector_industry.json (8個股票，包含成功和回退資料)
- 🚀 準備了增強版測試伺服器

### 📁 關鍵檔案狀態
- ✅ `test-static-service.html` - 主要測試頁面
- ✅ `public/data/sector_industry.json` - 主要資料來源 (8個股票)
- ✅ `public/data/symbols_metadata.json` - 回退資料來源
- ✅ `src/utils/staticSectorIndustryService.js` - 服務實作
- ✅ `test-server-enhanced.py` - 增強版測試伺服器

## 🚀 啟動測試環境

### 1. 啟動增強版測試伺服器
```bash
python test-server-enhanced.py
```

### 2. 開啟測試頁面
瀏覽器訪問: `http://localhost:8080/test-static-service.html`

## 🧪 測試步驟清單

### 階段 1: 基本功能測試
- [ ] **1.1 頁面載入**: 確認頁面正常載入，無 JavaScript 錯誤
- [ ] **1.2 服務狀態**: 點擊「檢查狀態」，確認顯示 8 個股票
- [ ] **1.3 資料來源**: 確認顯示 "github_actions_python" 資料來源

### 階段 2: 單個股票測試
- [ ] **2.1 預設測試**: 點擊「測試單個股票 (CRM)」
- [ ] **2.2 資料顯示**: 確認顯示 CRM 的完整資訊
  - Sector: Technology
  - Industry: Enterprise Software
  - Exchange: NYSE
  - Confidence: 1.0
  - Source: yfinance_python

### 階段 3: 批量股票測試
- [ ] **3.1 批量查詢**: 點擊「測試批量股票」
- [ ] **3.2 結果驗證**: 確認顯示 6 個股票的資訊網格
- [ ] **3.3 統計資訊**: 檢查 Sector 分佈和資料來源統計

### 階段 4: 自訂股票測試
- [ ] **4.1 成功案例**: 輸入 "ASTS" 並測試
- [ ] **4.2 回退案例**: 輸入 "ONDS" 並測試 (應顯示回退資料)
- [ ] **4.3 失敗案例**: 輸入 "INVALID" 並測試 (應顯示錯誤)

### 階段 5: 快取功能測試
- [ ] **5.1 快取命中**: 重複執行測試，觀察日誌中的快取使用
- [ ] **5.2 強制重載**: 點擊「強制重新載入」
- [ ] **5.3 清除快取**: 點擊「清除快取」並重新測試

### 階段 6: 錯誤處理測試
- [ ] **6.1 網路中斷**: 停止伺服器，觀察錯誤處理
- [ ] **6.2 資料損壞**: 暫時修改 JSON 檔案，測試驗證機制
- [ ] **6.3 回退機制**: 確認回退到 symbols_metadata.json

## 📊 預期測試結果

### 成功指標
- ✅ 所有 8 個股票都能正確載入
- ✅ 6 個高信心度股票 (confidence: 1.0)
- ✅ 2 個回退股票 (confidence: 0.8)
- ✅ 5 個不同的 Sector 分類
- ✅ 快取機制正常運作
- ✅ 統計資訊準確顯示

### 效能指標
- ⚡ 首次載入 < 2 秒
- ⚡ 快取命中 < 100ms
- ⚡ 批量查詢 < 500ms
- ⚡ UI 響應流暢

### 資料品質指標
- 📊 **成功率**: 6/8 = 75% (yfinance)
- 📊 **回退率**: 2/8 = 25% (fallback)
- 📊 **覆蓋率**: 5 個 Sector, 8 個 Industry
- 📊 **信心度**: 平均 0.95

## 🔍 日誌監控重點

### 伺服器日誌
```
📊 [timestamp] 127.0.0.1 - "GET /public/data/sector_industry.json HTTP/1.1" 200 -
📄 [timestamp] 127.0.0.1 - "GET /test-static-service.html HTTP/1.1" 200 -
```

### 瀏覽器控制台
- ✅ 無 JavaScript 錯誤
- ✅ 無 CORS 錯誤
- ✅ 無 404 錯誤
- ✅ 快取日誌正常

## 🎯 測試資料概覽

### 主要測試股票 (高信心度)
1. **ASTS** - Communication Services / Satellite Communications
2. **RIVN** - Consumer Cyclical / Electric Vehicles
3. **PL** - Technology / Satellite Imaging & Analytics
4. **CRM** - Technology / Enterprise Software
5. **NVDA** - Technology / Semiconductors
6. **TSLA** - Consumer Cyclical / Auto Manufacturers

### 回退測試股票 (低信心度)
7. **ONDS** - Technology / Industrial IoT Solutions
8. **RDW** - Industrials / Space Infrastructure

## 🚨 常見問題排除

### 問題 1: 頁面無法載入
- 檢查伺服器是否啟動
- 確認 port 8080 未被占用
- 檢查防火牆設定

### 問題 2: 資料載入失敗
- 檢查 JSON 檔案格式
- 確認檔案路徑正確
- 檢查快取設定

### 問題 3: 快取問題
- 使用瀏覽器開發者工具清除快取
- 檢查 Cache-Control 標頭
- 重新啟動伺服器

## ✅ 測試完成檢查

完成所有測試後，確認：
- [ ] 所有功能正常運作
- [ ] 效能符合預期
- [ ] 錯誤處理正確
- [ ] 日誌無異常
- [ ] 準備好部署到生產環境

---

**測試環境**: Windows 本地開發環境  
**測試時間**: 2025-12-26  
**測試版本**: Enhanced v1.0  
**快取狀態**: 已清理，使用乾淨資料