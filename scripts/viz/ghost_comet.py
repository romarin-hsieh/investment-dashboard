import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import os

# --- 1. 數據模擬 (Simulate Data) ---
np.random.seed(42)
days = 200

# 模擬板塊 (Sector - Benchmark)
# 走勢：盤整 -> 緩步上漲
sector_trend = np.linspace(100, 130, days) + np.random.normal(0, 0.5, days).cumsum()
sector_df = pd.DataFrame({'Close': sector_trend})

# 模擬個股 (Stock - Leader)
# 走勢：跟隨板塊但更強 -> 領先突破 -> 高潮噴出
stock_trend = sector_trend * 1.1 + np.concatenate([np.zeros(100), np.linspace(0, 30, 100)])
stock_trend += np.random.normal(0, 1.5, days) # 波動更大
stock_df = pd.DataFrame({'Close': stock_trend})

# --- 2. 指標計算邏輯 (Simplified) ---
def get_coords(df):
    # X: Trend (McGinley approximation using EWM)
    ma = df['Close'].ewm(span=20).mean()
    # Trend Inertia: (Price - MA) / Volatility
    x = (df['Close'] - ma) / df['Close'].rolling(50).std()
    
    # Y: Momentum (StochRSI)
    delta = df['Close'].diff()
    # Simple RSI Logic
    # Handle wins/losses
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    ma_up = up.rolling(14).mean()
    ma_down = down.rolling(14).mean()
    rs = ma_up / ma_down
    rsi = 100 - (100 / (1 + rs))
    # Stoch Logic
    stoch = (rsi - rsi.rolling(14).min()) / (rsi.rolling(14).max() - rsi.rolling(14).min())
    
    # Use synthetic Y if data not enough, but let's clear NANs
    y = stoch.fillna(0.5)
    
    # Z: Structure (Inverted BB Width)
    std = df['Close'].rolling(20).std()
    bbw = (4 * std) / ma
    # Normalize Z so 1 = Max Squeeze (Min Width)
    # Z = 1 - Normalized Width
    width_min = bbw.rolling(120, min_periods=20).min().iloc[-1]
    width_max = bbw.rolling(120, min_periods=20).max().iloc[-1]
    
    # Fill safe values
    if np.isnan(width_min): width_min = 0.01
    if np.isnan(width_max): width_max = 0.1
    if width_max == width_min: width_max = width_min + 0.01
    
    z = 1 - (bbw - width_min) / (width_max - width_min)
    z = z.clip(0, 1)
    
    return x.fillna(0), y.fillna(0.5), z.fillna(0.5)

# 計算座標
stock_x, stock_y, stock_z = get_coords(stock_df)
sector_x, sector_y, sector_z = get_coords(sector_df)

# --- 3. 繪製 3D 戰情室 ---
# Use non-interactive backend for headless environments
plt.switch_backend('Agg') 
fig = plt.figure(figsize=(16, 10))
ax = fig.add_subplot(111, projection='3d')

# A. 繪製 "幽靈彗星" (Sector Benchmark)
# 使用灰色、虛線、透明度高 -> 作為背景參考
# Slice last 30 days
start_idx = days - 30
if start_idx < 0: start_idx = 0

ax.plot(sector_x[start_idx:], sector_y[start_idx:], sector_z[start_idx:], 
        color='gray', linestyle='--', linewidth=1.5, alpha=0.4, label='Sector (Peer)')
ax.scatter(sector_x.iloc[-1], sector_y.iloc[-1], sector_z.iloc[-1], 
           color='gray', s=50, alpha=0.5)

# B. 繪製 "主彗星" (Active Stock)
# 使用熱力色系 (紅/黃) -> 代表 V5 Growth 策略
# 尾巴漸層
for i in range(days-30, days-1):
    # Determine color (Heatmap: Old=Yellow, New=Red)
    # 0 to 1
    progress = (i - (days-30)) / 30
    ax.plot(stock_x[i:i+2], stock_y[i:i+2], stock_z[i:i+2], 
            color=plt.cm.autumn(progress), linewidth=3)

# 當前點 (Today)
ax.scatter(stock_x.iloc[-1], stock_y.iloc[-1], stock_z.iloc[-1], 
           color='red', s=200, edgecolors='white', linewidth=2, label='Leader (Active)', zorder=10)

# C. 標註 "發射區" (Launchpad Zone)
# 高 Z (Squeeze) + 正 X (Uptrend) -> Squeeze implies Z close to 1
# X > 0, Z > 0.8
# Meshgrid surface
xx, yy = np.meshgrid(np.linspace(0, 2, 2), np.linspace(0, 1, 2))
zz = np.ones_like(xx) * 0.8
ax.plot_surface(xx, yy, zz, alpha=0.15, color='yellow')
ax.text(1.5, 0.5, 0.9, "Launchpad Zone\n(Squeeze)", color='goldenrod', fontweight='bold')

# D. 裝飾與資訊面板
ax.set_xlabel('X: Trend Inertia (vs Sector)')
ax.set_ylabel('Y: Momentum (StochRSI)')
ax.set_zlabel('Z: Potential Energy (Squeeze)')
ax.set_title('3D Kinetic Dashboard: Stock vs Sector Relative Strength', fontsize=14)
ax.legend()

# 模擬狀態文字
info_text = """
MARKET REGIME: BULL (RISK ON)
STRATEGY: V5 (GROWTH)
-----------------------------
RELATIVE STRENGTH:
> Stock X ({:.1f}) > Sector X ({:.1f})
> LEADER CONFIRMED

SIGNAL:
> BUY BREAKOUT
""".format(stock_x.iloc[-1], sector_x.iloc[-1])

plt.figtext(0.05, 0.5, info_text, fontsize=12, fontfamily='monospace', 
            bbox=dict(facecolor='white', alpha=0.8))

output_path = os.path.join("public", "assets", "ghost_comet_dashboard.png")
os.makedirs(os.path.dirname(output_path), exist_ok=True)
plt.savefig(output_path)
print(f"Simulation Generated: {output_path}")
