@echo off
echo 🔍 快速符號數據一致性檢查
echo ================================

echo.
echo 📊 運行數據一致性驗證...
node scripts/validate-symbol-consistency.cjs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 檢查完成：所有數據源一致
    echo 💡 可以安全部署到生產環境
) else (
    echo.
    echo ❌ 檢查失敗：發現數據不一致問題
    echo 🛠️ 請根據上方建議修復問題後重新檢查
    pause
    exit /b 1
)

echo.
echo 🚀 如果要部署，請運行：
echo    deploy-production.bat
echo.
pause