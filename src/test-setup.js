// Global Vitest setup: make vue-i18n available to every @vue/test-utils mount.
// Components migrated to $t() throw "$t is not a function" when mounted without
// the i18n plugin; installing it once here keeps component unit tests focused on
// behaviour rather than i18n wiring. Locale defaults to 'en'.
import { config } from '@vue/test-utils'
import i18n from './i18n.js'
import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'

// Production lazy-loads messages (empty store at boot); tests need both locales
// present synchronously. jsdom has no CSP, so vue-i18n's full build compiles the
// raw JSON fine here.
i18n.global.setLocaleMessage('en', en)
i18n.global.setLocaleMessage('zh-TW', zhTW)
i18n.global.locale.value = 'en'
config.global.plugins = [...(config.global.plugins || []), i18n]
