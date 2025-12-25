@echo off
echo 🚀 開始正式部署...
echo.

REM 檢查 PowerShell 是否可用
powershell -Command "Write-Host 'PowerShell 可用'" >nul 2>&1
if %errorlevel% equ 0 (
    echo 📋 使用 PowerShell 執行部署...
    powershell -ExecutionPolicy Bypass -File "deploy-production.ps1"
) else (
    echo 📋 使用批次檔執行部署...
    call deploy-production.bat
)

echo.
echo ✅ 部署腳本執行完成
pause