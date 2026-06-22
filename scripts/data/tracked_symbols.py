"""
Tracked-symbol universe loader — the single source of truth for "which stocks
do we track".

The canonical universe lives in config/stocks.json: the same file the
self-service add-symbol flow (ADR-0012) and the nightly metadata / ETL read.
This helper exposes it to the Python crawlers so the Dataroma crawl is
config-driven instead of carrying its own hardcoded ticker list.
"""
import io
import json
from pathlib import Path

# scripts/data/tracked_symbols.py -> repo root is two parents up.
_CONFIG = Path(__file__).resolve().parents[2] / "config" / "stocks.json"


def load_tracked_symbols(enabled_only=True, priority=None):
    """Return tracked stock symbols from config/stocks.json.

    Args:
        enabled_only: keep only entries whose ``enabled`` is not False.
        priority: if given, keep only entries with this ``priority`` value.

    Returns:
        A sorted, de-duplicated list of uppercase symbols. Index/ETF-style
        ``^`` tickers are excluded — Dataroma covers individual equities only.
    """
    with io.open(_CONFIG, encoding="utf-8") as fh:
        data = json.load(fh)

    stocks = data.get("stocks", data) if isinstance(data, dict) else data

    symbols = set()
    for entry in stocks:
        if enabled_only and not entry.get("enabled", True):
            continue
        if priority is not None and entry.get("priority") != priority:
            continue
        sym = str(entry.get("symbol", "")).strip().upper()
        if sym and not sym.startswith("^"):
            symbols.add(sym)

    return sorted(symbols)


if __name__ == "__main__":
    syms = load_tracked_symbols()
    print(f"{len(syms)} tracked symbols from {_CONFIG}:")
    print(", ".join(syms))
