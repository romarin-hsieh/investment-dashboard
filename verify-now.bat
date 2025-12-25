@echo off
echo 🔍 開始部署驗證...
echo.

REM 檢查 PowerShell 是否可用
powershell -Command "Write-Host 'PowerShell 可用'" >nul 2>&1
if %errorlevel% equ 0 (
    echo 📋 使用 PowerShell 執行驗證...
    powershell -ExecutionPolicy Bypass -File "verify-deployment.ps1"
) else (
    echo 📋 使用手動驗證...
    echo 請手動檢查以下連結:
    echo - 主網站: https://romarin-hsieh.github.io/investment-dashboard/
    echo - 資料 API: https://romarin-hsieh.github.io/investment-dashboard/data/sector_industry.json
    echo.
    echo 如果連結可正常訪問，表示部署成功
)

echo.
echo ✅ 驗證腳本執行完成
pause