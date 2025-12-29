# Path Management Guidelines

## 🎯 Core Principle

**All static JSON fetch must use `paths.*` from `baseUrl.js`**

## ✅ Required Standards

### 1. Single Source of Truth
- `src/utils/baseUrl.js` is the **only** place for path construction
- All static asset URLs must be built using `baseUrl.js` exports

### 2. Forbidden Patterns
Never use these patterns in any code:

```javascript
// ❌ NEVER DO THIS
fetch('/data/...')
fetch('./data/...')
hostname === 'romarin-hsieh.github.io'
'/investment-dashboard/'  // except in vite.config.js
```

### 3. Correct Usage
Always use the unified path API:

```javascript
// ✅ CORRECT APPROACH
import { paths } from '@/utils/baseUrl'

// For static data files
fetch(paths.status())
fetch(paths.technicalIndicatorsIndex())
fetch(paths.ohlcv('AAPL'))
fetch(paths.symbolsMetadata())
```

## 📊 Current Status (Verified)

### ✅ Compliant Files
All services have been updated to use `baseUrl.js`:
- `src/services/ohlcvApi.js`
- `src/api/precomputedOhlcvApi.js`
- `src/utils/directMetadataLoader.js`
- `src/utils/metadataService.js`
- `src/utils/staticSectorIndustryService.js`
- `src/utils/autoUpdateScheduler.js`
- `src/utils/cacheWarmupService.js`
- `src/utils/precomputedIndicatorsApi.js`
- `src/utils/symbolsConfig.js`

### ✅ Verification Results
- ❌ Zero hardcoded `/investment-dashboard/` paths in source code
- ❌ Zero hostname-based branching logic
- ❌ Zero direct `/data/` or `./data/` fetch calls
- ✅ All paths constructed through `baseUrl.js`

### 🌐 Environment Support
- **Local Development**: `BASE_URL = '/'`
- **GitHub Pages**: `BASE_URL = '/investment-dashboard/'`
- **Automatic Detection**: Via `import.meta.env.BASE_URL`

## 🔒 Guardrails

### Before Adding New Static Fetch
1. Add the path to `baseUrl.js` `paths` object
2. Use `paths.newPath()` in your code
3. Test in both local and production environments

### Code Review Checklist
- [ ] No hardcoded paths
- [ ] Uses `paths.*` from `baseUrl.js`
- [ ] Works in both environments

## 🧪 Testing

### Path Consistency Test
```bash
# These should return zero hits:
grep -r "romarin-hsieh.github.io" src/
grep -r "/investment-dashboard/" src/
grep -r "fetch('/data/" src/
grep -r "fetch('./data/" src/
```

### Environment Test
```javascript
// Test both environments:
// Local: http://localhost:3000
// Production: https://romarin-hsieh.github.io/investment-dashboard/
// All JSON files should load successfully
```

---

**Last Updated**: 2025-12-29  
**Status**: ✅ All guidelines implemented and verified