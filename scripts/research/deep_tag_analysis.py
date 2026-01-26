"""
Deep Tag Analysis (Scientific Protocol - Industrial Grade)
Executes the "Grand Challenge" Validation: 26 Questions across 9 Core Blocks (A-I).
Includes Vectorized Backtesting for N=2000 Bootstrapping.
OPTIMIZED: Pre-calculates Indicators to avoid repetitive processing.
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
import random
from scipy import stats
import json

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from research.quant_engine import KineticMarketState
from data.tag_engine import get_ticker_tags, get_strategy_mode
from data.category_universes import get_all_category_tickers

# Configuration
DATA_DIR = "public/data"
BOOTSTRAP_ROUNDS = 2000
CONFIDENCE_LEVEL = 0.98
ALPHA = 1.0 - CONFIDENCE_LEVEL
RISK_FREE_RATE = 0.04

class AnalysisEngine:
    def __init__(self):
        self.tickers = get_all_category_tickers()
        self.data_cache = {}
        self.indicator_cache = {} # Pre-calculated indicators
        self.spy_returns = None
        self.load_and_prep_data()
        
    def load_and_prep_data(self):
        print("Loading and Pre-calculating Indicators...")
        for t in self.tickers + ['SPY', 'DIA', 'VUG']: 
            path = f"{DATA_DIR}/{t}.json"
            if os.path.exists(path):
                try:
                    df = pd.read_json(path)
                    df.columns = [c.lower() for c in df.columns]
                    if 'time' in df.columns:
                        df['date'] = pd.to_datetime(df['time'])
                        df.set_index('date', inplace=True)
                        df.sort_index(inplace=True)
                    
                    df = df.dropna()
                    if len(df) > 50:
                        self.data_cache[t] = df
                        
                        # Pre-calc Indicators
                        if t in self.tickers: # Only for analyzed tickers
                            eng = KineticMarketState(df.reset_index())
                            df_ind = eng.analyze()
                            if 'date_parsed' in df_ind.columns:
                                df_ind.set_index('date_parsed', inplace=True)
                            else:
                                df_ind.index = df.index
                            self.indicator_cache[t] = df_ind
                            
                except Exception as e:
                    print(f"Error loading {t}: {e}")
        
        if 'SPY' in self.data_cache:
            self.spy_returns = self.data_cache['SPY']['close'].pct_change().fillna(0)
            
    def run_strategy(self, ticker, mode, params_override=None):
        """
        Runs strategy logic on PRE-CALCULATED indicators.
        """
        if ticker not in self.indicator_cache:
            return None, None
            
        df_ind = self.indicator_cache[ticker]
        
        # 2. Logic Params
        params = {
            "dip_buy_x": 0.5, "dip_buy_y": 0.2, 
            "momentum_x": 1.0, "momentum_y": 0.9,
            "avoid_x": -0.5
        }
        
        if mode == "TREND_FOLLOWING": 
            params.update({"dip_buy_x": 0.4, "dip_buy_y": 0.3})
        elif mode == "MEAN_REVERSION":
            params.update({"dip_buy_x": 0.5, "dip_buy_y": 0.2})
            
        if params_override:
            params.update(params_override)
            
        # 3. Vectorized Signals
        x = df_ind['x_trend'].values
        y = df_ind['y_momentum'].values
        z = df_ind['z_structure'].values
        
        sig_codes = np.zeros(len(x), dtype=int)
        
        mask_launchpad = (z > 0.8) & (x > 0)
        mask_dip = (x > params['dip_buy_x']) & (y < params['dip_buy_y'])
        mask_mom = (x > params['momentum_x']) & (y > params['momentum_y'])
        mask_avoid = (x < params['avoid_x'])
        
        sig_codes[mask_launchpad] = 1 # LP
        sig_codes[mask_dip] = 2 # DB
        sig_codes[mask_mom] = 3 # MR
        sig_codes[mask_avoid] = 4 # AVOID
        
        return sig_codes, df_ind

    def simulate_equity_vectorized(self, ticker, sig_codes, slippage_bps=0):
        # Use data from cache for checks/prices
        df = self.data_cache[ticker]
        returns = df['close'].pct_change().fillna(0).values
        
        # Safe length check
        n_sigs = len(sig_codes)
        n_rets = len(returns)
        n = min(n_sigs, n_rets)
        
        # Truncate to matching length
        sig_codes = sig_codes[:n]
        returns = returns[:n]
        
        state_signals = np.zeros(n, dtype=int)
        
        is_buy = (sig_codes == 1) | (sig_codes == 2) | (sig_codes == 3)
        is_sell = (sig_codes == 4)
        
        state_signals[is_buy] = 1
        state_signals[is_sell] = -1
        
        s_series = pd.Series(state_signals)
        s_series = s_series.replace(0, np.nan).ffill().fillna(0)
        positions = s_series.values
        
        positions_lagged = np.zeros(n)
        positions_lagged[1:] = positions[:-1]
        
        strat_returns = positions_lagged * returns
        cost = np.abs(np.diff(np.insert(positions_lagged, 0, 0))) * (slippage_bps / 10000.0)
        
        net_returns = strat_returns - cost
        equity = np.cumprod(1 + net_returns)
        
        return equity[-1], net_returns

    # --- BLOCK A: Alpha Origin ---
    def block_a_permutation(self):
        print("Running Block A: Permutation...")
        real_perfs = []
        for t in self.tickers:
             if t not in self.indicator_cache: continue
             tags = get_ticker_tags(t)
             mode = get_strategy_mode(tags)
             sig, _ = self.run_strategy(t, mode)
             eq, _ = self.simulate_equity_vectorized(t, sig)
             real_perfs.append(eq)
        real_avg = np.mean(real_perfs)
        
        perm_means = []
        modes = ["TREND_FOLLOWING", "MEAN_REVERSION"]
        
        # N=Bootstrap
        for _ in range(BOOTSTRAP_ROUNDS // 5): # 400 rounds sufficient for A
            batch = []
            sample = random.sample(self.tickers, min(len(self.tickers), 50))
            for t in sample:
                if t not in self.indicator_cache: continue
                rnd_mode = random.choice(modes)
                sig, _ = self.run_strategy(t, rnd_mode)
                eq, _ = self.simulate_equity_vectorized(t, sig)
                batch.append(eq)
            perm_means.append(np.mean(batch))
            
        p_val = sum(1 for p in perm_means if p > real_avg) / len(perm_means)
        return {"Real_Avg": real_avg, "P_Value": p_val}

    # --- BLOCK B: Fidelity ---
    def block_b_fidelity(self):
        print("Running Block B: Fidelity...")
        real_res = []
        rand_res = []
        
        for t in self.tickers[:30]:
            if t not in self.indicator_cache: continue
            tags = get_ticker_tags(t)
            mode = get_strategy_mode(tags)
            sig_real, _ = self.run_strategy(t, mode)
            eq_real, _ = self.simulate_equity_vectorized(t, sig_real)
            real_res.append(eq_real)
            
            sig_rand = sig_real.copy()
            valid_indices = np.where(sig_real != 4)[0]
            entry_indices = np.where((sig_real == 1) | (sig_real == 2) | (sig_real == 3))[0]
            
            rand_canvas = np.zeros_like(sig_real)
            rand_canvas[sig_real == 4] = 4
            
            if len(entry_indices) > 0 and len(valid_indices) > 0:
                new_entries = np.random.choice(valid_indices, len(entry_indices), replace=False)
                rand_canvas[new_entries] = 2
                
            eq_rand, _ = self.simulate_equity_vectorized(t, rand_canvas)
            rand_res.append(eq_rand)
            
        return {
            "Real_Entry_Avg": np.mean(real_res),
            "Random_Entry_Avg": np.mean(rand_res)
        }

    # --- BLOCK C: Robustness ---
    def block_c_robustness(self):
        print("Running Block C: Robustness...")
        target = "VUG" 
        if target not in self.indicator_cache: return {}
        
        x_range = [0.4, 0.5, 0.6]
        y_range = [0.2, 0.3, 0.4]
        
        surface = {}
        for x in x_range:
            for y in y_range:
                sig, _ = self.run_strategy(target, "TREND_FOLLOWING", {"dip_buy_x": x, "dip_buy_y": y})
                eq, _ = self.simulate_equity_vectorized(target, sig)
                surface[f"X{x}_Y{y}"] = eq
        return surface

    # --- BLOCK D: Interaction ---
    def block_d_synergy(self):
        print("Running Block D: Synergy...")
        growth_only = []
        growth_mega = []
        
        for t in self.tickers:
            if t not in self.indicator_cache: continue
            tags = get_ticker_tags(t)
            sig, _ = self.run_strategy(t, "TREND_FOLLOWING")
            eq, _ = self.simulate_equity_vectorized(t, sig)
            
            if "GROWTH" in tags:
                if "MEGA_CAP" in tags:
                    growth_mega.append(eq)
                else:
                    growth_only.append(eq)
                    
        return {
            "Growth_Only_Avg": np.mean(growth_only) if growth_only else 0, 
            "Growth_Mega_Avg": np.mean(growth_mega) if growth_mega else 0
        }

    # --- BLOCK E: Predictive ---
    def block_e_predictive(self):
        print("Running Block E: Predictive...")
        corrs = []
        for t in self.tickers[:50]:
            if t not in self.indicator_cache: continue
            df_ind = self.indicator_cache[t] # Use cache
            
            z = df_ind['z_structure'].values
            rets = self.data_cache[t]['close'].pct_change().values
            
            # Align lengths
            n = min(len(z), len(rets))
            z = z[:n]
            rets = rets[:n]
            
            vol = pd.Series(rets).rolling(4).std().shift(-4).values 
            
            valid = ~np.isnan(z) & ~np.isnan(vol)
            if np.sum(valid) > 30:
                c = np.corrcoef(z[valid], vol[valid])[0,1]
                corrs.append(c)
        return {"Avg_Z_Vol_Corr": np.mean(corrs) if corrs else 0}

    # --- BLOCK F: Friction ---
    def block_f_friction(self):
        print("Running Block F: Friction...")
        res = {}
        for s in [0, 10, 20]:
            batch = []
            for t in self.tickers[:20]:
                if t not in self.indicator_cache: continue
                tags = get_ticker_tags(t)
                sig, _ = self.run_strategy(t, get_strategy_mode(tags))
                eq, _ = self.simulate_equity_vectorized(t, sig, s)
                batch.append(eq)
            res[f"Slippage_{s}bps"] = np.mean(batch)
        return res

    # --- BLOCK G: Portfolio ---
    def block_g_portfolio(self):
        print("Running Block G: Portfolio...")
        if self.spy_returns is None: return {}
        
        corrs = []
        for t in self.tickers[:20]:
             if t not in self.indicator_cache: continue
             tags = get_ticker_tags(t)
             sig, _ = self.run_strategy(t, get_strategy_mode(tags))
             _, ret_stream = self.simulate_equity_vectorized(t, sig)
             
             # Align with SPY
             # This is tricky with vectorized differing lengths/dates
             # Simple approach: Join on Index?
             # For speed approx: 
             # Use the DF index from cache to align
             dates = self.data_cache[t].index
             ret_series = pd.Series(ret_stream, index=dates)
             
             # Inner join
             combined = pd.concat([ret_series, self.spy_returns], axis=1, join='inner').dropna()
             if len(combined) > 50:
                 c = combined.iloc[:,0].corr(combined.iloc[:,1])
                 corrs.append(c)
                 
        return {"Avg_Correlation_SPY": np.mean(corrs) if corrs else 0}

    # --- BLOCK H: Random Benchmark ---
    def block_h_random_benchmark(self):
        print(f"Running Block H: Random Benchmark (N={BOOTSTRAP_ROUNDS})...")
        
        real_eqs = []
        for t in self.tickers:
            if t not in self.indicator_cache: continue
            tags = get_ticker_tags(t)
            sig, _ = self.run_strategy(t, get_strategy_mode(tags))
            eq, _ = self.simulate_equity_vectorized(t, sig)
            real_eqs.append(eq)
        global_real = np.mean(real_eqs)
        
        # Calc Distrib
        sig_dist = {0:0, 1:0, 2:0, 3:0, 4:0}
        total = 0
        for t in self.tickers[:20]:
             if t not in self.indicator_cache: continue
             tags = get_ticker_tags(t)
             sig, _ = self.run_strategy(t, get_strategy_mode(tags))
             u, c = np.unique(sig, return_counts=True)
             for v, co in zip(u, c): sig_dist[v] += co
             total += len(sig)
             
        p_wait = sig_dist[0]/total if total else 0.5
        p_buy = (sig_dist[1]+sig_dist[2]+sig_dist[3])/total if total else 0.2
        p_sell = sig_dist[4]/total if total else 0.3
        
        random_means = []
        for _ in range(BOOTSTRAP_ROUNDS):
            batch = []
            sample = random.sample(self.tickers, min(len(self.tickers), 40))
            for t in sample:
                if t not in self.indicator_cache: continue
                n = len(self.data_cache[t])
                rand_s = np.random.choice([0,2,4], size=n, p=[p_wait, p_buy, p_sell])
                eq, _ = self.simulate_equity_vectorized(t, rand_s)
                batch.append(eq)
            random_means.append(np.mean(batch))
            
        p_val = sum(1 for r in random_means if r > global_real) / len(random_means)
        
        ci_lower = np.percentile(random_means, (1-CONFIDENCE_LEVEL)/2*100)
        ci_upper = np.percentile(random_means, (1+CONFIDENCE_LEVEL)/2*100)
        
        return {
            "Real_CAGR_Proxy": global_real,
            "Random_Mean": np.mean(random_means),
            "P_Value": p_val,
            "CI_Lower": ci_lower,
            "CI_Upper": ci_upper
        }

    # --- BLOCK I: Kinetics ---
    def block_i_kinetics(self):
        print("Running Block I: Kinetics...")
        dev_map = {"High": [], "Low": []}
        
        for t in self.tickers:
            if t not in self.data_cache: continue
            df = self.data_cache[t]
            close = df['close']
            
            ma20 = close.rolling(20).mean()
            ma60 = close.rolling(60).mean()
            ma120 = close.rolling(120).mean()
            avg = (ma20+ma60+ma120)/3
            
            dev = (close - avg) / avg
            vol = close.pct_change().rolling(5).std().shift(-5)
            
            df_k = pd.DataFrame({'d': dev, 'v': vol}).dropna()
            
            dev_map['High'].extend(df_k[df_k['d'].abs() > 0.02]['v'].values)
            dev_map['Low'].extend(df_k[df_k['d'].abs() < 0.01]['v'].values)
        
        h_mean = np.mean(dev_map['High']) if dev_map['High'] else 0
        l_mean = np.mean(dev_map['Low']) if dev_map['Low'] else 0
        
        _, p_val = stats.ttest_ind(dev_map['High'], dev_map['Low'], equal_var=False)
        return {"High_Dev_Vol": h_mean, "Low_Dev_Vol": l_mean, "P_Value": p_val}

    def execute(self):
        print(f"Starting Industrial Check (N={BOOTSTRAP_ROUNDS})...")
        res = {}
        res["Block_A"] = self.block_a_permutation()
        res["Block_B"] = self.block_b_fidelity()
        res["Block_C"] = self.block_c_robustness()
        res["Block_D"] = self.block_d_synergy()
        res["Block_E"] = self.block_e_predictive()
        res["Block_F"] = self.block_f_friction()
        res["Block_G"] = self.block_g_portfolio()
        res["Block_H"] = self.block_h_random_benchmark()
        res["Block_I"] = self.block_i_kinetics()
        
        print("\n=== RESULTS ===")
        print(json.dumps(res, indent=2, cls=NpEncoder))
        
        with open("deep_analysis_results.json", "w") as f:
            json.dump(res, f, cls=NpEncoder, indent=2)
            
        self.generate_report(res)

    def generate_report(self, res):
        md = f"""# Tag Strategy: Industrial Grade Validation Report
**Date**: {datetime.now().strftime("%Y-%m-%d")}
**Protocol**: 9-Block Scientific Framework (A-I)
**Confidence Level**: {CONFIDENCE_LEVEL*100}% (Alpha={ALPHA:.2f})
**Bootstrap Rounds**: {BOOTSTRAP_ROUNDS}

## Core Findings

### Block H: The Random Benchmark (Baseline Reality)
*   **Real Strategy Score**: {res['Block_H']['Real_CAGR_Proxy']:.4f}
*   **Random Noise Score**: {res['Block_H']['Random_Mean']:.4f}
*   **P-Value**: **{res['Block_H']['P_Value']:.5f}** (Target < {ALPHA})
*   **98% Confidence Interval**: [{res['Block_H']['CI_Lower']:.4f}, {res['Block_H']['CI_Upper']:.4f}]
*   **Conclusion**: {"✅ **PASSED**" if res['Block_H']['P_Value'] < ALPHA else "❌ **FAILED**"}

### Block I: Advanced Kinetics
*   **Hypothesis**: High Deviation (>2%) leads to Volatility Expansion.
*   **High Deviation Vol**: {res['Block_I']['High_Dev_Vol']:.5f}
*   **Low Deviation Vol**: {res['Block_I']['Low_Dev_Vol']:.5f}
*   **Ratio**: {res['Block_I']['High_Dev_Vol'] / max(res['Block_I']['Low_Dev_Vol'], 1e-9):.2f}x
*   **Significance**: P={res['Block_I']['P_Value']:.2e}

### Block A: Alpha Origin (Permutation)
*   **Does Tag Logic Matter?**: P={res['Block_A']['P_Value']:.4f}

### Block D: Strategic Synergy
*   **Growth Only**: {res['Block_D']['Growth_Only_Avg']:.3f}
*   **Growth + Mega Cap**: {res['Block_D']['Growth_Mega_Avg']:.3f}

See `deep_analysis_results.json` for full dataset.
"""
        with open("docs/TAG_VALIDATION_REPORT.md", "w", encoding="utf-8") as f:
            f.write(md)

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer): return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super(NpEncoder, self).default(obj)

if __name__ == "__main__":
    eng = AnalysisEngine()
    eng.execute()
