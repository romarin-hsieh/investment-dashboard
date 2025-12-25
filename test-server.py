#!/usr/bin/env python3
"""
簡單的本地測試伺服器
用於測試 test-static-service.html 頁面
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# 設定伺服器參數
PORT = 8080
DIRECTORY = "."

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加 CORS 標頭
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    print(f"🚀 啟動測試伺服器...")
    print(f"📁 目錄: {os.path.abspath(DIRECTORY)}")
    print(f"🌐 URL: http://localhost:{PORT}")
    print(f"🧪 測試頁面: http://localhost:{PORT}/test-static-service.html")
    print(f"📊 資料檔案: http://localhost:{PORT}/public/data/sector_industry.json")
    print()
    print("按 Ctrl+C 停止伺服器")
    print("-" * 60)
    
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 伺服器已停止")
        sys.exit(0)
    except Exception as e:
        print(f"❌ 伺服器錯誤: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()