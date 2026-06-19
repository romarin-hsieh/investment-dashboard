import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  parseSymbolsArg,
  validateSymbolFormat,
  normalizeExchange,
  buildStockEntry,
  symbolExists,
  recomputeMetadata,
  addSymbolToConfig,
  fetchSymbolMetadata,
  serializeConfig,
  addSymbols,
} from './add-symbol.js';

describe('parseSymbolsArg', () => {
  it('splits on commas and whitespace, upper-cases, dedupes, drops empties', () => {
    expect(parseSymbolsArg('abnb, shop  net,abnb')).toEqual(['ABNB', 'SHOP', 'NET']);
    expect(parseSymbolsArg('   ')).toEqual([]);
    expect(parseSymbolsArg(undefined)).toEqual([]);
  });
});

describe('validateSymbolFormat', () => {
  it('accepts normal tickers and dotted/hyphenated ones', () => {
    expect(validateSymbolFormat('NVDA')).toBe(true);
    expect(validateSymbolFormat('BRK-B')).toBe(true);
    expect(validateSymbolFormat('BF.B')).toBe(true);
  });
  it('rejects malformed tickers', () => {
    expect(validateSymbolFormat('')).toBe(false);
    expect(validateSymbolFormat('123')).toBe(false); // must start with a letter
    expect(validateSymbolFormat('TOOOOLONGGG')).toBe(false); // 11 chars
    expect(validateSymbolFormat('AB CD')).toBe(false);
    expect(validateSymbolFormat('AB$')).toBe(false);
  });
});

describe('normalizeExchange', () => {
  it('maps Yahoo exchange names to short codes', () => {
    expect(normalizeExchange('NasdaqGS')).toBe('NASDAQ');
    expect(normalizeExchange('NMS')).toBe('NASDAQ');
    expect(normalizeExchange('New York Stock Exchange')).toBe('NYSE');
    expect(normalizeExchange('NYSEArca')).toBe('NYSE');
    expect(normalizeExchange('AMEX')).toBe('AMEX');
    expect(normalizeExchange(undefined)).toBe('UNKNOWN');
  });
});

describe('buildStockEntry', () => {
  it('produces the canonical key order with enabled + default priority', () => {
    const e = buildStockEntry({ symbol: 'NET', exchange: 'NYSE', sector: 'Technology', industry: 'Software' });
    expect(e).toEqual({ symbol: 'NET', exchange: 'NYSE', sector: 'Technology', industry: 'Software', enabled: true, priority: 2 });
    expect(Object.keys(e)).toEqual(['symbol', 'exchange', 'sector', 'industry', 'enabled', 'priority']);
  });
});

describe('symbolExists', () => {
  const config = { stocks: [{ symbol: 'NVDA' }, { symbol: 'pl' }] };
  it('is case-insensitive', () => {
    expect(symbolExists(config, 'NVDA')).toBe(true);
    expect(symbolExists(config, 'PL')).toBe(true);
    expect(symbolExists(config, 'ABNB')).toBe(false);
  });
});

describe('recomputeMetadata', () => {
  it('fixes the counts from the actual array', () => {
    const config = {
      stocks: [{ symbol: 'A', enabled: true }, { symbol: 'B', enabled: false }, { symbol: 'C', enabled: true }],
      metadata: { total_stocks: 999, enabled_stocks: 999, exchanges: ['NYSE'] },
    };
    const out = recomputeMetadata(config);
    expect(out.metadata.total_stocks).toBe(3);
    expect(out.metadata.enabled_stocks).toBe(2);
    expect(out.metadata.exchanges).toEqual(['NYSE']); // other metadata preserved
  });
});

describe('addSymbolToConfig', () => {
  it('appends and recomputes', () => {
    const config = { stocks: [{ symbol: 'NVDA', enabled: true }], metadata: { total_stocks: 1, enabled_stocks: 1 } };
    const out = addSymbolToConfig(config, buildStockEntry({ symbol: 'NET', exchange: 'NYSE', sector: 'Tech', industry: 'SW' }));
    expect(out.stocks).toHaveLength(2);
    expect(out.stocks[1].symbol).toBe('NET');
    expect(out.metadata.total_stocks).toBe(2);
  });
});

describe('fetchSymbolMetadata', () => {
  it('extracts sector/industry/exchange from a quoteSummary', async () => {
    const yahooFinance = {
      quoteSummary: async () => ({
        price: { quoteType: 'EQUITY', exchangeName: 'NasdaqGS' },
        summaryProfile: { sector: 'Technology', industry: 'Software - Infrastructure' },
      }),
    };
    const meta = await fetchSymbolMetadata('NET', { yahooFinance });
    expect(meta).toEqual({ symbol: 'NET', exchange: 'NASDAQ', sector: 'Technology', industry: 'Software - Infrastructure' });
  });

  it('falls back to ETF labels when the profile has no sector', async () => {
    const yahooFinance = {
      quoteSummary: async () => ({ price: { quoteType: 'ETF', exchangeName: 'NYSEArca' }, summaryProfile: {} }),
    };
    const meta = await fetchSymbolMetadata('SCHD', { yahooFinance });
    expect(meta).toEqual({ symbol: 'SCHD', exchange: 'NYSE', sector: 'ETF', industry: 'Exchange Traded Fund' });
  });

  it('throws for a symbol Yahoo cannot resolve', async () => {
    const yahooFinance = { quoteSummary: async () => ({}) };
    await expect(fetchSymbolMetadata('FAKE', { yahooFinance })).rejects.toThrow(/no Yahoo Finance data/);
  });
});

describe('serializeConfig', () => {
  it('uses 2-space indent and a trailing newline', () => {
    const s = serializeConfig({ a: 1 });
    expect(s).toBe('{\n  "a": 1\n}\n');
  });
});

describe('addSymbols (filesystem integration)', () => {
  let rootDir;
  const baseConfig = {
    version: '2.0.0',
    last_updated: '2026-01-01T00:00:00Z',
    description: 'test',
    stocks: [{ symbol: 'NVDA', exchange: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors', enabled: true, priority: 1 }],
    metadata: { total_stocks: 1, enabled_stocks: 1, exchanges: ['NASDAQ'], sectors: ['Technology'] },
  };

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'add-symbol-'));
    fs.mkdirSync(path.join(rootDir, 'config'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'public', 'config'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'config', 'stocks.json'), serializeConfig(baseConfig));
    fs.writeFileSync(path.join(rootDir, 'public', 'config', 'stocks.json'), serializeConfig(baseConfig));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const yahooFinance = {
    quoteSummary: async (symbol) => {
      if (symbol === 'FAKE') return {};
      return { price: { quoteType: 'EQUITY', exchangeName: 'NYSE' }, summaryProfile: { sector: 'Industrials', industry: 'Defense' } };
    },
  };

  it('adds a new symbol, skips an existing one, fails an invalid one, and fixes metadata drift', async () => {
    const report = await addSymbols(['NET', 'nvda', '123BAD', 'FAKE'], { rootDir, yahooFinance, now: '2026-06-19T00:00:00Z' });

    expect(report.added.map((m) => m.symbol)).toEqual(['NET']);
    expect(report.skipped).toEqual(['NVDA']);
    expect(report.failed.map((f) => f.symbol)).toEqual(['123BAD', 'FAKE']);

    const written = JSON.parse(fs.readFileSync(path.join(rootDir, 'config', 'stocks.json'), 'utf8'));
    expect(written.stocks).toHaveLength(2);
    expect(written.stocks[1]).toEqual({ symbol: 'NET', exchange: 'NYSE', sector: 'Industrials', industry: 'Defense', enabled: true, priority: 2 });
    expect(written.metadata.total_stocks).toBe(2);
    expect(written.metadata.enabled_stocks).toBe(2);
    expect(written.last_updated).toBe('2026-06-19T00:00:00Z');

    // public/config copy is kept in sync
    const pub = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'config', 'stocks.json'), 'utf8'));
    expect(pub.stocks).toHaveLength(2);
  });

  it('does not rewrite the file when nothing is added', async () => {
    const before = fs.readFileSync(path.join(rootDir, 'config', 'stocks.json'), 'utf8');
    const report = await addSymbols(['NVDA'], { rootDir, yahooFinance, now: '2026-06-19T00:00:00Z' });
    expect(report.added).toEqual([]);
    expect(report.skipped).toEqual(['NVDA']);
    expect(fs.readFileSync(path.join(rootDir, 'config', 'stocks.json'), 'utf8')).toBe(before);
  });
});
