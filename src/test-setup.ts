// Global Vitest setup: make vue-i18n available to every @vue/test-utils mount.
// Components migrated to $t() throw "$t is not a function" when mounted without
// the i18n plugin; installing it once here keeps component unit tests focused on
// behaviour rather than i18n wiring. Locale defaults to 'en'.
import { config } from '@vue/test-utils'
import i18n from './i18n'
import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
// Register the `toHaveNoViolations` matcher (vitest-axe) for the a11y suite
// (src/a11y/*.a11y.test.js). Explicit expect.extend — the package's side-effect
// `extend-expect` entry does not hook Vitest 4's expect. Harmless elsewhere.
import { expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'
expect.extend(axeMatchers)

// Production lazy-loads messages (empty store at boot); tests need both locales
// present synchronously. jsdom has no CSP, so vue-i18n's full build compiles the
// raw JSON fine here.
i18n.global.setLocaleMessage('en', en)
i18n.global.setLocaleMessage('zh-TW', zhTW)
i18n.global.locale.value = 'en'
config.global.plugins = [...(config.global.plugins || []), i18n]
