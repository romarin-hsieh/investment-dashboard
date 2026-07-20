<template>
  <div class="layout">
    <header class="header">
      <nav class="nav">
        <div class="container nav-container">
          <div class="nav-brand">
            <h1>{{ $t('nav.brand') }}</h1>
          </div>
          <div class="nav-controls">
            <ul class="nav-list">
              <li>
                <router-link to="/market-overview" class="nav-link">{{ $t('nav.marketOverview') }}</router-link>
              </li>
              <li>
                <router-link to="/stock-overview" class="nav-link">{{ $t('nav.stockOverview') }}</router-link>
              </li>

              <!-- Tools disclosure: previously only /system-manager was linked, leaving
                   /technical-manager, /auto-update-monitor and /settings reachable only by
                   typing a URL (audit N1). All operational + config pages now live here. -->
              <li class="nav-tools" ref="toolsRoot">
                <button
                  class="nav-link nav-tools-toggle"
                  :class="{ 'router-link-active': isToolsRouteActive }"
                  @click="toolsOpen = !toolsOpen"
                  :aria-expanded="toolsOpen ? 'true' : 'false'"
                  aria-haspopup="true"
                  aria-controls="nav-tools-menu"
                >
                  {{ $t('nav.tools') }}
                  <span class="nav-tools-caret" :class="{ open: toolsOpen }" aria-hidden="true">▾</span>
                </button>
                <ul v-show="toolsOpen" id="nav-tools-menu" class="nav-tools-menu">
                  <li>
                    <router-link to="/system-manager" class="nav-tools-item">{{ $t('nav.controlPanel') }}</router-link>
                  </li>
                  <li>
                    <router-link to="/technical-manager" class="nav-tools-item">{{ $t('nav.technicalManager') }}</router-link>
                  </li>
                  <li>
                    <router-link to="/auto-update-monitor" class="nav-tools-item">{{ $t('nav.autoUpdateMonitor') }}</router-link>
                  </li>
                  <li>
                    <router-link to="/settings" class="nav-tools-item">{{ $t('nav.settings') }}</router-link>
                  </li>
                </ul>
              </li>
            </ul>
            <button
              @click="toggleTheme"
              class="theme-toggle"
              :title="theme === 'dark' ? $t('nav.switchToLight') : $t('nav.switchToDark')"
              :aria-label="theme === 'dark' ? $t('nav.switchToLightAria') : $t('nav.switchToDarkAria')"
              :aria-pressed="theme === 'dark' ? 'true' : 'false'"
            >
               <span aria-hidden="true" v-if="theme === 'dark'">☀️</span>
               <span aria-hidden="true" v-else>🌙</span>
            </button>
            <button
              @click="toggleLocale"
              class="lang-toggle"
              :title="$t('nav.languageAria')"
              :aria-label="$t('nav.languageAria')"
            >
               <span aria-hidden="true">{{ currentLocale === 'en' ? '中' : 'EN' }}</span>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <main class="main-content">
      <div class="container">
        <slot />
      </div>
    </main>

    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <span class="copyright">{{ $t('nav.footerCopyright', { year }) }}</span>
          <span class="separator">•</span>
          <span class="attribution">
            {{ $t('nav.footerPoweredBy') }}
            <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" class="tradingview-link">
              TradingView
            </a>
          </span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../composables/useLocale'

// Routes surfaced by the Tools disclosure — used to mark the toggle active.
const TOOLS_ROUTES = ['/system-manager', '/technical-manager', '/auto-update-monitor', '/settings']

export default {
  name: 'Layout',
  setup() {
    const { theme, toggleTheme } = useTheme()
    const { currentLocale, toggleLocale } = useLocale()
    return { theme, toggleTheme, currentLocale, toggleLocale }
  },
  data() {
    return { toolsOpen: false }
  },
  computed: {
    year() {
      return new Date().getFullYear()
    },
    isToolsRouteActive() {
      return TOOLS_ROUTES.includes(this.$route.path)
    }
  },
  watch: {
    // Any navigation closes the menu (including selecting an item within it).
    $route() {
      this.toolsOpen = false
    }
  },
  mounted() {
    document.addEventListener('keydown', this.onDocKeydown)
    document.addEventListener('click', this.onDocClick)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onDocKeydown)
    document.removeEventListener('click', this.onDocClick)
  },
  methods: {
    onDocKeydown(e) {
      if (e.key === 'Escape' && this.toolsOpen) {
        this.toolsOpen = false
        // Return focus to the toggle so keyboard users are not stranded.
        this.$refs.toolsRoot?.querySelector('.nav-tools-toggle')?.focus()
      }
    },
    onDocClick(e) {
      if (this.toolsOpen && this.$refs.toolsRoot && !this.$refs.toolsRoot.contains(e.target)) {
        this.toolsOpen = false
      }
    }
  }
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-slow) ease;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.nav-brand h1 {
  color: var(--primary-color);
  font-size: var(--text-xl);
  margin: 0;
  font-weight: var(--weight-bold);
  letter-spacing: -0.5px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.nav-list {
  display: flex;
  list-style: none;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: var(--weight-medium);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
  font-size: var(--text-base);
}

.nav-link:hover {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.nav-link.router-link-active {
  color: #fff; /* white text on the darkened brand fill (passes WCAG AA) */
  background-color: var(--primary-strong);
}

/* Tools disclosure (N1). All tokens theme-aware so the menu is legible in both
   themes without touching the fixed greyscale ramp (audit A1). */
.nav-tools {
  position: relative;
}
.nav-tools-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.nav-tools-caret {
  font-size: 0.7em;
  transition: transform var(--transition-base);
}
.nav-tools-caret.open {
  transform: rotate(180deg);
}
.nav-tools-menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  min-width: 220px;
  list-style: none;
  margin: 0;
  padding: var(--space-2);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 50;
}
.nav-tools-item {
  display: block;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: var(--text-base);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-xs);
  white-space: nowrap;
  transition: all var(--transition-base);
}
.nav-tools-item:hover {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}
.nav-tools-item.router-link-active {
  color: #fff;
  background-color: var(--primary-strong);
}

.theme-toggle {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-base);
    font-size: var(--text-lg);
}

.theme-toggle:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

.lang-toggle {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    min-width: 36px;
    height: 36px;
    padding: 0 var(--space-2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-base);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
}

.lang-toggle:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

.main-content {
  flex: 1;
  padding-top: var(--space-8);
  padding-bottom: var(--space-12);
}

.footer {
  flex-shrink: 0;
  background: var(--bg-header);
  padding: var(--space-6) 0;
  margin-top: auto;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.separator {
  color: var(--border-color);
}

.tradingview-link {
  color: var(--primary-text);
  text-decoration: none;
  font-weight: var(--weight-medium);
}

.tradingview-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    height: auto;
    padding: var(--space-4);
    gap: var(--space-4);
  }
  
  .nav-controls {
    flex-direction: column;
    width: 100%;
    gap: var(--space-4);
  }
  
  .nav-list {
    width: 100%;
    justify-content: center;
  }
  
  .footer-content {
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .separator { display: none; }
}
</style>
