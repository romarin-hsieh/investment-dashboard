import sys
import os
import argparse
import subprocess

# Add local directory to path so `data.*` package imports resolve when run
# either from the repo root or from scripts/.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from data.tracked_symbols import load_tracked_symbols


def main():
    parser = argparse.ArgumentParser(
        description="Batch-crawl Dataroma for the tracked stock universe "
                    "(config/stocks.json — the ADR-0012 single source of truth)."
    )
    parser.add_argument(
        "--priority", type=int, default=None,
        help="Only crawl symbols with this priority value (default: all enabled).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print the resolved ticker list and exit without crawling.",
    )
    args = parser.parse_args()

    # 1. Resolve the ticker universe from config (no hardcoded list).
    tickers = load_tracked_symbols(enabled_only=True, priority=args.priority)
    scope = "all enabled" if args.priority is None else f"priority={args.priority}"
    print(f"Found {len(tickers)} tickers to process "
          f"(source: config/stocks.json, scope: {scope}).")

    if args.dry_run:
        print(", ".join(tickers))
        return

    # 2. Process each ticker via the single-ticker crawler (isolated subprocess).
    failed = []
    success = []

    for i, ticker in enumerate(tickers):
        print(f"[{i + 1}/{len(tickers)}] Processing {ticker}...")
        try:
            result = subprocess.run(
                [sys.executable, "scripts/crawl_dataroma_stock.py", "--ticker", ticker],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                print(f"SUCCESS: {ticker}")
                success.append(ticker)
            else:
                print(f"FAILED: {ticker}")
                print(f"Error output: {result.stderr}")
                failed.append(ticker)

        except Exception as e:
            print(f"EXCEPTION for {ticker}: {e}")
            failed.append(ticker)

    # 3. Summary
    print("\n" + "=" * 30)
    print("BATCH CRAWL COMPLETE")
    print(f"Total: {len(tickers)}")
    print(f"Success: {len(success)}")
    print(f"Failed: {len(failed)}")

    if failed:
        print(f"Failed Tickers: {', '.join(failed)}")


if __name__ == "__main__":
    main()
