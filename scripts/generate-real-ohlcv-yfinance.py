#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate real market OHLCV JSON files for GitHub Pages (no CORS proxy needed).

Outputs:
- public/data/ohlcv/{SYMBOL}.json
- public/data/ohlcv/{symbol_lower}_{interval}_{days}d.json  (e.g. onds_1d_90d.json)
- public/data/ohlcv/index.json

JSON schema:
{
  "timestamps": [epoch_ms...],
  "open": [...],
  "high": [...],
  "low": [...],
  "close": [...],
  "volume": [...],
  "metadata": {
    "symbol": "ONDS",
    "period": "1d",
    "days": 90,
    "generated": "2025-12-30T12:34:56Z",
    "source": "yfinance",
    "rows": 64
  }
}
"""

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

import pandas as pd
import yfinance as yf

DAY_MS = 24 * 60 * 60 * 1000


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_mkdir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json_atomic(path: Path, data: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def load_symbols() -> List[str]:
    """Load symbols from the master configuration file.
    
    Source of Truth: public/config/stocks.json
    """
    candidates = [
        Path("public/config/stocks.json"),
        Path("stocks.json"),
    ]
    for p in candidates:
        if p.exists():
            raw = read_json(p)
            # stocks.json: { "stocks": [ { "symbol": "AAPL", ... } ] }
            if isinstance(raw, dict) and "stocks" in raw and isinstance(raw["stocks"], list):
                return [str(item["symbol"]).upper().strip() for item in raw["stocks"] if item.get("enabled", True)]
            
            # Legacy simple list fallback
            if isinstance(raw, dict):
                 if "symbols" in raw and isinstance(raw["symbols"], list):
                    return [str(s).upper().strip() for s in raw["symbols"] if str(s).strip()]
            
    raise FileNotFoundError("Master config 'public/config/stocks.json' not found.")


def to_epoch_ms_index(dt_index: pd.DatetimeIndex) -> List[int]:
    """Convert pandas DatetimeIndex to UTC epoch ms.
    - If tz-aware: convert to UTC
    - If naive: treat as UTC (do NOT localize to runner timezone)
    """
    idx = pd.to_datetime(dt_index)
    if getattr(idx, "tz", None) is not None:
        idx = idx.tz_convert("UTC")
    else:
        idx = idx.tz_localize("UTC")
    # epoch ms
    return [(int(ts.value) // 1_000_000) for ts in idx]


def sanity_check(symbol: str, payload: Dict[str, Any], min_rows: int = 24) -> Optional[str]:
    ts = payload.get("timestamps") or []
    if len(ts) < min_rows:
        return f"{symbol}: too few rows ({len(ts)} < {min_rows})"
    # monotonic increasing
    if any(ts[i] >= ts[i + 1] for i in range(len(ts) - 1)):
        return f"{symbol}: timestamps not strictly increasing"
    # no far-future timestamp (allow now + 1 day)
    now_ms = int(time.time() * 1000)
    if max(ts) > now_ms + DAY_MS:
        return f"{symbol}: future timestamp detected (max_ts={max(ts)}, now={now_ms})"
    # OHLC lengths
    for k in ["open", "high", "low", "close", "volume"]:
        if len(payload.get(k) or []) != len(ts):
            return f"{symbol}: length mismatch for {k}"
    return None


def fetch_ohlcv_yfinance(symbol: str, interval: str, days: int, retries: int = 3, backoff_sec: float = 1.5) -> pd.DataFrame:
    """Fetch OHLCV using yfinance with better error handling."""
    last_err = None
    period = f"{days}d"
    
    for attempt in range(1, retries + 1):
        try:
            print(f"  Attempt {attempt}: Fetching {symbol} data...")
            
            # Try using Ticker().history first (more reliable for single symbols)
            ticker = yf.Ticker(symbol)
            df = ticker.history(
                period=period,
                interval=interval,
                auto_adjust=False,
                actions=False
            )
            
            if df is None or df.empty:
                # Fallback to yf.download
                print(f"  Ticker.history failed, trying yf.download...")
                df = yf.download(
                    tickers=symbol,
                    period=period,
                    interval=interval,
                    auto_adjust=False,
                    actions=False,
                    progress=False,
                    threads=False,
                )
            
            if df is None or df.empty:
                raise RuntimeError("empty dataframe from both methods")
            
            # Debug: print column names and shape
            print(f"  Raw data shape: {df.shape}")
            print(f"  Columns: {list(df.columns)}")
            
            # Handle multi-level columns if present (from yf.download)
            if isinstance(df.columns, pd.MultiIndex):
                # Flatten multi-level columns - take the first level
                df.columns = [col[0] for col in df.columns]
                print(f"  Flattened columns: {list(df.columns)}")
            
            # Check for required columns (case-insensitive)
            required_cols = ["Open", "High", "Low", "Close", "Volume"]
            available_cols = {col.lower(): col for col in df.columns}
            
            # Map to correct column names
            col_mapping = {}
            for req_col in required_cols:
                lower_req = req_col.lower()
                if lower_req in available_cols:
                    col_mapping[available_cols[lower_req]] = req_col
                else:
                    raise RuntimeError(f"Missing required column: {req_col}. Available: {list(df.columns)}")
            
            # Rename columns to standard format
            df = df.rename(columns=col_mapping)
            
            # Keep only required columns
            df = df[required_cols]
            
            # Drop rows with NaNs in essential columns
            initial_rows = len(df)
            df = df.dropna(subset=required_cols, how="any")
            final_rows = len(df)
            
            if df.empty:
                raise RuntimeError("dataframe empty after dropna")
            
            print(f"  Cleaned data: {final_rows}/{initial_rows} rows, date range: {df.index[0]} to {df.index[-1]}")
            return df
            
        except Exception as e:
            last_err = e
            print(f"  Attempt {attempt} failed: {str(e)}")
            if attempt < retries:
                sleep_s = backoff_sec * (2 ** (attempt - 1))
                print(f"  Retrying in {sleep_s}s...")
                time.sleep(sleep_s)
            else:
                break
    
    raise RuntimeError(f"yfinance fetch failed for {symbol} after {retries} attempts: {last_err}")


def df_to_payload(symbol: str, df: pd.DataFrame, interval: str, days: int) -> Dict[str, Any]:
    timestamps = to_epoch_ms_index(df.index)
    return {
        "timestamps": timestamps,
        "open": [float(x) for x in df["Open"].tolist()],
        "high": [float(x) for x in df["High"].tolist()],
        "low": [float(x) for x in df["Low"].tolist()],
        "close": [float(x) for x in df["Close"].tolist()],
        "volume": [float(x) for x in df["Volume"].tolist()],
        "metadata": {
            "symbol": symbol,
            "period": interval,          # ✅ 對齊舊 schema 用 period
            "days": days,
            "generated": utc_now_iso(),  # ✅ 對齊舊 schema 用 generated
            "source": "yfinance",
            "note": "Real market data for accurate MFI/VP calculations"
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=1825)
    parser.add_argument("--interval", type=str, default="1d", choices=["1d", "1h", "1wk", "1mo"])
    parser.add_argument("--output-dir", type=str, default="public/data/ohlcv")
    parser.add_argument("--min-rows", type=int, default=24)
    parser.add_argument("--symbols", type=str, default="", help="Comma-separated symbols override (e.g. TSM,NVDA)")
    parser.add_argument("--sleep-between", type=float, default=0.4)
    args = parser.parse_args()
    
    out_dir = Path(args.output_dir)
    safe_mkdir(out_dir)
    
    if args.symbols.strip():
        symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    else:
        symbols = load_symbols()
    
    generated_at = utc_now_iso()
    
    ok = 0
    failed = 0
    items = []
    files_all: List[str] = []
    
    # Special mapping for Fear & Greed indices
    # Key: Yahoo Finance Ticker, Value: Output Filename (stem)
    # Note: Regular stocks use their symbol as filename
    SPECIAL_MAPPING = {
        "^GSPC": "FOREXCOM_SPXUSD",
        "^VIX": "TVC_VIX",
        "TLT": "NASDAQ_TLT",
        "JNK": "NASDAQ_JNK"
    }
    
    # Add special symbols to the list if not present
    for yf_ticker in SPECIAL_MAPPING.keys():
        if yf_ticker not in symbols:
            symbols.append(yf_ticker)

    print(f"🚀 Starting real OHLCV data generation for {len(symbols)} symbols...")
    
    for sym in symbols:
        sym = sym.upper()
        
        # Determine output filename
        # If it's a special symbol, use the mapped name. Otherwise use symbol.
        if sym in SPECIAL_MAPPING:
            out_name = SPECIAL_MAPPING[sym]
        else:
            # Standard cleanup for Windows/URL safety
            out_name = sym.replace(":", "_")
            
        target_a = out_dir / f"{out_name}.json"
        target_b = out_dir / f"{out_name.lower()}_{args.interval}_{args.days}d.json"
        
        try:
            print(f"📊 Fetching {sym} (saving as {out_name})...")
            df = fetch_ohlcv_yfinance(sym, args.interval, args.days)
            # Pass the mapped name as symbol in metadata so frontend matches it?
            # Or keep original? Frontend likely ignores metadata symbol for logic, uses filename/request.
            # But let's use the mapped name in metadata to be safe and consistent.
            payload_symbol = out_name 
            payload = df_to_payload(payload_symbol, df, args.interval, args.days)
            
            err = sanity_check(sym, payload, min_rows=args.min_rows)
            if err:
                raise RuntimeError(err)
            
            write_json_atomic(target_a, payload)
            write_json_atomic(target_b, payload)
            
            ok += 1
            files_all.extend([f"{target_a.name}", f"{target_b.name}"])
            
            items.append({
                "symbol": sym,
                "files": [f"{target_a.name}", f"{target_b.name}"],
                "rows": len(payload["timestamps"]),
                "lastTimestamp": payload["timestamps"][-1] if payload["timestamps"] else None,
                "priceRange": {
                    "min": min(payload["low"]),
                    "max": max(payload["high"]),
                    "latest": payload["close"][-1] if payload["close"] else None
                },
                "status": "ok",
            })
            
            print(f"✅ {sym}: {len(payload['timestamps'])} points, latest: ${payload['close'][-1]:.2f}")
            
        except Exception as e:
            failed += 1
            print(f"❌ {sym}: {str(e)}")
            # IMPORTANT: do not delete existing files on failure
            items.append({
                "symbol": sym,
                "files": [f"{target_a.name}", f"{target_b.name}"],
                "status": "failed",
                "error": str(e),
            })
        
        time.sleep(args.sleep_between)
    
    # ✅ index.json：向下相容舊前端 schema（symbols/files/totalFiles/period/dataPoints/generated）
    index_payload = {
        "generated": generated_at,
        "symbols": symbols,                 # ✅ 前端 getAvailableSymbols() 需要
        "files": files_all,                 # ✅ 方便 debug/檢查
        "totalFiles": len(files_all),
        "dataPoints": args.days,
        "period": args.interval,
        "source": "yfinance",
        "note": "Real OHLCV data for both ohlcvApi and precomputedOhlcvApi",
        # 額外附加報表（不影響舊前端）
        "report": {
            "totalSymbols": len(symbols),
            "ok": ok,
            "failed": failed,
            "successRate": f"{(ok / len(symbols) * 100):.1f}%" if symbols else "0%",
            "items": items
        }
    }
    
    write_json_atomic(out_dir / "index.json", index_payload)
    
    # Summary
    print(f"\n📊 Generation Summary:")
    print(f"✅ Successful: {ok}/{len(symbols)} ({(ok / len(symbols) * 100):.1f}%)")
    print(f"❌ Failed: {failed}")
    print(f"📁 Total files: {len(files_all)}")
    print(f"📋 Index: {out_dir / 'index.json'}")
    
    # ok=0 才 fail（避免完全無資料）
    if ok == 0:
        print("❌ All symbols failed. Aborting.")
        return 2
    
    print(f"🎉 Real OHLCV data generation completed!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())