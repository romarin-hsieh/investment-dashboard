/**
 * CORS Proxy Manager - Handles proxy rotation and failover
 * CORS 代理管理器 - 處理代理輪替與故障轉移
 *
 * This module manages CORS proxy services for Yahoo Finance API requests.
 * 此模組管理 Yahoo Finance API 請求的 CORS 代理服務。
 *
 * @module api/corsProxyManager
 */

// Type Definitions / 型別定義
export interface ApiConfig {
    baseUrl: string;
    staticTechBaseUrl: string;
    cacheTimeout: number;
    maxConcurrentRequests: number;
    requestDelay: number;
}

// CORS Proxy Configuration - Priority ordered (most reliable first)
// CORS 代理配置 - 依可靠度排序（最可靠優先）
export const CORS_PROXIES: readonly string[] = [
    // 1. Custom Cloudflare Worker (Best Performance & Reliability)
    // 1. 自訂 Cloudflare Worker（最佳效能與可靠度）
    'https://yfinance-proxy.romarinhsieh.workers.dev/?',

    // 2. allorigins.win (Priority 2: Reliable Free Proxy)
    // 2. allorigins.win（優先度 2：可靠的免費代理）
    'https://api.allorigins.win/raw?url=',

    // 3. Fallback: corsproxy.io (Priority 3: Often rate-limited/paywalled)
    // 3. 備援：corsproxy.io（優先度 3：常有速率限制/付費牆）
    'https://corsproxy.io/?',

    // 4. Fallback: cors-anywhere (Priority 4: Demo usage only)
    // 4. 備援：cors-anywhere（優先度 4：僅供 Demo 使用）
    'https://cors-anywhere.herokuapp.com/',
] as const;

// API Configuration / API 配置
export const API_CONFIG: ApiConfig = {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    staticTechBaseUrl: 'data/technical-indicators/',
    cacheTimeout: 5 * 60 * 1000, // 5 minutes / 5 分鐘快取
    maxConcurrentRequests: 2,
    requestDelay: 800, // ms
};

/**
 * CORS Proxy Manager class for handling proxy rotation
 * CORS 代理管理類別，處理代理輪替
 */
class CorsProxyManager {
    private currentProxyIndex: number;
    private proxies: string[];

    constructor() {
        this.currentProxyIndex = 0;
        this.proxies = [...CORS_PROXIES];
    }

    /**
     * Build proxy URL for a target URL
     * 為目標 URL 建構代理 URL
     *
     * @param targetUrl - The URL to proxy / 要代理的 URL
     * @returns The proxied URL / 代理後的 URL
     */
    buildProxyUrl(targetUrl: string): string {
        const proxy = this.proxies[this.currentProxyIndex];
        return `${proxy}${encodeURIComponent(targetUrl)}`;
    }

    /**
     * Get current proxy URL
     * 取得目前代理 URL
     *
     * @returns Current proxy URL / 目前代理 URL
     */
    getCurrentProxy(): string {
        // Fall back to the first proxy (then '') so a stale index can't return undefined.
        return this.proxies[this.currentProxyIndex] ?? this.proxies[0] ?? '';
    }

    /**
     * Rotate to next proxy (for failover)
     * 輪替至下一個代理（用於故障轉移）
     *
     * @returns Next proxy URL / 下一個代理 URL
     */
    rotateProxy(): string {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        console.log(`🔄 Rotated to proxy: ${this.getCurrentProxy()}`);
        console.log(`🔄 輪替至代理: ${this.getCurrentProxy()}`);
        return this.getCurrentProxy();
    }

    /**
     * Reset to first (most reliable) proxy
     * 重置為第一個（最可靠的）代理
     */
    resetToFirst(): void {
        this.currentProxyIndex = 0;
    }

    /**
     * Get proxy count
     * 取得代理數量
     *
     * @returns Number of available proxies / 可用代理數量
     */
    getProxyCount(): number {
        return this.proxies.length;
    }
}

// Singleton instance / 單例實例
export const corsProxyManager = new CorsProxyManager();

export default corsProxyManager;
