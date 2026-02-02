import pandas as pd
import numpy as np

class KineticMarketState:
    def __init__(self, df):
        """
        Initialize with a DataFrame containing 'close' column.
        Expects columns in lowercase: 'open', 'high', 'low', 'close', 'volume'
        """
        self.df = df.copy()
        # Sort by date just in case
        if 'time' in self.df.columns:
            self.df['date_parsed'] = pd.to_datetime(self.df['time'])
            self.df = self.df.sort_values('date_parsed').reset_index(drop=True)
            
    def calc_mcginley(self, period=20):
        """
        Calculates McGinley Dynamic (X-axis: Trend Inertia).
        Formula: MD[i] = MD[i-1] + (Price - MD[i-1]) / (k * (Price/MD[i-1])^4)
        """
        close = self.df['close'].values
        md = np.zeros_like(close)
        md[0] = close[0]
        
        k = float(period)
        
        for i in range(1, len(close)):
            prev = md[i-1]
            price = close[i]
            # Avoid division by zero
            if prev == 0:
                prev = 1e-9
                
            ratio = max(price / prev, 0.001)
            # The magical non-linear acceleration
            md[i] = prev + (price - prev) / (k * (ratio ** 4))
            
        return pd.Series(md, index=self.df.index)

    def calc_stoch_rsi(self, period=14):
        """
        Calculates Stochastic RSI (Y-axis: Momentum Acceleration).
        """
        close = self.df['close']
        delta = close.diff()
        
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        loss = loss.replace(0, 1e-9) # Avoid division by zero
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        min_rsi = rsi.rolling(window=period).min()
        max_rsi = rsi.rolling(window=period).max()
        
        # Avoid division by zero in normalization
        denom = (max_rsi - min_rsi).replace(0, 1e-9)
        stoch_rsi = (rsi - min_rsi) / denom
        
        return stoch_rsi.fillna(0.5) # Default to neutral

    def calc_structure_z(self, period=20, num_std=2):
        """
        Calculates Inverted Bollinger Band Width (Z-axis: Structure Potential).
        Higher Z = Tighter Squeeze = Higher Potential Energy.
        """
        close = self.df['close']
        sma = close.rolling(window=period).mean()
        std = close.rolling(window=period).std()
        
        # BB Width
        bbw = (2 * num_std * std) / sma
        
        # Normalize BBW relative to recent history (100 days) to get "Squeeze Score"
        min_b = bbw.rolling(window=100).min()
        max_b = bbw.rolling(window=100).max()
        
        denom = (max_b - min_b).replace(0, 1e-9)
        
        # Invert: We want Low BBW -> High Z (High Potential)
        # Z = 1 - Normalized_BBW
        z_score = 1 - (bbw - min_b) / denom
        
        return z_score.fillna(0).clip(0, 1)

    def analyze(self):
        """
        Runs all calculations and returns the DataFrame with X, Y, Z coordinates and Signals.
        """
        self.df['mcginley'] = self.calc_mcginley(20)
        
        # X-Slope Calculation (Standardized)
        slope_raw = self.df['mcginley'].diff()
        slope_mean = slope_raw.rolling(50).mean()
        slope_std = slope_raw.rolling(50).std().replace(0, 1e-9)
        self.df['x_trend'] = ((slope_raw - slope_mean) / slope_std).fillna(0).clip(-3, 3)
        
        self.df['y_momentum'] = self.calc_stoch_rsi(14)
        self.df['z_structure'] = self.calc_structure_z(20)
        
        # Generate Signals based on Dossier Logic
        self.df['signal'] = self.df.apply(self._get_signal_tag, axis=1)
        self.df['commentary'] = self.df.apply(self._get_commentary, axis=1)
        
        return self.df

    def _get_signal_tag(self, row):
        x, y, z = row['x_trend'], row['y_momentum'], row['z_structure']
        
        if z > 0.8 and x > 0: return "LAUNCHPAD" # Breakout Setup
        if x > 0.5 and y < 0.2: return "DIP_BUY"   # Trend Pullback
        # v2.0 Optimization: CLIMAX -> MOMENTUM_RUN (Bullish Inertia)
        if x > 1.0 and y > 0.9: return "MOMENTUM_RUN" 
        if x < -0.5: return "AVOID"                # Downtrend
        return "WAIT"                              # Noise

    def _get_commentary(self, row):
        tag = row['signal']
        x = row['x_trend']
        price = row['close']
        mcg = row['mcginley']
        
        trend_status = "BULLISH" if price > mcg else "BEARISH"
        
        if tag == "LAUNCHPAD":
            return f"Volatility Squeeze detected (Z={row['z_structure']:.2f}). Market structure is coiling for a potential move. Monitor for breakout above recent highs."
        elif tag == "DIP_BUY":
            return f"**PRIMARY SETUP**: Strong Trend (X={x:.2f}) + Oversold (Y={row['y_momentum']:.2f}). Statistically the highest win-rate setup. Buy with confidence."
        elif tag == "MOMENTUM_RUN":
            return f"Trend is accelerating (X={x:.2f}). Do NOT sell yet. Use Trailing Stop to capture the 'Fat Tail' run. Do not add new positions."
        elif tag == "AVOID":
            return f"Trend is Down (X={x:.2f}). Price is below dynamic support ({trend_status})."
        else:
            return "Market is incoherent or chopping. Capital preservation is priority."
