#!/usr/bin/env node
/**
 * Compute per-chunk size deltas between two `rollup-plugin-visualizer`
 * `stats.json` snapshots and emit a markdown report suitable for a PR comment.
 *
 * Used by `.github/workflows/bundle-size.yml` to surface bundle-size impact
 * on every pull request. Part of WS-D Bundle Analyzer Integration (PR-D2).
 *
 * Usage:
 *   node scripts/bundle-size-delta.js <base-stats.json> <head-stats.json>
 *
 * Output: markdown to stdout. Exit 0 on success; exit 1 on IO/parse error.
 *
 * Input format (rollup-plugin-visualizer template: 'raw-data'):
 *   { version, tree, nodeParts: { [uid]: { renderedLength, gzipLength,
 *     brotliLength, metaUid } }, nodeMetas: { [uid]: { id, moduleParts:
 *     { [chunkName]: nodePartUid }, ... } }, ... }
 *
 * Normalization: chunk filenames contain 8-char content hashes
 * (`vendor-CQqD8gzt.js`). We strip those so renames don't appear as delete+add.
 */

import { readFileSync } from 'fs';

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

/** Build the full markdown report. Pure — exported for unit testing. */
export function buildReport(baseStats, headStats) {
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

  md += '\n<details><summary>How to read</summary>\n\n';
  md += 'Chunks are keyed by filename with 8-char content hashes stripped, so renamed chunks collapse into one row. Sizes are summed across all modules assigned to that chunk by Rollup. "Total gzipped" is the sum of the gzip column across all chunks — it is the single number most closely tracking runtime transfer cost.\n\n';
  md += 'Generated by `scripts/bundle-size-delta.js` via `.github/workflows/bundle-size.yml`.\n';
  md += '</details>\n';

  return md;
}

// ---------- CLI entry ----------

// Only run when invoked directly; importing for tests doesn't trigger this.
const invokedDirectly = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
  || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());

if (invokedDirectly) {
  const [basePath, headPath] = process.argv.slice(2);
  if (!basePath || !headPath) {
    console.error(
      'Usage: node scripts/bundle-size-delta.js <base-stats.json> <head-stats.json>'
    );
    process.exit(1);
  }
  try {
    const base = JSON.parse(readFileSync(basePath, 'utf8'));
    const head = JSON.parse(readFileSync(headPath, 'utf8'));
    process.stdout.write(buildReport(base, head));
  } catch (err) {
    console.error(`bundle-size-delta: ${err.message}`);
    process.exit(1);
  }
}
