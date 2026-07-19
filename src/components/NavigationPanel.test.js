/**
 * Component test for NavigationPanel — WS-H PR 2 (see ADR-0013).
 *
 * Why these cases: NavigationPanel is the Stock Overview sidebar. It owns ONE
 * piece of real logic — `filteredTocTree` — and two thin wiring paths. A defect
 * in any of them is silent: the search box goes inert, or the nav shrinks/empties,
 * with no error and no console warning.
 *
 * Mock strategy: NONE required. The component imports only TOCTree.vue and
 * touches no network, storage or timers — adding service mocks here would be noise.
 *   - shallowMount for filter/wiring cases (auto-stubs TOCTree so we can read the
 *     props it is handed).
 *   - i18n is installed globally by src/test-setup.js. Per ADR-0013 we assert
 *     structure/props, never the English copy (the app is bilingual).
 */
import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'

import NavigationPanel from './NavigationPanel.vue'
import TOCTree from './TOCTree.vue'

// ---------- fixtures ----------

/** `label` is the company name and `symbol` the ticker — the component matches on both. */
function symbolNode (symbol, label, sector, industry) {
  return {
    id: `symbol-${symbol.toLowerCase()}`,
    type: 'symbol',
    label,
    symbol,
    metadata: { sector, industry, exchange: 'NASDAQ', marketCap: 0 }
  }
}

/** 2 sectors x 2 industries so filtering has something to discard. */
function makeTocTree () {
  return [
    {
      id: 'sector-tech',
      type: 'sector',
      label: 'Technology',
      children: [
        {
          id: 'industry-semis',
          type: 'industry',
          label: 'Semiconductors',
          children: [
            symbolNode('NVDA', 'NVIDIA Corp', 'Technology', 'Semiconductors'),
            symbolNode('AMD', 'Advanced Micro Devices', 'Technology', 'Semiconductors')
          ]
        },
        {
          id: 'industry-software',
          type: 'industry',
          label: 'Software',
          children: [symbolNode('MSFT', 'Microsoft Corp', 'Technology', 'Software')]
        }
      ]
    },
    {
      id: 'sector-energy',
      type: 'sector',
      label: 'Energy',
      children: [
        {
          id: 'industry-oil',
          type: 'industry',
          label: 'Oil & Gas',
          children: [symbolNode('XOM', 'Exxon Mobil', 'Energy', 'Oil & Gas')]
        }
      ]
    }
  ]
}

function mountPanel (props = {}) {
  return shallowMount(NavigationPanel, {
    props: { tocTree: makeTocTree(), ...props }
  })
}

/** Flatten the symbols a filtered tree would actually render. */
function symbolsOf (nodes) {
  return nodes.flatMap(sector =>
    sector.children.flatMap(industry => industry.children.map(s => s.symbol))
  )
}

describe('NavigationPanel', () => {
  describe('props handed to TOCTree', () => {
    it('passes the FILTERED tree and the LOCAL query, not the raw props', async () => {
      // Guards `:nodes="filteredTocTree"` / `:search-query="localSearchQuery"`.
      // Reverting either to the raw prop makes the search box completely inert
      // with no error — and the parent stubs this component in its own suite.
      const wrapper = mountPanel({ searchQuery: '' })
      const tree = () => wrapper.findComponent(TOCTree)

      expect(symbolsOf(tree().props('nodes'))).toEqual(['NVDA', 'AMD', 'MSFT', 'XOM'])

      await wrapper.setData({ localSearchQuery: 'NVDA' })

      expect(symbolsOf(tree().props('nodes'))).toEqual(['NVDA'])
      expect(tree().props('searchQuery')).toBe('NVDA')
    })

    it('forwards activeSymbol through to the tree', async () => {
      const wrapper = mountPanel({ activeSymbol: 'MSFT' })
      expect(wrapper.findComponent(TOCTree).props('activeSymbol')).toBe('MSFT')
    })
  })

  describe('filteredTocTree', () => {
    it('narrows to exactly one sector/industry/symbol for a ticker match', async () => {
      const wrapper = mountPanel()
      await wrapper.setData({ localSearchQuery: 'NVDA' })

      const nodes = wrapper.findComponent(TOCTree).props('nodes')
      expect(nodes).toHaveLength(1)
      expect(nodes[0].label).toBe('Technology')
      expect(nodes[0].children).toHaveLength(1)
      expect(nodes[0].children[0].label).toBe('Semiconductors')
      expect(symbolsOf(nodes)).toEqual(['NVDA'])
    })

    it('returns an EMPTY tree when nothing matches (never the unfiltered tree)', async () => {
      // Pins the `.filter(Boolean)` + the empty-children guard. A guard inversion
      // here would tell the user a ticker exists when it does not; dropping the
      // .filter(Boolean) sends `null` into TOCTree's v-for and crashes it.
      const wrapper = mountPanel()
      await wrapper.setData({ localSearchQuery: 'ZZZZ' })

      const nodes = wrapper.findComponent(TOCTree).props('nodes')
      expect(nodes).toEqual([])
    })

    it('keeps every symbol beneath a matched sector or industry, case-insensitively', async () => {
      // The sector/industry labels are evaluated inside the per-symbol loop, so a
      // group-level hit intentionally retains all descendants. Easy to "optimise"
      // into symbol-only matching, which silently shrinks the user's nav.
      const wrapper = mountPanel()
      const nodes = () => wrapper.findComponent(TOCTree).props('nodes')

      await wrapper.setData({ localSearchQuery: 'technology' }) // lowercase vs 'Technology'
      expect(symbolsOf(nodes())).toEqual(['NVDA', 'AMD', 'MSFT'])

      await wrapper.setData({ localSearchQuery: 'Semiconductors' })
      expect(symbolsOf(nodes())).toEqual(['NVDA', 'AMD'])
    })

    it('matches on company name as well as ticker', async () => {
      const wrapper = mountPanel()
      await wrapper.setData({ localSearchQuery: 'exxon' })
      expect(symbolsOf(wrapper.findComponent(TOCTree).props('nodes'))).toEqual(['XOM'])
    })
  })

  describe('trim guards', () => {
    it('treats a whitespace-only query as no query at all', async () => {
      const wrapper = mountPanel()
      await wrapper.setData({ localSearchQuery: '   ' })

      // Without the `.trim()` guard a stray spacebar would empty the whole panel.
      expect(symbolsOf(wrapper.findComponent(TOCTree).props('nodes')))
        .toEqual(['NVDA', 'AMD', 'MSFT', 'XOM'])
    })

    it('trims padding before matching so a pasted ticker still resolves', async () => {
      const wrapper = mountPanel()
      await wrapper.setData({ localSearchQuery: '  NVDA  ' })
      expect(symbolsOf(wrapper.findComponent(TOCTree).props('nodes'))).toEqual(['NVDA'])
    })
  })

  describe('events', () => {
    it('re-emits symbol-click from the tree with the ticker intact', async () => {
      // The only path driving scroll-to-card navigation in StockOverview — a
      // dropped payload makes every nav item silently do nothing.
      const wrapper = mountPanel()
      wrapper.findComponent(TOCTree).vm.$emit('symbol-click', 'NVDA')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('symbol-click')).toBeTruthy()
      expect(wrapper.emitted('symbol-click')[0]).toEqual(['NVDA'])
    })

    it('emits search-change with the RAW (untrimmed) query as the user types', async () => {
      const wrapper = mountPanel()
      await wrapper.find('input.search-input').setValue('  NVDA  ')

      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('search-change').at(-1)).toEqual(['  NVDA  '])
    })
  })

  describe('searchQuery prop sync', () => {
    it('adopts a later searchQuery prop change into the local query', async () => {
      const wrapper = mountPanel({ searchQuery: '' })
      await wrapper.setProps({ searchQuery: 'MSFT' })

      expect(wrapper.findComponent(TOCTree).props('searchQuery')).toBe('MSFT')
      expect(symbolsOf(wrapper.findComponent(TOCTree).props('nodes'))).toEqual(['MSFT'])
    })
  })
})
