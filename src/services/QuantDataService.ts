
// Simple in-memory cache service for Quant Data
import { withDataBase } from '../utils/baseUrl'

/** 單一 ticker 的量化資料列（欄位隨後端 payload 演進，故以索引簽章開放）。 */
export interface QuantTicker {
  ticker: string;
  [key: string]: unknown;
}

/** dashboard_status.json 的頂層結構。 */
export interface QuantDashboardStatus {
  data?: QuantTicker[];
  [key: string]: unknown;
}

class QuantDataService {
  private cache: Readonly<QuantDashboardStatus> | null = null;
  private fetchPromise: Promise<Readonly<QuantDashboardStatus>> | null = null;
  private lastFetch = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getData(): Promise<Readonly<QuantDashboardStatus>> {
    const now = Date.now();

    // Return valid cache
    if (this.cache && (now - this.lastFetch < this.CACHE_DURATION)) {
      return this.cache;
    }

    // Return ongoing promise if multiple requests hit at once
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch new data
    this.fetchPromise = fetch(withDataBase('data/dashboard_status.json'))
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json() as Promise<QuantDashboardStatus>;
      })
      .then(data => {
        // Freeze data to prevent Vue from making it reactive (Performance Critical for large datasets)
        this.cache = Object.freeze(data);
        this.lastFetch = Date.now();
        this.fetchPromise = null;
        return this.cache;
      })
      .catch(err => {
        this.fetchPromise = null;
        throw err;
      });

    return this.fetchPromise;
  }

  // Get specific ticker data
  async getTickerData(ticker: string): Promise<QuantTicker | null | undefined> {
    const data = await this.getData();
    if (!data || !data.data) return null;
    return data.data.find(d => d.ticker === ticker.toUpperCase());
  }
}

export const quantDataService = new QuantDataService();
