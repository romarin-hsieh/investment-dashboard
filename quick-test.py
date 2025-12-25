#!/usr/bin/env python3
"""
快速測試腳本 - 驗證伺服器和資料
"""

import requests
import json
import sys

def test_server():
    base_url = "http://localhost:8080"
    
    print("🧪 快速伺服器測試")
    print("=" * 40)
    
    # 測試 1: 測試頁面
    try:
        response = requests.get(f"{base_url}/test-static-service.html", timeout=5)
        if response.status_code == 200:
            print("✅ 測試頁面可訪問")
        else:
            print(f"❌ 測試頁面錯誤: {response.status_code}")
    except Exception as e:
        print(f"❌ 測試頁面連接失敗: {e}")
        return False
    
    # 測試 2: 主要資料檔案
    try:
        response = requests.get(f"{base_url}/public/data/sector_industry.json", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 主要資料檔案可訪問 ({len(data.get('items', []))} 個股票)")
            
            # 驗證資料結構
            if 'items' in data and 'sector_grouping' in data:
                print("✅ 資料結構正確")
            else:
                print("❌ 資料結構不完整")
                
        else:
            print(f"❌ 主要資料檔案錯誤: {response.status_code}")
    except Exception as e:
        print(f"❌ 主要資料檔案連接失敗: {e}")
    
    # 測試 3: 回退資料檔案
    try:
        response = requests.get(f"{base_url}/public/data/symbols_metadata.json", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 回退資料檔案可訪問 ({len(data.get('items', []))} 個股票)")
        else:
            print(f"❌ 回退資料檔案錯誤: {response.status_code}")
    except Exception as e:
        print(f"❌ 回退資料檔案連接失敗: {e}")
    
    print()
    print("🎯 測試完成！請在瀏覽器中訪問:")
    print(f"   {base_url}/test-static-service.html")
    print()
    
    return True

if __name__ == "__main__":
    test_server()