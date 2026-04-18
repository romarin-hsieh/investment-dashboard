# Smart Money Trend (Chip MFI) Specification

## Overview
The **Smart Money Trend** (formerly Chip MFI) is a visual indicator designed to evaluate the strength and intent of "Smart Money" (Elite Funds and Insiders) in a specific stock. It combines static ownership structure with dynamic accumulation trends.

## Visual Components

### 1. Smart Money Trend Chart
A dual-axis chart comparing "Smart Money" accumulation against price action.
*   **Bar (Green)**: Aggregate Shares Held by Elite Funds (Super Investors).
*   **Line (Blue)**: Average Reported Price per quarter.
*   **Interpretation**:
    *   **Safe Buy Zone**: When Shares Held are increasing (Accumulation) while Stock Price is stable or dropping (Divergence).
    *   **Distribution**: When Shares Held are decreasing significantly.

### 2. Elite Funds (Super Investors)
Detailed quarterly activity of top-tier funds.
*   Renamed from "Super Investor Stats".

## Data Sources
*   **Elite Funds**: Dataroma (Super Investors)
*   **Insiders**: Yahoo Finance & Dataroma Form 4

## Data Flow & Maintenance
This metric is computed on the frontend (`HoldingsAnalysis.vue`) using pre-fetched JSON data. The underlying data is updated daily/weekly via Github Actions:
1.  **Yahoo Finance Data**: Updated via `daily-data-update.yml`.
2.  **Dataroma Data**: Updated via `dataroma-stock-update.yml`.
