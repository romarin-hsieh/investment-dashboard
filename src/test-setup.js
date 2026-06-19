// Global Vitest setup: make vue-i18n available to every @vue/test-utils mount.
// Components migrated to $t() throw "$t is not a function" when mounted without
// the i18n plugin; installing it once here keeps component unit tests focused on
// behaviour rather than i18n wiring. Locale defaults to 'en'.
import { config } from '@vue/test-utils'
import i18n from './i18n.js'

i18n.global.locale.value = 'en'
config.global.plugins = [...(config.global.plugins || []), i18n]
