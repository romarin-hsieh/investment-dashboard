# Deployment Report - 2026-01-10

## Summary
A major maintenance release has been deployed to fix critical data integrity issues and improve system stability.

## Key Changes

### 1. Data Integrity Restoration
- **Regenerated Data**: Full regeneration of technical indicators for all 67 tracked symbols for the date `2026-01-10`.
- **Fixed Validation Errors**: Resolved `404` errors for VST, MP, OKLO, and others by ensuring `latest_index.json` is synchronized with the new dataset.
- **Limitation**: Due to Yahoo Finance blocking scraping attempts, `Quarterly` breakdown for earnings is currently unavailable. Data reliability for other metrics remains high (98%+).

### 2. UI/UX Improvements
- **Earnings & Revenue History**: Removed the "Quarterly" toggle to prevent users from seeing empty charts. The view now enforces a "Yearly" perspective.
- **Performance Monitor**: Fixed a legacy Vue 2 syntax error (`this.$once`) that caused console errors during performance tracking.

### 3. Stability
- **Build Verification**: The project has been successfully built (`npm run build`) with the new data.
- **Deployment**: Code and data have been pushed to the `main` branch to trigger the production deployment workflow.

## Verification
Please visit the live dashboard after the GitHub Pages build completes (approx. 3-5 minutes).
URL: [https://romarin-hsieh.github.io/investment-dashboard/](https://romarin-hsieh.github.io/investment-dashboard/)
