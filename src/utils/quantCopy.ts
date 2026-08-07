/**
 * Quant signal / commentary localization (audit CP-1).
 *
 * The pipeline payload carries signal CODES (WAIT / NO_DATA / NO_TRADE / LAUNCHPAD /
 * DIP_BUY / CLIMAX / AVOID) and English commentary PROSE. Presentation maps both to i18n
 * keys here — one map instead of per-component switches, so a new signal added to the
 * payload has exactly one place to be wired. Unmapped values fall back to the raw string
 * (visible and honest, never silently hidden).
 *
 * The commentary map matches the three exact strings the generator currently emits
 * (`scripts/production/daily_update.py`); the payload's `reason` field is a byte-identical
 * copy of `commentary`, not a code, so string-matching here is the seam until the
 * generator emits a real `reason_code`.
 */
type Translate = (key: string) => string

const SIGNAL_KEYS: Record<string, string> = {
  LAUNCHPAD: 'signalCard.signals.launchpad',
  DIP_BUY: 'signalCard.signals.dipBuy',
  CLIMAX: 'signalCard.signals.climax',
  AVOID: 'signalCard.signals.avoid',
  WAIT: 'signalCard.signals.wait',
  NO_DATA: 'signalCard.signals.noData',
  NO_TRADE: 'signalCard.signals.noTrade',
}

export function signalLabel(signal: string | undefined | null, t: Translate): string {
  if (!signal) return ''
  const key = SIGNAL_KEYS[signal]
  return key ? t(key) : signal.replace('_', ' ')
}

const COMMENTARY_KEYS: Record<string, string> = {
  'Sector Weakness (Peer Down)': 'cometChart.commentary.sectorWeakness',
  'Insufficient Data': 'cometChart.commentary.insufficientData',
  'Sector Avoidance': 'cometChart.commentary.sectorAvoidance',
}

/** Localizes known payload commentary; unknown prose returns as-is; empty returns null. */
export function commentaryLabel(raw: string | undefined | null, t: Translate): string | null {
  if (!raw || !raw.trim()) return null
  const key = COMMENTARY_KEYS[raw.trim()]
  return key ? t(key) : raw
}
