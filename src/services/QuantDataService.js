
// Simple in-memory cache service for Quant Data
class QuantDataService {
    constructor() {
        this.cache = null;
        this.fetchPromise = null;
        this.lastFetch = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    async getData() {
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
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
            ? import.meta.env.BASE_URL.slice(0, -1)
            : import.meta.env.BASE_URL;
        this.fetchPromise = fetch(`${baseUrl}/data/dashboard_status.json`)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
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
    async getTickerData(ticker) {
        const data = await this.getData();
        if (!data || !data.data) return null;
        return data.data.find(d => d.ticker === ticker.toUpperCase());
    }
}

export const quantDataService = new QuantDataService();
