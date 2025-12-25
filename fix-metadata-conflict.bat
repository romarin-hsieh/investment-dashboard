@echo off
chcp 65001 >nul
echo 🔧 修復 Metadata 更新衝突
echo ========================
echo.

echo 📋 解決 Git 衝突並重新觸發 metadata 更新...

echo 📝 Step 1: 拉取遠端變更...
git pull origin main --rebase

echo.
echo 📤 Step 2: 推送解決衝突...
git push origin main

echo.
echo 🔄 Step 3: 手動觸發 metadata 更新...
git commit --allow-empty -m "🔄 Trigger metadata update after conflict resolution"
git push origin main

echo.
echo ✅ Metadata 更新已重新觸發!
echo.
echo 📊 這將更新:
echo    - CRM, IONQ 等股票的產業標籤
echo    - Exchange 資訊
echo    - Sector/Industry 分類
echo.
echo 🔍 監控更新:
echo    - GitHub Actions: https://github.com/romarin-hsieh/investment-dashboard/actions
echo    - 預計 5-10 分鐘完成
echo.
pause