import { createI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = ['en', 'zh-TW']
const STORAGE_KEY = 'locale'

/**
 * Resolve the initial UI locale synchronously (before the app mounts):
 * 1. a previously-saved choice in localStorage, else
 * 2. the browser language (any zh-* → zh-TW), else
 * 3. English.
 */
export function resolveInitialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
  } catch (e) {
    /* localStorage can throw in private mode — fall through */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en'
  return nav.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
}

const locale = resolveInitialLocale()

export const i18n = createI18n({
  legacy: false,          // Composition API mode (useI18n)
  globalInjection: true,  // also expose $t / this.$t for the Options-API components
  locale,
  fallbackLocale: 'en',
  // Messages are LAZY-LOADED (see loadLocaleMessages). Only the active locale
  // ships at boot; the other is a separate chunk fetched on first switch, so it
  // no longer weighs down the entry bundle (ADR-0007 reclaim path).
  messages: {},
})

// Dynamic imports of src/locales/** are precompiled by @intlify/unplugin-vue-i18n
// the same as the old static imports were, so each locale chunk is message
// FUNCTIONS — no runtime compile, no CSP 'unsafe-eval' (ADR-0009).
const LOCALE_LOADERS = {
  en: () => import('./locales/en.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
}
const loadedLocales = new Set()

/**
 * Fetch + install a locale's messages once. Awaited before mount for the active
 * locale, and before switching to a not-yet-loaded locale (so no missing-key flash).
 */
export async function loadLocaleMessages(loc) {
  if (loadedLocales.has(loc) || !LOCALE_LOADERS[loc]) return
  const mod = await LOCALE_LOADERS[loc]()
  i18n.global.setLocaleMessage(loc, mod.default ?? mod)
  loadedLocales.add(loc)
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = locale
}

export default i18n
