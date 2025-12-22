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
              <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
            </li>
            <li>
              <router-link to="/holdings" class="nav-link">Holdings</router-link>
            </li>
            <li>
              <router-link to="/settings" class="nav-link">Settings</router-link>
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
        <p class="text-center text-muted">&copy; 2025 Investment Dashboard POC</p>
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
}

.footer {
  flex-shrink: 0;
  background: #f8f9fa;
  padding: 1rem 0;
  margin-top: 2rem;
}
</style>
