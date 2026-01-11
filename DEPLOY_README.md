# Deployment Instructions

This project is a Vue.js application built with Vite. The production build is located in the `dist` directory.

## Prerequisites

- Node.js (v16+)
- npm

## 1. Build the Project

If you haven't already built the project, run:

```bash
npm install
npm run build
```

The build artifacts will be output to the `dist/` folder.

## 2. Verify Data

Before deploying, ensure that the necessary OHLCV data exists. The build process does **not** automatically generate mock data. 
You must ensure the `public/data` folder is correctly populated.

We have included a script to generate the required mock data (ending on 2026-01-09):

```bash
node generate_data.js
```

Ensure this script is run *before* deployment if you rely on local data files, or ensure these JSON files are copied to your production server's public directory.

## Automated Updates (GitHub Actions)

This repository includes a GitHub Action (`.github/workflows/daily-update.yml`) configured to:
1.  Run daily at 00:00 UTC.
2.  Fetch real market data using `yfinance` for all stocks in `stocks.json` plus required indices (`^GSPC`, `^VIX`, `TLT`, `JNK`).
3.  Commit the updated `.json` files back to the `public/data/ohlcv` directory.

If you are deploying updates automatically from the `main` branch, your data will stay fresh automatically.

## 3. Deployment Options

### Option A: Static Web Server (Simplest)

You can serve the `dist` folder using a simple static server like `serve`.

```bash
# Install serve globally
npm install -g serve

# Serve the dist folder
serve -s dist
```

### Option B: Nginx / Apache

Copy the contents of the `dist` folder to your web server's root directory (e.g., `/var/www/html` for Nginx).

**Nginx Configuration Example:**

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

*Note: The `try_files` directive is crucial for Vue Router's history mode.*

### Option C: Cloud Providers (Vercel / Netlify)

1.  **Vercel**:
    *   Install Vercel CLI: `npm i -g vercel`
    *   Run `vercel` in the project root.
    *   Set Output Directory to `dist`.

2.  **Netlify**:
    *   Drag and drop the `dist` folder into the Netlify dashboard manual deploy area.

## 4. Verification

After deployment, navigate to the **Market Overview** page.
- Check the **Fear & Greed Gauge**. It should display the current value and historical data (1 Week Ago, 1 Year Ago, etc.).
- Ensure the latest data date is **2026/01/09**.
- If you see "1970" dates or "NaN", ensure the `.json` files in `/data/ohlcv/` are accessible and not blocked by CORS or missing.
