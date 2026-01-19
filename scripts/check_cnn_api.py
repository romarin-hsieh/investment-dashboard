import requests
import json
import datetime

def check_cnn():
    url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        print(f"Fetching from {url}...")
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            # Structure usually: { "fear_and_greed": { "score": ..., "rating": ... } }
            # Or graph data list
            print("Success! Data received.")
            
            # Print sample
            print(json.dumps(data, indent=2)[:500])
            
            # Check latest value
            if 'fear_and_greed' in data:
                 print(f"Current Score: {data['fear_and_greed'].get('score')}")
                 print(f"Rating: {data['fear_and_greed'].get('rating')}")
            elif 'fear_and_greed_historical' in data:
                 latest = data['fear_and_greed_historical']['data'][-1]
                 print(f"Latest History: {latest}")
            
            return True
        else:
            print(f"Failed. Status Code: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    check_cnn()
