import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const STORAGE_KEY = 'locale'

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh-TW', label: '中', name: '繁體中文' },
]

/**
 * Locale companion to useTheme: a reactive, persisted current-locale plus a
 * toggle. Persists to localStorage ('locale') and keeps <html lang> in sync.
 * Must be called from within setup() (it uses vue-i18n's global scope).
 */
export function useLocale() {
  const { locale } = useI18n({ useScope: 'global' })

  const currentLocale = computed({
    get: () => locale.value,
    set: (value) => {
      locale.value = value
      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch (e) {
        /* ignore persistence failure */
      }
      if (typeof document !== 'undefined') document.documentElement.lang = value
    },
  })

  const toggleLocale = () => {
    currentLocale.value = currentLocale.value === 'en' ? 'zh-TW' : 'en'
  }

  return { currentLocale, toggleLocale, supportedLocales: SUPPORTED_LOCALES }
}
