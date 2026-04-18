# CORS Proxy — Operator & Contributor Notes

> **Scope of this doc**: Practical notes for maintaining the Tier-3 CORS proxy fallback. The underlying *decision* (why we use rotated public proxies, when we'd migrate to self-hosted) lives in [ADR-0002](../architecture/adr/0002-cors-proxy-strategy.md). This doc is the operational companion — what's in the list today, how to swap it, and what to do when it all breaks.
>
> **Audience**: Whoever is staring at DevTools at 10 PM wondering why live quotes are failing.
>
> **Code path**: `src/api/corsProxyManager.ts` holds the rotation list and logic.

---

## Context (1 paragraph)

The frontend needs to reach Yahoo Finance for Tier-3 fallback. Browsers block cross-origin requests without CORS headers, and Yahoo Finance doesn't serve them. Public CORS proxies relay the request and inject the headers. We use a **rotated list** so that individual proxy outages don't kill the fallback. **This is best-effort only** — the Static Lake (Tier 2) covers 99%+ of reads. Tier-3 exists to avoid phantom-data scenarios, not to be reliable.

---

## Current Proxy Inventory (as of this doc)

The authoritative list lives in [`src/api/corsProxyManager.ts`](../../src/api/corsProxyManager.ts). History of what we've tried and why they fell out of favour:

| Proxy | Status | Notes |
|---|---|---|
| `https://api.allorigins.win/raw?url=` | ✅ Currently primary | Truly free, no prod restriction, reasonably stable |
| `https://corsproxy.io/?` | ⚠️ Dev-only safe | Free on `localhost`, **requires paid plan in production** ($5–50/mo) — keep as dev fallback only |
| `https://cors.sh/` | ❓ Last-known-unstable | Retain as backup; re-test quarterly |
| `https://proxy-cors.isomorphic-git.org/` | ❓ Status unknown | Maintained by isomorphic-git team |
| `https://thingproxy.freeboard.io/fetch/` | ❓ Status unknown | — |
| `https://cors-anywhere.herokuapp.com/` | ❌ Dead in prod | Rate-limited to signed-up users; keep in list but expect 403 |

**Rule of thumb**: public CORS proxies rot. Assume the list needs revision every 3–6 months.

---

## How to Swap a Proxy (the common task)

1. Confirm the failing proxy via DevTools (response code, error text)
2. Edit [`src/api/corsProxyManager.ts`](../../src/api/corsProxyManager.ts) — reorder, remove, or add endpoints
3. Keep the primary as one that's verified-working *and* free-in-production
4. Keep ≥ 3 entries for rotation resilience
5. Ship the change as a small PR — title pattern: `fix(cors): swap primary proxy from X to Y`
6. Verify locally: load the app with DevTools open, deliberately force Tier-3 fallback (hard-refresh a stock whose Static Lake entry is missing), confirm 200 response

---

## When to Escalate to Self-Hosted

Per [ADR-0002](../architecture/adr/0002-cors-proxy-strategy.md), migrate to a self-hosted proxy when:

- Tier-3 failure rate exceeds **5% over 30 days**, **OR**
- All free public proxies become unreliable simultaneously (> 1 week), **OR**
- We need to send auth / signed requests (never today — but a hypothetical future constraint)

The self-hosted path of least resistance is a **Cloudflare Worker**: free tier covers this use case, deploys in minutes, no server to patch. When that time comes, file a follow-up ADR.

---

## Alternative Strategies (for reference only — none adopted today)

### Paid market-data APIs

| Service | Free tier | Paid |
|---|---|---|
| Alpha Vantage | 5 calls/min | scaling tiers |
| IEX Cloud | limited free | usage-based |
| Finnhub | 60 calls/min | scaling tiers |
| RapidAPI / Yahoo-Finance15 | small free quota | usage-based |

Consider when: our free Yahoo Finance path hits a structural cap (symbol count × request rate) and a paid API's SLA is a better bet than chasing proxies.

### Cloud-hosted self-proxy

| Platform | Complexity | Cost |
|---|---|---|
| Cloudflare Workers | Low — ~20 lines of JS | Free tier covers us |
| Vercel Edge Functions | Low | Free tier covers us |
| Netlify Functions | Low | Free tier covers us |
| AWS Lambda + API Gateway | Medium | Near-zero at our scale but ops overhead |
| Azure / GCP Functions | Medium | Similar to AWS |

All of these violate [ADR-0001](../architecture/adr/0001-static-first-architecture.md)'s "no runtime backend" stance *slightly* — a proxy is not really a backend, but it's a moving part we'd have to maintain. Only do this if public proxies genuinely die.

### Skip Tier-3 entirely

Technically an option — drop live API fallback and rely solely on Static Lake. The cost is Job Story #6 (*"never make a decision on phantom data"*) — users would see empty widgets when the Static Lake has gaps. Not recommended.

---

## Testing / Health Check

Quick sanity test to paste into DevTools console:

```js
(async () => {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5d';
  const proxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    // add whatever is in corsProxyManager.ts
  ];
  for (const p of proxies) {
    try {
      const r = await fetch(`${p}${encodeURIComponent(url)}`);
      console.log(`${r.ok ? '✅' : '❌'} ${p} — status ${r.status}`);
    } catch (e) {
      console.log(`❌ ${p} — ${e.message}`);
    }
  }
})();
```

Run this quarterly or whenever the Tier-3 failure rate looks high.

---

## Related Documents

- Decision record: [../architecture/adr/0002-cors-proxy-strategy.md](../architecture/adr/0002-cors-proxy-strategy.md)
- Architecture context: [../architecture/OVERVIEW.md §3](../architecture/OVERVIEW.md#3-the-3-tier-cache-strategy)
- Incident playbook: [../operations/RUNBOOK.md — Playbook 5](../operations/RUNBOOK.md#playbook-5--all-tier-3-cors-proxies-failing)
