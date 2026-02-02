import json
import pandas as pd
import numpy as np
import os

SECTOR_FILE = "public/data/sector_industry.json"
DATA_DIR = "public/data"

# --- 1. Shared Indicators ---
class Indicators:
    @staticmethod
    def mcginley_dynamic(series, period=14):
        # Initialize
        if len(series) == 0: return pd.Series([])
        md = np.zeros(len(series))
        md[0] = series.iloc[0]
        close = series.values
        for i in range(1, len(series)):
            # Avoid division by zero
            denom = md[i-1]
            if denom == 0: denom = 1.0 # fallback
            
            ratio = close[i] / denom
            ratio = max(0.1, min(ratio, 10)) 
            k = period * 0.6
            md[i] = md[i-1] + (close[i] - md[i-1]) / (k * (ratio ** 4))
        return pd.Series(md, index=series.index)

    @staticmethod
    def stoch_rsi(series, period=14, k=3, d=3):
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        # Avoid div by zero
        loss = loss.replace(0, 0.0001)
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        rsi_min = rsi.rolling(period).min()
        rsi_max = rsi.rolling(period).max()
        denom = rsi_max - rsi_min
        denom = denom.replace(0, 1) # Avoid div by zero
        
        stoch = (rsi - rsi_min) / denom
        k_line = stoch.rolling(k).mean() * 100
        d_line = k_line.rolling(d).mean()
        return k_line, d_line

    @staticmethod
    def bollinger_bands(close, period=20):
        sma = close.rolling(period).mean()
        std = close.rolling(period).std()
        upper = sma + 2 * std
        lower = sma - 2 * std
        # BB Width
        sma_safe = sma.replace(0, 1)
        width = (upper - lower) / sma_safe
        return sma, upper, width

    @staticmethod
    def atr(high, low, close, period=14):
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(period).mean()

# --- 2. Filter Layers (L1 & L2) ---

class MarketRegime:
    """
    L1: Global Filter (SPY vs 200MA)
    L2: Peer Filter (Sector vs 20MA)
    """
    @staticmethod
    def get_global_regime(spy_data):
        if spy_data is None or len(spy_data) < 200:
            return "UNKNOWN" 
            
        current_price = spy_data['close'].iloc[-1]
        ma200 = spy_data['close'].rolling(200).mean().iloc[-1]
        
        return "BULL_RISK_ON" if current_price > ma200 else "BEAR_RISK_OFF"

    @staticmethod
    def get_sector_trend(sector_data):
        # Peer Filter: Check if Sector ETF is above 20MA (Short-term strength)
        if sector_data is None or len(sector_data) < 20: 
            return "NEUTRAL" # Default allow if no data? Or Block? Let's say Neutral allows.
        
        current = sector_data['close'].iloc[-1]
        ma20 = sector_data['close'].rolling(20).mean().iloc[-1]
        return "UP" if current > ma20 else "DOWN"

# --- 3. Strategy Engines (L3 Signal) ---

class StrategyEngine:
    def __init__(self, name):
        self.name = name
    
    def prepare(self, df):
        raise NotImplementedError
        
    def generate_signal(self, df, regime, sector_trend):
        raise NotImplementedError

class EngineV5_Growth(StrategyEngine):
    """
    V5: Growth/Tech
    Filters:
      - L1: Must be BULL
      - L2: Sector Trend must be UP (No falling knives)
      - L3: Squeeze + Breakout
    """
    def __init__(self):
        super().__init__("V5_Growth (Tight)")
        
    def prepare(self, df):
        df['atr'] = Indicators.atr(df['high'], df['low'], df['close'], 14)
        df['ma20'], df['bb_upper'], df['bb_width'] = Indicators.bollinger_bands(df['close'], 20)
        df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
        df['stoch_k'], _ = Indicators.stoch_rsi(df['close'], 14)
        
        # Z-Score of Width for Climax
        width_mean = df['bb_width'].rolling(120).mean()
        width_std = df['bb_width'].rolling(120).std()
        df['width_zscore'] = (df['bb_width'] - width_mean) / width_std
        return df

    def generate_signal(self, df, regime, sector_trend):
        if len(df) < 200: return "NO_DATA", "Insufficient Data"
        last = df.iloc[-1]
        
        # L1 Global Filter
        if regime == "BEAR_RISK_OFF":
            return "NO_TRADE", "Regime Block (Bear)"
            
        # L2 Peer Filter
        if sector_trend == "DOWN":
            return "WAIT", "Sector Weakness (Peer Down)"

        # L3 Climax Check
        if last['stoch_k'] > 95 and last['width_zscore'] > 2.0:
            return "SELL_CLIMAX", "Climax: Overheated"

        # L3 Entry
        # Allow Squeeze to be True on current OR previous candle (since breakout expands bands)
        prev = df.iloc[-2]
        is_squeeze = (last['bb_width_pct'] < 0.20) or (prev['bb_width_pct'] < 0.20)
        is_breakout = (last['close'] > last['bb_upper'])
        
        if is_squeeze and is_breakout:
            return "BUY_BREAKOUT", "Squeeze Breakout"
            
        return "HOLD", "Trend Continuation"

class EngineV1_Defensive(StrategyEngine):
    """
    V1: Defensive/Value
    Filters:
      - L1: Tolerates Bear (maybe) - User said 'Force Defensive Mode', implies safe to operate.
      - L2: Sector Trend must be UP? User said "No Catching Knives". 
        "If sector falling, wait." -> Logic: Only buy dips in *Uptrending Sectors*.
    """
    def __init__(self):
        super().__init__("V1_Defensive (MeanRev)")

    def prepare(self, df):
        df['mcginley'] = Indicators.mcginley_dynamic(df['close'], 14)
        df['stoch_k'], _ = Indicators.stoch_rsi(df['close'], 14)
        return df
        
    def generate_signal(self, df, regime, sector_trend):
        if len(df) < 20: return "NO_DATA", "Insufficient Data"
        last = df.iloc[-1]
        
        # L2 Peer Filter
        if sector_trend == "DOWN":
            return "WAIT", "Sector Weakness (Peer Down)"
            
        # L3 Entry
        is_uptrend = (last['close'] > last['mcginley'])
        is_oversold = (last['stoch_k'] < 20)
        
        if is_uptrend and is_oversold:
            return "BUY_DIP", "Mean Rev Dip"
            
        return "HOLD", "Wait"

# --- 4. System Controller & Data Provider ---

class DataProvider:
    SECTOR_ETF_MAP = {
        "Technology": "XLK",
        "Healthcare": "XLV",
        "Energy": "XLE",
        "Consumer Cyclical": "XLY",
        "Consumer Defensive": "XLP",
        "Financial Services": "XLF",
        "Industrials": "XLI",
        "Utilities": "XLU",
        "Basic Materials": "XLB",
        "Communication Services": "XLC",
        "Real Estate": "XLRE"
    }
    
    @staticmethod
    def get_etf_ticker(sector):
        return DataProvider.SECTOR_ETF_MAP.get(sector, "SPY")

class QuantSystem:
    def __init__(self):
        self.v5 = EngineV5_Growth()
        self.v1 = EngineV1_Defensive()
        
        self.sector_map = {}
        self.load_metadata()
        
        self.GROUPS = {
            "GROWTH": ["Technology", "Consumer Cyclical", "Unknown"],
            "DEFENSIVE": ["Healthcare", "Utilities", "Communication Services", "Industrials", "Consumer Defensive", "Financial Services", "ETF", "Basic Materials", "Real Estate"],
            "AVOID": ["Energy"] 
        }

    def load_metadata(self):
        try:
            with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data.get('items', []):
                    self.sector_map[item['symbol'].upper()] = item.get('sector', 'Unknown')
        except: pass

    def analyze_ticker(self, ticker, ohlcv_data, spy_data, sector_data=None):
        """
        Main Analysis Pipeline (v6.0)
        """
        ticker = ticker.upper()
        
        # 0. Context
        regime = MarketRegime.get_global_regime(spy_data)
        sector_trend = MarketRegime.get_sector_trend(sector_data)
        
        # 1. Routing
        sector = self.sector_map.get(ticker, "Unknown")
        
        active_engine = None
        if sector in self.GROUPS["GROWTH"]: active_engine = self.v5
        elif sector in self.GROUPS["DEFENSIVE"]: active_engine = self.v1
        elif sector in self.GROUPS["AVOID"]:
             return {
                "Ticker": ticker, 
                "Strategy": "Avoid", 
                "Signal": "NO_TRADE", 
                "Reason": "Sector Avoidance",
                "Regime": regime,
                "SectorTrend": sector_trend
            }
        else: active_engine = self.v1
        
        # 2. Execution
        df_prep = active_engine.prepare(ohlcv_data.copy())
        signal, reason = active_engine.generate_signal(df_prep, regime, sector_trend)
        
        return {
            "Ticker": ticker,
            "Sector": sector,
            "Regime": regime,
            "SectorTrend": sector_trend,
            "Strategy": active_engine.name,
            "Signal": signal,
            "Reason": reason
        }

# Helper for Viz (unchanged)
def get_viz_style(regime, strategy_name):
    style = {}
    if regime == "BULL_RISK_ON":
        style['bg_color'] = 'lightcyan'
        style['status_text'] = "MARKET: BULL (RISK ON)"
    else:
        style['bg_color'] = '#f0f0f0'
        style['status_text'] = "MARKET: BEAR (DEFENSE MODE)"
    if "V5" in strategy_name:
        style['comet_cmap'] = 'autumn' 
        style['zone_highlight'] = 'SQUEEZE_ZONE'
    else:
        style['comet_cmap'] = 'winter'
        style['zone_highlight'] = 'DIP_ZONE'
    return style
