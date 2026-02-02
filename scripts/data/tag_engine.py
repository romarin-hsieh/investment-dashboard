"""
Tag Engine
Assigns "Factor Tags" to tickers based on their universe membership and attributes.
This serves as the 'Labeling Layer' for the strategy matrix.
"""

from data.category_universes import CATEGORY_UNIVERSES

# Hardcoded for validation period (2018-2025) to avoid look-ahead bias from current 'marketCap'
MEGA_CAPS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "LLY", "AVGO"]

def get_ticker_tags(ticker):
    """
    Returns a list of tags for a given ticker based on static universe lists.
    e.g. "NVDA" -> ["GROWTH", "BLUE_CHIP", "MEGA_CAP"]
    """
    tags = set()

    # 1. Universe-Based Tags
    if ticker in CATEGORY_UNIVERSES["GROWTH"]:
        tags.add("GROWTH")
    
    if ticker in CATEGORY_UNIVERSES["VALUE"]:
        tags.add("VALUE")

    if ticker in CATEGORY_UNIVERSES["DIVIDEND"]:
        tags.add("DIVIDEND")
        
    if ticker in CATEGORY_UNIVERSES["SMALL_CAP"]:
        tags.add("SMALL_CAP")

    if ticker in CATEGORY_UNIVERSES["BLUE_CHIP"]:
        tags.add("BLUE_CHIP")

    # 2. Size-Based Tags (Overlay)
    if ticker in MEGA_CAPS:
        tags.add("MEGA_CAP")
        tags.discard("SMALL_CAP") # Safety check

    return list(tags)

def get_strategy_mode(tags):
    """
    Determines the primary strategy mode based on tags.
    Hierarchy: GROWTH > VALUE > BLUE_CHIP
    """
    if "GROWTH" in tags or "SMALL_CAP" in tags:
        return "TREND_FOLLOWING"
    elif "VALUE" in tags or "DIVIDEND" in tags:
        return "MEAN_REVERSION"
    else:
        return "BALANCED" # Default for purely Blue Chip or unclassified

if __name__ == "__main__":
    # Test
    test_tickers = ["NVDA", "KO", "IWM", "MSFT"]
    print("--- Tag Engine Test ---")
    for t in test_tickers:
        tags = get_ticker_tags(t)
        mode = get_strategy_mode(tags)
        print(f"{t}: {tags} -> {mode}")
