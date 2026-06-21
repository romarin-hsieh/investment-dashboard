import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadLocaleMessages } from '../i18n.js'

const STORAGE_KEY = 'locale'

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh-TW', label: '中', name: '繁體中文' },
]

/**
 * Locale companion to useTheme: a reactive, persisted current-locale plus a
 * toggle. Persists to localStorage ('locale') and keeps <html lang> in sync.
 * Switching is async because the target locale's messages are lazy-loaded
 * (only the active locale ships at boot). Must be called from within setup().
 */
export function useLocale() {
  const { locale } = useI18n({ useScope: 'global' })

  const currentLocale = computed(() => locale.value)

  async function setLocale(value) {
    if (value === locale.value) return
    // Fetch the target locale's chunk before flipping so there's no
    // missing-key flash on first switch.
    await loadLocaleMessages(value)
    locale.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch (e) {
      /* ignore persistence failure */
    }
    if (typeof document !== 'undefined') document.documentElement.lang = value
  }

  const toggleLocale = () => setLocale(locale.value === 'en' ? 'zh-TW' : 'en')

  return { currentLocale, toggleLocale, setLocale, supportedLocales: SUPPORTED_LOCALES }
}
