---
description: Code review checklist and standards enforcement
---

# Code Review Workflow

This workflow guides AI agents when reviewing or generating code for the Investment Dashboard.

## Pre-Commit Checklist

Before any code change, verify:

### 1. Comment Language
- [ ] All comments use **bilingual format**: English first, then Traditional Chinese
- [ ] JSDoc/Docstrings include both language versions
- [ ] File headers include bilingual description

**Example**:
```javascript
// Calculate moving average for the given period
// 計算指定週期的移動平均線
```

### 2. Naming Conventions
- [ ] JavaScript: `camelCase` variables, `PascalCase` classes
- [ ] Python: `snake_case` variables/functions, `PascalCase` classes
- [ ] Files follow project patterns (see `docs/CODING_STANDARDS.md`)

### 3. TypeScript Coverage
- [ ] New frontend code uses TypeScript (`.ts`, `.tsx`)
- [ ] Proper type annotations for function parameters and returns
- [ ] Zod schemas for runtime validation where applicable

### 4. Error Handling
- [ ] No silent failures (always log or return meaningful errors)
- [ ] Fallback mechanisms for API calls
- [ ] User-friendly error messages

### 5. Data Validation
- [ ] Validate external API responses
- [ ] Check for null/undefined before operations
- [ ] Validate generated data files have expected schema

## Reference Documents
- [Coding Standards](file:///docs/CODING_STANDARDS.md)
- [Data Operations](file:///docs/DATA_OPERATIONS.md)
- [Component Dependencies](file:///docs/COMPONENT_DEPENDENCIES.md)
