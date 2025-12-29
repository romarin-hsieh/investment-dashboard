# Kiro Development Tasks - Data Update Robustness

## 🎯 Overview

Replace time-window based refresh with timestamp-driven cache busting, enforce 30-day retention for daily indicator files, and unify all fetch paths via `baseUrl.js`.

---

## Task 0 — Baseline & Guardrails

### Objective
Establish constraints and ensure changes don't break GitHub Pages subpath deployment.

### Scope
- Confirm `src/utils/baseUrl.js` is the single source of truth for all static asset paths
- Confirm GitHub Pages base path works for both local dev (`/`) and production (`/investment-dashboard/`)

### Deliverables
- Verification that all static JSON fetch uses `paths.*` from `baseUrl.js`
- Documentation stating: "All static JSON fetch must use `paths.*` from `baseUrl.js`"

### Acceptance Criteria
- No code path constructs URLs using:
  - `hostname === ...`
  - hardcoded `'/investment-dashboard/'`
  - leading slash `'/data/...'` (unless created through `paths.*`)

---

## Task 1 — Implement Timestamp-Driven Data Version Check

### Objective
Remove time-window refresh logic. Use `status.json` and `latest_index.json` timestamps to decide whether to bust cache and reload.

### Current Problem
```javascript
// ❌ Current problematic approach
const basePath = window.location.hostname === 'romarin-hsieh.github.io' ? '/investment-dashboard/' : '/';
// Fixed time window checks (ET 16:30–17:00)
```

### New Approach
```javascript
// ✅ New version-driven approach
async function checkDataVersionAndRefresh() {
  // 1. Force no-cache fetch of status.json
  const statusUrl = paths.status() + '?v=' + Date.now();
  const status = await fetch(statusUrl).then(r => r.json());
  
  // 2. Compare versions
  const currentVersion = status.generatedAt;
  const lastSeenVersion = localStorage.getItem('lastSeenDataVersion');
  
  if (currentVersion !== lastSeenVersion) {
    // 3. Version changed - clear cache and reload
    clearRelevantCaches();
    localStorage.setItem('lastSeenDataVersion', currentVersion);
    
    // 4. Refetch index files
    const indexUrl = paths.technicalIndicatorsIndex() + '?v=' + currentVersion;
    await fetch(indexUrl).then(r => r.json());
    
    // 5. Notify UI to reload data
    window.location.reload(); // or soft refresh
  }
}
```

### Implementation Steps
1. Create new service: `src/utils/dataVersionService.js`
2. Implement `checkDataVersionAndRefresh()` function
3. Update `src/utils/autoUpdateScheduler.js` to use version checking instead of time windows
4. Remove/disable any fixed time window logic (e.g., ET 16:30–17:00 checks)

### Files to Touch
- `src/utils/autoUpdateScheduler.js` (replace time window logic)
- New file: `src/utils/dataVersionService.js`
- Any consumer that triggers "update checks" on app load

### Deliverables
- New function: `checkDataVersionAndRefresh()`
- Local storage key: `lastSeenDataVersion`
- Removal of time-based update logic

### Acceptance Criteria
- Opening site at any time:
  - If `status.json` indicates same version: **no cache clear**, **no reload**
  - If version changed: **cache bust occurs** and app uses the newest index/data
- No dependency on user timezone or trading session windows

---

## Task 2 — Cache Busting Rules (Only Index/Status No-Cache)

### Objective
Avoid stale "fixed name" JSON files being cached while letting versioned files naturally cache.

### Cache Strategy
```javascript
// Files that need cache busting (fixed names)
const noCacheFiles = [
  'status.json',                              // Always changing
  'technical-indicators/latest_index.json',  // Points to latest date
  'ohlcv/index.json'                         // Symbol list
];

// Files that cache naturally (versioned names)
const naturalCacheFiles = [
  'technical-indicators/2025-12-29_AAPL.json', // Date in filename
  'ohlcv/AAPL.json'                            // May need versioning if overwritten daily
];
```

### Implementation Details
```javascript
// Update baseUrl.js to support versioned URLs
export const paths = {
  status: (options = {}) => {
    const url = withBase('data/status.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },
  
  technicalIndicatorsIndex: (options = {}) => {
    const url = withBase('data/technical-indicators/latest_index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },
  
  // Regular versioned files don't need query params
  technicalIndicators: (date, symbol) => 
    withBase(`data/technical-indicators/${date}_${symbol}.json`)
};
```

### Files to Touch
- `src/utils/baseUrl.js` (add versioning support)
- `src/utils/precomputedIndicatorsApi.js` (fetch latest_index with version query)
- `src/services/ohlcvApi.js` and `src/api/precomputedOhlcvApi.js` (if needed)

### Deliverables
- Helper methods for cache-busted fetch in `baseUrl.js`
- Updated API services to use versioned URLs for index files

### Acceptance Criteria
- After Actions updates data, clients reliably see latest `latest_index.json` and `status.json`
- Versioned daily indicator files still load correctly without cache bust
- CDN cache doesn't prevent data updates

---

## Task 3 — Path Unification: Migrate All Static Fetches to `baseUrl.js`

### Objective
Eliminate environment branching and relative/absolute path inconsistencies.

### Current Status
✅ **Already completed** - All services have been updated to use `baseUrl.js`:
- `src/services/ohlcvApi.js`
- `src/api/precomputedOhlcvApi.js`
- `src/utils/directMetadataLoader.js`
- `src/utils/metadataService.js`
- `src/utils/staticSectorIndustryService.js`
- `src/utils/autoUpdateScheduler.js`
- `src/utils/cacheWarmupService.js`
- `src/utils/precomputedIndicatorsApi.js`
- `src/utils/symbolsConfig.js`

### Verification Required
- Audit all files to ensure no remaining hardcoded paths
- Test both environments (local dev and GitHub Pages)

### Search Patterns to Verify Removal
```bash
# These should return zero hits:
grep -r "romarin-hsieh.github.io" src/
grep -r "/investment-dashboard/" src/
grep -r "fetch('/data/" src/
grep -r "fetch('./data/" src/
```

### Acceptance Criteria
- Global search for problematic patterns returns zero hits
- Local dev and GitHub Pages both work with identical code
- All static JSON fetches use `paths.*()` from `baseUrl.js`

---

## Task 4 — Repo Retention Policy: Keep Only 30 Days of Daily Indicator Files

### Objective
Prevent repo size explosion by retaining only the last 30 days of per-day indicator snapshots.

### Current Problem
```
public/data/technical-indicators/
├── 2025-12-24_AAPL.json
├── 2025-12-25_AAPL.json
├── 2025-12-26_AAPL.json
├── 2025-12-27_AAPL.json
├── 2025-12-29_AAPL.json
└── ... (growing daily, 67 files per day)
```

### Retention Strategy
```
Keep in repo:
├── latest_index.json (permanent)
└── Last 30 days of YYYY-MM-DD_SYMBOL.json

Archive to Release assets:
├── Older than 30 days → archive-technical-indicators-YYYY-MM.zip
└── Upload to GitHub Release assets
```

### Implementation Steps
1. Create script: `scripts/archive-old-technical-indicators.js`
2. Calculate cutoff date: `cutoff = today - 30 days`
3. Move older files to temp archive folder
4. Zip by month: `archive-technical-indicators-YYYY-MM.zip`
5. Upload to GitHub Release assets
6. Delete old files from repo
7. Commit changes (only if files removed)

### Archive Script Structure
```javascript
// scripts/archive-old-technical-indicators.js
const fs = require('fs');
const path = require('path');

const RETENTION_DAYS = 30;
const INDICATORS_DIR = 'public/data/technical-indicators';

async function archiveOldIndicators() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  // 1. Find files older than cutoff
  // 2. Group by month
  // 3. Create monthly archives
  // 4. Upload to GitHub Release
  // 5. Remove old files from repo
}
```

### Workflow Integration
```yaml
# .github/workflows/daily-data-update.yml
- name: Archive old technical indicators
  run: node scripts/archive-old-technical-indicators.js
  
- name: Upload archives to Release
  run: |
    # Upload logic using gh CLI or actions/upload-release-asset
```

### Files to Touch
- New file: `scripts/archive-old-technical-indicators.js`
- Update: `.github/workflows/daily-data-update.yml`

### Acceptance Criteria
- `public/data/technical-indicators/` contains only:
  - `latest_index.json`
  - Last 30 days of dated files
- Archives are available as Release assets for older periods
- Archive process is automated and idempotent

---

## Task 5 — Release Asset Upload Automation

### Objective
Automate uploading archived indicator zips to GitHub Releases.

### Implementation
```yaml
# In .github/workflows/daily-data-update.yml
- name: Create monthly release if needed
  run: |
    MONTH=$(date +%Y-%m)
    gh release create "archive-$MONTH" \
      --title "Data Archive $MONTH" \
      --notes "Archived technical indicators for $MONTH" \
      || echo "Release already exists"

- name: Upload archive to release
  run: |
    MONTH=$(date +%Y-%m)
    if [ -f "archive-technical-indicators-$MONTH.zip" ]; then
      gh release upload "archive-$MONTH" \
        "archive-technical-indicators-$MONTH.zip" \
        --clobber
    fi
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Requirements
- Use `GITHUB_TOKEN` in Actions
- Create or reuse monthly releases (tag: `archive-YYYY-MM`)
- Upload asset: `archive-technical-indicators-YYYY-MM.zip`
- Handle idempotency (rerun doesn't fail or duplicate)

### Acceptance Criteria
- On archive run, GitHub Release contains the zip asset
- Pipeline is idempotent (rerun doesn't duplicate assets or fail)
- Archives are accessible for download from Releases page

---

## Task 6 — Risk & Regression Tests

### Objective
Ensure the new update logic is stable and doesn't break production.

### Test Cases

#### 1. GitHub Pages Base Path Test
```javascript
// Test both environments
const environments = [
  'http://localhost:3000',
  'https://romarin-hsieh.github.io/investment-dashboard/'
];

// Verify these files load successfully:
// - status.json
// - latest_index.json  
// - 2025-12-29_AAPL.json
```

#### 2. Cache Bust Test
```javascript
// Simulate version change
localStorage.setItem('lastSeenDataVersion', 'old-version');
// Modify status.json generatedAt
// Reload page - should trigger cache clear and data refresh
```

#### 3. No Version Change Test
```javascript
// Refresh page multiple times
// Should NOT clear caches or reload if version unchanged
```

#### 4. Missing Data Test
```javascript
// If a symbol file is missing
// UI should show "no data" and not crash
```

#### 5. Archive Behavior Test
```javascript
// Ensure old files are removed and archived
// latest_index.json remains intact
// Archive uploads successfully
```

### Acceptance Criteria
- No uncaught exceptions in console
- No broken static fetch paths in either environment
- Update logic behaves deterministically based on timestamps, not clocks
- Archive process doesn't break current data access

---

## 📋 Implementation Checklist

### Phase 1: Core Stability (High Priority)
- [ ] **Task 1**: Implement version-driven update checking
- [ ] **Task 2**: Add cache busting for index files only
- [ ] **Task 3**: Verify path unification is complete

### Phase 2: Long-term Maintenance (Medium Priority)  
- [ ] **Task 4**: Implement 30-day retention policy
- [ ] **Task 5**: Automate Release asset uploads

### Phase 3: Validation (Before Production)
- [ ] **Task 6**: Complete regression testing
- [ ] Verify both local dev and GitHub Pages work
- [ ] Monitor repo size and archive functionality

---

## 🎯 Success Metrics

### Reliability
- ✅ 99% uptime for data version checking
- ✅ Zero 404 errors due to path issues
- ✅ Data updates visible within 5 minutes of Actions completion

### Maintainability  
- ✅ Repo size stable under 100MB
- ✅ All paths managed in single file (`baseUrl.js`)
- ✅ Archive process 100% automated

### User Experience
- ✅ Data updates transparent to users
- ✅ Page load times unaffected
- ✅ Offline cache still functional

---

## ⚠️ Risk Mitigation

### High Risk: CDN Cache Delays
- **Mitigation**: Force no-cache for `status.json` and `latest_index.json`
- **Fallback**: Implement retry logic with exponential backoff

### Medium Risk: Archive Upload Failures
- **Mitigation**: Implement error handling and manual recovery procedures
- **Monitoring**: Alert on archive process failures

### Low Risk: Version Check Failures
- **Mitigation**: Graceful degradation - continue with cached data
- **Recovery**: Manual cache clear option for users

This specification provides a complete roadmap for implementing robust, scalable data updates while maintaining system reliability and preventing repository bloat.