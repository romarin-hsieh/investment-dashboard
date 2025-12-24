<template>
  <div class="layout">
    <header class="header">
      <nav class="nav">
        <div class="container">
          <div class="nav-brand">
            <h1>Investment Dashboard</h1>
          </div>
          <ul class="nav-list">
            <li>
              <router-link to="/market-overview" class="nav-link">Market Overview</router-link>
            </li>
            <li>
              <router-link to="/stock-overview" class="nav-link">Stock Overview</router-link>
            </li>
            <!-- Settings temporarily hidden -->
            <!-- <li>
              <router-link to="/settings" class="nav-link">Settings</router-link>
            </li> -->
            <li>
              <router-link to="/system-manager" class="nav-link">Control Panel</router-link>
            </li>
          </ul>
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
export default {
  name: 'Layout'
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-brand h1 {
  color: #007bff;
  font-size: 1.5rem;
  margin-bottom: 0;
}

.nav .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.main-content {
  flex: 1;
  padding-top: 1rem;
}

.footer {
  flex-shrink: 0;
  background: #f8f9fa;
  padding: 0.75rem 0;
  margin-top: 2rem;
  border-top: 1px solid #e9ecef;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.copyright {
  font-weight: 500;
}

.separator {
  color: #dee2e6;
  font-weight: bold;
}

.attribution {
  color: #6c757d;
}

.tradingview-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.tradingview-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
  
  .separator {
    display: none;
  }
}

/* Navigation styling */
.nav-list {
  display: flex;
  align-items: center;
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
}

.nav-list li {
  display: flex;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #495057;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: #e9ecef;
  color: #007bff;
}

.nav-link.router-link-active {
  background-color: #007bff;
  color: white;
}
</style>
