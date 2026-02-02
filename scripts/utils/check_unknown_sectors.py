import os
import json

DATA_DIR = "public/data"
SECTOR_FILE = "public/data/sector_industry.json"

def check():
    try:
        with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            known = set(item['symbol'].upper() for item in data.get('items', []))
    except Exception as e:
        print(f"Error reading {SECTOR_FILE}: {e}")
        return

    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and f != 'sector_industry.json']
    file_symbols = set(f.replace('.json', '').upper() for f in files)

    unknown = file_symbols - known
    
    print(f"Total Files: {len(file_symbols)}")
    print(f"Known Symbols: {len(known)}")
    print(f"Unknown Symbols ({len(unknown)}):")
    for s in sorted(list(unknown)):
        print(f"- {s}")

if __name__ == "__main__":
    check()
