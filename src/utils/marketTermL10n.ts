/**
 * Market-vocabulary localization for third-party payload values (audit CP-8).
 *
 * Yahoo insider feeds and Dataroma activity columns deliver finite English vocabularies
 * (Buy / Sale, Add 12.5%, Chief Executive Officer, …) that were rendered raw under 繁中
 * labels. Each map covers the known vocabulary; unmapped values fall back to the raw
 * string — visible and honest, never hidden.
 */
type Translate = (key: string) => string

const TX_TYPE_KEYS: Record<string, string> = {
  Buy: 'marketTerms.tx.buy',
  Purchase: 'marketTerms.tx.buy',
  Sale: 'marketTerms.tx.sell',
  Sell: 'marketTerms.tx.sell',
}

export function txTypeLabel(raw: string | undefined | null, t: Translate): string {
  if (!raw) return ''
  const key = TX_TYPE_KEYS[raw.trim()]
  return key ? t(key) : raw
}

// Dataroma activity is either a bare word (Buy / Sell / Hold / Sold Out) or a word plus
// magnitude ("Add 12.5%", "Reduce 3.40%") — translate the word, keep the magnitude.
const ACTIVITY_KEYS: Record<string, string> = {
  Buy: 'marketTerms.activity.buy',
  Sell: 'marketTerms.activity.sell',
  Add: 'marketTerms.activity.add',
  Reduce: 'marketTerms.activity.reduce',
  Hold: 'marketTerms.activity.hold',
  'Sold Out': 'marketTerms.activity.soldOut',
}

export function activityLabel(raw: string | undefined | null, t: Translate): string {
  if (!raw || !raw.trim()) return '-'
  const value = raw.trim()
  const exact = ACTIVITY_KEYS[value]
  if (exact) return t(exact)
  const match = /^(Sold Out|Buy|Sell|Add|Reduce|Hold)\b\s*(.*)$/.exec(value)
  if (match && match[1]) {
    const word = t(ACTIVITY_KEYS[match[1]] as string)
    return match[2] ? `${word} ${match[2]}` : word
  }
  return value
}

// SEC filer relationships (finite common set; long tail falls back raw).
const RELATIONSHIP_KEYS: Record<string, string> = {
  'Chief Executive Officer': 'marketTerms.role.ceo',
  CEO: 'marketTerms.role.ceo',
  'Chief Financial Officer': 'marketTerms.role.cfo',
  CFO: 'marketTerms.role.cfo',
  'Chief Operating Officer': 'marketTerms.role.coo',
  COO: 'marketTerms.role.coo',
  Director: 'marketTerms.role.director',
  Officer: 'marketTerms.role.officer',
  President: 'marketTerms.role.president',
  Chairman: 'marketTerms.role.chairman',
  'Chairman of the Board': 'marketTerms.role.chairman',
  'General Counsel': 'marketTerms.role.generalCounsel',
  '10% Owner': 'marketTerms.role.tenPctOwner',
}

export function relationshipLabel(raw: string | undefined | null, t: Translate): string {
  if (!raw || !raw.trim()) return '-'
  const key = RELATIONSHIP_KEYS[raw.trim()]
  return key ? t(key) : raw
}
