
import requests
from bs4 import BeautifulSoup

# Try to get Buffett's history page
url = 'https://www.dataroma.com/m/hist.php?m=BRK'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

print(f"Fetching {url}...")
try:
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    print(f"Page Title: {soup.title.string.strip() if soup.title else 'No Title'}")
    
    # Look for links to quarters?
    # Or is there a table?
    main_div = soup.find('div', id='wrap')
    if main_div:
        print("Found #wrap")
        # Look for select options for quarters?
        selects = main_div.find_all('select')
        for select in selects:
             print(f"Found Select: {select.get('name')}")
             options = select.find_all('option')
             print(f"  Options count: {len(options)}")
             for opt in options[:5]:
                 print(f"    {opt.text} -> {opt.get('value')}")
                 
    else:
        print("No #wrap found. Dumping start of look:")
        print(response.text[:500])

except Exception as e:
    print(f"Error: {e}")
