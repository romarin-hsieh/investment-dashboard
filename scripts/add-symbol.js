#!/usr/bin/env node
/**
 * add-symbol.js — self-service "add a tracked symbol" helper.
 *
 * Validates a ticker, confirms it is a real Yahoo Finance instrument, auto-fills
 * its exchange / sector / industry, and appends a well-formed entry to
 * `config/stocks.json` (the single source of truth). The nightly ETL then
 * generates all data for it and the frontend picks it up automatically.
 *
 * Usage:
 *   node scripts/add-symbol.js ABNB
 *   node scripts/add-symbol.js "ABNB, SHOP, NET"
 *
 * Idempotent: symbols already present are skipped, not duplicated. Invalid or
 * non-existent tickers are reported and skipped (config is never corrupted).
 *
 * The interesting logic is exported as pure functions so it can be unit-tested
 * without touching the network or the filesystem (see add-symbol.test.js).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// 1–10 chars, must start with a letter, allow digits, dot and hyphen (BRK-B, BF.B).
export const SYMBOL_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/** Split a free-form input ("ABNB, SHOP NET") into a deduped, upper-cased list. */
export function parseSymbolsArg(arg) {
  return [
    ...new Set(
      String(arg || '')
        .split(/[\s,]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
}

export function validateSymbolFormat(symbol) {
  return SYMBOL_RE.test(symbol);
}

/** Map Yahoo's exchange names onto the short codes used in stocks.json. */
export function normalizeExchange(name) {
  if (!name) return 'UNKNOWN';
  const n = String(name).toLowerCase();
  if (n.includes('nasdaq') || n.includes('nms') || n.includes('ngm') || n.includes('ncm')) return 'NASDAQ';
  if (n.includes('nyse') || n.includes('new york') || n.includes('arca')) return 'NYSE';
  if (n.includes('amex') || n.includes('american') || n.includes('bats') || n.includes('cboe')) return 'AMEX';
  return String(name).toUpperCase();
}

/** Build a stocks.json entry with the canonical key order. */
export function buildStockEntry({ symbol, exchange, sector, industry, priority = 2 }) {
  return { symbol, exchange, sector, industry, enabled: true, priority };
}

export function symbolExists(config, symbol) {
  return (config.stocks || []).some((s) => String(s.symbol).toUpperCase() === symbol);
}

/** Recompute the metadata counts from the actual stocks array (also fixes drift). */
export function recomputeMetadata(config) {
  const stocks = config.stocks || [];
  return {
    ...config,
    metadata: {
      ...(config.metadata || {}),
      total_stocks: stocks.length,
      enabled_stocks: stocks.filter((s) => s.enabled !== false).length,
    },
  };
}

/** Return a new config with `entry` appended and metadata recomputed. */
export function addSymbolToConfig(config, entry) {
  return recomputeMetadata({ ...config, stocks: [...(config.stocks || []), entry] });
}

function makeYahooClient() {
  const pkg = require('yahoo-finance2');
  const YahooFinance = pkg.default;
  return new YahooFinance();
}

/**
 * Fetch exchange / sector / industry for a symbol from Yahoo Finance. Throws if
 * the symbol does not resolve to a real instrument — that is our "is it real?"
 * validation. `yahooFinance` can be injected for tests.
 */
export async function fetchSymbolMetadata(symbol, { yahooFinance } = {}) {
  const yf = yahooFinance || makeYahooClient();
  const res = await yf.quoteSummary(symbol, { modules: ['summaryProfile', 'price'] });
  if (!res || !res.price) {
    throw new Error(`no Yahoo Finance data for "${symbol}" (delisted or not a real ticker?)`);
  }
  const quoteType = res.price.quoteType;
  const isEtf = quoteType === 'ETF' || quoteType === 'MUTUALFUND';
  const sector = res.summaryProfile?.sector || (isEtf ? 'ETF' : 'Unknown');
  const industry = res.summaryProfile?.industry || (isEtf ? 'Exchange Traded Fund' : 'Unknown');
  const exchange = normalizeExchange(res.price.exchangeName || res.price.fullExchangeName);
  return { symbol, exchange, sector, industry };
}

/** Serialize config the way stocks.json is stored (2-space indent, trailing newline). */
export function serializeConfig(config) {
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Add symbols to config/stocks.json (and mirror to public/config/stocks.json).
 * Returns a report. Injectable opts: { rootDir, yahooFinance, now }.
 */
export async function addSymbols(requested, opts = {}) {
  const rootDir = opts.rootDir;
  const configPath = path.join(rootDir, 'config', 'stocks.json');
  const publicPath = path.join(rootDir, 'public', 'config', 'stocks.json');

  let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const added = [];
  const skipped = [];
  const failed = [];

  for (const raw of requested) {
    const symbol = String(raw).trim().toUpperCase();
    if (!validateSymbolFormat(symbol)) {
      failed.push({ symbol, reason: 'invalid ticker format' });
      continue;
    }
    if (symbolExists(config, symbol)) {
      skipped.push(symbol);
      continue;
    }
    try {
      const meta = await fetchSymbolMetadata(symbol, opts);
      config = addSymbolToConfig(config, buildStockEntry(meta));
      added.push(meta);
    } catch (err) {
      failed.push({ symbol, reason: err.message });
    }
  }

  if (added.length > 0) {
    const out = serializeConfig({
      ...config,
      last_updated: opts.now || new Date().toISOString(),
    });
    fs.writeFileSync(configPath, out);
    if (fs.existsSync(path.dirname(publicPath))) {
      fs.writeFileSync(publicPath, out); // keep the served copy in sync immediately
    }
  }

  return { added, skipped, failed };
}

async function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const requested = parseSymbolsArg(process.argv.slice(2).join(' '));

  if (requested.length === 0) {
    console.error('Usage: node scripts/add-symbol.js "SYMBOL[, SYMBOL ...]"');
    process.exit(1);
  }

  console.log(`Requested: ${requested.join(', ')}`);
  const { added, skipped, failed } = await addSymbols(requested, { rootDir });

  for (const m of added) console.log(`✅ added ${m.symbol} (${m.exchange} · ${m.sector} / ${m.industry})`);
  for (const s of skipped) console.log(`⏭️  skipped ${s} (already in config)`);
  for (const f of failed) console.log(`❌ ${f.symbol}: ${f.reason}`);

  console.log(`\nDone — added ${added.length}, skipped ${skipped.length}, failed ${failed.length}.`);
  if (added.length > 0) {
    console.log('config/stocks.json updated. The nightly ETL will generate data on its next run.');
  }
  // Fail the run only if nothing landed AND something was genuinely wrong.
  if (added.length === 0 && skipped.length === 0 && failed.length > 0) {
    process.exit(1);
  }
}

// Run only when invoked directly (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
