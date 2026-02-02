import os
import json
import pandas as pd
import numpy as np
import sys
from datetime import datetime

# Add project root to path
sys.path.append(os.getcwd())
try:
    from scripts.core.strategy_selector import Indicators, MarketRegime, DataProvider
except ImportError:
    # Handle case where run from scripts/research
    sys.path.append(os.path.join(os.getcwd(), "../../"))
    from scripts.core.strategy_selector import Indicators, MarketRegime, DataProvider

DATA_DIR = "public/data"
SECTOR_FILE = "public/data/sector_industry.json"
OUTPUT_REPORT = "docs/QUANT_SYSTEM_MASTER_REPORT.md"

# --- Configuration ---
INITIAL_CAPITAL = 100000.0
MAX_POSITIONS = 10
POS_SIZE_PCT = 0.10  # 10% per trade
START_DATE = "2018-01-01"
END_DATE = "2025-12-31" 

# Metadata Loading
SECTOR_MAP = {}
try:
    with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for item in data.get('items', []):
            SECTOR_MAP[item['symbol'].upper()] = item.get('sector', 'Unknown')
except: pass

GROUPS = {
    "GROWTH": ["Technology", "Consumer Cyclical", "Unknown"],
    "DEFENSIVE": ["Healthcare", "Utilities", "Communication Services", "Industrials", "Consumer Defensive", "Financial Services", "Basic Materials", "Real Estate"],
    "AVOID": ["Energy"] 
}

class PortfolioSimulator:
    def __init__(self):
        self.market_data = None
        self.sector_data = {} # {SectorName: DF}
        self.symbol_data = {} # {Ticker: DF prepared}
        
        # Portfolio State
        self.cash = INITIAL_CAPITAL
        self.equity_curve = []
        self.positions = {} # {Ticker: {EntryPrice, Size, Shares, EntryDate, StopPrice, Strategy}}
        self.trade_history = []
        
        self.load_data()
        self.prepare_data()

    def load_json_df(self, filename):
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path): return None
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                if isinstance(content, dict) and 'timestamps' in content:
                    df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'open': content['open'], 'high': content['high'], 'low': content['low'], 'close': content['close'], 'volume': content['volume']
                    })
                elif isinstance(content, list):
                    df = pd.DataFrame(content)
                    df['date'] = pd.to_datetime(df['time'])
                
                df = df.sort_values('date').reset_index(drop=True)
                return df
        except: return None

    def load_data(self):
        print("Loading Data...")
        # 1. SPY
        self.market_data = self.load_json_df("SPY.json")
        if self.market_data is not None:
            self.market_data = self.market_data.set_index('date').sort_index()
            # Calc Global Regime (MA200)
            self.market_data['ma200'] = self.market_data['close'].rolling(200).mean()
            self.market_data['is_bull'] = self.market_data['close'] > self.market_data['ma200']
        
        # 2. Sector ETFs
        etf_tickers = set(DataProvider.SECTOR_ETF_MAP.values())
        for etf in etf_tickers:
            df = self.load_json_df(f"{etf}.json")
            if df is not None:
                df = df.set_index('date').sort_index()
                # Calc Peer Trend (MA20)
                df['ma20'] = df['close'].rolling(20).mean()
                df['is_uptrend'] = df['close'] > df['ma20']
                # Map back to Sector Name
                for sec, tick in DataProvider.SECTOR_ETF_MAP.items():
                    if tick == etf:
                        self.sector_data[sec] = df
                        
        # 3. Individual Symbols
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and f != 'sector_industry.json']
        for fname in files:
            sym = fname.replace('.json', '').upper()
            if sym in ['SPY', '^VIX'] or sym in etf_tickers: continue
            
            df = self.load_json_df(fname)
            if df is not None and len(df) > 200:
                self.symbol_data[sym] = df

    def prepare_data(self):
        print(f"Preparing Indicators for {len(self.symbol_data)} symbols...")
        # Pre-calc indicators for everyone
        for sym in list(self.symbol_data.keys()):
            df = self.symbol_data[sym]
            sector = SECTOR_MAP.get(sym, "Unknown")
            
            # Skip Energy
            if sector in GROUPS["AVOID"]: 
                del self.symbol_data[sym]
                continue
                
            # Calc Tech Indicators
            df['atr'] = Indicators.atr(df['high'], df['low'], df['close'], 14)
            
            # Strategy Logic
            strategy = "V1"
            if sector in GROUPS["GROWTH"]:
                strategy = "V5"
                df['ma20'], df['bb_upper'], df['bb_width'] = Indicators.bollinger_bands(df['close'], 20)
                df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
                df['stoch_k'], _ = Indicators.stoch_rsi(df['close'], 14)
                
                # Pre-calc Entry Signal (Part 1: Tech)
                # Squeeze: Current or Prev < 20%
                prev_width = df['bb_width_pct'].shift(1)
                is_squeeze = (df['bb_width_pct'] < 0.20) | (prev_width < 0.20)
                is_breakout = df['close'] > df['bb_upper']
                df['signal_tech'] = is_squeeze & is_breakout
                
                # Pre-calc Climax (for Exit)
                width_mean = df['bb_width'].rolling(120).mean()
                width_std = df['bb_width'].rolling(120).std()
                width_z = (df['bb_width'] - width_mean) / width_std
                df['is_climax'] = (df['stoch_k'] > 95) & (width_z > 2.0)
                
            else: # Defensive V1
                strategy = "V1"
                df['mcginley'] = Indicators.mcginley_dynamic(df['close'], 14)
                df['stoch_k'], _ = Indicators.stoch_rsi(df['close'], 14)
                is_uptrend = df['close'] > df['mcginley']
                is_oversold = df['stoch_k'] < 20
                df['signal_tech'] = is_uptrend & is_oversold
                df['is_climax'] = False # Not used in V1 exit logic usually
            
            df['Strategy'] = strategy
            df['Sector'] = sector
            df.set_index('date', inplace=True)
            self.symbol_data[sym] = df

    def run_simulation(self):
        print(f"Running Event Loop ({START_DATE} to {END_DATE})...")
        
        # Calendar (Align to SPY)
        calendar = self.market_data.index
        calendar = calendar[(calendar >= START_DATE) & (calendar <= END_DATE)]
        
        for date in calendar:
            # 1. Update Equity
            daily_total = self.cash
            holdings_val = 0
            
            # --- Manage Existing Positions ---
            tickers_to_close = []
            
            for sym, pos in self.positions.items():
                if date not in self.symbol_data[sym].index:
                    holdings_val += pos['Size'] # No data, assume unchanged (rare)
                    continue
                    
                row = self.symbol_data[sym].loc[date]
                current_val = pos['Shares'] * row['close']
                holdings_val += current_val
                days_held = (date - pos['EntryDate']).days
                pnl_pct = (row['close'] - pos['EntryPrice']) / pos['EntryPrice']
                
                exit_reason = None
                
                # Update Trailing High (for Stop)
                # In V5 we use ATR stop. V1 uses 5% fixed.
                # Simplified: Just verify exit conditions daily.
                
                if pos['Strategy'] == "V5":
                    # Dynamic Stop loss Logic (Recalculated on entry, fixed or trailing?)
                    # Script said: "Stop 2 ATR" from entry or local high?
                    # Let's use the stop_price stored in pos (Fixed Initial Risk) OR Trailing?
                    # Profitable Trend Following usually trails. Let's trail if price moves up.
                    # Wait, simple validation script used Fixed Stop or Time. Let's stick to simple logic to match validate.py
                    # "if row['close'] < stop_price: SELL_STOP"
                    
                    if row['close'] < pos['StopPrice']: 
                        exit_reason = "Loss (Stop)"
                    elif days_held > 5 and pnl_pct < (0.5 * row['atr'] / row['close']):
                        exit_reason = "Stagnation (Time)"
                    elif row['is_climax']:
                        exit_reason = "Profit (Climax)"
                        
                elif pos['Strategy'] == "V1":
                    if pnl_pct < -0.05: exit_reason = "Loss (Stop)"
                    elif pnl_pct > 0.10: exit_reason = "Profit (Target)"
                    elif days_held > 10: exit_reason = "Stagnation (Time)"
                
                if exit_reason:
                    # Sell
                    self.cash += current_val
                    self.trade_history.append({
                        'Symbol': sym, 'EntryDate': pos['EntryDate'], 'ExitDate': date,
                        'EntryPrice': pos['EntryPrice'], 'ExitPrice': row['close'],
                        'PnL': current_val - pos['Size'], 'PnL_Pct': pnl_pct,
                        'Reason': exit_reason, 'Strategy': pos['Strategy']
                    })
                    tickers_to_close.append(sym)
                    
            for sym in tickers_to_close:
                del self.positions[sym]
                
            # Update Daily Equity Record (After sells)
            portfolio_val = self.cash + sum(self.positions[s]['Shares'] * self.symbol_data[s].loc[date]['close'] for s in self.positions if date in self.symbol_data[s].index)
            self.equity_curve.append({'date': date, 'equity': portfolio_val})
            
            # --- Check New Entries ---
            # Max positions reached?
            if len(self.positions) >= MAX_POSITIONS: continue
            if self.cash < (portfolio_val * POS_SIZE_PCT * 0.9): continue # Not enough cash
            
            # Market Context
            if date not in self.market_data.index: continue
            spy_in_bull = self.market_data.loc[date]['is_bull']
            
            # Filter Candidates
            candidates = []
            
            for sym, df in self.symbol_data.items():
                if sym in self.positions: continue
                if date not in df.index: continue
                
                row = df.loc[date]
                if not row['signal_tech']: continue # No technical signal
                
                # Context Filters
                # V5: Needs Bull + Sector Up
                # V1: Needs Sector Up (Defensive)
                
                if row['Strategy'] == "V5":
                    if not spy_in_bull: continue # Global Filter
                
                # Peer Filter
                sec_name = row['Sector']
                if sec_name in self.sector_data:
                    sec_df = self.sector_data[sec_name]
                    if date in sec_df.index:
                        if not sec_df.loc[date]['is_uptrend']: continue # Sector Down Block
                
                candidates.append(sym)
            
            # Execute Buys
            # Shuffle to avoid alphabetical bias
            np.random.shuffle(candidates)
            
            for sym in candidates:
                if len(self.positions) >= MAX_POSITIONS: break
                
                # Position Sizing
                target_size = portfolio_val * POS_SIZE_PCT
                if self.cash < target_size: target_size = self.cash # Take remainder
                if target_size < 1000: break # Dust
                
                row = self.symbol_data[sym].loc[date]
                price = row['close']
                shares = target_size / price
                
                # Stop Loss Calc
                stop_price = 0
                if row['Strategy'] == "V5":
                    stop_price = price - (2.0 * row['atr'])
                else: 
                    stop_price = price * 0.95 # 5% Stop
                
                self.positions[sym] = {
                    'EntryPrice': price,
                    'Size': target_size,
                    'Shares': shares,
                    'EntryDate': date,
                    'StopPrice': stop_price,
                    'Strategy': row['Strategy']
                }
                self.cash -= target_size

    def generate_report(self):
        # Convert Equity Curve
        df_eq = pd.DataFrame(self.equity_curve).set_index('date')
        df_eq['return_pct'] = df_eq['equity'].pct_change()
        
        # Benchmark SPY
        spy = self.market_data.loc[df_eq.index]['close']
        spy_eq = (spy / spy.iloc[0]) * INITIAL_CAPITAL
        
        # Metrics
        def calc_cagr(series):
            if len(series) < 2: return 0
            years = (series.index[-1] - series.index[0]).days / 365.25
            total_ret = series.iloc[-1] / series.iloc[0]
            return (total_ret ** (1/years)) - 1
            
        def calc_maxdd(series):
            roll_max = series.cummax()
            dd = (series - roll_max) / roll_max
            return dd.min()
            
        def calc_sharpe(returns):
            if returns.std() == 0: return 0
            return (returns.mean() / returns.std()) * (252**0.5)
            
        pf_cagr = calc_cagr(df_eq['equity'])
        sp_cagr = calc_cagr(spy_eq)
        
        pf_mdd = calc_maxdd(df_eq['equity'])
        sp_mdd = calc_maxdd(spy_eq)
        
        pf_sharpe = calc_sharpe(df_eq['return_pct'])
        sp_ret = spy.pct_change()
        sp_sharpe = calc_sharpe(sp_ret)
        
        # Trade Stats
        df_trades = pd.DataFrame(self.trade_history)
        win_rate = len(df_trades[df_trades['PnL'] > 0]) / len(df_trades) if len(df_trades) > 0 else 0
        total_pnl = df_trades['PnL'].sum() if len(df_trades) > 0 else 0
        
        # Output Markdown
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            f.write(f"# Quant System Master Report (v6.0)\n\n")
            f.write(f"**Period**: {START_DATE} to {END_DATE}\n")
            f.write(f"**Initial Capital**: ${INITIAL_CAPITAL:,.0f}\n")
            f.write(f"**Final Equity**: ${df_eq['equity'].iloc[-1]:,.2f}\n\n")
            
            f.write(f"## 1. Portfolio Performance vs Benchmark (SPY)\n")
            f.write(f"| Metric | Quant Portfolio (v6.0) | SPY (Buy & Hold) | Diff |\n")
            f.write(f"| --- | --- | --- | --- |\n")
            f.write(f"| **CAGR (Annual Return)** | **{pf_cagr:.2%}** | {sp_cagr:.2%} | {pf_cagr-sp_cagr:+.2%} |\n")
            f.write(f"| **Sharpe Ratio** | **{pf_sharpe:.2f}** | {sp_sharpe:.2f} | {pf_sharpe-sp_sharpe:+.2f} |\n")
            f.write(f"| **Max Drawdown** | **{pf_mdd:.2%}** | {sp_mdd:.2%} | {pf_mdd-sp_mdd:+.2%} |\n")
            f.write(f"| **Final Amount** | **${df_eq['equity'].iloc[-1]:,.0f}** | ${spy_eq.iloc[-1]:,.0f} | ${df_eq['equity'].iloc[-1]-spy_eq.iloc[-1]:,.0f} |\n\n")
            
            f.write(f"## 2. Trade Statistics\n")
            f.write(f"- **Total Trades**: {len(df_trades)}\n")
            f.write(f"- **Win Rate**: {win_rate:.1%} ({len(df_trades[df_trades['PnL']>0])} wins / {len(df_trades[df_trades['PnL']<=0])} losses)\n")
            f.write(f"- **Best Trade**: {df_trades.loc[df_trades['PnL'].idxmax()]['Symbol']} ({df_trades['PnL'].max():.0f}$)\n" if len(df_trades)>0 else "")
            f.write(f"- **Worst Trade**: {df_trades.loc[df_trades['PnL'].idxmin()]['Symbol']} ({df_trades['PnL'].min():.0f}$)\n" if len(df_trades)>0 else "")
            
            f.write(f"\n## 3. Yearly Breakdown\n")
            f.write(f"| Year | Portfolio Return | SPY Return |\n")
            f.write(f"| --- | --- | --- |\n")
            
            # Yearly Calc
            df_eq['year'] = df_eq.index.year
            years = df_eq['year'].unique()
            for y in years:
                sub = df_eq[df_eq['year'] == y]
                spy_sub = spy[sub.index]
                if len(sub) > 0:
                    y_ret = (sub['equity'].iloc[-1] / sub['equity'].iloc[0]) - 1
                    s_ret = (spy_sub.iloc[-1] / spy_sub.iloc[0]) - 1
                    f.write(f"| {y} | {y_ret:.1%} | {s_ret:.1%} |\n")
            
            f.write(f"\n## 4. Conclusion\n")
            if pf_cagr > sp_cagr and pf_mdd > sp_mdd: # mdd is negative, so higher is better (closer to 0)
                f.write(f"✅ **System BEATS Market**: The strategy generated higher returns with lower risk.\n")
            elif pf_cagr > sp_cagr:
                f.write(f"⚠️ **High Return / High Risk**: System beat SPY in returns but had deeper drawdowns.\n")
            else:
                f.write(f"❌ **System Underperformed**: Failed to beat SPY Buy & Hold.\n")

        print(f"Report Generated: {OUTPUT_REPORT}")

if __name__ == "__main__":
    sim = PortfolioSimulator()
    sim.run_simulation()
    sim.generate_report()
