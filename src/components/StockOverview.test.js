/**
 * Component test for StockOverview (WS-G PR-G3). Third Vue component test
 * in the project; mirrors the mount + module-mock pattern established by
 * PR-G1 (`MFIVolumeProfilePanel.test.js`) and PR-G2
 * (`FundamentalAnalysis.test.js`).
 *
 * StockOverview is the largest Options-API component in the codebase and
 * aggregates a lot of moving parts: data load via `stockOverviewOptimizer`,
 * three layers of grouping in `groupedStocks` (Sector → Industry → MarketCap),
 * a `tocTree` mirroring that grouping for the side-nav, a keyboard
 * navigation surface (`j`/`k`/`Enter`/`Escape`/`?`), and lifecycle wiring
 * for ScrollSpy. We exercise:
 *   - mount + happy/error path of `loadStockData`
 *   - sector/industry sort priority + market-cap tiebreaker in `groupedStocks`
 *   - flat-symbol traversal + keyboard navigation methods
 *   - pure helpers (`formatTime`, `mapExchangeCode`, `sanitizeId`,
 *     `isSymbolValid` delegation)
 *
 * Coverage philosophy: same as PR-G1/G2 — happy + 1 failure case per public
 * surface, with the priority-sort logic and keyboard nav state machine
 * covered explicitly because they're the most behavioural-visible parts of
 * the component and would be the easiest to silently regress during the
 * queued refactor work.
 *
 * Mock strategy:
 *   - `@/utils/stocksConfigService`     → vi.mock (named export `stocksConfig`)
 *   - `@/utils/stockOverviewOptimizer`  → vi.mock (named export)
 *   - `@/utils/directMetadataLoader`    → vi.mock (named export)
 *   - `@/services/NavigationService`    → vi.mock (named export `navigationService`)
 *   - `@/services/ScrollSpyService`     → vi.mock (named export `scrollSpyService`)
 *   - `@/lib/fetcher`                   → vi.mock (defensive — imported but unused
 *                                                  in flows under test; real impl
 *                                                  pulls in network/timer code)
 *   - `@/composables/useTheme`          → vi.mock (returns reactive ref('light'))
 *   - `@/composables/useKeyboardShortcuts` → vi.mock (named export `createKeyHandler`)
 *   - Child components (StockCard, NavigationPanel, etc.) → stubbed via
 *     mount options so we don't pull their entire dep graph.
 *   - `$route` / `$router` → injected via `global.mocks` since the
 *     component reads `$route.query.focus` and calls `$router.push/replace`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ---------- module mocks (must precede component import) ----------

vi.mock('@/utils/stocksConfigService.js', () => ({
  stocksConfig: { getEnabledSymbols: vi.fn() }
}))
vi.mock('@/utils/stockOverviewOptimizer.js', () => ({
  stockOverviewOptimizer: { loadOptimizedStockData: vi.fn() },
  default: { loadOptimizedStockData: vi.fn() }
}))
vi.mock('@/utils/directMetadataLoader.js', () => ({
  directMetadataLoader: { loadMetadata: vi.fn() }
}))
vi.mock('@/services/NavigationService.js', () => ({
  navigationService: {
    scrollToSymbol: vi.fn().mockResolvedValue(undefined),
    isSymbolValid:  vi.fn().mockReturnValue(true)
  }
}))
vi.mock('@/services/ScrollSpyService.js', () => ({
  scrollSpyService: {
    setup:   vi.fn(),
    cleanup: vi.fn(),
    pause:   vi.fn(),
    resume:  vi.fn()
  }
}))
vi.mock('@/lib/fetcher', () => ({
  dataFetcher: { fetchQuotesSnapshot: vi.fn(), fetchDailySnapshot: vi.fn() }
}))
vi.mock('@/composables/useTheme.js', () => ({
  useTheme: () => ({
    theme:       ref('light'),
    toggleTheme: vi.fn(),
    setTheme:    vi.fn()
  })
}))
vi.mock('@/composables/useKeyboardShortcuts', () => ({
  createKeyHandler: vi.fn(() => () => {})
}))

import StockOverview from './StockOverview.vue'
import { stocksConfig } from '@/utils/stocksConfigService.js'
import { stockOverviewOptimizer } from '@/utils/stockOverviewOptimizer.js'
import { directMetadataLoader } from '@/utils/directMetadataLoader.js'
import { navigationService } from '@/services/NavigationService.js'
import { scrollSpyService } from '@/services/ScrollSpyService.js'

// ---------- fixtures ----------

/**
 * Two-sector, three-industry, four-symbol fixture. Specifically chosen so
 * the priority-sort assertions cover (a) sector ordering against the
 * hard-coded `sectorPriority` list, (b) industry ordering within a sector,
 * and (c) market-cap descending tiebreaker within an industry.
 *
 * Symbols + sectors:
 *   AAPL   → Technology / Consumer Electronics      (cap 3T)
 *   NVDA   → Technology / Semiconductors            (cap 2T)
 *   AMD    → Technology / Semiconductors            (cap 200B) ← lower-cap peer of NVDA
 *   JPM    → Financial Services / Banks - Diversified (cap 500B)
 */
function makeQuotesStub () {
  return [
    { symbol: 'AAPL', price: 175 },
    { symbol: 'NVDA', price: 900 },
    { symbol: 'AMD',  price: 150 },
    { symbol: 'JPM',  price: 200 }
  ]
}

function makeMetadataStub () {
  return {
    items: [
      { symbol: 'AAPL', sector: 'Technology', industry: 'Consumer Electronics', confidence: 0.95, market_cap: 3_000_000_000_000, exchange: 'NMS' },
      { symbol: 'NVDA', sector: 'Technology', industry: 'Semiconductors',       confidence: 0.95, market_cap: 2_000_000_000_000, exchange: 'NMS' },
      { symbol: 'AMD',  sector: 'Technology', industry: 'Semiconductors',       confidence: 0.95, market_cap:   200_000_000_000, exchange: 'NMS' },
      { symbol: 'JPM',  sector: 'Financial Services', industry: 'Banks - Diversified', confidence: 0.95, market_cap: 500_000_000_000, exchange: 'NYQ' }
    ]
  }
}

function makeDailyStub () {
  return {
    per_symbol: [
      { symbol: 'AAPL', change: 1.2 },
      { symbol: 'NVDA', change: 2.5 },
      { symbol: 'AMD',  change: -0.8 },
      { symbol: 'JPM',  change: 0.3 }
    ]
  }
}

function makeOptimizerPayload () {
  return {
    quotes:     makeQuotesStub(),
    metadata:   makeMetadataStub(),
    dailyData:  makeDailyStub(),
    lastUpdate: '2026-04-27T10:00:00Z'
  }
}

// ---------- per-test setup ----------

/**
 * Mount options shared across every test:
 *   - Stub all child components so we don't pull NavigationPanel's tree
 *     widget, the lazy TradingView iframe, or any of the skeleton CSS.
 *   - Inject $route/$router so beforeRouteLeave + onSymbolClick + the
 *     focus-symbol bootstrap don't blow up on undefined.
 */
function makeMountOpts (props = {}) {
  return {
    props,
    global: {
      stubs: {
        StockCard:                true,
        LazyTradingViewWidget:    true,
        NavigationPanel:          true,
        WidgetSkeleton:           true,
        StockCardSkeleton:        true,
        KeyboardShortcutsOverlay: true
      },
      mocks: {
        $route:  { query: {} },
        // `push` and `replace` need a `.catch()` chain — the component
        // calls `.catch(...)` on both at StockOverview.vue:639 and :950.
        $router: {
          push:    vi.fn().mockReturnValue({ catch: vi.fn() }),
          replace: vi.fn().mockReturnValue({ catch: vi.fn() })
        }
      }
    }
  }
}

beforeEach(() => {
  // Component logs aggressively from loadStockData (uses console.error as
  // info-channel — see `🚀 Starting optimized stock data load...`). Silence
  // to keep test output readable. Same pattern as PR-G1/G2.
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Default happy-path returns; individual tests override as needed.
  stocksConfig.getEnabledSymbols.mockResolvedValue(['AAPL', 'NVDA', 'AMD', 'JPM'])
  stockOverviewOptimizer.loadOptimizedStockData.mockResolvedValue(makeOptimizerPayload())
  directMetadataLoader.loadMetadata.mockResolvedValue(makeMetadataStub())

  // localStorage starts clean per test so saved-expanded-sections logic is
  // deterministic.
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

// ---------- mount + loadStockData lifecycle ----------

describe('StockOverview — mount + loadStockData lifecycle', () => {
  it('mounts and loads optimized stock data on mount (happy)', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    // Symbols fetched once, then handed straight to the optimizer.
    expect(stocksConfig.getEnabledSymbols).toHaveBeenCalledTimes(1)
    expect(stockOverviewOptimizer.loadOptimizedStockData).toHaveBeenCalledTimes(1)
    expect(stockOverviewOptimizer.loadOptimizedStockData)
      .toHaveBeenCalledWith(['AAPL', 'NVDA', 'AMD', 'JPM'])

    expect(wrapper.vm.quotes.length).toBe(4)
    expect(wrapper.vm.metadata.items.length).toBe(4)
    expect(wrapper.vm.dailyData.per_symbol.length).toBe(4)
    expect(wrapper.vm.lastUpdate).toBe('2026-04-27T10:00:00Z')
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.loading).toBe(false)

    // Optimizer returned metadata, so the direct loader fallback isn't called.
    expect(directMetadataLoader.loadMetadata).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('falls back to directMetadataLoader when optimizer returns no metadata', async () => {
    stockOverviewOptimizer.loadOptimizedStockData.mockResolvedValueOnce({
      quotes:     makeQuotesStub(),
      dailyData:  makeDailyStub(),
      lastUpdate: '2026-04-27T10:00:00Z'
      // metadata intentionally absent
    })

    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    expect(directMetadataLoader.loadMetadata).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.metadata.items.length).toBe(4)
    expect(wrapper.vm.error).toBeNull()

    wrapper.unmount()
  })

  it('sets error and clears loading when optimizer throws (failure)', async () => {
    stockOverviewOptimizer.loadOptimizedStockData
      .mockRejectedValueOnce(new Error('Network down'))

    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    expect(wrapper.vm.error).toMatch(/Network down/)
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.quotes).toEqual([])

    wrapper.unmount()
  })

  it('refresh() re-runs loadStockData', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()
    expect(stockOverviewOptimizer.loadOptimizedStockData).toHaveBeenCalledTimes(1)

    await wrapper.vm.refresh()
    await flushPromises()
    expect(stockOverviewOptimizer.loadOptimizedStockData).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('cleans up scrollSpy on unmount', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    wrapper.unmount()
    expect(scrollSpyService.cleanup).toHaveBeenCalled()
  })
})

// ---------- groupedStocks priority sort ----------

describe('StockOverview — groupedStocks sector/industry/market-cap priority', () => {
  it('orders sectors by priority list (Technology before Financial Services)', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    const sectors = Object.keys(wrapper.vm.groupedStocks)
    // Technology comes before Financial Services per `sectorPriority` at
    // StockOverview.vue:223. The fixture also includes JPM in Financial
    // Services so both are non-empty.
    expect(sectors.indexOf('Technology'))
      .toBeLessThan(sectors.indexOf('Financial Services'))

    wrapper.unmount()
  })

  it('within Technology, orders industries by priority and stocks by market-cap desc', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    const tech = wrapper.vm.groupedStocks['Technology']
    // industryPriority for Technology lists Semiconductors *before*
    // Consumer Electronics, so NVDA + AMD precede AAPL despite AAPL having
    // the largest market cap.
    expect(tech.map(s => s.quote.symbol)).toEqual(['NVDA', 'AMD', 'AAPL'])

    // Within Semiconductors, market-cap descending puts NVDA (2T) before
    // AMD (200B).
    const semis = tech.filter(s => s.metadata.industry === 'Semiconductors')
    expect(semis.map(s => s.quote.symbol)).toEqual(['NVDA', 'AMD'])

    wrapper.unmount()
  })

  it('classifies low-confidence metadata as Unknown sector', async () => {
    const lowConfidence = {
      items: [
        { symbol: 'XYZ', sector: 'Technology', industry: 'Software - Application', confidence: 0.3, market_cap: 1000, exchange: 'NMS' }
      ]
    }
    stockOverviewOptimizer.loadOptimizedStockData.mockResolvedValueOnce({
      quotes:    [{ symbol: 'XYZ' }],
      metadata:  lowConfidence,
      dailyData: { per_symbol: [] },
      lastUpdate: '2026-04-27T10:00:00Z'
    })

    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    // confidence < 0.7 → sector falls back to 'Unknown' even though metadata
    // claims Technology. See StockOverview.vue:197.
    expect(wrapper.vm.groupedStocks['Unknown']).toBeTruthy()
    expect(wrapper.vm.groupedStocks['Technology']).toBeUndefined()

    wrapper.unmount()
  })

  it('groupedStocks is empty when quotes or metadata missing', async () => {
    stockOverviewOptimizer.loadOptimizedStockData.mockResolvedValueOnce({
      quotes:    [],
      metadata:  null,
      dailyData: null,
      lastUpdate: null
    })
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    expect(wrapper.vm.groupedStocks).toEqual({})
    expect(wrapper.vm.tocTree).toEqual([])

    wrapper.unmount()
  })
})

// ---------- tocTree shape ----------

describe('StockOverview — tocTree', () => {
  it('mirrors groupedStocks as a sector → industry → symbol tree', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    const tree = wrapper.vm.tocTree
    expect(tree.length).toBe(2) // Technology + Financial Services

    const tech = tree.find(n => n.label === 'Technology')
    expect(tech.type).toBe('sector')
    expect(tech.id).toBe('sector-Technology')

    // Industries under Technology in priority order.
    const industries = tech.children.map(c => c.label)
    expect(industries).toEqual(['Semiconductors', 'Consumer Electronics'])

    const semis = tech.children[0]
    expect(semis.type).toBe('industry')
    // Symbols under Semiconductors should carry exchange + marketCap from
    // metadata via `mapExchangeCode`.
    expect(semis.children.map(s => s.symbol)).toEqual(['NVDA', 'AMD'])
    expect(semis.children[0].metadata.exchange).toBe('NASDAQ') // NMS → NASDAQ
    expect(semis.children[0].metadata.marketCap).toBe(2_000_000_000_000)

    wrapper.unmount()
  })
})

// ---------- keyboard navigation ----------

describe('StockOverview — keyboard navigation', () => {
  it('flatSymbols walks groupedStocks in display order', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    // Same order as groupedStocks: Technology (NVDA, AMD, AAPL) then
    // Financial Services (JPM).
    expect(wrapper.vm.flatSymbols).toEqual(['NVDA', 'AMD', 'AAPL', 'JPM'])

    wrapper.unmount()
  })

  it('moveSelection(+1) starts at index 0 from -1; clamps at end', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    expect(wrapper.vm.selectedIndex).toBe(-1)
    expect(wrapper.vm.selectedSymbol).toBe('')

    wrapper.vm.moveSelection(1)
    expect(wrapper.vm.selectedIndex).toBe(0)
    expect(wrapper.vm.selectedSymbol).toBe('NVDA')

    // Walk to the end then attempt to overshoot; clamps at last index.
    wrapper.vm.moveSelection(1)
    wrapper.vm.moveSelection(1)
    wrapper.vm.moveSelection(1)
    expect(wrapper.vm.selectedIndex).toBe(3)
    wrapper.vm.moveSelection(1)
    expect(wrapper.vm.selectedIndex).toBe(3) // clamped, no wrap

    wrapper.unmount()
  })

  it('moveSelection(-1) starts at last index from -1', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    wrapper.vm.moveSelection(-1)
    expect(wrapper.vm.selectedIndex).toBe(3)
    expect(wrapper.vm.selectedSymbol).toBe('JPM')

    wrapper.unmount()
  })

  it('moveSelection is a no-op when flatSymbols is empty', async () => {
    stockOverviewOptimizer.loadOptimizedStockData.mockResolvedValueOnce({
      quotes: [], metadata: null, dailyData: null, lastUpdate: null
    })
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    wrapper.vm.moveSelection(1)
    expect(wrapper.vm.selectedIndex).toBe(-1)

    wrapper.unmount()
  })

  it('openSelectedDetail pushes stock-detail route with the selected symbol', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    wrapper.vm.moveSelection(1) // NVDA
    wrapper.vm.openSelectedDetail()

    expect(wrapper.vm.$router.push).toHaveBeenCalledWith({
      name: 'stock-detail',
      params: { symbol: 'NVDA' }
    })

    wrapper.unmount()
  })

  it('openSelectedDetail closes help overlay first if open (early return)', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    wrapper.vm.showShortcutsHelp = true
    wrapper.vm.moveSelection(1) // would select NVDA
    wrapper.vm.openSelectedDetail()

    expect(wrapper.vm.showShortcutsHelp).toBe(false)
    // The early-return path must NOT push a route.
    expect(wrapper.vm.$router.push).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('clearSelection resets selectedIndex (or closes help if open)', async () => {
    const wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()

    wrapper.vm.moveSelection(1)
    expect(wrapper.vm.selectedIndex).toBe(0)
    wrapper.vm.clearSelection()
    expect(wrapper.vm.selectedIndex).toBe(-1)

    // Same key with help overlay open → closes overlay, leaves index alone.
    wrapper.vm.selectedIndex = 2
    wrapper.vm.showShortcutsHelp = true
    wrapper.vm.clearSelection()
    expect(wrapper.vm.showShortcutsHelp).toBe(false)
    expect(wrapper.vm.selectedIndex).toBe(2)

    wrapper.unmount()
  })
})

// ---------- pure helpers ----------

describe('StockOverview — pure helpers', () => {
  let wrapper

  beforeEach(async () => {
    wrapper = mount(StockOverview, makeMountOpts())
    await flushPromises()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('formatTime returns localised string for valid input, "" for null', () => {
    expect(wrapper.vm.formatTime(null)).toBe('')
    expect(wrapper.vm.formatTime('')).toBe('')

    const out = wrapper.vm.formatTime('2026-04-27T10:00:00Z')
    // Locale-dependent; assert structurally rather than exact text.
    expect(out).toMatch(/Apr/)
    expect(out.length).toBeGreaterThan(0)
  })

  it('mapExchangeCode translates known codes; passes through unknowns', () => {
    expect(wrapper.vm.mapExchangeCode('NYQ')).toBe('NYSE')
    expect(wrapper.vm.mapExchangeCode('NMS')).toBe('NASDAQ')
    expect(wrapper.vm.mapExchangeCode('NCM')).toBe('NASDAQ')
    expect(wrapper.vm.mapExchangeCode('NGM')).toBe('NASDAQ')
    expect(wrapper.vm.mapExchangeCode('ASE')).toBe('AMEX')
    // Unknown → returned as-is.
    expect(wrapper.vm.mapExchangeCode('TPE')).toBe('TPE')
    // Falsy → 'Unknown'.
    expect(wrapper.vm.mapExchangeCode('')).toBe('Unknown')
    expect(wrapper.vm.mapExchangeCode(undefined)).toBe('Unknown')
  })

  it('sanitizeId replaces non-alphanumerics with underscores', () => {
    expect(wrapper.vm.sanitizeId('Technology')).toBe('Technology')
    expect(wrapper.vm.sanitizeId('Financial Services')).toBe('Financial_Services')
    expect(wrapper.vm.sanitizeId('REIT - Specialty')).toBe('REIT___Specialty')
    expect(wrapper.vm.sanitizeId('Banks - Diversified')).toBe('Banks___Diversified')
  })

  it('isSymbolValid delegates to navigationService', () => {
    wrapper.vm.isSymbolValid('AAPL')
    expect(navigationService.isSymbolValid).toHaveBeenCalledWith('AAPL')
  })

  it('saveExpandedSections + loadExpandedSections roundtrip via localStorage', () => {
    wrapper.vm.expandedSections = new Set(['sector-Technology', 'industry-foo'])
    wrapper.vm.saveExpandedSections()

    // Reload into a fresh Set.
    wrapper.vm.expandedSections = new Set()
    wrapper.vm.loadExpandedSections()
    expect([...wrapper.vm.expandedSections].sort())
      .toEqual(['industry-foo', 'sector-Technology'])
  })
})
