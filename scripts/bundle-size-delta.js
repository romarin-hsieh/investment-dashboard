#!/usr/bin/env node
/**
 * Compute per-chunk size deltas between two `rollup-plugin-visualizer`
 * `stats.json` snapshots and emit a markdown report. Also enforces
 * per-chunk performance budgets defined in `bundle-size-budgets.js`.
 *
 * Used by `.github/workflows/bundle-size.yml` to surface bundle-size impact
 * AND fail the workflow when a chunk exceeds budget. Part of WS-D Bundle
 * Analyzer Integration (PR-D2 added the delta path; PR-D3 added the budget
 * gate + ADR-0007).
 *
 * Two CLI modes:
 *   1. Delta report (default):
 *        node scripts/bundle-size-delta.js <base-stats.json> <head-stats.json>
 *      Emits markdown to stdout. Always includes a budget-status section
 *      (so reviewers see violations on the PR comment). Always exit 0
 *      regardless of budget status.
 *
 *   2. Budget enforcement:
 *        node scripts/bundle-size-delta.js --check-budgets <head-stats.json>
 *      Reads only the head snapshot, checks against `BUDGETS`, prints
 *      violations to stderr in CI-friendly form, exits 0 if green / 2 if
 *      any chunk over budget. The workflow uses this exit code to fail the
 *      `Enforce bundle budgets` step AFTER the comment has already posted.
 *
 * Input format (rollup-plugin-visualizer template: 'raw-data'):
 *   { version, tree, nodeParts: { [uid]: { renderedLength, gzipLength,
 *     brotliLength, metaUid } }, nodeMetas: { [uid]: { id, moduleParts:
 *     { [chunkName]: nodePartUid }, ... } }, ... }
 *
 * Normalization: chunk filenames contain 8-char content hashes
 * (`vendor-CQqD8gzt.js`). We strip those so renames don't appear as
 * delete+add, AND so multiple hashed chunks with the same logical name
 * (e.g. two `index-*.js`) aggregate into one budget-checkable row.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { BUDGETS } from './bundle-size-budgets.js';

// ---------- pure helpers (no IO) ----------

/**
 * Sum per-chunk byte totals (raw, gzip, brotli) across all modules.
 * Returns a map keyed by the chunk's **original** filename (with hash).
 */
export function chunkTotals(stats) {
  const totals = {};
  const metas = stats.nodeMetas || {};
  const parts = stats.nodeParts || {};
  for (const uid of Object.keys(metas)) {
    const meta = metas[uid];
    const moduleParts = meta && meta.moduleParts;
    if (!moduleParts) continue;
    for (const chunk of Object.keys(moduleParts)) {
      const part = parts[moduleParts[chunk]];
      if (!part) continue;
      if (!totals[chunk]) totals[chunk] = { raw: 0, gzip: 0, brotli: 0 };
      totals[chunk].raw += part.renderedLength || 0;
      totals[chunk].gzip += part.gzipLength || 0;
      totals[chunk].brotli += part.brotliLength || 0;
    }
  }
  return totals;
}

/**
 * Strip the 8-char content hash from a chunk filename so renamed chunks
 * collapse to one row in the delta table.
 *   vendor-CQqD8gzt.js → vendor.js
 *   StockDetail-CUajTT96.css → StockDetail.css
 */
export function normalizeChunkName(name) {
  return name.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '.$1');
}

/** Fold a hashed-chunk totals map into hash-stripped keys. */
export function aggregate(totals) {
  const agg = {};
  for (const chunk of Object.keys(totals)) {
    const key = normalizeChunkName(chunk);
    if (!agg[key]) agg[key] = { raw: 0, gzip: 0, brotli: 0 };
    agg[key].raw += totals[chunk].raw;
    agg[key].gzip += totals[chunk].gzip;
    agg[key].brotli += totals[chunk].brotli;
  }
  return agg;
}

/** Human-readable byte count (B / KB / MB). */
export function fmtBytes(n) {
  if (!Number.isFinite(n) || n === 0) return '0 B';
  const abs = Math.abs(n);
  if (abs < 1024) return `${n} B`;
  if (abs < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Format an individual delta cell with arrow + percentage. */
export function fmtDelta(before, after) {
  if (!before && !after) return '—';
  if (!before) return `🆕 +${fmtBytes(after)}`;
  if (!after) return `🗑️ -${fmtBytes(before)}`;
  const diff = after - before;
  if (diff === 0) return '—';
  const pct = ((diff / before) * 100).toFixed(1);
  const sign = diff > 0 ? '+' : '−';
  const arrow = diff > 0 ? '🔺' : '🟢';
  return `${arrow} ${sign}${fmtBytes(Math.abs(diff))} (${sign}${Math.abs(pct)}%)`;
}

/** Sum the gzip column across all chunks in a totals map. */
export function sumGzip(totals) {
  return Object.values(totals).reduce((s, v) => s + (v.gzip || 0), 0);
}

/**
 * Compare per-chunk gzip totals against a budget config and return a
 * structured result. The special key `__total__` in `budgets` is matched
 * against the sum of all chunk gzip sizes rather than a single chunk row.
 *
 * Pure function — exported for unit testing. Used internally by the CLI
 * (`--check-budgets` mode) and by `buildReport()` to append a budget
 * section to the delta markdown.
 *
 * @param {Object} headTotals — output of `aggregate(chunkTotals(stats))`
 * @param {Object} budgets — keyed by normalized chunk name; values are
 *   `{ gzip: <bytes>, headroomPct?: <integer> }`
 * @returns {{ ok: boolean, violations: Array<{
 *     chunk: string,
 *     budget: number,
 *     actual: number,
 *     overBy: number,
 *     overPct: number
 *   }>}}
 */
export function evaluateBudgets(headTotals, budgets = BUDGETS) {
  const violations = [];
  const totalGzip = sumGzip(headTotals);

  for (const chunk of Object.keys(budgets)) {
    const limits = budgets[chunk];
    if (limits.gzip == null) continue;
    const actual = chunk === '__total__'
      ? totalGzip
      : (headTotals[chunk]?.gzip || 0);
    if (actual > limits.gzip) {
      const overBy = actual - limits.gzip;
      violations.push({
        chunk,
        budget: limits.gzip,
        actual,
        overBy,
        overPct: (overBy / limits.gzip) * 100
      });
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Format the budget-status section appended to every delta comment.
 * Green when all chunks are within budget; red with a violation table
 * when one or more chunks exceed.
 */
export function formatBudgetSection(result) {
  let md = '\n### 🎯 Performance budgets\n\n';
  if (result.ok) {
    md += '✅ All chunks within budget. See [`bundle-size-budgets.js`](scripts/bundle-size-budgets.js) and [ADR-0007](docs/architecture/adr/0007-bundle-size-budgets.md).\n';
    return md;
  }
  md += `❌ **${result.violations.length} budget violation(s)** — this PR cannot merge until either the bundle shrinks or the budget is explicitly raised in [\`bundle-size-budgets.js\`](scripts/bundle-size-budgets.js) (which requires a corresponding [ADR-0007](docs/architecture/adr/0007-bundle-size-budgets.md) change-log entry).\n\n`;
  md += '| Chunk | Budget (gzip) | Actual (gzip) | Over by |\n';
  md += '|---|---:|---:|---:|\n';
  for (const v of result.violations) {
    const label = v.chunk === '__total__' ? '**Total (all chunks)**' : `\`${v.chunk}\``;
    md += `| ${label} | ${fmtBytes(v.budget)} | ${fmtBytes(v.actual)} | +${fmtBytes(v.overBy)} (+${v.overPct.toFixed(1)}%) |\n`;
  }
  return md;
}

/** Build the full markdown report. Pure — exported for unit testing. */
export function buildReport(baseStats, headStats, options = {}) {
  const baseTotals = aggregate(chunkTotals(baseStats));
  const headTotals = aggregate(chunkTotals(headStats));
  const allChunks = new Set([
    ...Object.keys(baseTotals),
    ...Object.keys(headTotals)
  ]);
  const rows = [...allChunks].sort();

  const beforeTotal = sumGzip(baseTotals);
  const afterTotal = sumGzip(headTotals);

  let md = '';
  md += '### 📦 Bundle size impact\n\n';
  md += `**Total gzipped**: ${fmtBytes(beforeTotal)} → ${fmtBytes(afterTotal)} (${fmtDelta(beforeTotal, afterTotal)})\n\n`;
  md += '| Chunk | Before (gzip) | After (gzip) | Δ (gzip) | Δ (raw) |\n';
  md += '|---|---:|---:|---:|---:|\n';

  let changed = 0;
  for (const chunk of rows) {
    const b = baseTotals[chunk] || { raw: 0, gzip: 0 };
    const h = headTotals[chunk] || { raw: 0, gzip: 0 };
    if (b.raw === h.raw && b.gzip === h.gzip) continue;
    changed++;
    md += `| \`${chunk}\` | ${fmtBytes(b.gzip)} | ${fmtBytes(h.gzip)} | ${fmtDelta(b.gzip, h.gzip)} | ${fmtDelta(b.raw, h.raw)} |\n`;
  }

  if (changed === 0) {
    md += '| _no chunks changed_ | — | — | — | — |\n';
  }

  // PR-D3: append a budget-status section so reviewers see violations on
  // the PR comment even when the workflow's enforcement step would also
  // fail the build. Skippable via `options.skipBudgets` for tests that
  // exercise pre-PR-D3 behaviour explicitly.
  if (!options.skipBudgets) {
    const budgetResult = evaluateBudgets(headTotals);
    md += formatBudgetSection(budgetResult);
  }

  md += '\n<details><summary>How to read</summary>\n\n';
  md += 'Chunks are keyed by filename with 8-char content hashes stripped, so renamed chunks collapse into one row. Sizes are summed across all modules assigned to that chunk by Rollup. "Total gzipped" is the sum of the gzip column across all chunks — it is the single number most closely tracking runtime transfer cost.\n\n';
  md += 'Generated by `scripts/bundle-size-delta.js` via `.github/workflows/bundle-size.yml`.\n';
  md += '</details>\n';

  return md;
}

// ---------- CLI entry ----------

// Only run when invoked directly; importing for tests / `node -e` doesn't
// trigger this. Uses Node's canonical `import.meta.url ↔ argv[1]` pattern
// guarded against the `argv[1] === undefined` case (PR-D2 had this bug).
const invokedDirectly = !!process.argv[1]
  && (() => {
    try { return fileURLToPath(import.meta.url) === process.argv[1]; }
    catch { return false; }
  })();

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const checkBudgetsIdx = args.indexOf('--check-budgets');

  try {
    if (checkBudgetsIdx >= 0) {
      // Mode 2 — budget enforcement only.
      const headPath = args[checkBudgetsIdx + 1];
      if (!headPath) {
        console.error(
          'Usage: node scripts/bundle-size-delta.js --check-budgets <head-stats.json>'
        );
        process.exit(1);
      }
      const head = JSON.parse(readFileSync(headPath, 'utf8'));
      const headTotals = aggregate(chunkTotals(head));
      const result = evaluateBudgets(headTotals);
      if (result.ok) {
        console.error('bundle-size-delta: all chunks within budget ✓');
        process.exit(0);
      }
      console.error(`bundle-size-delta: ${result.violations.length} budget violation(s):`);
      for (const v of result.violations) {
        const label = v.chunk === '__total__' ? 'Total (all chunks)' : v.chunk;
        console.error(
          `  ${label} — budget ${fmtBytes(v.budget)}, actual ${fmtBytes(v.actual)} (+${v.overPct.toFixed(1)}%)`
        );
      }
      process.exit(2);
    } else {
      // Mode 1 — delta report (default).
      const [basePath, headPath] = args;
      if (!basePath || !headPath) {
        console.error(
          'Usage: node scripts/bundle-size-delta.js <base-stats.json> <head-stats.json>\n' +
          '       node scripts/bundle-size-delta.js --check-budgets <head-stats.json>'
        );
        process.exit(1);
      }
      const base = JSON.parse(readFileSync(basePath, 'utf8'));
      const head = JSON.parse(readFileSync(headPath, 'utf8'));
      process.stdout.write(buildReport(base, head));
    }
  } catch (err) {
    console.error(`bundle-size-delta: ${err.message}`);
    process.exit(1);
  }
}
