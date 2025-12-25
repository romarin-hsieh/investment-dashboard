#!/usr/bin/env python3
"""
增強版本地測試伺服器
包含快取控制和詳細日誌
用於最終測試 test-static-service.html 頁面
"""

import http.server
import socketserver
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# 設定伺服器參數
PORT = 8080
DIRECTORY = "."

class EnhancedHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加 CORS 標頭
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # 添加快取控制標頭
        if self.path.endswith('.json'):
            # JSON 檔案不快取，確保總是獲取最新資料
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        elif self.path.endswith('.html'):
            # HTML 檔案短時間快取
            self.send_header('Cache-Control', 'max-age=60')
        else:
            # 其他檔案正常快取
            self.send_header('Cache-Control', 'max-age=3600')
        
        super().end_headers()
    
    def log_message(self, format, *args):
        # 增強日誌格式
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        client_ip = self.address_string()
        message = format % args
        
        # 特殊標記重要請求
        if '.json' in message:
            print(f"📊 [{timestamp}] {client_ip} - {message}")
        elif '.html' in message:
            print(f"📄 [{timestamp}] {client_ip} - {message}")
        elif '404' in message:
            print(f"❌ [{timestamp}] {client_ip} - {message}")
        else:
            print(f"📁 [{timestamp}] {client_ip} - {message}")

def print_server_info():
    print("🚀 增強版測試伺服器啟動")
    print("=" * 60)
    print(f"📁 服務目錄: {os.path.abspath(DIRECTORY)}")
    print(f"🌐 伺服器 URL: http://localhost:{PORT}")
    print(f"🧪 測試頁面: http://localhost:{PORT}/test-static-service.html")
    print(f"📊 資料檔案: http://localhost:{PORT}/public/data/sector_industry.json")
    print(f"🔄 回退資料: http://localhost:{PORT}/public/data/symbols_metadata.json")
    print()
    print("🎯 快取控制:")
    print("   - JSON 檔案: 無快取 (no-cache)")
    print("   - HTML 檔案: 60秒快取")
    print("   - 其他檔案: 1小時快取")
    print()
    print("📋 測試檢查清單:")
    print("   ✅ 1. 開啟測試頁面")
    print("   ✅ 2. 檢查服務狀態")
    print("   ✅ 3. 測試單個股票 (CRM)")
    print("   ✅ 4. 測試批量股票")
    print("   ✅ 5. 測試自訂股票")
    print("   ✅ 6. 測試快取功能")
    print("   ✅ 7. 檢查統計資訊")
    print()
    print("按 Ctrl+C 停止伺服器")
    print("=" * 60)

def check_files():
    """檢查必要檔案是否存在"""
    required_files = [
        'test-static-service.html',
        'public/data/sector_industry.json',
        'public/data/symbols_metadata.json',
        'src/utils/staticSectorIndustryService.js'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ 缺少必要檔案:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        print()
        return False
    
    print("✅ 所有必要檔案都存在")
    print()
    return True

def main():
    print_server_info()
    
    # 檢查必要檔案
    if not check_files():
        print("請確保所有必要檔案都存在後再重新啟動伺服器")
        sys.exit(1)
    
    try:
        with socketserver.TCPServer(("", PORT), EnhancedHTTPRequestHandler) as httpd:
            print(f"🟢 伺服器已啟動，監聽 port {PORT}")
            print("等待請求...")
            print()
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 伺服器已停止")
        print("感謝使用增強版測試伺服器！")
        sys.exit(0)
    except Exception as e:
        print(f"❌ 伺服器錯誤: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()