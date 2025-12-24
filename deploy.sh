#!/bin/bash

# Investment Dashboard - GitHub Pages 部署腳本

echo "🚀 開始部署 Investment Dashboard 到 GitHub Pages..."

# 檢查是否在正確的分支
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  警告: 當前不在 main 分支 (當前: $current_branch)"
    echo "是否繼續? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

# 安裝依賴
echo "📦 安裝依賴..."
npm ci

# 構建項目
echo "🔨 構建項目..."
NODE_ENV=production npm run build

# 檢查構建結果
if [ ! -d "dist" ]; then
    echo "❌ 構建失敗: dist 文件夾不存在"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ 構建失敗: index.html 不存在"
    exit 1
fi

echo "✅ 構建成功!"
echo "📁 構建文件:"
ls -la dist/

# 提交並推送到 GitHub
echo "📤 推送到 GitHub..."
git add .
git commit -m "Deploy: Update Investment Dashboard $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

echo "🎉 部署完成!"
echo "🌐 網站將在幾分鐘內更新: https://romarin-hsieh.github.io/investment-dashboard/"
echo "📊 檢查部署狀態: https://github.com/romarin-hsieh/investment-dashboard/actions"