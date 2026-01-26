"""
Category Universes Definition (ETF Proxy Method)
Frozen as of Early 2026 (based on late 2025 filings)

Source ETFs:
- GROWTH: VUG (Vanguard Growth)
- VALUE: VTV (Vanguard Value)
- DIVIDEND: VYM (High Dividend Yield)
- SMALL_CAP: IWM (Russell 2000) - Representative sample
- BLUE_CHIP: DIA (Dow Jones Industrial Average)
"""

CATEGORY_UNIVERSES = {
    "GROWTH": [
        "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", 
        "META", "AVGO", "TSLA", "LLY", "V", 
        "MA", "NFLX", "PLTR", "COST", "AMD", 
        "ORCL", "CRM", "MCD", "LRCX", "INTU"
    ],
    "VALUE": [
        "JPM", "BRK-B", "XOM", "JNJ", "WMT", 
        "ABBV", "BAC", "HD", "PG", "MU", 
        "UNH", "WFC", "CVX", "IBM", "CSCO", 
        "CAT", "MRK", "GS", "PM", "RTX"
    ],
    "DIVIDEND": [
        "AVGO", "JPM", "XOM", "JNJ", "WMT", 
        "ABBV", "BAC", "HD", "PG", "CSCO", 
        "UNH", "WFC", "CVX", "IBM", "KO", 
        "CAT", "MRK", "GS", "PM", "RTX"
    ],
    "SMALL_CAP": [
        "BE", "CRDO", "KTOS", "HL", "FN", 
        "SATS", "IONQ", "CDE", "NXT", "GH", 
        "CVLT", "QBTS", "MDGL", "BBIO", "HQY", 
        "DY", "STRL", "RMBS", "HIMS", "ACHR"
    ],
    "BLUE_CHIP": [
        "GS", "CAT", "MSFT", "HD", "AXP", 
        "SHW", "UNH", "AMGN", "V", "MCD", 
        "JPM", "IBM", "TRV", "BA", "AAPL", 
        "AMZN", "CRM", "HON", "JNJ", "NVDA"
    ]
}

def get_all_category_tickers():
    """Returns a flat list of unique tickers across all categories."""
    all_tickers = set()
    for tickers in CATEGORY_UNIVERSES.values():
        all_tickers.update(tickers)
    return list(all_tickers)
