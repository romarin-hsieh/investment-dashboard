/**
 * Per-chunk bundle-size budgets enforced by the `bundle-size.yml` workflow.
 *
 * Keys are post-normalization chunk names (8-char content hashes stripped —
 * see `normalizeChunkName` in `bundle-size-delta.js`). The special key
 * `__total__` is the sum of all chunks' gzipped sizes.
 *
 * Limits are in **bytes**, gzipped. Any chunk whose actual gzip size exceeds
 * its budget fails the `Enforce bundle budgets` step in CI (and only that
 * step — the `Post or update PR comment` step still runs first so the
 * delta report and the violation list both reach the PR review surface).
 *
 * Calibrated against measured baseline on 2026-04-25 with 10–31 % headroom.
 * Calibration method, calibration date, and adjustment process are recorded
 * in [ADR-0007](../docs/architecture/adr/0007-bundle-size-budgets.md). Tweak
 * the numbers ONLY through a PR that updates this file *and* ADR-0007's
 * change log; never silently.
 */

const KB = 1024;
const MB = 1024 * 1024;

export const BUDGETS = {
  // Largest single chunk in the entire bundle. Lazy-loaded only when a 3D
  // chart renders, so growth here only affects the small subset of pages
  // that touch ReviewCometChart / ThreeDKineticChart. Tightest headroom of
  // any budget — bumping requires explicit PR justification.
  'assets/plotly.js':       { gzip: 1.8 * MB,  headroomPct: 13 },

  // Entry-route chunk — every visitor pays this cost on first paint.
  // Aggregated across both `index-*` chunks Rollup emits. Raised for the i18n
  // bulk migration (⑥): all locale messages load at boot, so the entry grows as
  // bilingual coverage expands. Reclaim path: lazy-load the non-active locale
  // (load only EN at boot, fetch zh-TW on switch) — see ADR-0007 change log.
  'assets/index.js':        { gzip: 180 * KB,  headroomPct: 9 },

  // Largest *route* chunk — heavily used (every stock detail page) and
  // already split across Analysis / Holdings tabs by PR-C3, so further
  // growth signals new tab content rather than tab-merge regression.
  'assets/StockDetail.js':  { gzip: 130 * KB,  headroomPct: 21 },

  // Shared deps (Vue + vue-router + vue-i18n). vue-i18n was added in PR 6-1 for
  // bilingual EN/繁中 support and deliberately placed in this long-cached chunk
  // (rather than the entry chunk) so the cost is paid once — see ADR-0007 change log.
  'assets/vendor.js':       { gzip: 105 * KB,  headroomPct: 11 },

  // Last-line whole-bundle safety net. Catches the case where a new chunk
  // we didn't anticipate (and therefore didn't budget individually) eats
  // budget headroom across many small files at once.
  '__total__':              { gzip: 2.25 * MB, headroomPct: 10 }
};
