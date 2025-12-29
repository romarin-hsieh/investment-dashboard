# Data Update Robustness & Retention Specification

## 🎯 目標

將基於時間窗口的更新邏輯改為基於時間戳的版本驅動更新，實施 30 天數據保留策略，並統一所有路徑管理。

## 📊 當前架構分析

### 數據流程
```
GitHub Actions (每日 UTC 02:00)
├── 生成 OHLCV 數據 (135 個文件)
├── 生成技術指標 (67 個文件/日)
├── 更新狀態文件
└── Commit & Push → GitHub Pages
```

### 前端讀取
```
用戶訪問 → status.json → latest_index.json → 具體數據文件 → 渲染
```

### 問題點
- ❌ 固定時間窗口更新不可靠
- ❌ 路徑檢測邏輯分散
- ❌ Repo 大小無限膨脹
- ❌ 快取策略不一致

## 🔧 解決方案

### Task 1: 版本驅動的數據更新檢查

#### 目標
用 `status.json` 時間戳取代固定時間窗口，實現可靠的版本檢查。

#### 實作邏輯
```javascript
// 新的更新檢查流程
async function checkDataVersionAndRefresh() {
  // 1. 強制 no-cache 讀取 status.json
  const statusUrl = paths.status() + '?v=' + Date.now();
  const status = await fetch(statusUrl).then(r => r.json());
  
  // 2. 比較版本
  const currentVersion = status.generatedAt;
  const lastSeenVersion = localStorage.getItem('lastSeenDataVersion');
  
  if (currentVersion !== lastSeenVersion) {
    // 3. 版本變更 - 清除快取並重新載入
    clearRelevantCaches();
    localStorage.setItem('lastSeenDataVersion', currentVersion);
    
    // 4. 重新讀取索引文件
    const indexUrl = paths.technicalIndicatorsIndex() + '?v=' + currentVersion;
    await fetch(indexUrl).then(r => r.json());
    
    // 5. 通知 UI 重新載入數據
    window.location.reload(); // 或軟重載
  }
}
```

#### 要修改的文件
- `src/utils/autoUpdateScheduler.js` - 移除時間窗口邏輯
- 新增 `src/utils/dataVersionService.js` - 版本檢查服務

#### 驗收標準
- ✅ 任何時間打開網站都能正確檢查版本
- ✅ 版本未變更時不會清除快取
- ✅ 版本變更時自動刷新到最新數據

### Task 2: 選擇性快取清除策略

#### 目標
只對固定檔名的索引文件做 no-cache，讓版本化文件正常快取。

#### 快取規則
```javascript
// 需要 cache busting 的文件（檔名固定）
const noCacheFiles = [
  'status.json',
  'technical-indicators/latest_index.json',
  'ohlcv/index.json'
];

// 自然快取的文件（檔名已版本化）
const naturalCacheFiles = [
  'technical-indicators/2025-12-29_AAPL.json',
  'ohlcv/AAPL.json' // 如果每日覆蓋，也需要版本化
];
```

#### 實作方式
```javascript
// 在 baseUrl.js 中新增版本化 helper
export const paths = {
  status: (options = {}) => {
    const url = withBase('data/status.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },
  
  technicalIndicatorsIndex: (options = {}) => {
    const url = withBase('data/technical-indicators/latest_index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  }
};
```

#### 驗收標準
- ✅ 索引文件總是獲取最新版本
- ✅ 日期版本化文件正常快取
- ✅ CDN 快取不會影響數據更新

### Task 3: 統一路徑管理

#### 目標
消除所有分散的路徑檢測邏輯，統一使用 `baseUrl.js`。

#### 要清理的模式
```javascript
// ❌ 要移除的模式
fetch('/data/...')
fetch('./data/...')
hostname === 'romarin-hsieh.github.io'
'/investment-dashboard/'

// ✅ 統一使用
import { paths } from '@/utils/baseUrl'
fetch(paths.status())
```

#### 要修改的文件
- `src/utils/directMetadataLoader.js` ✅ 已完成
- `src/utils/metadataService.js` ✅ 已完成
- `src/utils/precomputedIndicatorsApi.js` ✅ 已完成
- `src/utils/cacheWarmupService.js` ✅ 已完成
- `src/services/ohlcvApi.js` ✅ 已完成
- `src/api/precomputedOhlcvApi.js` ✅ 已完成

#### 驗收標準
- ✅ 全域搜尋不到任何 hardcode 路徑
- ✅ 本地開發和 GitHub Pages 使用相同代碼
- ✅ 所有靜態 JSON 讀取都走 `paths.*()` API

### Task 4: 30 天數據保留策略

#### 目標
防止 repo 無限膨脹，只保留最近 30 天的技術指標文件。

#### 保留策略
```
保留：
├── latest_index.json (永久)
└── 最近 30 天的 YYYY-MM-DD_SYMBOL.json

歸檔：
├── 超過 30 天 → archive-technical-indicators-YYYY-MM.zip
└── 上傳到 GitHub Release assets
```

#### 實作腳本
```javascript
// scripts/archive-old-technical-indicators.js
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30);

// 1. 找出超過 30 天的文件
// 2. 移動到臨時歸檔資料夾
// 3. 按月打包成 zip
// 4. 上傳到 GitHub Release
// 5. 刪除 repo 中的舊文件
// 6. Commit 變更
```

#### 工作流程更新
```yaml
# .github/workflows/daily-data-update.yml
- name: Archive old technical indicators
  run: node scripts/archive-old-technical-indicators.js

- name: Upload to Release Assets
  uses: actions/upload-release-asset@v1
  # 上傳歸檔文件
```

#### 驗收標準
- ✅ `public/data/technical-indicators/` 永遠只有最近 30 天
- ✅ 舊數據可從 Release assets 下載
- ✅ 歸檔過程自動化且冪等

### Task 5: Release Assets 自動化

#### 目標
自動化歸檔文件上傳到 GitHub Releases。

#### 實作方式
```yaml
- name: Create Monthly Release
  run: |
    MONTH=$(date +%Y-%m)
    gh release create "archive-$MONTH" \
      --title "Data Archive $MONTH" \
      --notes "Archived technical indicators for $MONTH" \
      || echo "Release already exists"

- name: Upload Archive
  run: |
    gh release upload "archive-$MONTH" \
      "archive-technical-indicators-$MONTH.zip" \
      --clobber
```

#### 驗收標準
- ✅ 每月自動創建 Release
- ✅ 歸檔文件成功上傳
- ✅ 重複執行不會失敗

## 📋 實作優先順序

### Phase 1: 核心穩定性 (高優先級)
1. **Task 1**: 版本驅動更新 - 解決更新可靠性問題
2. **Task 2**: 快取策略 - 解決 CDN 快取問題
3. **Task 3**: 路徑統一 - 已基本完成，需要驗證

### Phase 2: 長期維護 (中優先級)
4. **Task 4**: 30 天保留策略 - 防止 repo 膨脹
5. **Task 5**: 自動化歸檔 - 完善歸檔流程

## 🧪 測試驗證

### 版本檢查測試
```javascript
// 模擬版本變更
localStorage.setItem('lastSeenDataVersion', 'old-version');
// 修改 status.json 中的 generatedAt
// 重新載入頁面，應該觸發快取清除和數據重載
```

### 路徑一致性測試
```javascript
// 在兩個環境中測試
// 本地: http://localhost:3000
// 生產: https://romarin-hsieh.github.io/investment-dashboard/
// 所有 JSON 文件都應該正常載入
```

### 快取測試
```javascript
// 1. 首次載入 - 設置 lastSeenDataVersion
// 2. 重新載入 - 不應該清除快取
// 3. 模擬版本變更 - 應該清除快取並重載
```

## ⚠️ 風險評估

### 高風險
- **CDN 快取延遲**: status.json 被 CDN 快取可能導致版本檢查失效
- **版本檢查失敗**: 網路問題可能導致版本檢查失敗

### 中風險
- **歸檔過程失敗**: 可能導致舊文件累積
- **Release 上傳失敗**: 歸檔文件可能遺失

### 緩解措施
- 對關鍵文件使用強制 no-cache
- 實作錯誤處理和重試機制
- 定期監控 repo 大小和歸檔狀態

## 🎯 成功指標

### 可靠性指標
- ✅ 99% 的時間用戶能獲取到最新數據
- ✅ 版本檢查響應時間 < 2 秒
- ✅ 零因路徑問題導致的 404 錯誤

### 維護性指標
- ✅ Repo 大小穩定在合理範圍 (< 100MB)
- ✅ 所有路徑管理集中在單一文件
- ✅ 歸檔過程 100% 自動化

### 用戶體驗指標
- ✅ 數據更新對用戶透明
- ✅ 頁面載入時間不受影響
- ✅ 離線快取仍然有效

---

## 📝 開發檢查清單

### Task 1: 版本驅動更新
- [ ] 實作 `dataVersionService.js`
- [ ] 修改 `autoUpdateScheduler.js`
- [ ] 移除時間窗口邏輯
- [ ] 測試版本檢查機制

### Task 2: 快取策略
- [ ] 更新 `baseUrl.js` 支援版本化 URL
- [ ] 修改所有索引文件讀取
- [ ] 測試快取清除邏輯

### Task 3: 路徑統一
- [ ] 驗證所有服務使用 `paths.*()` API
- [ ] 移除殘留的 hardcode 路徑
- [ ] 測試兩個環境的路徑一致性

### Task 4: 數據保留
- [ ] 實作歸檔腳本
- [ ] 更新 GitHub Actions 工作流程
- [ ] 測試歸檔和清理邏輯

### Task 5: Release 自動化
- [ ] 配置 Release 創建和上傳
- [ ] 測試歸檔文件上傳
- [ ] 驗證冪等性

這個規格提供了完整的實作指南，可以直接交給開發團隊執行。每個任務都有明確的目標、實作方式和驗收標準。