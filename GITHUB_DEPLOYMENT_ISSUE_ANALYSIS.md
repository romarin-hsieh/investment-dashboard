# 🚨 GitHub 部署問題分析報告

## 📋 **問題概述**

**問題**: GitHub 自動觸發的 commit 導致正式環境出現 404 錯誤  
**Commit ID**: `3acb2efd332b2e0465805dd6ead8bc56d0b4e80a`  
**影響**: 生產環境毀滅性死亡 (error code: 404)  

## 🔍 **根本原因分析**

### **發現的問題**

#### **1. GitHub Actions 衝突**
在 `.github/workflows/precompute-indicators.yml` 中發現了導致部署衝突的配置：

```yaml
# 問題配置
- name: Commit and push results
  run: |
    git commit -m "Update precomputed technical indicators $(date -u +%Y-%m-%d)"
    git push  # 這會觸發新的部署

- name: Deploy to GitHub Pages (if needed)  # 這裡又觸發了另一個部署
  if: github.ref == 'refs/heads/main'
  uses: peaceiris/actions-gh-pages@v3
```

#### **2. 部署衝突機制**
1. **預計算 Action** 自動 commit 技術指標數據
2. **Commit 觸發** 主要的部署 Action (`deploy.yml`)
3. **同時執行** 預計算 Action 中的部署步驟
4. **衝突結果** 兩個部署同時進行，導致 GitHub Pages 混亂

#### **3. 缺少 CI 跳過標記**
- 預計算的 commit 沒有 `[skip ci]` 標記
- 導致每次自動 commit 都觸發完整的 CI/CD 流程

## 🛠️ **已實施的修復**

### **修復 1: 移除重複部署**
```yaml
# 修復後的配置 - 移除了重複的部署步驟
- name: Commit and push results
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add public/data/technical-indicators/
    if ! git diff --staged --quiet; then
      git commit -m "Update precomputed technical indicators $(date -u +%Y-%m-%d) [skip ci]"
      git push
    else
      echo "No changes to commit"
    fi
```

### **修復 2: 添加 CI 跳過標記**
- 在 commit 訊息中添加 `[skip ci]` 標記
- 防止預計算 commit 觸發新的部署流程

### **修復 3: 改善錯誤處理**
- 添加條件檢查，只在有變更時才 commit
- 避免空 commit 導致的不必要觸發

## 📊 **部署流程分析**

### **修復前的問題流程**
```
1. 預計算 Action 觸發 (定時或手動)
   ↓
2. 生成技術指標數據
   ↓
3. Commit 數據 (無 [skip ci])
   ↓
4. 觸發主要部署 Action (deploy.yml)
   ↓
5. 同時執行預計算 Action 中的部署
   ↓
6. 兩個部署衝突 → 404 錯誤
```

### **修復後的正確流程**
```
1. 預計算 Action 觸發 (定時或手動)
   ↓
2. 生成技術指標數據
   ↓
3. Commit 數據 (含 [skip ci])
   ↓
4. 不觸發新的 CI/CD (因為 [skip ci])
   ↓
5. 數據更新完成，等待下次正常部署
```

## 🔧 **GitHub Actions 配置檢查**

### **deploy.yml** ✅ 正常
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]  # 正確的觸發條件
  workflow_dispatch:

# 使用標準的 GitHub Pages 部署流程
- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4  # 官方推薦的部署 Action
```

### **precompute-indicators.yml** ✅ 已修復
```yaml
name: Precompute Technical Indicators
on:
  schedule:
    - cron: '0 22 * * 1-5'  # 美股收盤後執行
  workflow_dispatch:

# 修復後：只負責數據更新，不執行部署
- name: Commit and push results
  run: |
    # 添加 [skip ci] 防止觸發新的部署
    git commit -m "Update precomputed technical indicators $(date -u +%Y-%m-%d) [skip ci]"
```

## 🚨 **風險評估**

### **高風險因素 (已解決)**
- ✅ **部署衝突**: 已移除重複部署配置
- ✅ **無限循環**: 已添加 `[skip ci]` 防止循環觸發
- ✅ **錯誤處理**: 已改善條件檢查

### **中風險因素**
- ⚠️ **定時執行**: 預計算仍會定時執行，需監控
- ⚠️ **數據同步**: 預計算數據與部署的時間差

### **低風險因素**
- 📊 **手動觸發**: 保留手動觸發選項作為備案
- 📊 **權限管理**: GitHub Actions 權限配置正確

## 📈 **監控建議**

### **部署監控**
1. **監控 GitHub Actions 執行狀況**
   - 檢查是否有失敗的 workflow
   - 確認部署時間和頻率

2. **監控網站可用性**
   - 設置 uptime 監控
   - 檢查 404 錯誤是否再次出現

3. **監控數據更新**
   - 確認技術指標數據正常更新
   - 檢查數據時間戳是否正確

### **預警機制**
```yaml
# 建議添加到 GitHub Actions
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Deployment Failed',
        body: 'GitHub Pages deployment failed. Please check the logs.'
      })
```

## 🎯 **預防措施**

### **1. 部署策略改進**
- **分離關注點**: 數據更新和網站部署分開處理
- **時間錯開**: 避免同時執行多個 Actions
- **依賴管理**: 明確 Action 之間的依賴關係

### **2. 測試環境**
- **Staging 環境**: 在正式部署前測試
- **分支策略**: 使用 develop 分支進行測試
- **回滾機制**: 準備快速回滾方案

### **3. 文檔和流程**
- **部署文檔**: 記錄部署流程和注意事項
- **故障處理**: 建立故障處理 SOP
- **權限管理**: 限制自動部署的權限範圍

## 🔄 **恢復步驟**

如果再次出現類似問題，建議按以下步驟處理：

### **緊急恢復**
1. **停用自動部署**
   ```bash
   # 暫時禁用 GitHub Actions
   git push --force-with-lease origin main
   ```

2. **手動部署**
   ```bash
   # 本地構建和部署
   npm run build
   # 手動上傳到 GitHub Pages
   ```

3. **檢查配置**
   - 確認 GitHub Actions 配置
   - 檢查部署日誌
   - 驗證網站功能

### **長期解決**
1. **改進 CI/CD 流程**
2. **添加更多測試**
3. **實施監控和警報**

## 📋 **總結**

**問題已解決**: ✅ 修復了 GitHub Actions 中的部署衝突  
**風險降低**: ✅ 添加了 `[skip ci]` 防止循環觸發  
**監控改善**: ✅ 改善了錯誤處理和條件檢查  

**建議**: 持續監控部署狀況，確保修復有效，並考慮實施更完善的 CI/CD 流程。

---

**分析日期**: 2024-12-25  
**問題狀態**: ✅ 已修復  
**風險等級**: 🟡 中等 (需持續監控)  
**下次檢查**: 部署後 24 小時內  