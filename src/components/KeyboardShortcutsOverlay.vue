<template>
  <div
    v-if="visible"
    class="shortcuts-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    @click.self="$emit('close')"
  >
    <div class="shortcuts-panel">
      <div class="shortcuts-header">
        <h3 id="shortcuts-title">Keyboard shortcuts</h3>
        <button
          class="shortcuts-close"
          aria-label="Close keyboard shortcuts"
          @click="$emit('close')"
        >×</button>
      </div>
      <ul class="shortcuts-list">
        <li v-for="item in bindings" :key="item.key">
          <kbd>{{ displayKey(item.key) }}</kbd>
          <span>{{ item.description }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KeyboardShortcutsOverlay',
  props: {
    visible: { type: Boolean, default: false },
    bindings: { type: Array, required: true }
  },
  emits: ['close'],
  methods: {
    displayKey (key) {
      if (key === 'Enter') return '↵'
      if (key === 'Escape') return 'Esc'
      if (key === 'ArrowUp') return '↑'
      if (key === 'ArrowDown') return '↓'
      return key
    }
  }
}
</script>

<style scoped>
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.shortcuts-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  min-width: 320px;
  max-width: 420px;
  padding: 1.5rem;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.shortcuts-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.shortcuts-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 0.25rem;
}

.shortcuts-close:hover {
  color: var(--text-primary);
}

.shortcuts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shortcuts-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
}

kbd {
  display: inline-block;
  min-width: 2rem;
  padding: 0.15rem 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  text-align: center;
  color: var(--text-primary);
}
</style>
