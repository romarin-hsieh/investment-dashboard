# 投資儀表板部署指南

## 🚀 部署選項

### 1. GitHub Pages (免費推薦)

**步驟：**
1. 將代碼推送到 GitHub repository
2. 在 GitHub repository 設置中啟用 GitHub Pages
3. 選擇 "GitHub Actions" 作為部署源
4. 代碼推送到 main 分支時會自動部署

**訪問地址：** `https://yourusername.github.io/investment-dashboard/`

### 2. Zeabur 部署

**步驟：**
1. 註冊 [Zeabur](https://zeabur.com) 帳號
2. 連接 GitHub repository
3. 選擇 Node.js 模板
4. 自動檢測 `zeabur.json` 配置並部署

**特點：** 
- 免費額度充足
- 支持自定義域名
- 自動 HTTPS

### 3. Vercel 部署

**步驟：**
1. 註冊 [Vercel](https://vercel.com) 帳號
2. 導入 GitHub repository
3. 自動檢測 Vue.js 項目並部署

**命令行部署：**
```bash
npm install -g vercel
vercel login
npm run deploy:vercel
```

### 4. Netlify 部署

**步驟：**
1. 註冊 [Netlify](https://netlify.com) 帳號
2. 拖拽 `dist` 文件夾到 Netlify 部署區域
3. 或連接 GitHub repository 自動部署

**命令行部署：**
```bash
npm install -g netlify-cli
netlify login
npm run build
npm run deploy:netlify
```

### 5. Docker 部署

**本地構建：**
```bash
docker build -t investment-dashboard .
docker run -p 80:80 investment-dashboard
```

**Docker Compose：**
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

## 🔧 環境變量配置

如果需要配置環境變量（如 Google Sheets API），在各平台添加：

```env
VITE_GOOGLE_SHEETS_API_KEY=your_api_key
VITE_GOOGLE_SHEETS_ID=your_sheet_id
```

## 📊 性能優化

部署前建議：
1. 運行 `npm run build` 確保構建成功
2. 運行 `npm run preview` 本地預覽生產版本
3. 檢查 `dist` 文件夾大小（應該 < 10MB）

## 🌐 自定義域名

大部分平台都支持自定義域名：
- **GitHub Pages**: 在 repository 設置中添加 CNAME
- **Vercel/Netlify**: 在項目設置中添加域名
- **Zeabur**: 在服務設置中綁定域名

## 🔒 安全考慮

- 所有平台都提供免費 HTTPS
- 敏感配置使用環境變量
- 定期更新依賴包

## 📈 監控和分析

建議添加：
- Google Analytics
- 錯誤監控 (Sentry)
- 性能監控 (Web Vitals)