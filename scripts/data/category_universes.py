"""
Category Universes Definition (ETF Proxy Method)
Frozen as of Early 2026 (based on late 2025 filings)
Updated to include all dashboard tracked stocks (>70 symbols).

Source ETFs:
- GROWTH: VUG (Vanguard Growth)
- VALUE: VTV (Vanguard Value)
- DIVIDEND: VYM (High Dividend Yield)
- SMALL_CAP: IWM (Russell 2000) - Representative sample
- BLUE_CHIP: DIA (Dow Jones Industrial Average)
"""

CATEGORY_UNIVERSES = {
    "GROWTH": [
        "NVDA", "MSFT", "GOOG", "AMZN", "META", 
        "TSLA", "NFLX", "AVGO", "CRM", "PLTR", 
        "MDB", "ORCL", "TSM", "AMD", "LRCX", 
        "ADBE", "PANW", "CRWD", "DDOG", "APP",
        "ZETA", "ALAB", "MU", "SMCI", "VRT",
        "NET", "ZS", "SE", "MELI", "GRAB",
        "DUOL", "PATH", "INTR", "KSPI", "SNDK"
    ],
    "VALUE": [
        "JPM", "BRK-B", "XOM", "JNJ", "WMT", 
        "ABBV", "BAC", "HD", "PG", "CSCO", 
        "CVX", "IBM", "CAT", "MRK", "GS", 
        "PM", "RTX", "V", "MA", "COST",
        "UNH", "WFC", "INTU", "AXP", "TRV",
        "BA", "HON", "MMM", "KO", "MCD"
    ],
    "DIVIDEND": [
        "VYM", "SCHD", "VIG", "DGRO", "VNQ",
        "O", "MAIN", "JEPI", "JEPQ", "DIVO"
    ],
    "SMALL_CAP": [
        "IWM", "RIVN", "PL", "ONDS", "RDW", 
        "AVAV", "RKLB", "ASTS", "ACHR", "JOBY",
        "HIMS", "IONQ", "RGTI", "QBTS", "D-WAVE",
        "LUNR", "RBRK", "SOFI", "HOOD", "NU",
        "CLSK", "IREN", "WULF", "CIFR", "HUT",
        "CRWV", "TMDX", "CHYM", "CRCL", "AXON",
        "KTOS", "BE", "EOSE", "SMR", "OKLO",
        "LEU", "CCJ", "UUUU", "MP", "BWXT",
        "VST", "CEG", "ETN", "GEV", "POWL",
        "UMAC", "FIG", "COIN", "IBKR", "RR"
    ],
    "BLUE_CHIP": [
        "DIA", "SPY", "QQQ", "IWM", "VUG", 
        "VTV", "GLD", "SLV", "USO", "UNG"
    ]
}

def get_all_category_tickers():
    """Returns a flat list of unique tickers across all categories."""
    all_tickers = set()
    for tickers in CATEGORY_UNIVERSES.values():
        all_tickers.update(tickers)
    # Filter out placeholders or indices if needed, but for now we keep everything that looks like a ticker
    # Ensure standard tickers like 'GOOGL' vs 'GOOG' are handled if needed. Using 'GOOG' as per config.
    return list(all_tickers)
