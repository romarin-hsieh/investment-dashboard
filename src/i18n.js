import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'

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
  messages: { en, 'zh-TW': zhTW },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = locale
}

export default i18n
