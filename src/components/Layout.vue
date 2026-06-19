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

              <li>
                <router-link to="/system-manager" class="nav-link">{{ $t('nav.controlPanel') }}</router-link>
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
          <span class="copyright">{{ $t('nav.footerCopyright') }}</span>
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
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'

export default {
  name: 'Layout',
  setup() {
    const { theme, toggleTheme } = useTheme()
    const { currentLocale, toggleLocale } = useLocale()
    return { theme, toggleTheme, currentLocale, toggleLocale }
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
  transition: all 0.3s ease;
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
  gap: 1.5rem;
}

.nav-list {
  display: flex;
  list-style: none;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: var(--weight-medium);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-link:hover {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.nav-link.router-link-active {
  color: #fff; /* white text on the darkened brand fill (passes WCAG AA) */
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
    transition: all 0.2s;
    font-size: 1.2rem;
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
    padding: 0 0.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
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
  gap: 0.75rem;
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
    padding: 1rem;
    gap: 1rem;
  }
  
  .nav-controls {
    flex-direction: column;
    width: 100%;
    gap: 1rem;
  }
  
  .nav-list {
    width: 100%;
    justify-content: center;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .separator { display: none; }
}
</style>
