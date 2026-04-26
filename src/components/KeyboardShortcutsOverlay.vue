<template>
  <div
    v-if="visible"
    ref="overlay"
    class="shortcuts-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    @click.self="$emit('close')"
    @keydown.tab="handleTab"
  >
    <div class="shortcuts-panel">
      <div class="shortcuts-header">
        <h3 id="shortcuts-title">Keyboard shortcuts</h3>
        <button
          ref="closeBtn"
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
// PR-E4: focus-trap + focus-restore for the help dialog. Standard
// modal-a11y pattern — Tab/Shift-Tab cycle focus inside the overlay,
// opening saves the previously-focused element and closing restores
// to it. Today the panel only renders one focusable element (the
// close button), so the trap collapses to "Tab keeps focus here";
// if more focusables are added later (e.g. action buttons inside
// list items), the cycle handler already covers them.
export default {
  name: 'KeyboardShortcutsOverlay',
  props: {
    visible: { type: Boolean, default: false },
    bindings: { type: Array, required: true }
  },
  emits: ['close'],
  data () {
    return { previouslyFocused: null }
  },
  watch: {
    visible (now, before) {
      if (now && !before) {
        // Remember what had focus before the overlay opened so we can
        // restore it on close. document.activeElement is null in some
        // edge cases (e.g. dialog opened from non-DOM event); fall back
        // to body which is the spec-default.
        this.previouslyFocused = document.activeElement || document.body
        this.$nextTick(() => {
          this.$refs.closeBtn?.focus()
        })
      } else if (!now && before) {
        const target = this.previouslyFocused
        this.previouslyFocused = null
        if (target && typeof target.focus === 'function') {
          target.focus()
        }
      }
    }
  },
  methods: {
    displayKey (key) {
      if (key === 'Enter') return '↵'
      if (key === 'Escape') return 'Esc'
      if (key === 'ArrowUp') return '↑'
      if (key === 'ArrowDown') return '↓'
      return key
    },
    handleTab (event) {
      const overlay = this.$refs.overlay
      if (!overlay) return
      const focusables = overlay.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      // Wrap focus at boundaries — Shift+Tab on first → last, Tab on
      // last → first. Single-focusable case (first === last) collapses
      // to "Tab keeps focus on the only element".
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
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
