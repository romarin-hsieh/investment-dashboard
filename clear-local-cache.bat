@echo off
echo 🧹 清理本地端測試環境快取資料...
echo.

REM 清理瀏覽器快取 (Chrome)
echo 📱 清理 Chrome 瀏覽器快取...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 >nul
rd /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Code Cache" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\GPUCache" >nul 2>&1

REM 清理 Edge 瀏覽器快取
echo 📱 清理 Edge 瀏覽器快取...
taskkill /f /im msedge.exe >nul 2>&1
timeout /t 2 >nul
rd /s /q "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache" >nul 2>&1
rd /s /q "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Code Cache" >nul 2>&1

REM 清理 DNS 快取
echo 🌐 清理 DNS 快取...
ipconfig /flushdns >nul 2>&1

REM 清理 Node.js 快取
echo 📦 清理 Node.js 快取...
if exist node_modules\.cache rd /s /q node_modules\.cache >nul 2>&1
if exist .vite rd /s /q .vite >nul 2>&1
if exist dist rd /s /q dist >nul 2>&1

REM 清理 Python 快取
echo 🐍 清理 Python 快取...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" >nul 2>&1
for /r . %%f in (*.pyc) do @if exist "%%f" del /q "%%f" >nul 2>&1

REM 清理臨時檔案
echo 🗑️ 清理臨時檔案...
del /q /s "%TEMP%\*" >nul 2>&1
del /q /s "%TMP%\*" >nul 2>&1

echo.
echo ✅ 本地快取清理完成！
echo 📋 已清理項目:
echo    - Chrome/Edge 瀏覽器快取
echo    - DNS 快取
echo    - Node.js 建置快取
echo    - Python 快取檔案
echo    - 系統臨時檔案
echo.
echo 🚀 準備進行最終測試...
pause