@echo off
echo 🧪 本地 OHLCV 資料刷新測試
echo ================================

echo.
echo 📋 檢查環境...
python --version
if %ERRORLEVEL% neq 0 (
    echo ❌ Python 未安裝或不在 PATH 中
    pause
    exit /b 1
)

node --version
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js 未安裝或不在 PATH 中
    pause
    exit /b 1
)

echo.
echo 📦 檢查 Python 依賴...
python -c "import yfinance, pandas, numpy; print('✅ Python 依賴已安裝')"
if %ERRORLEVEL% neq 0 (
    echo ❌ Python 依賴缺失，正在安裝...
    pip install yfinance pandas numpy
    if %ERRORLEVEL% neq 0 (
        echo ❌ 依賴安裝失敗
        pause
        exit /b 1
    )
)

echo.
echo 🧪 階段 1: 小規模測試 (3個符號)
echo =====================================
python scripts/generate-real-ohlcv-yfinance.py --days 90 --interval 1d --symbols "NVDA,ONDS,TSM" --min-rows 24

if %ERRORLEVEL% neq 0 (
    echo ❌ OHLCV 生成失敗！
    pause
    exit /b 1
)

echo.
echo 🔍 驗證生成的資料...
python -c "import json, datetime; idx=json.load(open('public/data/ohlcv/index.json')); print(f'✅ Index: {len(idx[\"symbols\"])} symbols, {idx[\"totalFiles\"]} files, {idx[\"report\"][\"successRate\"]} success rate')"

python -c "import json, datetime; data=json.load(open('public/data/ohlcv/onds_1d_90d.json')); print(f'✅ ONDS 最新時間戳: {datetime.datetime.fromtimestamp(data[\"timestamps\"][-1]/1000)}')"

python -c "import json; data=json.load(open('public/data/ohlcv/nvda_1d_90d.json')); print(f'✅ NVDA 最新價格: ${data[\"close\"][-1]:.2f}')"

echo.
echo 🧪 階段 2: 完整流程測試
echo ========================
echo 📈 生成技術指標...
node scripts/generate-daily-technical-indicators.js

if %ERRORLEVEL% neq 0 (
    echo ❌ 技術指標生成失敗！
    pause
    exit /b 1
)

echo.
echo 📋 生成每日快照...
node scripts/generate-daily-snapshot.js

if %ERRORLEVEL% neq 0 (
    echo ❌ 每日快照生成失敗！
    pause
    exit /b 1
)

echo.
echo 📊 更新 status.json...
node scripts/update-status.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Status 更新失敗！
    pause
    exit /b 1
)

echo.
echo 🔍 最終驗證...
python -c "import json; status=json.load(open('public/data/status.json')); print(f'✅ Status 更新時間: {status[\"generated\"]}')"

echo.
echo 📊 統計資訊...
echo OHLCV 檔案數量:
dir public\data\ohlcv\*.json | find /c ".json"

echo 技術指標檔案數量:
dir public\data\technical-indicators\*.json | find /c ".json"

echo.
echo 🎉 本地測試完成！
echo ==================
echo.
echo ✅ 所有階段測試通過
echo 📊 真實 OHLCV 資料已生成
echo 📈 技術指標已更新
echo 📋 每日快照已生成
echo 🔄 快取機制已更新
echo.
echo 🚀 下一步: 啟動開發伺服器測試前端
echo    npm run dev
echo    然後開啟 http://localhost:5173 測試 MFI Volume Profile
echo.
pause