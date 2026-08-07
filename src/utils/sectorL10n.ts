/**
 * Sector display localization (audit SK-C-1).
 *
 * The universe config carries the 12 sector names as English payload values; they were
 * rendered raw as the zh UI's group headings. Sectors are a small finite set with
 * standard Taiwan brokerage translations, so they map through i18n keys here. INDUSTRY
 * names (50+, e.g. "Software - Infrastructure") deliberately stay in English — reliable
 * finance-domain translations for the long tail are riskier than the mixed-language
 * display; only the 'Unknown' placeholder is localized at its call sites.
 *
 * Keys are matching-only: navigation ids/anchors keep the raw sector value.
 */
type Translate = (key: string) => string

const SECTOR_KEYS: Record<string, string> = {
  'Basic Materials': 'sectors.basicMaterials',
  'Communication Services': 'sectors.communicationServices',
  'Consumer Cyclical': 'sectors.consumerCyclical',
  'Consumer Defensive': 'sectors.consumerDefensive',
  'ETF': 'sectors.etf',
  'Energy': 'sectors.energy',
  'Financial Services': 'sectors.financialServices',
  'Healthcare': 'sectors.healthcare',
  'Industrials': 'sectors.industrials',
  'Real Estate': 'sectors.realEstate',
  'Technology': 'sectors.technology',
  'Utilities': 'sectors.utilities',
  'Unknown': 'sectors.unknown',
}

export function sectorLabel(sector: string | undefined | null, t: Translate): string {
  const raw = (sector || 'Unknown').trim()
  const key = SECTOR_KEYS[raw]
  return key ? t(key) : raw
}
