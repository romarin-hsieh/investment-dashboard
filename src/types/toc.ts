/**
 * Shared Table-of-Contents tree node types.
 *
 * One nested tree flows through three components: StockOverview.tocTree() builds
 * it, NavigationPanel filters it, and TOCTree renders it. Modelling it once here
 * keeps those boundaries type-compatible (each component previously carried its
 * own subtly-different local shape, which stopped composing once typed).
 */

/** A leaf ticker node. */
export interface TocSymbolNode {
  id: string;
  type: 'symbol';
  label: string;
  symbol: string;
  metadata: { sector: string; industry: string; exchange: string; marketCap: number };
}

/** An industry grouping under a sector. */
export interface TocIndustryNode {
  id: string;
  type: 'industry';
  label: string;
  children: TocSymbolNode[];
}

/** A top-level sector node (the root elements of the tree). */
export interface TocSectorNode {
  id: string;
  type: 'sector';
  label: string;
  children: TocIndustryNode[];
}
