<template>
  <div class="layout">
    <header class="header">
      <nav class="nav">
        <div class="container nav-container">
          <div class="nav-brand">
            <h1>Investment Dashboard</h1>
          </div>
          <div class="nav-controls">
            <ul class="nav-list">
              <li>
                <router-link to="/market-overview" class="nav-link">Market Overview</router-link>
              </li>
              <li>
                <router-link to="/stock-overview" class="nav-link">Stock Overview</router-link>
              </li>

              <li>
                <router-link to="/system-manager" class="nav-link">Control Panel</router-link>
              </li>
            </ul>
            <button @click="toggleTheme" class="theme-toggle" :title="theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'">
               <span v-if="theme === 'dark'">☀️</span>
               <span v-else>🌙</span>
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
          <span class="copyright">&copy; 2025 Investment Dashboard POC</span>
          <span class="separator">•</span>
          <span class="attribution">
            Market data powered by 
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

export default {
  name: 'Layout',
  setup() {
    const { theme, toggleTheme } = useTheme()
    return { theme, toggleTheme }
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
  font-size: 1.5rem;
  margin: 0;
  font-weight: 700;
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
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-link:hover {
  color: var(--primary-color);
  background-color: var(--bg-secondary);
}

.nav-link.router-link-active {
  color: var(--bg-card); /* White in Light / Dark in Dark (if background is primary) */
  color: #fff; /* Always white for active pill if primary color is dark */
  background-color: var(--primary-color);
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

.main-content {
  flex: 1;
  padding-top: 2rem;
  padding-bottom: 3rem;
}

.footer {
  flex-shrink: 0;
  background: var(--bg-header);
  padding: 1.5rem 0;
  margin-top: auto;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.separator {
  color: var(--border-color);
}

.tradingview-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
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
