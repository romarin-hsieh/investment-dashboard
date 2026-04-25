/**
 * Unit tests for bundle-size-delta.js.
 *
 * Coverage targets the pure helpers (chunk aggregation, formatting, report
 * composition) — CI integration is covered by running the workflow on PR-D2
 * itself when it's opened.
 */

import { describe, it, expect } from 'vitest';
import {
  chunkTotals,
  normalizeChunkName,
  aggregate,
  fmtBytes,
  fmtDelta,
  sumGzip,
  buildReport,
  evaluateBudgets,
  formatBudgetSection
} from './bundle-size-delta.js';
import { BUDGETS } from './bundle-size-budgets.js';

// Minimal fixture shaped like rollup-plugin-visualizer's raw-data template.
function fixture({ vendor = 100000, plotly = 1500000 } = {}) {
  return {
    version: 9,
    tree: {},
    nodeMetas: {
      'meta-1': { id: 'vue/index.js',    moduleParts: { 'assets/vendor-AAAAAAAA.js': 'part-1' } },
      'meta-2': { id: 'vue-router.js',   moduleParts: { 'assets/vendor-AAAAAAAA.js': 'part-2' } },
      'meta-3': { id: 'plotly.js',       moduleParts: { 'assets/plotly-BBBBBBBB.js': 'part-3' } }
    },
    nodeParts: {
      'part-1': { renderedLength: Math.floor(vendor * 0.6), gzipLength: Math.floor(vendor * 0.2), brotliLength: Math.floor(vendor * 0.18), metaUid: 'meta-1' },
      'part-2': { renderedLength: Math.floor(vendor * 0.4), gzipLength: Math.floor(vendor * 0.15), brotliLength: Math.floor(vendor * 0.13), metaUid: 'meta-2' },
      'part-3': { renderedLength: plotly,                   gzipLength: Math.floor(plotly * 0.3), brotliLength: Math.floor(plotly * 0.25), metaUid: 'meta-3' }
    }
  };
}

describe('normalizeChunkName', () => {
  it('strips 8-char content hashes from .js files', () => {
    expect(normalizeChunkName('assets/vendor-CQqD8gzt.js')).toBe('assets/vendor.js');
  });

  it('strips 8-char content hashes from .css files', () => {
    expect(normalizeChunkName('assets/StockDetail-CUajTT96.css')).toBe('assets/StockDetail.css');
  });

  it('leaves unhashed names alone', () => {
    expect(normalizeChunkName('index.html')).toBe('index.html');
    expect(normalizeChunkName('assets/vendor.js')).toBe('assets/vendor.js');
  });

  it('does not strip hashes shorter or longer than 8 chars', () => {
    expect(normalizeChunkName('assets/vendor-short.js')).toBe('assets/vendor-short.js');
    expect(normalizeChunkName('assets/vendor-TOOLONGHASH12.js')).toBe('assets/vendor-TOOLONGHASH12.js');
  });
});

describe('chunkTotals', () => {
  it('sums rendered/gzip/brotli lengths per chunk across all modules', () => {
    const stats = fixture();
    const totals = chunkTotals(stats);
    expect(totals['assets/vendor-AAAAAAAA.js'].raw).toBe(60000 + 40000);
    expect(totals['assets/vendor-AAAAAAAA.js'].gzip).toBe(20000 + 15000);
    expect(totals['assets/plotly-BBBBBBBB.js'].raw).toBe(1500000);
  });

  it('returns empty object when nodeMetas is missing', () => {
    expect(chunkTotals({})).toEqual({});
  });

  it('skips parts whose metaUid does not resolve', () => {
    const stats = { nodeMetas: { 'm': { moduleParts: { 'chunk.js': 'missing-uid' } } }, nodeParts: {} };
    expect(chunkTotals(stats)).toEqual({});
  });
});

describe('aggregate', () => {
  it('collapses hashed chunk variants into a single row', () => {
    const hashed = {
      'assets/vendor-AAAAAAAA.js': { raw: 100, gzip: 30, brotli: 25 },
      'assets/vendor-BBBBBBBB.js': { raw: 50,  gzip: 15, brotli: 13 }
    };
    const agg = aggregate(hashed);
    expect(Object.keys(agg)).toEqual(['assets/vendor.js']);
    expect(agg['assets/vendor.js'].raw).toBe(150);
    expect(agg['assets/vendor.js'].gzip).toBe(45);
  });
});

describe('fmtBytes', () => {
  it('formats bytes, KB, and MB thresholds', () => {
    expect(fmtBytes(0)).toBe('0 B');
    expect(fmtBytes(512)).toBe('512 B');
    expect(fmtBytes(2048)).toBe('2.0 KB');
    expect(fmtBytes(1_500_000)).toBe('1.43 MB');
  });

  it('handles negative byte counts', () => {
    expect(fmtBytes(-2048)).toBe('-2.0 KB');
  });

  it('returns "0 B" for NaN / infinity', () => {
    expect(fmtBytes(NaN)).toBe('0 B');
    expect(fmtBytes(Infinity)).toBe('0 B');
  });
});

describe('fmtDelta', () => {
  it('renders em-dash when both sides are zero', () => {
    expect(fmtDelta(0, 0)).toBe('—');
  });

  it('renders 🆕 for added chunks', () => {
    expect(fmtDelta(0, 1024)).toContain('🆕');
    expect(fmtDelta(0, 1024)).toContain('1.0 KB');
  });

  it('renders 🗑️ for removed chunks', () => {
    expect(fmtDelta(1024, 0)).toContain('🗑️');
  });

  it('renders 🔺 with + sign for growth', () => {
    const out = fmtDelta(1000, 1500);
    expect(out).toContain('🔺');
    expect(out).toContain('+');
    expect(out).toContain('50');
  });

  it('renders 🟢 for shrinkage', () => {
    const out = fmtDelta(1000, 500);
    expect(out).toContain('🟢');
    expect(out).toContain('−');
  });

  it('returns em-dash when values are equal', () => {
    expect(fmtDelta(1000, 1000)).toBe('—');
  });
});

describe('sumGzip', () => {
  it('sums gzip across all chunks', () => {
    const totals = {
      a: { raw: 100, gzip: 30, brotli: 25 },
      b: { raw: 200, gzip: 70, brotli: 60 }
    };
    expect(sumGzip(totals)).toBe(100);
  });
});

describe('buildReport', () => {
  it('emits a "no chunks changed" row when base === head', () => {
    const stats = fixture();
    const report = buildReport(stats, stats);
    expect(report).toContain('no chunks changed');
    expect(report).toContain('Total gzipped');
  });

  it('surfaces chunk deltas with arrows and percentages', () => {
    const base = fixture({ vendor: 100000 });
    const head = fixture({ vendor: 200000 });
    const report = buildReport(base, head);
    expect(report).toContain('assets/vendor.js');
    expect(report).toContain('🔺');
    expect(report).not.toContain('no chunks changed');
  });

  it('does not emit the "no changes" row when at least one chunk shifted', () => {
    const base = fixture({ vendor: 100000, plotly: 1500000 });
    const head = fixture({ vendor: 100000, plotly: 1600000 });
    const report = buildReport(base, head);
    expect(report).not.toContain('no chunks changed');
    expect(report).toContain('assets/plotly.js');
  });

  it('appends a budget-status section by default', () => {
    const stats = fixture();
    const report = buildReport(stats, stats);
    expect(report).toContain('Performance budgets');
  });

  it('skips the budget section when options.skipBudgets is true', () => {
    const stats = fixture();
    const report = buildReport(stats, stats, { skipBudgets: true });
    expect(report).not.toContain('Performance budgets');
  });
});

// ---------- PR-D3 budget enforcement ----------

describe('evaluateBudgets', () => {
  const tinyBudgets = {
    'assets/vendor.js':  { gzip: 50_000 },
    'assets/plotly.js':  { gzip: 1_000_000 },
    '__total__':         { gzip: 500_000 }
  };

  it('returns ok=true when every budgeted chunk is under its limit', () => {
    const totals = {
      'assets/vendor.js':  { raw: 50_000, gzip: 20_000, brotli: 18_000 },
      'assets/plotly.js':  { raw: 800_000, gzip: 200_000, brotli: 180_000 }
    };
    const result = evaluateBudgets(totals, tinyBudgets);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags a chunk that exceeds its individual budget', () => {
    const totals = {
      'assets/vendor.js':  { raw: 200_000, gzip: 60_000, brotli: 50_000 },
      'assets/plotly.js':  { raw: 800_000, gzip: 200_000, brotli: 180_000 }
    };
    const result = evaluateBudgets(totals, tinyBudgets);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].chunk).toBe('assets/vendor.js');
    expect(result.violations[0].budget).toBe(50_000);
    expect(result.violations[0].actual).toBe(60_000);
    expect(result.violations[0].overBy).toBe(10_000);
    expect(result.violations[0].overPct).toBeCloseTo(20, 1);
  });

  it('checks __total__ against the sum of all chunk gzip sizes', () => {
    // Each individual chunk is under, but the sum (300+250 = 550K) exceeds
    // the 500K __total__ budget.
    const totals = {
      'assets/vendor.js':  { raw: 1, gzip: 30_000,  brotli: 1 },
      'assets/plotly.js':  { raw: 1, gzip: 520_000, brotli: 1 }
    };
    const result = evaluateBudgets(totals, tinyBudgets);
    expect(result.ok).toBe(false);
    const totalViolation = result.violations.find(v => v.chunk === '__total__');
    expect(totalViolation).toBeDefined();
    expect(totalViolation.actual).toBe(550_000);
  });

  it('skips chunks with no budget entry', () => {
    const totals = {
      'assets/something-unbudgeted.js': { raw: 10_000_000, gzip: 9_999_999, brotli: 1 }
    };
    const result = evaluateBudgets(totals, tinyBudgets);
    // __total__ would still trigger here (9.99 MB > 500K), but the
    // unbudgeted chunk itself is not a violation.
    expect(result.violations.find(v => v.chunk.includes('something-unbudgeted'))).toBeUndefined();
  });

  it('treats a missing chunk as zero gzip (no false-positive)', () => {
    // No vendor.js or plotly.js in totals — they should not show as
    // violations even though they have budget entries.
    const result = evaluateBudgets({}, tinyBudgets);
    expect(result.ok).toBe(true);
  });

  it('uses the imported BUDGETS by default', () => {
    // Sanity: passing only one argument resolves to the production budget
    // table from bundle-size-budgets.js. We can't assert specific numbers
    // without coupling tests to budget tweaks, but we can assert the
    // fallback is reachable.
    expect(() => evaluateBudgets({})).not.toThrow();
    const result = evaluateBudgets({});
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('violations');
  });
});

describe('formatBudgetSection', () => {
  it('renders a green checkmark when ok=true', () => {
    const md = formatBudgetSection({ ok: true, violations: [] });
    expect(md).toContain('Performance budgets');
    expect(md).toContain('✅');
    expect(md).not.toContain('|');  // no table rendered
  });

  it('renders a violation table when ok=false', () => {
    const md = formatBudgetSection({
      ok: false,
      violations: [{
        chunk: 'assets/vendor.js',
        budget: 50_000,
        actual: 60_000,
        overBy: 10_000,
        overPct: 20
      }]
    });
    expect(md).toContain('❌');
    expect(md).toContain('assets/vendor.js');
    expect(md).toContain('48.8 KB');  // 50_000 / 1024
    expect(md).toContain('58.6 KB');  // 60_000 / 1024
    expect(md).toContain('+9.8 KB');  // 10_000 / 1024
  });

  it('labels __total__ as "Total" rather than the literal sentinel', () => {
    const md = formatBudgetSection({
      ok: false,
      violations: [{
        chunk: '__total__', budget: 1_000_000, actual: 1_100_000, overBy: 100_000, overPct: 10
      }]
    });
    expect(md).not.toContain('__total__');
    expect(md).toContain('Total');
  });
});

describe('BUDGETS sanity (not coupled to specific numbers)', () => {
  it('has a __total__ catch-all', () => {
    expect(BUDGETS).toHaveProperty('__total__');
    expect(BUDGETS.__total__.gzip).toBeGreaterThan(0);
  });

  it('has at least one per-chunk entry', () => {
    const perChunkKeys = Object.keys(BUDGETS).filter(k => k !== '__total__');
    expect(perChunkKeys.length).toBeGreaterThan(0);
  });

  it('every entry has a positive numeric gzip limit', () => {
    for (const [chunk, limits] of Object.entries(BUDGETS)) {
      expect(typeof limits.gzip, `${chunk}.gzip type`).toBe('number');
      expect(limits.gzip, `${chunk}.gzip > 0`).toBeGreaterThan(0);
    }
  });
});
